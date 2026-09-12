import { useState, useEffect } from "react";
import logoAsset from "@/assets/logo.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getPrintHeaderHTML, getPrintWatermarkHTML } from "@/components/PrintHeader";
import { getPrintFooterHTML } from "@/components/PrintFooter";
import { numberToWords } from "@/lib/numberToWords";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, FileText, Printer, Trash2, Receipt, Search, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { canEdit, canCreate } from "@/lib/permissions";
import { logAction } from "@/lib/logger";
import { format, subMonths } from "date-fns";

export default function Invoices() {
  const { role } = useAuth();
  const { permissions } = usePermissions();
  const hasEdit = canEdit(role, "invoices", permissions);

  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12; // 3x4 grid

  const [form, setForm, clearDraft] = useFormPersistence("invoice", {
    customer_id: "",
    sale_id: "",
    invoice_type: "sale" as string,
    notes: "",
    due_date: "",
  }, false);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "create") {
      const customerId = searchParams.get("customer_id") || "";
      const saleId = searchParams.get("sale_id") || "";
      const type = searchParams.get("type") || "sale";
      setForm({
        customer_id: customerId,
        sale_id: saleId,
        invoice_type: type,
        notes: "",
        due_date: "",
      });
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, name, phone, email, address");
      if (error) throw error;
      return data;
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("*, vehicles:vehicle_id(make, model, year)");
      if (error) throw error;
      return data;
    },
  });

  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const filtered = invoices.filter((inv) => {
    // Monthly Filter
    if (selectedMonth !== "all") {
      const invDate = new Date(inv.created_at);
      const invMonth = format(invDate, 'yyyy-MM');
      if (invMonth !== selectedMonth) return false;

      // Weekly Filter
      if (selectedWeek !== "all") {
        const dayOfMonth = invDate.getDate();
        const weekNum = Math.ceil(dayOfMonth / 7);
        if (String(weekNum) !== selectedWeek) return false;
      }
    }

    const q = search.toLowerCase();
    const invNum = inv.invoice_number.toLowerCase();
    const custName = (customerMap[inv.customer_id]?.name || "").toLowerCase();
    return !q || invNum.includes(q) || custName.includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const createInvoice = useMutation({
    mutationFn: async () => {
      const sale = sales.find((s) => s.id === form.sale_id);
      const saleTotal = sale ? Number(sale.sale_price) : 0;
      const subtotal = saleTotal;
      const total = subtotal;

      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      const { data: inv, error } = await supabase.from("invoices").insert({
        invoice_number: invoiceNumber,
        customer_id: form.customer_id,
        sale_id: form.sale_id || null,
        invoice_type: "sale",
        subtotal, tax: 0, total,
        notes: form.notes || null,
        due_date: form.due_date || null,
      }).select().single();
      if (error) throw error;

      return inv;
    },
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      logAction("CREATE", "Invoice", inv?.id);
      toast.success("Invoice created successfully.");
      clearDraft();
      setForm({ customer_id: "", sale_id: "", invoice_type: "sale", notes: "", due_date: "" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      logAction("DELETE", "Invoice", id);
      toast.success("Invoice deleted");
    },
    onError: () => toast.error("Failed to delete invoice"),
  });

  const getRepairLabel = (r: any) => {
    if (r.vehicles) return `${r.vehicles.year} ${r.vehicles.make} ${r.vehicles.model}`;
    if (r.manual_make) return `${r.manual_year || ""} ${r.manual_make} ${r.manual_model || ""}`.trim();
    return "Repair";
  };

  const getInvoiceHTML = (inv: any, logoBase64?: string) => {
    const cust = customerMap[inv.customer_id];
    const sale = sales.find((s) => s.id === inv.sale_id);
    const totalAmount = Number(inv.total) || 0;

    const vehicleInfo = sale
      ? `${(sale as any).vehicles?.year || ""} ${(sale as any).vehicles?.make || ""} ${(sale as any).vehicles?.model || ""}`.trim()
      : "Vehicle Sale";

    return `<html><head><title>Invoice ${inv.invoice_number}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
      body { font-family: 'Roboto', 'Arial', sans-serif; padding: 15px; max-width: 800px; margin: 0 auto; color: #1a1a1a; line-height: 1.3; }
      .date-section { text-align: right; font-weight: 800; font-size: 13px; margin-bottom: 15px; text-transform: uppercase; }
      .bill-to { margin-bottom: 20px; }
      .bill-to p { margin: 2px 0; font-size: 13px; }
      .main-container {
        background-color: transparent;
        border-radius: 40px;
        padding: 20px;
        position: relative;
        border: none;
        min-height: 600px;
      }
      .content-wrapper { position: relative; z-index: 1; }
      .bill-title { text-align: center; text-decoration: underline; font-weight: 900; font-size: 20px; margin-bottom: 20px; color: #1e293b; text-transform: uppercase; }
      
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: transparent; }
      th, td { border: 1px solid #475569; padding: 8px 10px; text-align: left; font-size: 13px; font-weight: 600; }
      th { background: transparent; text-transform: uppercase; }
      
      .total-row td { border-top: 3px solid #1e293b; font-weight: 900; font-size: 16px; }
      .amount-words { font-weight: 900; margin-bottom: 20px; font-size: 14px; text-transform: uppercase; }
      .bank-details { margin-top: 15px; font-size: 12px; }
      .bank-details h4 { margin: 0 0 5px 0; font-weight: 900; text-transform: uppercase; }
      .bank-details p { margin: 2px 0; font-weight: 500; }
    </style></head><body>
    ${getPrintHeaderHTML(logoBase64)}
    
    <div class="date-section">INVOICE NO: ${inv.invoice_number}<br/>DATE: ${new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>

    <div class="bill-to">
      <p style="font-weight: 900;">BILL TO:</p>
      <p><strong>${cust?.name || "—"}</strong></p>
      ${cust?.phone ? `<p>Tel: ${cust.phone}</p>` : ""}
      ${cust?.address ? `<p>${cust.address}</p>` : ""}
    </div>

    <div class="main-container">
      ${getPrintWatermarkHTML(logoBase64)}
      <div class="content-wrapper">
        <h2 class="bill-title">OFFICIAL INVOICE</h2>
        
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>DESCRIPTION</th>
              <th style="text-align: right;">AMOUNT (₦)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1.</td>
              <td>VEHICLE SALE: ${vehicleInfo}</td>
              <td style="text-align: right;">₦${totalAmount.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" style="text-align: right;">GRAND TOTAL</td>
              <td style="text-align: right; white-space: nowrap;">₦${totalAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="amount-words">
          AMOUNT IN WORDS: ${numberToWords(totalAmount)}
        </div>

        <div class="bank-details">
          <h4>BANK DETAILS:</h4>
          <p>Account name: <strong>Lamido CarsMOBILE -SERVICES</strong></p>
          <p>Account Number: <strong>1229785752</strong></p>
          <p>Bank: <strong>ZENITH BANK</strong></p>
        </div>
      </div>
    </div>
    ${getPrintFooterHTML()}
    </body></html>`;
  };

  const printInvoice = (inv: any) => {
    logAction("PRINT", "Invoice", inv.id, { invoice_number: inv.invoice_number });
    const html = getInvoiceHTML(inv);
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const downloadInvoicePDF = async (inv: any, isEmail = false) => {
    const cust = customerMap[inv.customer_id];
    const filename = `invoice-${inv.invoice_number}`;

    try {
      console.log("Starting invoice generation for:", filename);
      if (isEmail) toast.loading("Preparing link for email...", { id: "invoice-dl" });
      else toast.loading("Preparing invoice download...", { id: "invoice-dl" });

      console.log("Fetching logo asset...");
      const logoBase64 = await fetch(logoAsset)
        .then(r => r.blob())
        .then(blob => new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(blob);
        }));

      const html = getInvoiceHTML(inv, logoBase64);

      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:750px;height:2000px;border:none;visibility:hidden;";
      document.body.appendChild(iframe);
      const iDoc = iframe.contentDocument!;
      iDoc.open(); iDoc.write(html); iDoc.close();

      await new Promise<void>(res => {
        const imgs = Array.from(iDoc.images);
        if (imgs.length === 0) { setTimeout(res, 400); return; }
        let loaded = 0;
        const done = () => { if (++loaded >= imgs.length) setTimeout(res, 200); };
        imgs.forEach(img => {
          if (img.complete) done();
          else { img.onload = done; img.onerror = done; }
        });
        setTimeout(res, 1200);
      });

      const contentEl = iDoc.documentElement;
      const fullHeight = contentEl.scrollHeight;
      iframe.style.height = `${fullHeight}px`;
      await new Promise<void>(res => setTimeout(res, 100));

      const { toPng } = await import("html-to-image");
      const imgData = await toPng(contentEl, { pixelRatio: 2, backgroundColor: "#ffffff", width: 750, height: fullHeight });
      
      const { default: jsPDF } = await import("jspdf");
      const a4Width = 595;
      const scale = a4Width / 750;
      const pdfPageH = fullHeight * scale;
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [a4Width, pdfPageH] });
      pdf.addImage(imgData, "PNG", 0, 0, a4Width, pdfPageH);
      const fileBlob = pdf.output('blob');

      if (isEmail) {
        const filePath = `${inv.id}/${filename}-${Date.now()}.pdf`;
        console.log("Uploading to storage:", filePath);
        const { data, error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(filePath, fileBlob, { contentType: 'application/pdf' });
        
        if (uploadErr) {
          console.error("Supabase Storage Upload Error:", uploadErr);
          throw uploadErr;
        }

        console.log("Upload successful, getting public URL...");
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
        console.log("Public URL generated:", publicUrl);
        document.body.removeChild(iframe);
        
        if (cust?.email) {
          const subject = `Invoice ${inv.invoice_number} - Lamido Cars`;
          const body = `Hello ${cust.name || 'Customer'},\n\nPlease find your invoice attached below.\n\nYou can also download it directly here: ${publicUrl}\n\nThank you for choosing Lamido Cars!`;
          window.location.href = `mailto:${cust.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          toast.success("Link generated! Opening email client...", { id: "invoice-dl" });
        } else {
          toast.error("Customer email not found.", { id: "invoice-dl" });
        }
        logAction("EXPORT", "Invoice", inv.id, { invoice_number: inv.invoice_number, format: "PDF", method: "Email" });
        return publicUrl;
      } else {
        console.log("Triggering browser download...");
        pdf.save(`${filename}.pdf`);
        logAction("EXPORT", "Invoice", inv.id, { invoice_number: inv.invoice_number, format: "PDF", method: "Download" });
        document.body.removeChild(iframe);
        toast.success("Invoice downloaded", { id: "invoice-dl" });
      }
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to generate download", { id: "invoice-dl" });
    }
  };

  const customerSales = form.customer_id ? sales.filter((s) => s.customer_id === form.customer_id) : [];

  return (
    <div className="space-y-8 animate-fade-up pb-10 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-3.5 h-3.5 text-cyan-400/60" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400/60">Finance</span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-white/90">
            Invoices
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Generate and manage professional vehicle sales invoices.
          </p>
        </div>
        <div className="shrink-0">
          {canCreate(role, "invoices", permissions) && (
            <Button onClick={() => setDialogOpen(true)} size="sm" className="rounded-xl transition-all font-semibold text-xs h-10 px-5 text-white" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-3xl flex flex-col sm:flex-row gap-4 items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />
        <div className="relative w-full group z-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-cyan-500 transition-colors pointer-events-none" />
          <Input 
            placeholder="Search by invoice number or customer name..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(0); }} 
            className="pl-10 h-10 rounded-xl bg-background/50 border-white/10 focus-visible:ring-cyan-500/50 transition-all font-medium text-sm w-full"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] h-10 rounded-xl bg-background/50 border-white/10 focus-visible:ring-cyan-500 text-sm">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent className="glass-panel w-[160px] rounded-xl">
              <SelectItem value="all" className="rounded-lg">All Time</SelectItem>
              {Array.from({ length: 12 }).map((_, i) => {
                const d = subMonths(new Date(), i);
                const val = format(d, 'yyyy-MM');
                const label = format(d, 'MMMM yyyy');
                return (
                  <SelectItem key={val} value={val} className="rounded-lg">{label}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={selectedWeek} onValueChange={(v) => { setSelectedWeek(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] h-10 rounded-xl bg-background/50 border-white/10 focus-visible:ring-cyan-500 text-sm">
              <SelectValue placeholder="All Weeks" />
            </SelectTrigger>
            <SelectContent className="glass-panel w-[120px] rounded-xl">
              <SelectItem value="all" className="rounded-lg">All Weeks</SelectItem>
              <SelectItem value="1" className="rounded-lg">Week 1</SelectItem>
              <SelectItem value="2" className="rounded-lg">Week 2</SelectItem>
              <SelectItem value="3" className="rounded-lg">Week 3</SelectItem>
              <SelectItem value="4" className="rounded-lg">Week 4</SelectItem>
              <SelectItem value="5" className="rounded-lg">Week 5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {[1, 2, 3].map((n) => <div key={n} className="h-32 rounded-3xl bg-card/40 animate-pulse border border-white/5" />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="bento-card p-12 flex flex-col items-center justify-center text-center">
             <div className="bg-cyan-500/10 p-5 rounded-full mb-4">
               <FileText className="h-10 w-10 text-cyan-500" />
             </div>
             <h2 className="text-xl font-bold mb-2">No invoices created yet.</h2>
             <p className="text-muted-foreground max-w-sm mb-6">Create your first professional invoice for a customer sale or repair.</p>
             {canCreate(role, "invoices", permissions) && (
               <Button onClick={() => setDialogOpen(true)} className="rounded-xl shadow-lg shadow-cyan-500/20 bg-cyan-500 hover:bg-cyan-600 text-white">Create Invoice</Button>
             )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paged.map((inv) => {
                return (
                  <div key={inv.id} className="bento-card p-6 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-foreground/5 p-3 rounded-2xl group-hover:bg-cyan-500/10 transition-colors shrink-0">
                          <FileText className="h-5 w-5 text-foreground/70 group-hover:text-cyan-500 transition-colors" />
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                            inv.status === "paid" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}>
                          {inv.status}
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-lg text-foreground group-hover:text-cyan-500 transition-colors truncate">
                        {inv.invoice_number}
                      </h3>
                      
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground truncate">{customerMap[inv.customer_id]?.name || "Unknown Customer"}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-foreground/60 capitalize bg-foreground/5 px-2 py-1 rounded-lg">{inv.invoice_type}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                          ₦{Number(inv.total).toLocaleString()}
                        </p>
                      </div>
                    </div>
  
                    <div className="flex gap-2 mt-6 pt-4 border-t border-white/5 justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-500 text-muted-foreground transition-all">
                            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="rounded-xl glass-panel p-2 shadow-2xl border-white/10" align="end">
                        <DropdownMenuItem onClick={() => printInvoice(inv)} className="rounded-lg cursor-pointer gap-2">
                          <Printer className="h-4 w-4 text-cyan-500" /> Print Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadInvoicePDF(inv, true)} className="rounded-lg cursor-pointer gap-2">
                          <Mail className="h-4 w-4 text-indigo-500" /> Email to Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {hasEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" onClick={() => setDeleteId(inv.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="glass-panel p-6 rounded-3xl border border-white/5">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => page > 0 && setPage(page - 1)}
                      className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i} className="hidden sm:block">
                      <PaginationLink 
                        isActive={page === i}
                        onClick={() => setPage(i)}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => page < totalPages - 1 && setPage(page + 1)}
                      className={page >= totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="text-center mt-4 text-xs text-muted-foreground sm:hidden">
                Page {page + 1} of {totalPages}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl glass-panel border-white/10 p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground">This action cannot be undone. Financial records will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl border-white/10 text-foreground hover:bg-white/5 sm:mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 border-none"
            >Delete Forever</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl glass-panel shadow-2xl border-white/10 p-0 bg-background/95 backdrop-blur-3xl">
          <div className="p-4 sm:p-6 border-b border-white/5 bg-foreground/5 sticky top-0 z-50 backdrop-blur-md flex items-center gap-3">
             <Button variant="ghost" size="icon" onClick={closeDialog} className="sm:hidden h-8 w-8 rounded-full shrink-0">
               <ArrowLeft className="w-4 h-4" />
             </Button>
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-500" />
                Generate New Invoice
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer *</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v, sale_id: "" })}>
                <SelectTrigger className="rounded-xl h-11 bg-background/50 border-white/10 focus-visible:ring-cyan-500"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent className="glass-panel rounded-xl">{customers.map((c) => <SelectItem key={c.id} value={c.id} className="rounded-lg">{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {customerSales.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-cyan-500">Link Sale</Label>
                <Select value={form.sale_id} onValueChange={(v) => setForm({ ...form, sale_id: v })}>
                  <SelectTrigger className="rounded-xl h-11 bg-cyan-500/10 border-cyan-500/20 text-cyan-500"><SelectValue placeholder="Select relevant sale" /></SelectTrigger>
                  <SelectContent className="glass-panel rounded-xl border-cyan-500/20">
                    {customerSales.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="rounded-lg text-cyan-500 focus:bg-cyan-500/20">
                        {(s as any).vehicles ? `${(s as any).vehicles.year} ${(s as any).vehicles.make} ${(s as any).vehicles.model}` : ""} — ₦{Number(s.sale_price).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</Label>
              <Input type="date" className="rounded-xl h-11 bg-background/50 border-white/10 focus-visible:ring-cyan-500" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label>
              <Textarea className="rounded-xl min-h-[80px] bg-background/50 border-white/10 focus-visible:ring-cyan-500" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional invoice notes..." />
            </div>
          </div>
          <div className="p-6 border-t border-white/5 bg-foreground/5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl border-white/10 hover:bg-white/5">Cancel</Button>
            <Button onClick={() => createInvoice.mutate()} disabled={!form.customer_id || createInvoice.isPending} className="rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20">
              {createInvoice.isPending ? "Generating..." : "Generate Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
