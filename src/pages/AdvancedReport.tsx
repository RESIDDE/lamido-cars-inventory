import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, differenceInDays } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, AreaChart, Area
} from "recharts";
import {
  TrendingUp, Car, Users, DollarSign, Wrench, Receipt,
  FileSignature, FileText, BarChart3, ShieldCheck,
  AlertTriangle, CheckCircle2, Clock, Download, Printer, RefreshCw,
  ArrowUpRight, ArrowDownRight, Target, Calendar,
  Layers, Activity, PieChart as PieChartIcon, CreditCard,
  Banknote, ClipboardList, Star, Trophy, AlertCircle, Info,
  MessageSquare, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { exportToExcel, printTable } from "@/lib/exportHelpers";
import { toast } from "sonner";
import { logAction } from "@/lib/logger";

// ─── Color Palette ────────────────────────────────────────────────────────────
const CHART_COLORS = [
  "hsl(38 92% 50%)",   // amber
  "hsl(142 76% 36%)",  // emerald
  "hsl(199 89% 48%)",  // sky
  "hsl(262 83% 58%)",  // violet
  "hsl(0 84% 60%)",    // red
  "hsl(280 65% 60%)",  // purple
  "hsl(24 95% 53%)",   // orange
  "hsl(217 91% 60%)",  // blue
];

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel p-3 border border-white/20 shadow-2xl rounded-xl z-50 min-w-[160px]">
      <p className="font-semibold text-foreground mb-1 text-sm">{label}</p>
      {payload.map((e: any, i: number) => {
        let val = e.value;
        if (typeof val === "number" && (e.name?.includes("₦") || e.name?.toLowerCase().includes("revenue") || e.name?.toLowerCase().includes("amount") || e.name?.toLowerCase().includes("profit") || e.name?.toLowerCase().includes("expense") || e.name?.toLowerCase().includes("cost"))) {
          val = `₦${val.toLocaleString()}`;
        }
        return (
          <p key={i} className="text-xs font-medium flex justify-between gap-4" style={{ color: e.color || e.fill }}>
            <span>{e.name}:</span> <span className="font-bold">{val}</span>
          </p>
        );
      })}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, delta, deltaLabel }: {
  icon: any; label: string; value: string; sub?: string; color: string;
  delta?: number; deltaLabel?: string;
}) {
  const up = delta !== undefined ? delta >= 0 : null;
  return (
    <Card className="bento-card border-none shadow-xl group hover:scale-[1.01] transition-transform duration-200">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className={`p-2.5 rounded-xl ${color}/10`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          {delta !== undefined && (
            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${up ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-extrabold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground/70 mt-1">{sub}</p>}
        {deltaLabel && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{deltaLabel}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub, color = "text-amber-500" }: {
  icon: any; title: string; sub?: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`p-2 rounded-xl bg-foreground/5`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Insight Alert ────────────────────────────────────────────────────────────
function Insight({ type, message }: { type: "good" | "warn" | "info"; message: string }) {
  const styles = {
    good: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", Icon: CheckCircle2 },
    warn: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", Icon: AlertTriangle },
    info: { bg: "bg-sky-500/10 border-sky-500/20", text: "text-sky-400", Icon: Info },
  }[type];
  const { bg, text, Icon } = styles;
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${bg}`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${text}`} />
      <p className={`text-xs font-medium ${text}`}>{message}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { label: format(d, "MMMM yyyy"), value: format(d, "yyyy-MM") };
});

export default function AdvancedReport() {
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const generatedAt = format(new Date(), "dd MMM yyyy, HH:mm");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: vehicles = [], isLoading: vLoading } = useQuery({
    queryKey: ["report_vehicles", refreshKey],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["report_customers", refreshKey],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["report_sales", refreshKey],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("*, vehicles(*), customers(*)").order("sale_date", { ascending: false });
      return data || [];
    },
  });

  const { data: inquiries = [] } = useQuery({
    queryKey: ["report_inquiries", refreshKey],
    queryFn: async () => {
      const { data } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ["report_repairs", refreshKey],
    queryFn: async () => {
      const { data } = await (supabase as any).from("repairs").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["report_expenses", refreshKey],
    queryFn: async () => {
      const { data } = await (supabase as any).from("expenses").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["report_quotes", refreshKey],
    queryFn: async () => {
      const { data } = await (supabase as any).from("performance_quotes").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["report_audit", refreshKey],
    queryFn: async () => {
      const { data } = await (supabase as any).from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ["report_inspections", refreshKey],
    queryFn: async () => {
      const { data } = await (supabase as any).from("inspections").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const isLoading = vLoading;

  // ── Date Filter Helper ────────────────────────────────────────────────────
  const inMonth = (dateStr: string | null | undefined) => {
    if (!dateStr) return selectedMonth === "all";
    if (selectedMonth === "all") return true;
    return format(new Date(dateStr), "yyyy-MM") === selectedMonth;
  };

  // ── Derived Data ──────────────────────────────────────────────────────────
  const fVehicles = useMemo(() => vehicles.filter((v: any) => inMonth(v.created_at)), [vehicles, selectedMonth]);
  const fSales = useMemo(() => sales.filter((s: any) => inMonth(s.sale_date || s.created_at)), [sales, selectedMonth]);
  const fExpenses = useMemo(() => expenses.filter((e: any) => inMonth(e.expense_date || e.created_at)), [expenses, selectedMonth]);
  const fInquiries = useMemo(() => inquiries.filter((i: any) => inMonth(i.created_at)), [inquiries, selectedMonth]);
  const fRepairs = useMemo(() => repairs.filter((r: any) => inMonth(r.created_at)), [repairs, selectedMonth]);
  const fQuotes = useMemo(() => quotes.filter((q: any) => inMonth(q.created_at)), [quotes, selectedMonth]);
  const fCustomers = useMemo(() => customers.filter((c: any) => inMonth(c.created_at)), [customers, selectedMonth]);

  // ── Revenue & Profit ──────────────────────────────────────────────────────
  const totalRevenue = useMemo(() => fSales.reduce((s: number, x: any) => s + (Number(x.selling_price) || 0), 0), [fSales]);
  const totalCostOfGoods = useMemo(() => fSales.reduce((s: number, x: any) => s + (Number(x.cost_price) || 0), 0), [fSales]);
  const totalProfit = totalRevenue - totalCostOfGoods;
  const totalExpenses = useMemo(() => fExpenses.reduce((s: number, x: any) => s + (Number(x.amount) || 0), 0), [fExpenses]);
  const netProfit = totalProfit - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const repairRevenue = useMemo(() => fRepairs.filter((r: any) => r.status === "completed").reduce((s: number, x: any) => s + (Number(x.total_amount) || 0), 0), [fRepairs]);

  // Prior period for delta
  const prevMonth = format(subMonths(new Date(), 1), "yyyy-MM");
  const prevSales = useMemo(() => sales.filter((s: any) => format(new Date(s.sale_date || s.created_at), "yyyy-MM") === prevMonth), [sales]);
  const prevRevenue = prevSales.reduce((s: number, x: any) => s + (Number(x.selling_price) || 0), 0);
  const revenueDelta = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  // ── Vehicles ──────────────────────────────────────────────────────────────
  const availableVehicles = useMemo(() => vehicles.filter((v: any) => !v.is_sold && v.status !== "sold"), [vehicles]);
  const soldVehicles = useMemo(() => vehicles.filter((v: any) => v.is_sold || v.status === "sold"), [vehicles]);
  const avgDaysToSell = useMemo(() => {
    const withDays = fSales.filter((s: any) => s.vehicles?.created_at && s.sale_date);
    if (!withDays.length) return 0;
    const total = withDays.reduce((acc: number, s: any) => {
      return acc + differenceInDays(new Date(s.sale_date), new Date(s.vehicles.created_at));
    }, 0);
    return Math.round(total / withDays.length);
  }, [fSales]);

  // Make/Model breakdown
  const makeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    vehicles.forEach((v: any) => {
      const k = v.make || "Unknown";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [vehicles]);

  // ── Monthly Revenue Trend (last 6 months) ─────────────────────────────────
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yy");
      const monthSales = sales.filter((s: any) => format(new Date(s.sale_date || s.created_at), "yyyy-MM") === key);
      const monthExpenses = expenses.filter((e: any) => format(new Date(e.expense_date || e.created_at), "yyyy-MM") === key);
      const revenue = monthSales.reduce((s: number, x: any) => s + (Number(x.selling_price) || 0), 0);
      const cost = monthSales.reduce((s: number, x: any) => s + (Number(x.cost_price) || 0), 0);
      const exp = monthExpenses.reduce((s: number, x: any) => s + (Number(x.amount) || 0), 0);
      const profit = revenue - cost - exp;
      return { label, "Revenue ₦": revenue, "Profit ₦": profit, "Expenses ₦": exp, count: monthSales.length };
    });
  }, [sales, expenses]);

  // ── Inquiries Breakdown ───────────────────────────────────────────────────
  const inquiryStatus = useMemo(() => {
    const map: Record<string, number> = {};
    fInquiries.forEach((i: any) => { const k = i.status || "Pending"; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [fInquiries]);

  const conversionRate = useMemo(() => {
    const converted = inquiries.filter((i: any) => i.status === "converted" || i.status === "sold").length;
    return inquiries.length > 0 ? (converted / inquiries.length) * 100 : 0;
  }, [inquiries]);

  // ── Expense Category Breakdown ────────────────────────────────────────────
  const expenseCategoryBreak = useMemo(() => {
    const map: Record<string, number> = {};
    fExpenses.forEach((e: any) => { const k = e.category || "Other"; map[k] = (map[k] || 0) + (Number(e.amount) || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [fExpenses]);

  // ── Repair Stats ──────────────────────────────────────────────────────────
  const repairStatus = useMemo(() => {
    const map: Record<string, number> = {};
    fRepairs.forEach((r: any) => { const k = r.status || "pending"; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [fRepairs]);

  const totalRepairCost = useMemo(() => fRepairs.reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0), [fRepairs]);

  // ── Customer Acquisition ──────────────────────────────────────────────────
  const customersByMonth = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yy");
      const count = customers.filter((c: any) => format(new Date(c.created_at), "yyyy-MM") === key).length;
      return { label, Customers: count };
    });
  }, [customers]);

  // ── Audit Activity ─────────────────────────────────────────────────────────
  const auditActivity = useMemo(() => {
    const map: Record<string, number> = {};
    auditLogs.forEach((l: any) => {
      const k = format(new Date(l.created_at), "MMM dd");
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).slice(-10).map(([label, Actions]) => ({ label, Actions }));
  }, [auditLogs]);

  const auditByTable = useMemo(() => {
    const map: Record<string, number> = {};
    auditLogs.forEach((l: any) => { const k = l.table_name || "unknown"; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [auditLogs]);

  // ── Top Selling Vehicles ──────────────────────────────────────────────────
  const topVehicles = useMemo(() => {
    return fSales.slice(0, 5).map((s: any) => ({
      name: s.vehicles ? `${s.vehicles.year} ${s.vehicles.make} ${s.vehicles.model}` : "Unknown",
      revenue: Number(s.selling_price) || 0,
      profit: (Number(s.selling_price) || 0) - (Number(s.cost_price) || 0),
    }));
  }, [fSales]);

  // ── AI-style Insights ─────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list: { type: "good" | "warn" | "info"; message: string }[] = [];
    if (profitMargin > 20) list.push({ type: "good", message: `Strong profit margin of ${profitMargin.toFixed(1)}% — business is performing well.` });
    else if (profitMargin < 5 && totalRevenue > 0) list.push({ type: "warn", message: `Low profit margin of ${profitMargin.toFixed(1)}%. Review cost prices and operating expenses.` });
    if (availableVehicles.length > 20) list.push({ type: "warn", message: `${availableVehicles.length} vehicles still in inventory. Consider promotions to improve turnover.` });
    if (avgDaysToSell > 60) list.push({ type: "warn", message: `Average time-to-sell is ${avgDaysToSell} days. Consider reviewing pricing strategy.` });
    else if (avgDaysToSell > 0 && avgDaysToSell < 30) list.push({ type: "good", message: `Excellent sales velocity — vehicles sell in ~${avgDaysToSell} days on average.` });
    if (conversionRate > 40) list.push({ type: "good", message: `High inquiry conversion rate of ${conversionRate.toFixed(1)}%.` });
    else if (inquiries.length > 5 && conversionRate < 15) list.push({ type: "warn", message: `Low inquiry-to-sale conversion: ${conversionRate.toFixed(1)}%. Follow up on open leads.` });
    if (totalExpenses > totalProfit * 0.5 && totalProfit > 0) list.push({ type: "warn", message: `Expenses (₦${totalExpenses.toLocaleString()}) are consuming over 50% of gross profit. Review cost categories.` });
    if (fRepairs.filter((r: any) => r.status === "pending").length > 3) list.push({ type: "warn", message: `${fRepairs.filter((r: any) => r.status === "pending").length} repair jobs still pending. Follow up with workshop.` });
    if (fSales.length === 0 && selectedMonth !== "all") list.push({ type: "info", message: "No sales recorded for this period. Check if data has been entered." });
    if (list.length === 0) list.push({ type: "info", message: "Overall business metrics look stable. Keep monitoring key indicators." });
    return list;
  }, [profitMargin, availableVehicles, avgDaysToSell, conversionRate, totalExpenses, totalProfit, fRepairs, fSales, inquiries, selectedMonth]);

  // ── Scores / Health ───────────────────────────────────────────────────────
  const healthScore = useMemo(() => {
    let score = 50;
    if (profitMargin > 15) score += 15;
    else if (profitMargin > 5) score += 8;
    if (conversionRate > 30) score += 10;
    else if (conversionRate > 15) score += 5;
    if (avgDaysToSell > 0 && avgDaysToSell < 30) score += 10;
    else if (avgDaysToSell < 60) score += 5;
    if (fSales.length > 0) score += 10;
    if (netProfit > 0) score += 5;
    return Math.min(100, score);
  }, [profitMargin, conversionRate, avgDaysToSell, fSales, netProfit]);

  const healthColor = healthScore >= 75 ? "text-emerald-500" : healthScore >= 50 ? "text-amber-500" : "text-red-500";
  const healthBg = healthScore >= 75 ? "bg-emerald-500" : healthScore >= 50 ? "bg-amber-500" : "bg-red-500";

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      { metric: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}` },
      { metric: "Gross Profit", value: `₦${totalProfit.toLocaleString()}` },
      { metric: "Total Expenses", value: `₦${totalExpenses.toLocaleString()}` },
      { metric: "Net Profit", value: `₦${netProfit.toLocaleString()}` },
      { metric: "Profit Margin", value: `${profitMargin.toFixed(1)}%` },
      { metric: "Total Sales", value: String(fSales.length) },
      { metric: "Vehicles in Stock", value: String(availableVehicles.length) },
      { metric: "Vehicles Sold", value: String(soldVehicles.length) },
      { metric: "Total Customers", value: String(customers.length) },
      { metric: "New Customers (Period)", value: String(fCustomers.length) },
      { metric: "Open Inquiries", value: String(inquiries.filter((i: any) => i.status === "open" || i.status === "pending").length) },
      { metric: "Conversion Rate", value: `${conversionRate.toFixed(1)}%` },
      { metric: "Avg Days to Sell", value: `${avgDaysToSell} days` },
      { metric: "Repair Jobs", value: String(fRepairs.length) },
      { metric: "Business Health Score", value: `${healthScore}/100` },
    ];
    exportToExcel(rows, "lamido_cars_advanced_report");
    logAction("EXPORT", "AdvancedReport", "summary");
    toast.success("Report exported to Excel");
  };

  const handlePrint = () => {
    printTable(
      `Lamido Cars — Advanced Business Report (${selectedMonth === "all" ? "All Time" : selectedMonth})`,
      [
        { metric: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}` },
        { metric: "Net Profit", value: `₦${netProfit.toLocaleString()}` },
        { metric: "Profit Margin", value: `${profitMargin.toFixed(1)}%` },
        { metric: "Total Sales", value: String(fSales.length) },
        { metric: "Vehicles in Stock", value: String(availableVehicles.length) },
        { metric: "Conversion Rate", value: `${conversionRate.toFixed(1)}%` },
        { metric: "Health Score", value: `${healthScore}/100` },
      ],
      [{ key: "metric", label: "Metric" }, { key: "value", label: "Value" }]
    );
  };

  return (
    <div className="space-y-8 animate-fade-up pb-16 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-violet-400/60" />
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-400/60">Command Center</span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-white/90">
            Advanced Report
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Comprehensive audit & analytics across all modules — generated {generatedAt}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-background/50 border-white/10 text-sm">
              <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent className="glass-panel rounded-xl">
              <SelectItem value="all">All Time</SelectItem>
              {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} className="rounded-xl border-white/10 hover:bg-white/5 h-10">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="rounded-xl border-white/10 hover:bg-white/5 h-10">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl border-white/10 hover:bg-white/5 h-10">
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
          </Button>
        </div>
      </div>

      {/* ── Business Health Score ─────────────────────────────────────────── */}
      <div className="bento-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex items-center gap-5">
            <div className="relative">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--foreground)/0.05)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.915" fill="none"
                  stroke={healthScore >= 75 ? "hsl(142 76% 36%)" : healthScore >= 50 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)"}
                  strokeWidth="3" strokeDasharray={`${healthScore} ${100 - healthScore}`} strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                <span className={`text-2xl font-black ${healthColor}`}>{healthScore}</span>
                <span className="text-[9px] text-muted-foreground font-bold">/100</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Business Health</p>
              <p className={`text-3xl font-extrabold ${healthColor}`}>
                {healthScore >= 75 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "Needs Attention"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Based on sales, margin, velocity & conversion</p>
            </div>
          </div>
          <div className="flex-1 md:border-l border-white/5 md:pl-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-violet-400" /> AI Insights
            </p>
            <div className="space-y-2">
              {insights.slice(0, 3).map((ins, i) => <Insight key={i} {...ins} />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Top KPIs ─────────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={DollarSign} title="Financial Overview" sub="Revenue, profit, expenses & margins" color="text-emerald-500" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard icon={DollarSign} label="Total Revenue" value={`₦${totalRevenue.toLocaleString()}`}
            color="text-emerald-500" delta={selectedMonth !== "all" ? revenueDelta : undefined} deltaLabel="vs prev month" />
          <KpiCard icon={TrendingUp} label="Gross Profit" value={`₦${totalProfit.toLocaleString()}`} color="text-sky-500" />
          <KpiCard icon={Receipt} label="Total Expenses" value={`₦${totalExpenses.toLocaleString()}`} color="text-red-400" />
          <KpiCard icon={Banknote} label="Net Profit" value={`₦${netProfit.toLocaleString()}`}
            sub={`${profitMargin.toFixed(1)}% margin`} color={netProfit >= 0 ? "text-violet-500" : "text-red-500"} />
          <KpiCard icon={Wrench} label="Repair Revenue" value={`₦${repairRevenue.toLocaleString()}`} color="text-amber-500" />
        </div>
      </div>

      {/* ── Revenue Trend Chart ──────────────────────────────────────────────── */}
      <div className="bento-card p-6">
        <SectionHeader icon={BarChart3} title="6-Month Revenue & Profit Trend" sub="Monthly financial performance overview" color="text-violet-400" />
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground)/0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₦${(v / 1000000).toFixed(1)}M`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="Revenue ₦" stroke="hsl(142 76% 36%)" fill="url(#rev)" strokeWidth={2} />
              <Area type="monotone" dataKey="Profit ₦" stroke="hsl(262 83% 58%)" fill="url(#prof)" strokeWidth={2} />
              <Area type="monotone" dataKey="Expenses ₦" stroke="hsl(0 84% 60%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-4 mt-3 justify-center">
          {[["Revenue ₦", "hsl(142 76% 36%)"], ["Profit ₦", "hsl(262 83% 58%)"], ["Expenses ₦", "hsl(0 84% 60%)"]].map(([name, color]) => (
            <span key={name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* ── Vehicles & Sales ─────────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Car} title="Inventory & Sales Performance" sub="Vehicle stock levels, sales velocity and breakdown" color="text-sky-500" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <KpiCard icon={Car} label="Total Inventory" value={String(vehicles.length)} sub={`${availableVehicles.length} available`} color="text-sky-500" />
          <KpiCard icon={CheckCircle2} label="Vehicles Sold" value={String(soldVehicles.length)} color="text-emerald-500" />
          <KpiCard icon={Clock} label="Avg Days to Sell" value={avgDaysToSell > 0 ? `${avgDaysToSell}d` : "—"} color="text-amber-500" />
          <KpiCard icon={Target} label="Sales This Period" value={String(fSales.length)} color="text-violet-500" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Make Breakdown */}
          <div className="bento-card p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-foreground">
              <PieChartIcon className="h-4 w-4 text-sky-400" /> Inventory by Make
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={makeBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--foreground)/0.05)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Vehicles" radius={[0, 4, 4, 0]}>
                    {makeBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Top Sales */}
          <div className="bento-card p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-foreground">
              <Trophy className="h-4 w-4 text-amber-400" /> Top Sales (This Period)
            </h3>
            <div className="space-y-2.5">
              {topVehicles.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No sales in this period</p>
              ) : topVehicles.map((v: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-colors">
                  <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${i === 0 ? "bg-amber-500/20 text-amber-500" : i === 1 ? "bg-foreground/10 text-foreground" : "bg-foreground/5 text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{v.name}</p>
                    <p className="text-[10px] text-muted-foreground">Profit: ₦{v.profit.toLocaleString()}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">₦{v.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Customers & Inquiries ─────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Users} title="Customers & Lead Pipeline" sub="Customer growth, inquiry pipeline and conversion" color="text-fuchsia-500" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <KpiCard icon={Users} label="Total Customers" value={String(customers.length)} sub={`+${fCustomers.length} new`} color="text-fuchsia-500" />
          <KpiCard icon={MessageSquare} label="Total Inquiries" value={String(inquiries.length)} color="text-sky-500" />
          <KpiCard icon={Target} label="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} color={conversionRate > 30 ? "text-emerald-500" : "text-amber-500"} />
          <KpiCard icon={Star} label="Open Leads" value={String(inquiries.filter((i: any) => i.status === "open" || i.status === "pending" || !i.status).length)} color="text-violet-500" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bento-card p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-fuchsia-400" /> Customer Acquisition (6 Months)
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customersByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground)/0.05)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Customers" fill="hsl(280 65% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bento-card p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-sky-400" /> Inquiry Status Breakdown
            </h3>
            {inquiryStatus.length > 0 ? (
              <div className="h-[180px] flex items-center gap-4">
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie data={inquiryStatus} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {inquiryStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {inquiryStatus.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground capitalize">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {s.name}
                      </span>
                      <span className="font-bold">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No inquiry data</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Expenses ──────────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Receipt} title="Expense Analysis" sub="Category breakdown and cost management" color="text-red-400" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          <KpiCard icon={Receipt} label="Total Expenses" value={`₦${totalExpenses.toLocaleString()}`} color="text-red-400" />
          <KpiCard icon={CreditCard} label="Expense Entries" value={String(fExpenses.length)} color="text-orange-400" />
          <KpiCard icon={AlertCircle} label="Expense / Revenue" value={totalRevenue > 0 ? `${((totalExpenses / totalRevenue) * 100).toFixed(1)}%` : "—"} color="text-amber-400" />
        </div>
        {expenseCategoryBreak.length > 0 ? (
          <div className="bento-card p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-red-400" /> Expenses by Category
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseCategoryBreak}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground)/0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Expenses ₦" radius={[4, 4, 0, 0]}>
                    {expenseCategoryBreak.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bento-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No expense data for this period.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Run the expenses SQL migration and add expense records.</p>
          </div>
        )}
      </div>

      {/* ── Repairs & Maintenance ─────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Wrench} title="Repairs & Maintenance" sub="Workshop activity, job status and costs" color="text-orange-400" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <KpiCard icon={ClipboardList} label="Total Jobs" value={String(fRepairs.length)} color="text-orange-400" />
          <KpiCard icon={CheckCircle2} label="Completed" value={String(fRepairs.filter((r: any) => r.status === "completed").length)} color="text-emerald-500" />
          <KpiCard icon={Clock} label="Pending" value={String(fRepairs.filter((r: any) => r.status === "pending" || r.status === "in_progress").length)} color="text-amber-500" />
          <KpiCard icon={DollarSign} label="Repair Revenue" value={`₦${repairRevenue.toLocaleString()}`} color="text-violet-500" />
        </div>
        <div className="bento-card p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-orange-400" /> Repair Job Status
          </h3>
          {repairStatus.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {repairStatus.map((s, i) => (
                <div key={i} className="flex items-center gap-3 bento-card px-4 py-3 flex-1 min-w-[120px]">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <div>
                    <p className="text-lg font-extrabold">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{s.name.replace(/_/g, " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No repair jobs in this period</p>
          )}
        </div>
      </div>

      {/* ── Documents & Quotes ─────────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={FileText} title="Documents & Proforma Quotes" sub="Quote conversion and document activity" color="text-sky-400" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={FileSignature} label="Proforma Quotes" value={String(fQuotes.length)} color="text-sky-400" />
          <KpiCard icon={FileText} label="Quote → Sales" value={String(fSales.length)} color="text-emerald-500" />
          <KpiCard icon={ClipboardList} label="Inspections" value={String(inspections.length)} color="text-violet-500" />
          <KpiCard icon={ShieldCheck} label="Auth. Forms" value="—" color="text-amber-500" />
        </div>
      </div>

      {/* ── Audit Trail ──────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={ShieldCheck} title="Audit Trail & System Activity" sub="All logged user actions across the system" color="text-emerald-500" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bento-card p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" /> Activity (Last 10 Days)
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auditActivity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground)/0.05)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Actions" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bento-card p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-400" /> Activity by Module
            </h3>
            <div className="space-y-2.5">
              {auditByTable.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No audit data found</p>
              ) : auditByTable.map((a, i) => {
                const max = auditByTable[0]?.value || 1;
                const pct = (a.value / max) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground capitalize">{a.name.replace(/_/g, " ")}</span>
                      <span className="font-bold">{a.value}</span>
                    </div>
                    <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="bento-card overflow-hidden mt-5">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Recent Audit Entries
            </h3>
            <span className="text-xs text-muted-foreground">{auditLogs.length} total recorded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-foreground/5">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Module</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Record ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 10).map((log: any) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        log.action === "CREATE" ? "bg-emerald-500/10 text-emerald-400" :
                        log.action === "UPDATE" ? "bg-sky-500/10 text-sky-400" :
                        log.action === "DELETE" ? "bg-red-500/10 text-red-400" :
                        "bg-foreground/5 text-muted-foreground"
                      }`}>{log.action}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground capitalize">{(log.table_name || "—").replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground/60">{String(log.record_id || "—").slice(0, 8)}…</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{log.created_at ? format(new Date(log.created_at), "dd/MM/yy HH:mm") : "—"}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No audit logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── All Insights ──────────────────────────────────────────────────────── */}
      <div className="bento-card p-6">
        <SectionHeader icon={Activity} title="Full Business Insights" sub="Complete AI analysis based on all data" color="text-violet-400" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((ins, i) => <Insight key={i} {...ins} />)}
        </div>
      </div>

      {/* ── Report Footer ──────────────────────────────────────────────────────── */}
      <div className="text-center text-xs text-muted-foreground/40 pb-4">
        Lamido Cars Advanced Report — Generated {generatedAt} — {selectedMonth === "all" ? "All Time" : selectedMonth}
      </div>
    </div>
  );
}
