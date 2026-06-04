import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type AuditLog = {
  id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  module: string;
  description: string;
  created_at: string;
};

function getActionStyle(action: string) {
  const upper = action.toUpperCase();

  if (upper.includes("LOGIN")) {
    return {
      icon: "bi-box-arrow-in-right",
      badge: "bg-info-subtle text-info",
      box: "bg-info-subtle text-info",
      label: "LOGIN",
    };
  }

  if (upper.includes("LOGOUT")) {
    return {
      icon: "bi-box-arrow-right",
      badge: "bg-secondary-subtle text-secondary",
      box: "bg-secondary-subtle text-secondary",
      label: "LOGOUT",
    };
  }

  if (upper.includes("TAMBAH") || upper.includes("CREATE")) {
    return {
      icon: "bi-plus-lg",
      badge: "bg-success-subtle text-success",
      box: "bg-success-subtle text-success",
      label: "CREATE",
    };
  }

  if (upper.includes("KEMASKINI") || upper.includes("UPDATE") || upper.includes("EDIT")) {
    return {
      icon: "bi-pencil-square",
      badge: "bg-primary-subtle text-primary",
      box: "bg-primary-subtle text-primary",
      label: "UPDATE",
    };
  }

  if (upper.includes("PADAM") || upper.includes("DELETE")) {
    return {
      icon: "bi-trash",
      badge: "bg-danger-subtle text-danger",
      box: "bg-danger-subtle text-danger",
      label: "DELETE",
    };
  }

  if (upper.includes("APPROVE") || upper.includes("LULUS")) {
    return {
      icon: "bi-check-circle",
      badge: "bg-success-subtle text-success",
      box: "bg-success-subtle text-success",
      label: "APPROVE",
    };
  }

  if (upper.includes("REJECT") || upper.includes("TOLAK")) {
    return {
      icon: "bi-x-circle",
      badge: "bg-danger-subtle text-danger",
      box: "bg-danger-subtle text-danger",
      label: "REJECT",
    };
  }

  return {
    icon: "bi-clock-history",
    badge: "bg-light text-muted",
    box: "bg-light text-muted",
    label: "INFO",
  };
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Semua Jenis");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });
      
    console.log("AUDIT ERROR:", error);
    console.log("AUDIT DATA:", data);

    if (error) {
      alert(error.message);
      return;
    }
    console.log("AUDIT DATA:", data);
    setLogs(data || []);
  }

  const filteredLogs = logs.filter((log) => {
    const style = getActionStyle(log.action || "");

    const matchSearch =
      (log.actor_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.module || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.description || "").toLowerCase().includes(search.toLowerCase());

    const matchType =
      typeFilter === "Semua Jenis" || style.label === typeFilter;

    const logDate = log.created_at?.slice(0, 10);
    const matchDate = !dateFilter || logDate === dateFilter;

    return matchSearch && matchType && matchDate;
  });

  function exportCsv() {
    const rows = [
      ["Tarikh", "Pengguna", "Role", "Jenis", "Tindakan", "Modul"],
      ...filteredLogs.map((log) => {
        const style = getActionStyle(log.action || "");

        return [
          new Date(log.created_at).toLocaleString(),
          log.actor_name || "-",
          log.actor_role || "-",
          style.label,
          log.action || "-",
          log.module || "-",
        ];
      }),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "audit-log.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout role="district">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Log Audit</h2>
        <p className="text-muted mb-0">
          Rekod lengkap aktiviti sistem dalam daerah.
        </p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body border-bottom">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  className="form-control"
                  placeholder="Cari aktiviti, modul atau pengguna..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-2">
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option>Semua Jenis</option>
                <option>LOGIN</option>
                <option>LOGOUT</option>
                <option>CREATE</option>
                <option>UPDATE</option>
                <option>DELETE</option>
                <option>APPROVE</option>
                <option>REJECT</option>
                <option>INFO</option>
              </select>
            </div>

            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            <div className="col-md-3 text-md-end">
              <button
                className="btn btn-outline-success w-100"
                onClick={exportCsv}
              >
                <i className="bi bi-download me-1"></i>
                Eksport
              </button>
            </div>
          </div>
        </div>

        <div>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-journal-text fs-1 d-block mb-2"></i>
              Tiada rekod audit.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const style = getActionStyle(log.action || "");

              return (
                <div
                  key={log.id}
                  className="px-4 py-3 d-flex align-items-start gap-3 border-bottom audit-row"
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

                      <span className={`badge ${style.badge}`}>
                        {style.label}
                      </span>

                      <span className="badge bg-light text-muted">
                        {log.module || "-"}
                      </span>
                    </div>

                    <div className="text-muted small mt-1">
                      {log.description || log.action}
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
      </div>
    </DashboardLayout>
  );
}