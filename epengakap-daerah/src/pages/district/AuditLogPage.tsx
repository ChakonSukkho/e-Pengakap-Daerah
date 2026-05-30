import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setLogs(data || []);
  }

  return (
    <DashboardLayout role="district">
      <h2 className="fw-bold mb-1">Log Audit</h2>
      <p className="text-muted">Rekod aktiviti penting dalam sistem.</p>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Tarikh</th>
                <th>Pengguna</th>
                <th>Role</th>
                <th>Tindakan</th>
                <th>Modul</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    Tiada rekod audit.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>{log.actor_name}</td>
                    <td>{log.actor_role}</td>
                    <td>{log.action}</td>
                    <td>{log.module}</td>
                    <td>
                      <span className="badge bg-success">Success</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}