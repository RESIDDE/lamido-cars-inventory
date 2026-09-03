import { useState, useMemo } from "react";
import logoAsset from "@/assets/logo.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CustomerSelect } from "@/components/CustomerSelect";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useCustomerDuplicates } from "@/hooks/useCustomerDuplicates";
import { CustomerSuggestion } from "@/components/CustomerSuggestion";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { canEdit, canCreate } from "@/lib/permissions";
import { toast } from "sonner";
import { 
  PlusCircle, Search, Printer, Trash2, FileText, FileSignature, Car, 
  BarChart3, Package, Settings, ExternalLink, X
} from "lucide-react";
import { getPrintHeaderHTML, getPrintWatermarkHTML } from "@/components/PrintHeader";
import { getPrintFooterHTML } from "@/components/PrintFooter";
import { numberToWords } from "@/lib/numberToWords";
import { logAction } from "@/lib/logger";
import { format, subMonths } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Mail, ArrowLeft } from "lucide-react";

export default function PerformanceQuotes() {
  const { role } = useAuth();
  const { permissions } = usePermissions();
  const hasEdit = canEdit(role, "performance-quotes", permissions);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const emptyForm = {
    customerMode: "existing" as "existing" | "manual",
    customerId: "",
    manualCustomer: { name: "", phone: "", email: "", address: "" },
    selectedVehicles: [] as {
      id: string;
      make: string;
      model: string;
      year: string;
      vin: string;
      base_price: string;
      has_duty: boolean;
      duty_price: string;
      quantity: number;
      isManual?: boolean;
      vehicleDescription?: string;
    }[],
    notes: ""
  };

  const [form, setForm, clearDraft] = useFormPersistence("performance_quote", emptyForm);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleMode, setVehicleMode] = useState<"inventory" | "manual">("inventory");
  const [manualVehicleForm, setManualVehicleForm] = useState({ make: "", model: "", year: "", vin: "", price: "" });
  
  // Queries
  const { data: quotes = [], isLoading: loadingQuotes } = useQuery({
    queryKey: ["performance_quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_quotes" as any)
        .select(`
          *,
          customers (*),
          performance_quote_items (*, vehicles (*))
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles" as any)
        .select("id, make, model, year, trim, color, vin, price")
        .eq("status", "Available")
        .neq("inventory_type", "service")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const duplicateSuggestion = useCustomerDuplicates(customers, {
    name: form.manualCustomer.name,
    phone: form.manualCustomer.phone,
    email: form.manualCustomer.email,
    address: form.manualCustomer.address
  });

  // Mutations
  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      let finalCustomerId = form.customerId;

      // Handle manual customer creation
      if (form.customerMode === "manual") {
        if (!form.manualCustomer.name.trim()) throw new Error("Customer name is required");
        const { data: cust, error: custErr } = await supabase
          .from("customers")
          .insert({
            name: form.manualCustomer.name.trim(),
            phone: form.manualCustomer.phone.trim() || null,
            email: form.manualCustomer.email.trim() || null,
            address: form.manualCustomer.address.trim() || null,
          })
          .select()
          .single();
        if (custErr) throw custErr;
        finalCustomerId = cust.id;
      } else {
        if (!finalCustomerId) throw new Error("Please select a customer");
      }

      if (form.selectedVehicles.length === 0) throw new Error("Please select at least one vehicle");

      // Calculate total
      const totalAmount = form.selectedVehicles.reduce((sum, v) => {
        const qty = v.quantity || 1;
        return sum + ((Number(v.base_price) || 0) * qty) + (v.has_duty ? ((Number(v.duty_price) || 0) * qty) : 0);
      }, 0);

      // Create Quote
      const response: any = await supabase
        .from("performance_quotes" as any)
        .insert({
          customer_id: finalCustomerId,
          total_amount: totalAmount,
          notes: form.notes.trim() || null,
        })
        .select()
        .single();
      const quote = response.data;
      const quoteErr = response.error;
      if (quoteErr) throw quoteErr;

      // Create Quote Items
      const items = form.selectedVehicles.map((v) => ({
        quote_id: quote.id,
        vehicle_id: v.isManual ? null : v.id,
        vehicle_description: v.isManual ? v.vehicleDescription : null,
        base_price: Number(v.base_price) || 0,
        has_duty: v.has_duty,
        duty_price: Number(v.duty_price) || 0,
        quantity: Number(v.quantity) || 1,
      }));

      const { error: itemsErr } = await supabase.from("performance_quote_items" as any).insert(items);
      if (itemsErr) throw itemsErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance_quotes"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      logAction("CREATE", "Proforma Quote");
      toast.success("Proforma quote created successfully. Please note it might take a moment to reflect across all views.");
      clearDraft();
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create quote");
    },
    onSettled: () => setIsSubmitting(false),
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("performance_quotes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["performance_quotes"] });
      logAction("DELETE", "Performance Quote", id);
      toast.success("Quote deleted successfully");
    },
    onError: () => toast.error("Failed to delete quote"),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setForm(emptyForm);
    setVehicleSearch("");
    setVehicleMode("inventory");
    setManualVehicleForm({ make: "", model: "", year: "", vin: "", price: "" });
  };

  const handleAddManualVehicle = () => {
    const { make, model, year, vin, price } = manualVehicleForm;
    if (!make.trim() || !model.trim()) return;
    const desc = [year.trim(), make.trim(), model.trim(), vin.trim()].filter(Boolean).join(" ");
    const tempId = `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setForm(prev => ({
      ...prev,
      selectedVehicles: [...prev.selectedVehicles, {
        id: tempId,
        make: make.trim(),
        model: model.trim(),
        year: year.trim(),
        vin: vin.trim(),
        base_price: price || "0",
        has_duty: false,
        duty_price: "0",
        quantity: 1,
        isManual: true,
        vehicleDescription: desc,
      }]
    }));
    setManualVehicleForm({ make: "", model: "", year: "", vin: "", price: "" });
    setVehicleMode("inventory");
  };

  const handleAddVehicle = (v: any) => {
    if (form.selectedVehicles.some((sv) => sv.id === v.id)) return;
    setForm(prev => ({
      ...prev,
      selectedVehicles: [...prev.selectedVehicles, {
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        vin: v.vin,
        base_price: v.price?.toString() || "0",
        has_duty: false,
        duty_price: "0",
        quantity: 1,
      }]
    }));
    setVehicleSearch("");
  };

  const handleRemoveVehicle = (id: string) => {
    setForm(prev => ({
      ...prev,
      selectedVehicles: prev.selectedVehicles.filter(v => v.id !== id)
    }));
  };

  const updateVehicleData = (id: string, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      selectedVehicles: prev.selectedVehicles.map(v => 
        v.id === id ? { ...v, [field]: value } : v
      )
    }));
  };

  const downloadQuotePDF = async (quote: any, isEmail = false) => {
    const filename = `quote-${quote.id.slice(0,8)}-${Date.now()}`;
    try {
      if (isEmail) toast.loading("Preparing quote link for email...", { id: "quote-dl" });
      else toast.loading("Preparing quote download...", { id: "quote-dl" });

      let logoBase64 = '';
      try {
        const response = await fetch(logoAsset);
        const blob = await response.blob();
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) { console.error("Logo load error:", e); }

      // Reuse the existing HTML generation logic but wrapped in a function or just copied here for now
      // (Ideally we should refactor getQuoteHTML but I'll implement it here for speed)
      const html = `<html><head><title>Proforma Quote - ${quote.id.slice(0,8).toUpperCase()}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
        body { font-family: 'Roboto', 'Arial', sans-serif; padding: 15px; max-width: 800px; margin: 0 auto; color: #1a1a1a; line-height: 1.3; }
        .date-section { text-align: right; font-weight: 800; font-size: 13px; margin-bottom: 5px; text-transform: uppercase; }
        .bill-to { margin-bottom: 10px; }
        .bill-to p { margin: 1px 0; font-size: 13px; }
        .main-container { position: relative; padding: 5px 20px; min-height: 600px; }
        .content-wrapper { position: relative; z-index: 1; }
        .bill-title { text-align: center; text-decoration: underline; font-weight: 900; font-size: 20px; margin-bottom: 10px; color: #1e293b; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #475569; padding: 8px 10px; text-align: left; font-size: 13px; font-weight: 600; }
        th { text-transform: uppercase; }
        .total-row td { border-top: 3px solid #1e293b; font-weight: 900; font-size: 16px; }
        .amount-words { font-weight: 900; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
        .notes-box { font-size: 12px; color: #475569; background: transparent; padding: 8px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0; }
      </style></head><body>
      ${getPrintHeaderHTML()}
      <div class="date-section">DATE: ${new Date(quote.quote_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>QUOTE NO: PQ-${quote.id.slice(0,8).toUpperCase()}</div>
      <div class="bill-to">
        <p style="font-weight: 900;">PREPARED FOR:</p>
        <p><strong>${quote.customers?.name || "—"}</strong></p>
        ${quote.customers?.phone ? `<p>Tel: ${quote.customers.phone}</p>` : ''}
      </div>
      <div class="main-container">
        ${getPrintWatermarkHTML()}
        <div class="content-wrapper">
          <h2 class="bill-title">PROFORMA QUOTE</h2>
          <table>
            <thead>
              <tr><th style="width: 40px;">#</th><th>VEHICLE DESCRIPTION</th><th style="width: 60px;">QTY</th><th style="width: 120px;">UNIT PRICE</th><th style="width: 120px; text-align: right;">AMOUNT (₦)</th></tr>
            </thead>
            <tbody>
              ${quote.performance_quote_items?.map((item: any, i: number) => {
                const vehicleDesc = item.vehicle_description
                  ? item.vehicle_description
                  : (`${item.vehicles?.year || ''} ${item.vehicles?.make || ''} ${item.vehicles?.model || ''} ${item.vehicles?.trim || ''}`).trim();
                return `
                <tr>
                  <td>${i+1}.</td>
                  <td>${vehicleDesc.toUpperCase()}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td>₦${Number(item.base_price).toLocaleString()}</td>
                  <td style="text-align: right;">₦${(Number(item.base_price) * Number(item.quantity)).toLocaleString()}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>

          ${quote.performance_quote_items?.some((item: any) => item.has_duty) ? `
          <h3 style="margin-top: 20px; font-weight: 800; text-transform: uppercase; font-size: 14px;">CUSTOM DUTY</h3>
          <table>
            <thead><tr><th style="width: 40px;">#</th><th>DESCRIPTION</th><th style="width: 60px;">QTY</th><th style="width: 120px;">UNIT PRICE</th><th style="width: 120px; text-align: right;">AMOUNT (₦)</th></tr></thead>
            <tbody>
              ${quote.performance_quote_items?.filter((item: any) => item.has_duty).map((item: any, i: number) => {
                const dutyDesc = item.vehicle_description
                  ? item.vehicle_description
                  : (`${item.vehicles?.make || ''} ${item.vehicles?.model || ''}`).trim();
                return `
                <tr>
                  <td>${i+1}.</td>
                  <td>CUSTOM DUTY - ${dutyDesc.toUpperCase()}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td>₦${Number(item.duty_price).toLocaleString()}</td>
                  <td style="text-align: right;">₦${(Number(item.duty_price) * Number(item.quantity)).toLocaleString()}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>` : ''}

          <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 20px; border-top: 2px solid #1e293b; padding-top: 10px;">
            <div style="font-weight: 900; font-size: 16px; margin-right: 40px;">GRAND TOTAL</div>
            <div style="font-weight: 900; font-size: 16px; text-align: right; white-space: nowrap;">₦${(Number(quote.total_amount) || 0).toLocaleString()}</div>
          </div>
          <div class="amount-words">AMOUNT IN WORDS: ${numberToWords(Number(quote.total_amount) || 0)}</div>
          ${quote.notes ? `<div class="notes-box"><strong>NOTES:</strong><br/>${quote.notes}</div>` : ''}
        </div>
      </div>
      ${getPrintFooterHTML()}
      </body></html>`;

      const iframe = document.createElement('iframe');
      iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:800px;height:2000px;border:none;visibility:hidden;";
      document.body.appendChild(iframe);
      const iDoc = iframe.contentDocument!;
      iDoc.open(); iDoc.write(html); iDoc.close();

      await new Promise<void>(res => setTimeout(res, 1000)); // Wait for render

      const contentEl = iDoc.documentElement;
      const { toPng } = await import("html-to-image");
      const imgData = await toPng(contentEl, { pixelRatio: 2, backgroundColor: "#ffffff" });
      
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      
      document.body.removeChild(iframe);

      if (isEmail) {
        const pdfBlob = pdf.output('blob');
        const filePath = `quotes/${quote.id}/${filename}.pdf`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, pdfBlob);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
        
        // Update DB
        await supabase.from("performance_quotes" as any).update({ quote_url: publicUrl }).eq("id", quote.id);

        if (quote.customers?.email) {
          const subject = `Proforma Quote - Lamido Cars`;
          const body = `Hello ${quote.customers.name},\n\nPlease find your proforma quote attached.\n\nDownload here: ${publicUrl}\n\nThank you!`;
          window.location.href = `mailto:${quote.customers.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          toast.success("Quote generated and email ready!", { id: "quote-dl" });
        } else {
          toast.error("Customer email not found.", { id: "quote-dl" });
        }
        logAction("EXPORT", "Proforma Quote", quote.id, { customer: quote.customers?.name, format: "PDF", method: "Email" });
      } else {
        pdf.save(`${filename}.pdf`);
        logAction("EXPORT", "Proforma Quote", quote.id, { customer: quote.customers?.name, format: "PDF", method: "Download" });
        toast.success("Quote downloaded!", { id: "quote-dl" });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate quote", { id: "quote-dl" });
    }
  };

  const handlePrint = (quote: any) => {
    toast.info("Preparing quote document...");
    logAction("PRINT", "Proforma Quote", quote.id, { customer: quote.customers?.name });
    const html = `<html><head><title>Proforma Quote - ${quote.id.slice(0,8).toUpperCase()}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
      body { font-family: 'Roboto', 'Arial', sans-serif; padding: 10px; max-width: 800px; margin: 0 auto; color: #1a1a1a; line-height: 1.2; }
      .date-section { text-align: right; font-weight: 800; font-size: 13px; margin-bottom: 5px; text-transform: uppercase; }
      .bill-to { margin-bottom: 10px; }
      .bill-to p { margin: 1px 0; font-size: 13px; }
      .main-container {
        background-color: transparent;
        border-radius: 40px;
        padding: 0px 20px;
        position: relative;
        border: none;
        min-height: 600px;
      }
      .content-wrapper { position: relative; z-index: 1; }
      .bill-title { text-align: center; text-decoration: underline; font-weight: 900; font-size: 18px; margin-bottom: 10px; color: #1e293b; text-transform: uppercase; }
      
      table { width: 100%; border-collapse: collapse; background: transparent; margin-bottom: 10px; }
      th, td { border: 1px solid #475569; padding: 8px 10px; text-align: left; font-size: 13px; font-weight: 600; }
      th { background: transparent; text-transform: uppercase; }
      td:first-child { width: 40px; text-align: center; }
      
      .total-row td { border-top: 3px solid #1e293b; font-weight: 900; font-size: 16px; }
      .amount-words { font-weight: 900; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
      .bank-details { margin-top: 10px; font-size: 12px; }
      .bank-details h4 { margin: 0 0 3px 0; font-weight: 900; text-transform: uppercase; }
      .bank-details p { margin: 1px 0; font-weight: 500; }
      .notes-box { font-size: 12px; color: #475569; background: transparent; padding: 8px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0; }
    </style></head><body>
    ${getPrintHeaderHTML()}
    
    <div class="date-section">DATE: ${new Date(quote.quote_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>QUOTE NO: PQ-${quote.id.slice(0,8).toUpperCase()}</div>

    <div class="bill-to">
      <p style="font-weight: 900;">PREPARED FOR:</p>
      <p><strong>${quote.customers?.name || "—"}</strong></p>
      ${quote.customers?.phone ? `<p>Tel: ${quote.customers.phone}</p>` : ''}
    </div>

    <div class="main-container">
      ${getPrintWatermarkHTML()}
      <div class="content-wrapper">
        <h2 class="bill-title">PROFORMA QUOTE</h2>
        
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>VEHICLE DESCRIPTION</th>
              <th style="width: 60px; text-align: center;">QTY</th>
              <th style="width: 120px;">UNIT PRICE</th>
              <th style="width: 120px; text-align: right;">AMOUNT (₦)</th>
            </tr>
          </the          <tbody>
            ${(() => {
              let rowsHtml = '';
              let rowCounter = 1;

              quote.performance_quote_items?.forEach((item: any) => {
                const v = item.vehicles;
                const basePrice = Number(item.base_price) || 0;
                const qty = Number(item.quantity) || 1;
                const vehicleDesc = item.vehicle_description
                  ? item.vehicle_description
                  : `${v?.year || ''} ${v?.make || ''} ${v?.model || ''} ${v?.trim || ''}`.trim();

                rowsHtml += `
                <tr>
                  <td>${rowCounter++}.</td>
                  <td>${vehicleDesc.toUpperCase()}</td>
                  <td style="text-align: center;">${qty}</td>
                  <td>₦${basePrice.toLocaleString()}</td>
                  <td style="text-align: right;">₦${(basePrice * qty).toLocaleString()}</td>
                </tr>
                `;
              });

              return rowsHtml;
            })()}
          </tbody>
        </table>

        ${quote.performance_quote_items?.some((item: any) => item.has_duty) ? `
        <h3 style="margin-top: 30px; margin-bottom: 15px; font-weight: 800; text-transform: uppercase; font-size: 16px; color: #1e293b;">CUSTOM DUTY</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>DESCRIPTION</th>
              <th style="width: 60px; text-align: center;">QTY</th>
              <th style="width: 120px;">UNIT PRICE</th>
              <th style="width: 120px; text-align: right;">AMOUNT (₦)</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              let rowsHtml = '';
              let dutyCounter = 1;
              quote.performance_quote_items?.forEach((item: any) => {
                if (item.has_duty) {
                  const v = item.vehicles;
                  const dutyPrice = Number(item.duty_price) || 0;
                  const qty = Number(item.quantity) || 1;
                  const vehicleDesc = item.vehicle_description
                    ? item.vehicle_description
                    : `${v?.year || ''} ${v?.make || ''} ${v?.model || ''}`.trim();

                  rowsHtml += `
                  <tr>
                    <td style="text-align: center;">${dutyCounter++}.</td>
                    <td>CUSTOM DUTY - ${vehicleDesc.toUpperCase()}</td>
                    <td style="text-align: center;">${qty}</td>
                    <td>₦${dutyPrice.toLocaleString()}</td>
                    <td style="text-align: right;">₦${(dutyPrice * qty).toLocaleString()}</td>
                  </tr>
                  `;
                }
              });
              return rowsHtml;
            })()}
          </tbody>
        </table>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 20px; border-top: 3px solid #1e293b; padding-top: 15px;">
          <div style="font-weight: 900; font-size: 18px; margin-right: 40px;">GRAND TOTAL</div>
          <div style="font-weight: 900; font-size: 18px; text-align: right; white-space: nowrap;">₦${(Number(quote.total_amount) || 0).toLocaleString()}</div>
        </div>

        <div class="amount-words">
          AMOUNT IN WORDS: ${numberToWords(Number(quote.total_amount) || 0)}
        </div>

        ${quote.notes ? `
        <div class="notes-box">
          <strong>NOTES / TERMS:</strong><br/>
          ${quote.notes.replace(/\n/g, '<br/>')}
        </div>
        ` : ''}
      </div>
    </div>

    ${getPrintFooterHTML()}
    </body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
      }, 500);
    } else {
      toast.error("Pop-up blocked");
    }
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q: any) => {
      // Monthly Filter
      if (selectedMonth !== "all") {
        const qDate = new Date(q.created_at);
        const qMonth = format(qDate, 'yyyy-MM');
        if (qMonth !== selectedMonth) return false;

        // Weekly Filter
        if (selectedWeek !== "all") {
          const dayOfMonth = qDate.getDate();
          const weekNum = Math.ceil(dayOfMonth / 7);
          if (String(weekNum) !== selectedWeek) return false;
        }
      }

      if (!search) return true;
      const term = search.toLowerCase();
      const custName = q.customers?.name?.toLowerCase() || "";
      const quoteId = q.id.toLowerCase();
      return custName.includes(term) || quoteId.includes(term);
    });
  }, [quotes, selectedMonth, selectedWeek, search]);

  const totalQuoteValue = useMemo(() => 
    filteredQuotes.reduce((sum: number, q: any) => sum + Number(q.total_amount), 0),
    [filteredQuotes]
  );

  return (
    <div className="space-y-8 animate-fade-up pb-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <FileSignature className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium uppercase tracking-wider text-emerald-500">Sales & Proposals</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground to-foreground/70 tracking-tight">
            Proforma Quotes
          </h1>
          <p className="text-base text-muted-foreground mt-2 max-w-xl">
            Create and manage multi-vehicle proforma quotes with dynamic duty pricing.
          </p>
        </div>
        {canCreate(role, "performance-quotes", permissions) && (
          <div className="flex gap-2 shrink-0">
            <Button size="lg" onClick={() => setDialogOpen(true)} className="rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all bg-emerald-500 hover:bg-emerald-600 cursor-pointer">
              <PlusCircle className="mr-2 h-5 w-5" /> New Quote
            </Button>
          </div>
        )}
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="bento-card border-none shadow-xl">
          <CardContent className="p-6">
             <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-emerald-500/10 rounded-2xl"><FileText className="h-6 w-6 text-emerald-500" /></div>
             </div>
             <h3 className="text-3xl font-bold">{filteredQuotes.length}</h3>
             <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Total Quotes Issued</p>
          </CardContent>
        </Card>
        <Card className="bento-card border-none shadow-xl">
          <CardContent className="p-6">
             <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-blue-500/10 rounded-2xl"><BarChart3 className="h-6 w-6 text-blue-500" /></div>
             </div>
             <h3 className="text-3xl font-bold">₦{totalQuoteValue.toLocaleString()}</h3>
             <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Total Quoted Value</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <div className="bento-card overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search quotes by customer or ID..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10 bg-background/50 border-white/10"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); }}>
              <SelectTrigger className="w-[160px] h-10 rounded-xl bg-background/50 border-white/10 focus-visible:ring-emerald-500 text-sm">
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

            <Select value={selectedWeek} onValueChange={(v) => { setSelectedWeek(v); }}>
              <SelectTrigger className="w-[120px] h-10 rounded-xl bg-background/50 border-white/10 focus-visible:ring-emerald-500 text-sm">
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

        {loadingQuotes ? (
          <div className="p-8 text-center text-muted-foreground">Loading quotes...</div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <FileSignature className="h-12 w-12 opacity-20 mb-4" />
            <p>No performance quotes found.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block table-container">
            <Table className="w-full">
              <TableHeader className="bg-foreground/5 pointer-events-none">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-semibold px-6 py-4">Quote ID</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Vehicles</TableHead>
                  <TableHead className="font-semibold text-right">Total Amount</TableHead>
                  <TableHead className="text-right font-semibold px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((q: any) => (
                  <TableRow key={q.id} className="border-border/10 hover:bg-white/5 transition-colors group">
                    <TableCell className="px-6 py-4 font-mono text-xs font-semibold text-emerald-500">
                      PQ-{q.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="font-medium">{q.customers?.name || "Unknown"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(q.quote_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 bg-foreground/10 px-2 py-1 rounded-md w-fit text-xs font-semibold">
                        <Car className="h-3 w-3" /> {q.performance_quote_items?.length || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">₦{Number(q.total_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-500/20 hover:text-emerald-500">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-panel border-white/10 rounded-xl p-1">
                            <DropdownMenuItem onClick={() => handlePrint(q)} className="rounded-lg cursor-pointer gap-2">
                              <Printer className="h-4 w-4 text-emerald-500" /> Print Quote
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadQuotePDF(q, false)} className="rounded-lg cursor-pointer gap-2">
                              <Download className="h-4 w-4 text-amber-500" /> Save as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadQuotePDF(q, true)} className="rounded-lg cursor-pointer gap-2">
                              <Mail className="h-4 w-4 text-sky-500" /> Email to Customer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {hasEdit && (
                          <Button variant="ghost" size="icon" onClick={() => deleteQuoteMutation.mutate(q.id)} className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-white/5">
            {filteredQuotes.map((q: any) => (
              <div key={q.id} className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm tracking-tight">{q.customers?.name || "Unknown Customer"}</p>
                    <p className="text-[10px] text-emerald-500 font-mono font-bold mt-0.5 uppercase tracking-widest">PQ-{q.id.slice(0, 8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-foreground">₦{Number(q.total_amount).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(q.quote_date).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <Car className="h-3 w-3 text-emerald-500" />
                    <span className="text-[9px] font-bold text-emerald-500 uppercase">{q.performance_quote_items?.length || 0} Vehicles</span>
                  </div>
                  
                  <div className="flex gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg hover:bg-emerald-500/10 text-emerald-500">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-panel border-white/10 rounded-xl p-1">
                        <DropdownMenuItem onClick={() => downloadQuotePDF(q, false)} className="rounded-lg cursor-pointer gap-2 text-xs">
                          <Download className="h-4 w-4 text-amber-500" /> PDF Quote
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(q)} className="rounded-lg cursor-pointer gap-2 text-xs">
                          <Printer className="h-4 w-4 text-emerald-500" /> Print
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {hasEdit && (
                      <Button variant="ghost" size="sm" onClick={() => deleteQuoteMutation.mutate(q.id)} className="h-8 rounded-lg hover:bg-destructive/20 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>

      {/* New Quote Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl glass-panel border-white/10 p-0 shadow-2xl">
          <div className="sticky top-0 z-10 glass-panel border-b border-white/10 p-4 sm:p-6 flex justify-between items-center bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={closeDialog} className="sm:hidden h-8 w-8 rounded-full shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <FileSignature className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" /> Create Proforma Quote
              </DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={closeDialog} className="hidden sm:flex rounded-full"><X className="h-5 w-5" /></Button>
          </div>

          <div className="p-6 space-y-8">
            {/* Customer Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Customer Details</h3>
                <div className="flex items-center gap-2 text-sm bg-foreground/5 p-1 rounded-lg">
                  <button onClick={() => setForm(p => ({...p, customerMode: "existing"}))} className={`px-3 py-1.5 rounded-md transition-colors ${form.customerMode === 'existing' ? 'bg-background shadow font-semibold' : 'text-muted-foreground'}`}>Existing</button>
                  <button onClick={() => setForm(p => ({...p, customerMode: "manual"}))} className={`px-3 py-1.5 rounded-md transition-colors ${form.customerMode === 'manual' ? 'bg-background shadow font-semibold' : 'text-muted-foreground'}`}>New / Manual</button>
                </div>
              </div>

              {form.customerMode === "existing" ? (
                <div className="w-full">
                  <CustomerSelect customers={customers} value={form.customerId} onValueChange={(val) => setForm(p => ({...p, customerId: val}))} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-white/10 rounded-xl bg-black/20">
                  <div className="space-y-1">
                    <Label>Customer Name *</Label>
                    <Input value={form.manualCustomer.name} onChange={e => setForm(p => ({...p, manualCustomer: {...p.manualCustomer, name: e.target.value}}))} />
                    <CustomerSuggestion 
                      suggestion={duplicateSuggestion} 
                      onSelect={(id) => setForm(p => ({...p, customerId: id, customerMode: 'existing'}))} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone Number</Label>
                    <Input value={form.manualCustomer.phone} onChange={e => setForm(p => ({...p, manualCustomer: {...p.manualCustomer, phone: e.target.value}}))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={form.manualCustomer.email} onChange={e => setForm(p => ({...p, manualCustomer: {...p.manualCustomer, email: e.target.value}}))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Address</Label>
                    <Input value={form.manualCustomer.address} onChange={e => setForm(p => ({...p, manualCustomer: {...p.manualCustomer, address: e.target.value}}))} />
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Vehicles</h3>
                <div className="flex items-center gap-2 text-sm bg-foreground/5 p-1 rounded-lg">
                  <button
                    onClick={() => { setVehicleMode("inventory"); setVehicleSearch(""); }}
                    className={`px-3 py-1.5 rounded-md transition-colors ${vehicleMode === 'inventory' ? 'bg-background shadow font-semibold' : 'text-muted-foreground'}`}
                  >
                    From Inventory
                  </button>
                  <button
                    onClick={() => { setVehicleMode("manual"); setVehicleSearch(""); }}
                    className={`px-3 py-1.5 rounded-md transition-colors ${vehicleMode === 'manual' ? 'bg-background shadow font-semibold' : 'text-muted-foreground'}`}
                  >
                    Add Manually
                  </button>
                </div>
              </div>

              {vehicleMode === "inventory" ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search inventory by make, model, VIN..."
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {vehicleSearch && (
                    <div className="border border-white/10 rounded-xl bg-black/40 overflow-hidden max-h-[200px] overflow-y-auto">
                      {vehicles.filter(v =>
                        (v.make.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                         v.model.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                         (v.vin && v.vin.toLowerCase().includes(vehicleSearch.toLowerCase()))) &&
                        !form.selectedVehicles.some(sv => sv.id === v.id)
                      ).map(v => (
                        <div key={v.id} className="p-3 border-b border-white/5 hover:bg-white/5 flex justify-between items-center cursor-pointer" onClick={() => handleAddVehicle(v)}>
                          <div>
                            <p className="font-semibold text-sm">{v.year} {v.make} {v.model}</p>
                            <p className="text-xs text-muted-foreground font-mono">{v.vin}</p>
                          </div>
                          <PlusCircle className="h-5 w-5 text-emerald-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 border border-dashed border-emerald-500/30 rounded-2xl bg-emerald-500/5 space-y-4">
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                    <Car className="h-4 w-4 text-emerald-500" />
                    Enter vehicle details manually (not from inventory)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Make *</Label>
                      <Input
                        placeholder="e.g. Toyota"
                        value={manualVehicleForm.make}
                        onChange={e => setManualVehicleForm(p => ({...p, make: e.target.value}))}
                        className="bg-background/50 border-white/10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Model *</Label>
                      <Input
                        placeholder="e.g. Camry"
                        value={manualVehicleForm.model}
                        onChange={e => setManualVehicleForm(p => ({...p, model: e.target.value}))}
                        className="bg-background/50 border-white/10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Year</Label>
                      <Input
                        placeholder="e.g. 2023"
                        value={manualVehicleForm.year}
                        onChange={e => setManualVehicleForm(p => ({...p, year: e.target.value}))}
                        className="bg-background/50 border-white/10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">VIN / Chassis No.</Label>
                      <Input
                        placeholder="Optional"
                        value={manualVehicleForm.vin}
                        onChange={e => setManualVehicleForm(p => ({...p, vin: e.target.value}))}
                        className="bg-background/50 border-white/10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Base Price (₦)</Label>
                      <CurrencyInput
                        value={manualVehicleForm.price}
                        onChange={e => setManualVehicleForm(p => ({...p, price: e.target.value}))}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={handleAddManualVehicle}
                        disabled={!manualVehicleForm.make.trim() || !manualVehicleForm.model.trim()}
                        className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Vehicle
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Vehicles List */}
              {form.selectedVehicles.length > 0 && (
                <div className="space-y-4 mt-6">
                  {form.selectedVehicles.map((sv, idx) => (
                    <div key={sv.id} className="p-4 border border-white/10 rounded-2xl bg-gradient-to-br from-white/5 to-transparent relative">
                      <button onClick={() => handleRemoveVehicle(sv.id)} className="absolute top-4 right-4 text-muted-foreground hover:text-destructive">
                        <X className="h-5 w-5" />
                      </button>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <div className="bg-emerald-500/20 p-2 rounded-lg"><Car className="h-4 w-4 text-emerald-500" /></div>
                        <div>
                          <h4 className="font-bold">{sv.year} {sv.make} {sv.model}</h4>
                          {sv.isManual && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Manual Entry</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Vehicle Base Price (₦)</Label>
                            <CurrencyInput value={sv.base_price} onChange={e => updateVehicleData(sv.id, "base_price", e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input 
                              type="number" 
                              min="1" 
                              value={sv.quantity === 0 ? "0" : sv.quantity || ""} 
                              onChange={e => {
                                const val = e.target.value;
                                if (val === "") {
                                  updateVehicleData(sv.id, "quantity", "");
                                } else {
                                  const parsed = parseInt(val);
                                  if (!isNaN(parsed)) updateVehicleData(sv.id, "quantity", parsed);
                                }
                              }}
                              className="bg-background/50 border-white/10"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3 p-4 bg-black/20 rounded-xl border border-white/5 flex flex-col justify-center">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`duty-${sv.id}`} 
                              checked={sv.has_duty} 
                              onCheckedChange={(c) => updateVehicleData(sv.id, "has_duty", c === true)} 
                            />
                            <Label htmlFor={`duty-${sv.id}`} className="font-semibold text-amber-500 cursor-pointer">Include Custom Duty Price</Label>
                          </div>
                          {sv.has_duty && (
                            <div className="space-y-1 animate-fade-down pt-2">
                              <Label className="text-xs text-muted-foreground">Duty Price Amount (₦) per unit</Label>
                              <CurrencyInput value={sv.duty_price} onChange={e => updateVehicleData(sv.id, "duty_price", e.target.value)} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Summary */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex justify-between items-center mt-6">
                    <span className="font-bold text-lg text-emerald-500 uppercase tracking-wider">Grand Total Estimate</span>
                    <span className="text-3xl font-black text-emerald-500">
                      ₦{form.selectedVehicles.reduce((sum, v) => sum + ((Number(v.base_price) || 0) * (v.quantity || 1)) + (v.has_duty ? ((Number(v.duty_price) || 0) * (v.quantity || 1)) : 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Additional Notes / Terms</Label>
              <Textarea placeholder="Enter any special conditions, validity period, etc." value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={3} className="bg-black/20 rounded-xl" />
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-white/10 bg-black/40">
            <Button variant="outline" onClick={closeDialog} className="rounded-xl">Cancel</Button>
            <Button 
              onClick={() => { setIsSubmitting(true); createQuoteMutation.mutate(); }} 
              disabled={isSubmitting || form.selectedVehicles.length === 0 || (form.customerMode === 'manual' && !form.manualCustomer.name.trim()) || (form.customerMode === 'existing' && !form.customerId)}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? "Generating..." : "Generate Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
