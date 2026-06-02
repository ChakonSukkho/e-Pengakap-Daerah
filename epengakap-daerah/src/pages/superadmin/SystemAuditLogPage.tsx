import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type AuditLog = {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string | null;
  module: string | null;
  description: string | null;
  created_at: string;
};

function getActionStyle(actionValue: string | null) {
  const action = (actionValue || "").toUpperCase();

  if (action.includes("APPROVE")) return { icon: "bi-check-circle", badge: "bg-success-subtle text-success", box: "bg-success-subtle text-success", label: "APPROVE" };
  if (action.includes("REJECT")) return { icon: "bi-x-circle", badge: "bg-danger-subtle text-danger", box: "bg-danger-subtle text-danger", label: "REJECT" };
  if (action.includes("CREATE")) return { icon: "bi-plus-circle", badge: "bg-success-subtle text-success", box: "bg-success-subtle text-success", label: "CREATE" };
  if (action.includes("UPDATE")) return { icon: "bi-pencil-square", badge: "bg-primary-subtle text-primary", box: "bg-primary-subtle text-primary", label: "UPDATE" };
  if (action.includes("DELETE")) return { icon: "bi-trash", badge: "bg-danger-subtle text-danger", box: "bg-danger-subtle text-danger", label: "DELETE" };
  if (action.includes("SUSPEND") || action.includes("DEACTIVATE")) return { icon: "bi-pause-circle", badge: "bg-warning-subtle text-warning", box: "bg-warning-subtle text-warning", label: "SUSPEND" };
  if (action.includes("ACTIVATE")) return { icon: "bi-power", badge: "bg-info-subtle text-info", box: "bg-info-subtle text-info", label: "ACTIVATE" };
  if (action.includes("MORE_INFO")) return { icon: "bi-info-circle", badge: "bg-info-subtle text-info", box: "bg-info-subtle text-info", label: "MORE INFO" };

  return {
    icon: "bi-clock-history",
    badge: "bg-secondary-subtle text-secondary",
    box: "bg-secondary-subtle text-secondary",
    label: actionValue || "INFO",
  };
}

export default function SystemAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("Semua Tindakan");
  const [moduleFilter, setModuleFilter] = useState("Semua Modul");

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    console.log("AUDIT LOG DATA:", data);
    setLogs(data || []);
    setLoading(false);
  }

  function resetFilters() {
    setSearch("");
    setActionFilter("Semua Tindakan");
    setModuleFilter("Semua Modul");
    fetchLogs();
  }

  const modules = useMemo(() => {
    const unique = Array.from(
      new Set(logs.map((log) => log.module).filter(Boolean))
    );

    return ["Semua Modul", ...unique] as string[];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const keyword = search.toLowerCase();
      const style = getActionStyle(log.action);

      const matchSearch =
        (log.actor_name || "").toLowerCase().includes(keyword) ||
        (log.actor_role || "").toLowerCase().includes(keyword) ||
        (log.action || "").toLowerCase().includes(keyword) ||
        (log.module || "").toLowerCase().includes(keyword) ||
        (log.description || "").toLowerCase().includes(keyword);

      const matchAction =
        actionFilter === "Semua Tindakan" || style.label === actionFilter;

      const matchModule =
        moduleFilter === "Semua Modul" || log.module === moduleFilter;

      return matchSearch && matchAction && matchModule;
    });
  }, [logs, search, actionFilter, moduleFilter]);

  function exportCsv() {
    const rows = [
      ["Tarikh", "Pengguna", "Role", "Tindakan", "Modul", "Description"],
      ...filteredLogs.map((log) => [
        new Date(log.created_at).toLocaleString(),
        log.actor_name || "-",
        log.actor_role || "-",
        getActionStyle(log.action).label,
        log.module || "-",
        log.description || "-",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "system-audit-log.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Log Audit Sistem</h2>
          <p className="text-muted mb-0">
            Rekod aktiviti penting seluruh sistem.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-success" onClick={fetchLogs}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          <button className="btn btn-outline-secondary" onClick={resetFilters}>
            <i className="bi bi-x-circle me-1"></i>
            Reset
          </button>

          <button className="btn btn-success" onClick={exportCsv}>
            <i className="bi bi-download me-1"></i>
            Export CSV
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Jumlah Log</p>
              <h3 className="fw-bold mb-0">{logs.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Hari Ini</p>
              <h3 className="fw-bold text-success mb-0">
                {
                  logs.filter(
                    (log) =>
                      log.created_at?.slice(0, 10) ===
                      new Date().toISOString().slice(0, 10)
                  ).length
                }
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Filtered</p>
              <h3 className="fw-bold text-primary mb-0">
                {filteredLogs.length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3 align-items-center">
            <div className="col-lg-5">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  className="form-control ps-5 rounded-3"
                  placeholder="Cari pengguna, role, tindakan, modul..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-3">
              <select
                className="form-select rounded-3"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option>Semua Tindakan</option>
                <option>APPROVE</option>
                <option>REJECT</option>
                <option>CREATE</option>
                <option>UPDATE</option>
                <option>DELETE</option>
                <option>ACTIVATE</option>
                <option>SUSPEND</option>
                <option>MORE INFO</option>
              </select>
            </div>

            <div className="col-lg-4">
              <select
                className="form-select rounded-3"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                {modules.map((module) => (
                  <option key={module}>{module}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success"></div>
              <p className="text-muted mt-3 mb-0">Memuatkan log audit...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              Tiada rekod audit.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const style = getActionStyle(log.action);

              return (
                <div
                  key={log.id}
                  className="px-4 py-3 d-flex align-items-start gap-3 border-bottom"
                >
                  <div
                    className={`rounded-3 d-flex align-items-center justify-content-center ${style.box}`}
                    style={{
                      width: 42,
                      height: 42,
                      flexShrink: 0,
                    }}
                  >
                    <i className={`bi ${style.icon}`}></i>
                  </div>

                  <div className="flex-grow-1">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <span className="fw-semibold small">
                        {log.actor_name || "-"}
                      </span>

                      <span className={`badge rounded-pill ${style.badge}`}>
                        {style.label}
                      </span>

                      <span className="badge rounded-pill bg-light text-muted border">
                        {log.module || "-"}
                      </span>

                      <span className="text-muted small">
                        {log.actor_role || "-"}
                      </span>
                    </div>

                    <div className="text-muted small mt-1">
                      {log.description || log.action || "-"}
                    </div>
                  </div>

                  <div className="text-muted small text-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredLogs.length} daripada {logs.length} rekod
        </div>
      </div>
    </DashboardLayout>
  );
}