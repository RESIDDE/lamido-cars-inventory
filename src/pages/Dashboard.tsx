import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Car, Users, DollarSign, Wrench, PlusCircle, Search, ChevronRight,
  TrendingUp, Calendar, ArrowUpRight, BarChart3, Clock, PieChart as PieChartIcon,
  FileSignature, FileText, Building2, Printer, Download, ListFilter
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { canAccess, canEdit, canCreate, getAccessiblePages, type AppRole, ALL_PAGES } from "@/lib/permissions";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, AreaChart, Area
} from "recharts";
import { differenceInDays } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { exportToExcel, printTable } from "@/lib/exportHelpers";
import { logAction } from "@/lib/logger";

const COLORS = ["hsl(var(--primary))", "hsl(142 76% 36%)", "hsl(0 84% 60%)", "hsl(262 83% 58%)", "hsl(38 92% 50%)", "hsl(199 89% 48%)"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-3 border border-white/20 shadow-2xl rounded-xl z-50 min-w-[150px]">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => {
          let val = entry.value;
          if (entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('price') || entry.name.toLowerCase().includes('profit')) {
            val = `₦${entry.value.toLocaleString()}`;
          }
          if (entry.name.toLowerCase().includes('time')) {
            val = `${entry.value} days`;
          }
          return (
            <p key={index} className="text-sm font-medium flex justify-between gap-4" style={{ color: entry.color || entry.fill }}>
              <span>{entry.name}:</span> <span>{val}</span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

const WelcomeLanding = ({ profile, user, role, permissions }: any) => {
  const accessibleKeys = getAccessiblePages(role as AppRole, permissions);
  const assignedPages = ALL_PAGES.filter(p => accessibleKeys.includes(p.key) && p.key !== 'dashboard');
  const displayName = profile?.display_name || user?.email?.split('@')[0] || "User";
  const initials = profile?.display_name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase() || "??";
  const isPending = !role;

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 animate-fade-up">
        <div className="w-24 h-24 rounded-full border-4 border-amber-500/30 shadow-2xl bg-amber-500/10 flex items-center justify-center text-3xl font-black text-amber-500 mb-6 overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
          ) : initials}
        </div>

        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Pending Approval
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-center">
          Welcome, <span className="text-amber-500">{displayName}</span>!
        </h1>
        <p className="text-base text-muted-foreground max-w-md leading-relaxed text-center mb-8">
          Your account has been created successfully. A <strong className="text-foreground">Super Admin</strong> needs to review and assign you a role before you can access the system.
        </p>

        <div className="glass-panel border border-amber-500/10 rounded-3xl p-6 max-w-sm w-full space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 text-center">What happens next?</p>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 shrink-0 mt-0.5">1.</span>
              <span>A Super Admin logs in and opens <strong className="text-foreground">Settings → Team</strong>.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-amber-500 shrink-0 mt-0.5">2.</span>
              <span>They find your name and assign you a role (Admin, Sales, or Mechanic).</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-amber-500 shrink-0 mt-0.5">3.</span>
              <span>Log out and log back in — your modules will appear!</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-up">
      <div className="w-32 h-32 rounded-full border-4 border-white shadow-2xl bg-primary/10 flex items-center justify-center text-4xl font-black text-primary mb-8 overflow-hidden">
        {profile?.avatar_url ? (
          <img src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${new Date(profile.updated_at || Date.now()).getTime()}`} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>

      <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
        Welcome, <span className="text-primary">{displayName}</span>!
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mb-12 leading-relaxed text-center">
        You are currently logged in as <span className="text-foreground font-bold uppercase tracking-widest text-sm bg-foreground/5 px-2 py-1 rounded-lg">{role?.replace('_', ' ')}</span>.
        {" Below are the modules you have been assigned to manage."}
      </p>

      {assignedPages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
          {assignedPages.map((page) => (
            <Link
              key={page.key}
              to={page.path}
              className="group bento-card p-6 flex flex-col items-center gap-4 hover:scale-[1.02] transition-all duration-300 border-white/5 hover:border-primary/20"
            >
              <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ChevronRight className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg">{page.label}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Access Granted</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { role, user, profile } = useAuth();
  const { permissions } = usePermissions();
  const hasVehicleEdit = canEdit(role, "vehicles", permissions);
  const canAddVehicle = canCreate(role, "vehicles", permissions);
  const [search, setSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [greeting, setGreeting] = useState("Welcome back");

  const isAdmin = role === "admin" || role === 'admin';

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const { data: vehicles = [], isLoading: loadingV } = useQuery({
    queryKey: ["dash-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*").eq("inventory_type", "Lamido");
      if (error) {
        toast.error("Vehicles query failed: " + error.message);
        throw error;
      }
      return data;
    },
  });

  const { data: resaleVehicles = [] } = useQuery({
    queryKey: ["dash-resale-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("id, status, created_at").eq("inventory_type", "resale");
      if (error) throw error;
      return data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["dash-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id");
      if (error) throw error;
      return data;
    },
  });

  const { data: sales = [], isLoading: loadingS } = useQuery({
    queryKey: ["dash-sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("*, vehicles(make, model, cost_price)");
      if (error) throw error;
      return data;
    },
  });

  const { data: repairs = [], isLoading: loadingR } = useQuery({
    queryKey: ["dash-repairs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("repairs").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: performanceQuotes = [] } = useQuery({
    queryKey: ["dash-perf-quotes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("performance_quotes").select("id, total_amount, created_at");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["dash-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: inquiries = [] } = useQuery({
    queryKey: ["dash-inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inquiries").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalQuotesValue = performanceQuotes.reduce((sum, q) => sum + Number(q.total_amount || 0), 0);
  const totalSalesRevenue = sales.reduce((sum, s) => sum + Number(s.sale_price || 0), 0);
  const totalRepairsRevenue = repairs.reduce((sum, r) => sum + Number(r.repair_cost || 0), 0);
  const totalRevenue = totalSalesRevenue + totalRepairsRevenue;

  const totalSalesProfit = sales.reduce((sum, s) => {
    const cost = Number((s as any).vehicles?.cost_price || 0);
    const sale = Number(s.sale_price || 0);
    return sum + (sale - cost);
  }, 0);

  const openInvoicesAmount = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + Number(i.total || 0), 0);
  const pendingInquiriesCount = inquiries.filter(i => i.status === 'pending').length;

  const monthlyTimeline = useMemo(() => {
    const months: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString("default", { month: "short" });
      const y = d.getFullYear(); const m = d.getMonth();
      const sRev = sales.filter(s => new Date(s.sale_date || s.created_at).getMonth() === m && new Date(s.sale_date || s.created_at).getFullYear() === y).reduce((sum, s) => sum + Number(s.sale_price || 0), 0);
      const rRev = repairs.filter(r => new Date(r.created_at).getMonth() === m && new Date(r.created_at).getFullYear() === y).reduce((sum, r) => sum + Number(r.repair_cost || 0), 0);
      months.push({ name: label, "Sales Revenue": sRev, "Repairs Revenue": rRev, "Total Revenue": sRev + rRev });
    }
    return months;
  }, [sales, repairs]);

  const profitMarginData = useMemo(() => {
    return sales
      .filter(s => s.vehicles && s.vehicles.cost_price != null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(s => {
        const cost = Number(s.vehicles?.cost_price || 0);
        const sale = Number(s.sale_price || 0);
        return {
          name: `${s.vehicles?.make} ${s.vehicles?.model}`.substring(0, 15),
          Cost: cost,
          Profit: sale - cost,
        };
      });
  }, [sales]);

  const turnaroundWait = useMemo(() => {
    const completed = repairs.filter(r => r.payment_status === 'paid_in_full');
    if (completed.length === 0) return 0;
    const days = completed.map(r => differenceInDays(new Date(r.updated_at), new Date(r.created_at)));
    const avg = days.reduce((a, b) => a + b, 0) / completed.length;
    return avg < 1 ? 1 : Math.round(avg);
  }, [repairs]);

  const inventoryAging = useMemo(() => {
    const unsold = vehicles.filter(v => v.status !== 'sold');
    const aging = { "0-30 days": 0, "31-60 days": 0, "61-90 days": 0, "90+ days": 0 };
    unsold.forEach(v => {
      const days = differenceInDays(new Date(), new Date(v.created_at));
      if (days <= 30) aging["0-30 days"]++;
      else if (days <= 60) aging["31-60 days"]++;
      else if (days <= 90) aging["61-90 days"]++;
      else aging["90+ days"]++;
    });
    return Object.entries(aging).map(([name, Count]) => ({ name, Count }));
  }, [vehicles]);

  const revSplit = [
    { name: "Vehicle Sales", value: totalSalesRevenue },
    { name: "Service & Repairs", value: totalRepairsRevenue }
  ].filter(x => x.value > 0);

  const topMakes = useMemo(() => {
    const makes = (sales || []).reduce((acc, s) => {
      const make = (s as any).vehicles?.make || 'Unknown';
      acc[make] = (acc[make] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const entries = Object.entries(makes) as [string, number][];
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [sales]);

  const sourceCompanyStats = useMemo(() => {
    const stats: Record<string, { inventory: number, total: number }> = {};
    vehicles.forEach(v => {
      const company = v.source_company || "Unknown";
      if (!stats[company]) stats[company] = { inventory: 0, total: 0 };
      stats[company].total++;
      if (v.status !== 'Sold') stats[company].inventory++;
    });
    return Object.entries(stats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.inventory - a.inventory);
  }, [vehicles]);

  const filteredCompanyStats = sourceCompanyStats.filter(s => s.name.toLowerCase().includes(companySearch.toLowerCase()));

  const filteredVehicles = vehicles
    .filter((v) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || v.year.toString().includes(q));
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const currentDateInfo = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Only show the full analytics dashboard if the user has explicit 'dashboard' view permission.
  // Otherwise, show the personalized welcome landing with their assigned pages.
  const hasDashboardAccess = canAccess(role as AppRole, "dashboard", permissions);

  if (!hasDashboardAccess) {
    return <WelcomeLanding profile={profile} user={user} role={role} permissions={permissions} />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-up pb-10">
      <svg width="0" height="0">
        <defs>
          <linearGradient id="splitSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} /></linearGradient>
          <linearGradient id="splitRepairs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.8} /><stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0.1} /></linearGradient>
        </defs>
      </svg>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <Avatar className="h-20 w-20 border-4 border-background shadow-xl shrink-0">
            <AvatarImage src={profile?.avatar_url ? `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${new Date(profile.updated_at || Date.now()).getTime()}` : ""} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {profile?.display_name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 opacity-80">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{currentDateInfo}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground to-foreground/70 tracking-tight">
              {greeting}, {profile?.display_name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-xl">
              Here's your dealership performance overview and key metrics.
            </p>
          </div>
        </div>
        {canAddVehicle && (
          <Button asChild size="lg" className="rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all group shrink-0 h-14 px-8 font-bold">
            <Link to="/vehicles/new"><PlusCircle className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" /> Add Vehicle</Link>
          </Button>
        )}
      </div>

      {(loadingV || loadingS || loadingR) ? (
        <div className="h-64 rounded-3xl bg-card/40 animate-pulse border border-white/5" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-4 md:gap-6 auto-rows-max">

          {/* MAIN KPI PANEL - 8 Cols */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6 relative">
            <Link to="/sales" className="md:col-span-6 group">
              <div className="bento-card h-full p-6 sm:p-8 flex flex-col justify-between overflow-hidden relative min-h-[160px]">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-3xl rounded-full pointer-events-none group-hover:bg-primary/30 transition-colors duration-500"></div>
                <div className="flex justify-between items-start z-10 relative">
                  <div className="p-3 bg-primary/10 rounded-2xl"><DollarSign className="h-6 w-6 text-primary" /></div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full"><TrendingUp className="w-3 h-3" /> Total Revenue</div>
                </div>
                <div className="mt-6 z-10 relative">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Company Lifetime Revenue</p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">₦{totalRevenue.toLocaleString()}</h2>
                </div>
              </div>
            </Link>


            <Link to="/sales" className="md:col-span-3 group">
              <div className="bento-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden h-full min-h-[130px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-2xl rounded-full pointer-events-none transition-colors duration-500 group-hover:bg-violet-500/20" />
                <div className="p-2 sm:p-3 bg-violet-500/10 w-fit rounded-xl sm:rounded-2xl mb-2 sm:mb-4 group-hover:bg-violet-500/20"><DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-violet-500" /></div>
                <div className="z-10 relative">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">₦{totalSalesRevenue.toLocaleString()}</h2>
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-1 sm:mt-2 font-semibold line-clamp-1">Sales Revenue</p>
                </div>
              </div>
            </Link>

            <Link to="/repairs" className="md:col-span-3 group">
              <div className="bento-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden h-full min-h-[130px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-2xl rounded-full pointer-events-none transition-colors duration-500 group-hover:bg-amber-500/20" />
                <div className="p-2 sm:p-3 bg-amber-500/10 w-fit rounded-xl sm:rounded-2xl mb-2 sm:mb-4 group-hover:bg-amber-500/20"><Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" /></div>
                <div className="z-10 relative">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">₦{totalRepairsRevenue.toLocaleString()}</h2>
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-1 sm:mt-2 font-semibold line-clamp-1">Repairs Revenue</p>
                </div>
              </div>
            </Link>


            <Link to="/inquiries" className="md:col-span-1 group">
              <div className="bento-card p-5 flex flex-col justify-between relative overflow-hidden h-full min-h-[130px]">
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 blur-xl rounded-full pointer-events-none transition-colors duration-500 group-hover:bg-sky-500/20" />
                <div className="p-2 bg-sky-500/10 w-fit rounded-xl mb-2 group-hover:bg-sky-500/20"><Search className="h-5 w-5 text-sky-500" /></div>
                <div className="z-10 relative">
                  <h2 className="text-xl font-bold text-foreground">{pendingInquiriesCount}</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold line-clamp-1">Inquiries</p>
                </div>
              </div>
            </Link>

            <Link to="/performance-quotes" className="md:col-span-1 group">
              <div className="bento-card p-5 flex flex-col justify-between relative overflow-hidden h-full min-h-[130px]">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-xl rounded-full pointer-events-none transition-colors duration-500 group-hover:bg-emerald-500/20" />
                <div className="p-2 bg-emerald-500/10 w-fit rounded-xl mb-2 group-hover:bg-emerald-500/20"><FileSignature className="h-5 w-5 text-emerald-500" /></div>
                <div className="z-10 relative">
                  <h2 className="text-xl font-bold text-foreground">{performanceQuotes.length}</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold line-clamp-1">Perf. Quotes</p>
                </div>
              </div>
            </Link>

            <div className="md:col-span-2 bento-card p-5 flex flex-col justify-between relative overflow-hidden group h-full min-h-[130px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/10 blur-xl rounded-full pointer-events-none transition-colors duration-500 group-hover:bg-slate-500/20" />
              <div className="p-2 bg-slate-500/10 w-fit rounded-xl mb-2 group-hover:bg-slate-500/20"><Clock className="h-5 w-5 text-slate-500" /></div>
              <div className="z-10 relative">
                <h2 className="text-xl font-bold text-foreground">{turnaroundWait} <span className="text-xs text-muted-foreground font-medium">days</span></h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold line-clamp-1">Avg Turnaround</p>
              </div>
            </div>

            <Link to="/customers" className="md:col-span-2 group">
              <div className="bento-card p-5 flex flex-col justify-between relative overflow-hidden h-full min-h-[130px]">
                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 blur-xl rounded-full pointer-events-none transition-colors duration-500 group-hover:bg-violet-500/20" />
                <div className="p-2 bg-violet-500/10 w-fit rounded-xl mb-2 group-hover:bg-violet-500/20"><Users className="h-5 w-5 text-violet-500" /></div>
                <div className="z-10 relative">
                  <h2 className="text-xl font-bold text-foreground">{customers.length}</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-semibold line-clamp-1">Total Customers</p>
                </div>
              </div>
            </Link>

            {/* MONTHLY REVENUE LINE CHART - 4 Cols */}
            <div className="md:col-span-4 bento-card p-6 flex flex-col min-h-[350px]">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-500" /> Revenue Growth</h3>
                  <p className="text-sm text-muted-foreground">Sales & Service combined over last 6 months</p>
                </div>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground)/0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Sales Revenue" stroke="hsl(var(--primary))" fill="url(#splitSales)" strokeWidth={3} />
                    <Area type="monotone" dataKey="Repairs Revenue" stroke="hsl(38 92% 50%)" fill="url(#splitRepairs)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory Aging - 2 Cols */}
            <div className="md:col-span-2 bento-card p-6 flex flex-col min-h-[280px]">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-1"><Car className="w-4 h-4 text-sky-500" /> Inventory Aging</h3>
              <p className="text-sm text-muted-foreground mb-4">Time left in stock for unsold vehicles</p>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={inventoryAging} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--foreground)/0.05)' }} />
                    <Bar dataKey="Count" fill="hsl(199 89% 48%)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Split - 2 Cols */}
            <div className="md:col-span-2 bento-card p-5 flex flex-col items-center min-h-[280px]">
              <h3 className="font-semibold text-sm self-start mb-0 w-full flex items-center gap-2"><PieChartIcon className="w-4 h-4" /> Split</h3>
              {revSplit.length > 0 ? (
                <div className="w-full h-full min-h-[200px] flex items-center justify-center relative">
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Total</span>
                    <span className="text-lg font-bold">₦{(totalRevenue / 1000000).toFixed(1)}M</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                        {revSplit.map((_, i) => <Cell key={i} fill={i === 0 ? "hsl(var(--primary))" : "hsl(38 92% 50%)"} stroke="none" />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-sm text-muted-foreground mt-10">No data</p>}
            </div>

            {/* Profit Margin - 4 Cols */}
            <div className="md:col-span-4 bento-card p-6 flex flex-col min-h-[280px]">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-emerald-500" /> Profit Margins</h3>
              <p className="text-sm text-muted-foreground mb-4">Cost vs Profit breakdown for recent sales</p>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitMarginData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground)/0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000)}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--foreground)/0.05)' }} />
                    <Bar dataKey="Cost" stackId="a" fill="hsl(var(--muted))" barSize={35} radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Profit" stackId="a" fill="hsl(142 76% 36%)" barSize={35} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* SIDEBAR PANEL - 4 Cols */}
          <div className="lg:col-span-4 flex flex-col gap-4 md:gap-6">

            {/* Top Makes Mini-List */}
            <div className="bento-card p-6">
              <h3 className="font-semibold text-lg mb-4">Top Brands Sold</h3>
              <div className="space-y-4">
                {topMakes.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> : topMakes.map(([make, count], idx) => (
                  <div key={make} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-foreground/5'}`}>#{idx + 1}</div>
                      <span className="font-medium">{make}</span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{count} {count === 1 ? 'sold' : 'sold'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Link to="/vehicles" className="bento-card p-5 group flex flex-col">
                <div className="p-2.5 bg-sky-500/10 w-fit rounded-xl group-hover:bg-sky-500/20 transition-colors mb-3"><Car className="h-5 w-5 text-sky-500" /></div>
                <h3 className="text-2xl font-bold">{vehicles.length}</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Lamido Stock</p>
              </Link>
              <Link to="/resale-vehicles" className="bento-card p-5 group flex flex-col">
                <div className="p-2.5 bg-orange-500/10 w-fit rounded-xl group-hover:bg-orange-500/20 transition-colors mb-3"><Car className="h-5 w-5 text-orange-500" /></div>
                <h3 className="text-2xl font-bold">{resaleVehicles.length}</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Resale Stock</p>
              </Link>
              <Link to="/customers" className="bento-card p-5 group flex flex-col">
                <div className="p-2.5 bg-violet-500/10 w-fit rounded-xl group-hover:bg-violet-500/20 transition-colors mb-3"><Users className="h-5 w-5 text-violet-500" /></div>
                <h3 className="text-2xl font-bold">{customers.length}</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Customers</p>
              </Link>
              <Link to="/sales" className="bento-card p-5 group flex flex-col">
                <div className="p-2.5 bg-emerald-500/10 w-fit rounded-xl group-hover:bg-emerald-500/20 transition-colors mb-3"><DollarSign className="h-5 w-5 text-emerald-500" /></div>
                <h3 className="text-2xl font-bold">{sales.length}</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Sales</p>
              </Link>
              <Link to="/repairs" className="bento-card p-5 group flex flex-col col-span-2">
                <div className="p-2.5 bg-amber-500/10 w-fit rounded-xl group-hover:bg-amber-500/20 transition-colors mb-3"><Wrench className="h-5 w-5 text-amber-500" /></div>
                <h3 className="text-2xl font-bold">{repairs.filter((r: any) => r.payment_status !== 'paid_in_full').length}</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Open Repair Jobs</p>
              </Link>
            </div>


            {/* Recent Inventory List */}
            <div className="glass-panel p-0 flex flex-col overflow-hidden bg-card/20 border-white/10 flex-1">
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-card/40">
                <h3 className="font-semibold text-foreground">Recent Imports</h3>
              </div>
              <div className="p-3">
                {filteredVehicles.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-8">Inventory is empty.</p>
                ) : (
                  <div className="space-y-1.5">
                    {filteredVehicles.map((v) => (
                      <Link key={v.id} to={`/vehicles/${v.id}`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/5 transition-all group border border-transparent hover:border-white/5">
                        <div className="bg-foreground/5 p-2 rounded-xl shrink-0 group-hover:bg-primary/10 transition-colors"><Car className="h-4 w-4 text-foreground/70 group-hover:text-primary" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{v.year} {v.make} {v.model}</p>
                          <p className="text-[11px] text-muted-foreground uppercase">{v.status || "In Stock"}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Inquiries */}
            <div className="glass-panel p-0 flex flex-col overflow-hidden bg-card/20 border-white/10 flex-1">
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-card/40">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-500/10 rounded-lg"><Search className="h-4 w-4 text-sky-500" /></div>
                  <h3 className="font-semibold text-foreground">Recent Inquiries</h3>
                </div>
                <Link to="/inquiries" className="text-xs text-primary hover:underline font-bold">View All</Link>
              </div>
              <div className="p-3">
                {inquiries.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-8">No inquiries found.</p>
                ) : (
                  <div className="space-y-1.5">
                    {inquiries.slice(0, 3).map((inq: any) => (
                      <div key={inq.id} className="flex flex-col gap-1 rounded-xl p-3 bg-white/5 border border-white/5">
                        <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${inq.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {inq.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{new Date(inq.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-foreground line-clamp-2 mt-1">{inq.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sourced Companies Inventory */}
            <div className="glass-panel p-0 flex flex-col overflow-hidden bg-card/20 border-white/10 flex-1">
              <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-card/40 gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg"><Building2 className="h-4 w-4 text-primary" /></div>
                  <h3 className="font-semibold text-foreground">Sourced Companies Inventory</h3>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search company..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="pl-8 h-8 rounded-lg bg-background/50 border-white/5 text-xs"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => {
                    logAction("EXPORT", "Dashboard Sourced Companies", "bulk", { format: "Excel", count: filteredCompanyStats.length });
                    exportToExcel(filteredCompanyStats, "sourced_companies_inventory");
                  }}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => {
                    logAction("PRINT", "Dashboard Sourced Companies", "bulk", { count: filteredCompanyStats.length });
                    printTable("Sourced Companies Inventory", filteredCompanyStats, [{ key: 'name', label: 'Company' }, { key: 'inventory', label: 'In Stock' }, { key: 'total', label: 'Total Sourced' }]);
                  }}>
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5 pointer-events-none">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10 px-5">Company Name</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10 text-center">In Stock</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider h-10 text-center">Total Sourced</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanyStats.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">No companies found.</TableCell></TableRow>
                    ) : (
                      filteredCompanyStats.map((s) => (
                        <TableRow key={s.name} className="border-white/5 hover:bg-white/5 transition-colors group">
                          <TableCell className="px-5 py-3">
                            <Link to={`/source-company/${encodeURIComponent(s.name)}`} className="font-medium text-sm text-primary hover:underline transition-colors">
                              {s.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                              {s.inventory}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs font-medium text-muted-foreground">{s.total}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
