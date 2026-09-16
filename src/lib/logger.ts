import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "SIGNUP"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "EXPORT"
  | "PRINT"
  | "VIEW"
  | "SEARCH"
  | "STATUS_CHANGE"
  | "PERMISSION_CHANGE"
  | "ROLE_CHANGE"
  | "INVITE"
  | "SIGNATURE"
  | "PAYMENT"
  | "OTHER";

export async function logAction(
  action: AuditAction,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, any>,
  userIdOverride?: string
) {
  try {
    const userId = userIdOverride || (await supabase.auth.getSession()).data.session?.user?.id;

    let userName: string | undefined;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", userId)
        .single();
      userName = profile?.display_name ?? undefined;
    }

    await (supabase as any).from("audit_logs").insert({
      user_id: userId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: {
        ...(details || {}),
        ...(userName ? { _user_name: userName } : {}),
      },
    });
  } catch (error) {
    console.error("Failed to log action:", error);
  }
}

/** Convenience: human-readable description of an audit log row */
export function describeLog(log: any): string {
  const action = log.action as AuditAction;
  const entity = log.entity_type ?? "";
  const name = log.details?._user_name ?? log.profiles?.display_name ?? "Someone";
  const d = log.details ?? {};

  switch (action) {
    case "LOGIN":       return `${name} logged in`;
    case "LOGOUT":      return `${name} logged out`;
    case "SIGNUP":      return `${name} created an account`;

    case "CREATE":
      if (entity === "Vehicle") return `${name} added vehicle — ${d.make ?? ""} ${d.model ?? ""} ${d.year ?? ""}`.trim();
      if (entity === "Customer") return `${name} added customer — ${d.name ?? ""}`;
      if (entity === "Sales") return `${name} recorded a sale — ${d.vehicle ?? ""}`;
      if (entity === "Invoice") return `${name} created invoice ${d.invoice_number ?? ""}`;
      if (entity === "Inquiry") return `${name} logged inquiry from ${d.customer ?? ""}`;
      if (entity === "Inspection") return `${name} recorded inspection for ${d.vehicle ?? ""}`;
      if (entity === "Repair") return `${name} opened repair job — ${d.vehicle ?? ""}`;
      if (entity === "Authority to Sell") return `${name} created Authority to Sell for ${d.customer ?? ""}`;
      if (entity === "Proforma Quote" || entity === "Proforma Invoice") return `${name} created proforma invoice`;
      return `${name} created a ${entity.toLowerCase()} record`;

    case "UPDATE":
      if (entity === "Vehicle") return `${name} updated vehicle — ${d.make ?? ""} ${d.model ?? ""}`.trim();
      if (entity === "Customer") return `${name} updated customer — ${d.name ?? ""}`;
      if (entity === "Sales") return `${name} updated sale record`;
      if (entity === "Invoice") return `${name} updated invoice ${d.invoice_number ?? ""}`;
      if (entity === "Inquiry") return `${name} updated inquiry from ${d.customer ?? ""}`;
      if (entity === "Inspection") return `${name} updated inspection for ${d.vehicle ?? ""}`;
      if (entity === "Repair") return `${name} updated repair job — ${d.vehicle ?? ""}`;
      if (entity === "Authority to Sell") return `${name} updated Authority to Sell for ${d.customer ?? ""}`;
      return `${name} updated a ${entity.toLowerCase()} record`;

    case "DELETE":
      if (entity === "Vehicle") return `${name} deleted vehicle — ${d.make ?? ""} ${d.model ?? ""}`.trim();
      if (entity === "Customer") return `${name} deleted customer — ${d.name ?? ""}`;
      if (entity === "Sales") return `${name} deleted a sale record`;
      if (entity === "Invoice") return `${name} deleted invoice ${d.invoice_number ?? ""}`;
      if (entity === "Inquiry") return `${name} deleted inquiry from ${d.customer ?? ""}`;
      if (entity === "Inspection") return `${name} deleted inspection for ${d.vehicle ?? ""}`;
      if (entity === "Repair") return `${name} deleted repair job`;
      return `${name} deleted a ${entity.toLowerCase()} record`;

    case "EXPORT":      return `${name} exported ${d.format ?? ""} — ${entity}`;
    case "PRINT":       return `${name} printed ${entity} ${d.ref ?? ""}`;
    case "VIEW":        return `${name} viewed ${entity} ${d.ref ?? ""}`;
    case "SEARCH":      return `${name} searched ${entity} — "${d.query ?? ""}"`;
    case "STATUS_CHANGE": return `${name} changed status of ${entity} to "${d.new_status ?? ""}"`;
    case "PERMISSION_CHANGE": return `${name} updated role permissions`;
    case "ROLE_CHANGE": return `${name} changed ${d.target_name ?? "a user"}'s role to ${d.new_role ?? ""}`;
    case "INVITE":      return `${name} invited ${d.invited_name ?? "a new user"} (${d.assigned_role ?? ""})`;
    case "SIGNATURE":   return `${name} signed ${entity} ${d.ref ?? ""}`;
    case "PAYMENT":     return `${name} recorded payment of ${d.amount ?? ""} on ${entity}`;
    default:            return `${name} performed ${action} on ${entity}`;
  }
}
