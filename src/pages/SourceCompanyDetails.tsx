import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, Car, Download, FileText, Printer, Building2, 
  Search, ListFilter, TrendingUp, DollarSign
} from "lucide-react";
import { useState, useMemo } from "react";
import { exportToExcel, exportToJSON, printTable } from "@/lib/exportHelpers";
import { Input } from "@/components/ui/input";
import { logAction } from "@/lib/logger";

export default function SourceCompanyDetails() {
  const { name } = useParams();
  const [search, setSearch] = useState("");
  
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["source-company-vehicles", name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("source_company", name)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    return !q || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || (v.vin && v.vin.toLowerCase().includes(q));
  });

  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter(v => v.status === 'Available').length;
    const sold = vehicles.filter(v => v.status === 'Sold').length;
    const totalValue = vehicles.reduce((sum, v) => sum + Number(v.price || 0), 0);
    return { total, available, sold, totalValue };
  }, [vehicles]);

  const handleExportExcel = () => {
    const rows = filtered.map((v) => ({
      Make: v.make, Model: v.model, Year: v.year, VIN: v.vin || "", 
      Price: v.price, Status: v.status, Condition: v.condition || "",
      "Date Arrived": v.date_arrived || "",
    }));
    logAction("EXPORT", "Source Company Details", name, { format: "Excel", count: rows.length });
    exportToExcel(rows, `vehicles_${name}`);
  };

  const handlePrint = () => {
    const rows = filtered.map((v) => ({
      vehicle: `${v.year} ${v.make} ${v.model}`, vin: v.vin || "—", price: `₦${Number(v.price).toLocaleString()}`,
      status: v.status, condition: v.condition || "—",
    }));
    logAction("PRINT", "Source Company Details", name, { count: rows.length });
    printTable(`${name} Vehicles List`, rows, [
      { key: "vehicle", label: "Vehicle" }, { key: "vin", label: "VIN" },
      { key: "price", label: "Price" }, { key: "status", label: "Status" }, { key: "condition", label: "Condition" },
    ]);
  };

  return (
    <div className="space-y-8 animate-fade-up pb-10 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-xl hover:bg-white/10">
            <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium uppercase tracking-wider text-primary">Source Company</span>
            </div>
            <h1 className="text-3xl font-heading font-extrabold">{name}</h1>
          </div>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="lg" className="rounded-2xl glass-panel border-white/10 hover:bg-white/5 transition-all" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" size="lg" className="rounded-2xl glass-panel border-white/10 hover:bg-white/5 transition-all" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bento-card border-none shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary"><Car className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Sourced</p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bento-card border-none shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500"><TrendingUp className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available</p>
                <h3 className="text-2xl font-bold">{stats.available}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bento-card border-none shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500"><DollarSign className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sold</p>
                <h3 className="text-2xl font-bold">{stats.sold}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bento-card border-none shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-500"><DollarSign className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inventory Value</p>
                <h3 className="text-2xl font-bold truncate">₦{stats.totalValue.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="glass-panel p-4 rounded-3xl relative overflow-hidden">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input 
          placeholder="Search by make, model, VIN..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="pl-10 h-10 rounded-xl bg-background/50 border-white/10"
        />
      </div>

      <div className="bento-card overflow-hidden table-container">
        <Table>
          <TableHeader className="bg-foreground/5 pointer-events-none">
            <TableRow className="border-border/50">
              <TableHead className="font-semibold px-6 py-4">Vehicle</TableHead>
              <TableHead className="font-semibold">VIN</TableHead>
              <TableHead className="font-semibold text-center">Status</TableHead>
              <TableHead className="font-semibold text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1,2,3].map(i => <TableRow key={i}><TableCell colSpan={4} className="h-16 animate-pulse bg-white/5" /></TableRow>)
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No vehicles found.</TableCell></TableRow>
            ) : filtered.map((v) => (
              <TableRow key={v.id} className="border-border/10 hover:bg-white/5 transition-colors">
                <TableCell className="px-6 py-4">
                  <div className="font-semibold text-sm">{v.year} {v.make} {v.model}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{v.condition}</div>
                </TableCell>
                <TableCell className="font-mono text-xs">{v.vin || "—"}</TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    v.status === 'Sold' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                    v.status === 'Available' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                    'bg-sky-500/10 text-sky-500 border-sky-500/20'
                  }`}>
                    {v.status}
                  </span>
                </TableCell>
                <TableCell className="text-right font-bold text-sm">₦{Number(v.price).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
