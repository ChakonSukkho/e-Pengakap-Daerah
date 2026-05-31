import { supabase } from "../services/supabaseClient";

export async function addAuditLog(
  action: string,
  module: string,
  description: string
) {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const { error } = await supabase.from("audit_logs").insert({
    actor_name: currentUser.full_name || "Unknown User",
    actor_role: currentUser.role || "Unknown Role",
    action,
    module,
    description,
  });

  if (error) {
    console.error("Audit log error:", error.message);
  }
}