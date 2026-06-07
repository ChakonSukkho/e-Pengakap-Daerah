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
  user_id?: string | null;
  district_environment_id?: string | null;
  record_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
};

type CurrentUser = {
  id?: string;
  full_name?: string;
  email?: string;
  role?: string;
  district?: string;
  district_environment_id?: string;
};

type ActionStyle = {
  icon: string;
  badge: string;
  dot: string;
  label: string;
  color: string;
};

const ROWS_PER_PAGE = 15;

const ACTION_TYPES = [
  "LOGIN",
  "LOGOUT",
  "CREATE",
  "UPDATE",
  "DELETE",
  "CANCEL",
  "APPROVE",
  "REJECT",
  "INFO",
];

const STAT_CARDS = [
  {
    label: "CREATE",
    icon: "bi-plus-circle-fill",
    color: "#198754",
    bg: "#d1e7dd",
  },
  {
    label: "UPDATE",
    icon: "bi-pencil-fill",
    color: "#0d6efd",
    bg: "#cfe2ff",
  },
  {
    label: "DELETE",
    icon: "bi-trash-fill",
    color: "#dc3545",
    bg: "#f8d7da",
  },
  {
    label: "LOGIN",
    icon: "bi-box-arrow-in-right",
    color: "#0dcaf0",
    bg: "#cff4fc",
  },
];

function getCurrentUser(): CurrentUser {
  try {
    return JSON.parse(
      localStorage.getItem("user") ||
        localStorage.getItem("auth_user") ||
        "{}"
    );
  } catch {
    return {};
  }
}

function getActionStyle(action: string): ActionStyle {
  const upper = String(action || "").toUpperCase();

  if (upper.includes("LOGIN")) {
    return {
      icon: "bi-box-arrow-in-right",
      badge: "bg-info-subtle text-info border border-info-subtle",
      dot: "#0dcaf0",
      label: "LOGIN",
      color: "#0dcaf0",
    };
  }

  if (upper.includes("LOGOUT")) {
    return {
      icon: "bi-box-arrow-right",
      badge: "bg-secondary-subtle text-secondary border border-secondary-subtle",
      dot: "#6c757d",
      label: "LOGOUT",
      color: "#6c757d",
    };
  }

  if (upper.includes("TAMBAH") || upper.includes("CREATE")) {
    return {
      icon: "bi-plus-circle-fill",
      badge: "bg-success-subtle text-success border border-success-subtle",
      dot: "#198754",
      label: "CREATE",
      color: "#198754",
    };
  }

  if (
    upper.includes("KEMASKINI") ||
    upper.includes("UPDATE") ||
    upper.includes("EDIT")
  ) {
    return {
      icon: "bi-pencil-fill",
      badge: "bg-primary-subtle text-primary border border-primary-subtle",
      dot: "#0d6efd",
      label: "UPDATE",
      color: "#0d6efd",
    };
  }

  if (
    upper.includes("PADAM") ||
    upper.includes("DELETE") ||
    upper.includes("DEACTIVATE") ||
    upper.includes("NYAHAKTIF")
  ) {
    return {
      icon: "bi-trash-fill",
      badge: "bg-danger-subtle text-danger border border-danger-subtle",
      dot: "#dc3545",
      label: "DELETE",
      color: "#dc3545",
    };
  }

  if (upper.includes("CANCEL") || upper.includes("BATAL")) {
    return {
      icon: "bi-x-circle-fill",
      badge: "bg-warning-subtle text-warning border border-warning-subtle",
      dot: "#ffc107",
      label: "CANCEL",
      color: "#ffc107",
    };
  }

  if (upper.includes("APPROVE") || upper.includes("LULUS")) {
    return {
      icon: "bi-check-circle-fill",
      badge: "bg-success-subtle text-success border border-success-subtle",
      dot: "#198754",
      label: "APPROVE",
      color: "#198754",
    };
  }

  if (upper.includes("REJECT") || upper.includes("TOLAK")) {
    return {
      icon: "bi-x-circle-fill",
      badge: "bg-danger-subtle text-danger border border-danger-subtle",
      dot: "#dc3545",
      label: "REJECT",
      color: "#dc3545",
    };
  }

  return {
    icon: "bi-info-circle-fill",
    badge: "bg-light text-muted border",
    dot: "#adb5bd",
    label: "INFO",
    color: "#adb5bd",
  };
}

function formatDateTime(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeOnly(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleTimeString("ms-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function getModuleName(log: AuditLog) {
  return log.module || "-";
}

function isToday(dateStr: string) {
  const today = new Date();
  const date = new Date(dateStr);

  return date.toDateString() === today.toDateString();
}

function isYesterday(dateStr: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const date = new Date(dateStr);

  return date.toDateString() === yesterday.toDateString();
}

function getGroupLabel(dateStr: string) {
  if (isToday(dateStr)) return "Hari Ini";
  if (isYesterday(dateStr)) return "Semalam";

  return formatDateOnly(dateStr);
}

function getInitials(name: string) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function AuditLogPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Semua Jenis");
  const [moduleFilter, setModuleFilter] = useState("Semua Modul");
  const [timeMode, setTimeMode] = useState("6 Jam Terkini");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");

  useEffect(() => {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    const start = toDateTimeLocalValue(sixHoursAgo);
    const end = toDateTimeLocalValue(now);

    setStartDateTime(start);
    setEndDateTime(end);

    fetchLogs("6 Jam Terkini", start, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLogs(
    selectedMode = timeMode,
    customStart = startDateTime,
    customEnd = endDateTime
  ) {
    if (!districtEnvironmentId) {
      setLogs([]);
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      return;
    }

    setLoading(true);

    let query = supabase
      .from("audit_logs")
      .select(
        "id, actor_name, actor_role, action, module, description, user_id, district_environment_id, record_id, ip_address, user_agent, created_at"
      )
      .eq("district_environment_id", districtEnvironmentId)
      .order("created_at", { ascending: false });

    if (selectedMode === "6 Jam Terkini") {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      query = query.gte("created_at", sixHoursAgo.toISOString());
    }

    if (selectedMode === "Custom Tarikh/Masa") {
      if (customStart) {
        query = query.gte("created_at", new Date(customStart).toISOString());
      }

      if (customEnd) {
        query = query.lte("created_at", new Date(customEnd).toISOString());
      }
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLogs((data || []) as AuditLog[]);
    setCurrentPage(1);
    setLoading(false);
  }

  function resetToLast6Hours() {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    const start = toDateTimeLocalValue(sixHoursAgo);
    const end = toDateTimeLocalValue(now);

    setTimeMode("6 Jam Terkini");
    setStartDateTime(start);
    setEndDateTime(end);
    setSearch("");
    setTypeFilter("Semua Jenis");
    setModuleFilter("Semua Modul");

    fetchLogs("6 Jam Terkini", start, end);
  }

  function clearFilters() {
    setSearch("");
    setTypeFilter("Semua Jenis");
    setModuleFilter("Semua Modul");
    setCurrentPage(1);
  }

  function exportCsv() {
    const rows = [
      [
        "Tarikh",
        "Pengguna",
        "Role",
        "Jenis",
        "Action",
        "Module",
        "Description",
        "Record ID",
        "District Environment ID",
      ],
      ...filteredLogs.map((log) => {
        const style = getActionStyle(log.action || "");

        return [
          formatDateTime(log.created_at),
          log.actor_name || "-",
          log.actor_role || "-",
          style.label,
          log.action || "-",
          getModuleName(log),
          log.description || "-",
          log.record_id || "-",
          log.district_environment_id || "-",
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
    link.download = `audit-log-${currentUser.district || "district"}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  const modules = useMemo(() => {
    const uniqueModules = Array.from(
      new Set(logs.map((log) => getModuleName(log)).filter((m) => m !== "-"))
    );

    return uniqueModules.sort();
  }, [logs]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};

    logs.forEach((log) => {
      const label = getActionStyle(log.action || "").label;
      counts[label] = (counts[label] || 0) + 1;
    });

    return counts;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const style = getActionStyle(log.action || "");
      const moduleName = getModuleName(log);
      const keyword = search.trim().toLowerCase();

      const matchSearch =
        !keyword ||
        (log.actor_name || "").toLowerCase().includes(keyword) ||
        (log.actor_role || "").toLowerCase().includes(keyword) ||
        (log.action || "").toLowerCase().includes(keyword) ||
        moduleName.toLowerCase().includes(keyword) ||
        (log.description || "").toLowerCase().includes(keyword) ||
        (log.record_id || "").toLowerCase().includes(keyword);

      const matchType =
        typeFilter === "Semua Jenis" || style.label === typeFilter;

      const matchModule =
        moduleFilter === "Semua Modul" || moduleName === moduleFilter;

      return matchSearch && matchType && matchModule;
    });
  }, [logs, search, typeFilter, moduleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ROWS_PER_PAGE));

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const groupedLogs = useMemo(() => {
    const groups: { label: string; logs: AuditLog[] }[] = [];
    const seen: Record<string, number> = {};

    paginatedLogs.forEach((log) => {
      const dateKey = new Date(log.created_at).toDateString();
      const label = getGroupLabel(log.created_at);

      if (seen[dateKey] === undefined) {
        seen[dateKey] = groups.length;
        groups.push({ label, logs: [] });
      }

      groups[seen[dateKey]].logs.push(log);
    });

    return groups;
  }, [paginatedLogs]);

  const activeFilterCount = [
    typeFilter !== "Semua Jenis",
    moduleFilter !== "Semua Modul",
    search.trim().length > 0,
  ].filter(Boolean).length;

  return (
    <DashboardLayout role="district">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Log Audit</h2>
          <p className="text-muted mb-0 small">
            Rekod tindakan penting untuk daerah{" "}
            <span className="fw-semibold">{currentUser.district || "-"}</span>.{" "}
            <span className="text-success fw-semibold">
              {timeMode === "6 Jam Terkini"
                ? "Memaparkan 6 jam terkini."
                : "Paparan custom."}
            </span>
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <div className="btn-group" role="group">
            <button
              className={`btn btn-sm ${
                viewMode === "timeline"
                  ? "btn-success"
                  : "btn-outline-secondary"
              }`}
              onClick={() => setViewMode("timeline")}
            >
              <i className="bi bi-list-ul me-1"></i>
              Timeline
            </button>

            <button
              className={`btn btn-sm ${
                viewMode === "table" ? "btn-success" : "btn-outline-secondary"
              }`}
              onClick={() => setViewMode("table")}
            >
              <i className="bi bi-table me-1"></i>
              Jadual
            </button>
          </div>

          <button
            className="btn btn-sm btn-outline-success"
            onClick={exportCsv}
            disabled={filteredLogs.length === 0}
          >
            <i className="bi bi-download me-1"></i>
            Eksport CSV
          </button>
        </div>
      </div>

      {!districtEnvironmentId && (
        <div className="alert alert-warning rounded-4 border-0 shadow-sm">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Akaun ini belum dihubungkan dengan district environment. Log audit
          tidak boleh dipaparkan.
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 42, height: 42, background: "#d1fae5" }}
                  >
                    <i className="bi bi-journal-text text-success fs-5"></i>
                  </div>

                  <div>
                    <div className="fw-bold fs-5 lh-1">{logs.length}</div>
                    <small className="text-muted">Jumlah Log</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {STAT_CARDS.map((s) => (
            <div className="col-6 col-md-3" key={s.label}>
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 42,
                        height: 42,
                        background: s.bg,
                      }}
                    >
                      <i
                        className={`bi ${s.icon} fs-5`}
                        style={{ color: s.color }}
                      ></i>
                    </div>

                    <div>
                      <div className="fw-bold fs-5 lh-1">
                        {stats[s.label] || 0}
                      </div>
                      <small className="text-muted">{s.label}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">
                Paparan Masa
              </label>

              <select
                className="form-select form-select-sm"
                value={timeMode}
                onChange={(e) => {
                  setTimeMode(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option>6 Jam Terkini</option>
                <option>Custom Tarikh/Masa</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">Dari</label>

              <input
                type="datetime-local"
                className="form-control form-control-sm"
                value={startDateTime}
                disabled={timeMode !== "Custom Tarikh/Masa"}
                onChange={(e) => setStartDateTime(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">
                Hingga
              </label>

              <input
                type="datetime-local"
                className="form-control form-control-sm"
                value={endDateTime}
                disabled={timeMode !== "Custom Tarikh/Masa"}
                onChange={(e) => setEndDateTime(e.target.value)}
              />
            </div>

            <div className="col-md-3 d-flex gap-2">
              <button
                className="btn btn-success btn-sm flex-fill"
                onClick={() => fetchLogs()}
                disabled={loading || !districtEnvironmentId}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1"></span>
                    Memuatkan...
                  </>
                ) : (
                  <>
                    <i className="bi bi-funnel me-1"></i>
                    Tapis
                  </>
                )}
              </button>

              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={resetToLast6Hours}
                disabled={loading || !districtEnvironmentId}
              >
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body border-bottom p-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>

                <input
                  className="form-control border-start-0 ps-0"
                  placeholder="Cari pengguna, modul, tindakan atau rekod..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />

                {search && (
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setSearch("")}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option>Semua Jenis</option>

                {ACTION_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option>Semua Modul</option>

                {modules.map((moduleName) => (
                  <option key={moduleName}>{moduleName}</option>
                ))}
              </select>
            </div>

            <div className="col-md-1 text-end">
              {activeFilterCount > 0 && (
                <span
                  className="badge bg-success rounded-pill"
                  title={`${activeFilterCount} penapis aktif`}
                  style={{ cursor: "pointer" }}
                  onClick={clearFilters}
                >
                  {activeFilterCount} ×
                </span>
              )}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="d-flex gap-2 flex-wrap mt-2">
              {search && (
                <span className="badge bg-light text-dark border small d-flex align-items-center gap-1">
                  <i className="bi bi-search" style={{ fontSize: 10 }}></i>
                  "{search}"
                  <button
                    className="btn-close btn-close-sm ms-1"
                    style={{ fontSize: 8 }}
                    onClick={() => setSearch("")}
                  ></button>
                </span>
              )}

              {typeFilter !== "Semua Jenis" && (
                <span className="badge bg-light text-dark border small d-flex align-items-center gap-1">
                  <i className="bi bi-tag" style={{ fontSize: 10 }}></i>
                  {typeFilter}
                  <button
                    className="btn-close btn-close-sm ms-1"
                    style={{ fontSize: 8 }}
                    onClick={() => setTypeFilter("Semua Jenis")}
                  ></button>
                </span>
              )}

              {moduleFilter !== "Semua Modul" && (
                <span className="badge bg-light text-dark border small d-flex align-items-center gap-1">
                  <i className="bi bi-grid" style={{ fontSize: 10 }}></i>
                  {moduleFilter}
                  <button
                    className="btn-close btn-close-sm ms-1"
                    style={{ fontSize: 8 }}
                    onClick={() => setModuleFilter("Semua Modul")}
                  ></button>
                </span>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-success mb-3"></div>
            <p className="text-muted mb-0">Memuatkan audit log...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-journal-x fs-1 d-block mb-3 opacity-50"></i>
            <p className="fw-semibold mb-1">Tiada log dijumpai</p>
            <p className="small mb-3">
              Cuba ubah penapis atau julat masa yang dipilih.
            </p>

            <button
              className="btn btn-sm btn-outline-success"
              onClick={resetToLast6Hours}
              disabled={!districtEnvironmentId}
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i>
              Reset semua penapis
            </button>
          </div>
        ) : viewMode === "timeline" ? (
          <div className="p-3 p-md-4">
            {groupedLogs.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <span
                    className="badge rounded-pill px-3 py-2 fw-semibold"
                    style={{
                      background: "#e8f5e9",
                      color: "#1b5e20",
                      fontSize: 12,
                    }}
                  >
                    <i className="bi bi-calendar3 me-1"></i>
                    {group.label}
                  </span>

                  <div className="flex-grow-1 border-bottom"></div>

                  <span className="small text-muted">
                    {group.logs.length} rekod
                  </span>
                </div>

                <div className="position-relative">
                  <div
                    className="position-absolute"
                    style={{
                      left: 20,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background:
                        "linear-gradient(to bottom, #dee2e6, transparent)",
                    }}
                  ></div>

                  <div
                    className="d-flex flex-column gap-2"
                    style={{ paddingLeft: 52 }}
                  >
                    {group.logs.map((log) => {
                      const style = getActionStyle(log.action || "");

                      return (
                        <div
                          key={log.id}
                          className="card border-0 shadow-sm rounded-3 position-relative"
                          style={{
                            cursor: "pointer",
                            transition: "box-shadow 0.15s",
                          }}
                          onClick={() => setSelectedLog(log)}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(0,0,0,.1)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.boxShadow = "")
                          }
                        >
                          <div
                            className="position-absolute rounded-circle border border-2 border-white d-flex align-items-center justify-content-center"
                            style={{
                              left: -38,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 32,
                              height: 32,
                              background: style.dot,
                              zIndex: 1,
                              boxShadow: `0 0 0 3px ${style.dot}33`,
                            }}
                          >
                            <i
                              className={`bi ${style.icon} text-white`}
                              style={{ fontSize: 13 }}
                            ></i>
                          </div>

                          <div className="card-body p-3">
                            <div className="d-flex align-items-start justify-content-between gap-2">
                              <div className="flex-grow-1 min-width-0">
                                <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                  <span
                                    className={`badge rounded-pill small ${style.badge}`}
                                    style={{ fontSize: 10 }}
                                  >
                                    {style.label}
                                  </span>

                                  {getModuleName(log) !== "-" && (
                                    <span
                                      className="badge bg-light text-muted border small"
                                      style={{ fontSize: 10 }}
                                    >
                                      <i
                                        className="bi bi-grid me-1"
                                        style={{ fontSize: 9 }}
                                      ></i>
                                      {getModuleName(log)}
                                    </span>
                                  )}
                                </div>

                                <p
                                  className="mb-1 fw-semibold small text-dark text-truncate"
                                  style={{ maxWidth: "100%" }}
                                >
                                  {log.description || log.action || "-"}
                                </p>

                                <div
                                  className="d-flex align-items-center gap-2 text-muted"
                                  style={{ fontSize: 12 }}
                                >
                                  <i className="bi bi-person-circle"></i>
                                  <span>{log.actor_name || "-"}</span>

                                  {log.actor_role && (
                                    <>
                                      <span>·</span>
                                      <span>{log.actor_role}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="text-end flex-shrink-0">
                                <div className="small fw-semibold text-muted">
                                  {formatTimeOnly(log.created_at)}
                                </div>
                                <i className="bi bi-chevron-right text-muted small"></i>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3">Tarikh / Masa</th>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-end"></th>
                </tr>
              </thead>

              <tbody>
                {paginatedLogs.map((log) => {
                  const style = getActionStyle(log.action || "");

                  return (
                    <tr
                      key={log.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-4 py-3">
                        <div className="fw-semibold small">
                          {formatDateTime(log.created_at)}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white fw-bold"
                            style={{
                              width: 32,
                              height: 32,
                              fontSize: 11,
                              background: style.dot,
                            }}
                          >
                            {getInitials(log.actor_name || "?")}
                          </div>

                          <span className="fw-semibold small">
                            {log.actor_name || "-"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-muted small">
                        {log.actor_role || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`badge rounded-pill ${style.badge}`}
                          style={{ fontSize: 11 }}
                        >
                          <i className={`bi ${style.icon} me-1`}></i>
                          {style.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 small">{getModuleName(log)}</td>

                      <td
                        className="px-4 py-3 text-muted small"
                        style={{ maxWidth: 260 }}
                      >
                        <span
                          className="d-inline-block text-truncate"
                          style={{ maxWidth: 240 }}
                        >
                          {log.description || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-end">
                        <i className="bi bi-chevron-right text-muted"></i>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredLogs.length > 0 && (
          <div className="card-footer bg-white border-top py-3 px-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            <div className="small text-muted">
              Papar{" "}
              <strong>
                {(currentPage - 1) * ROWS_PER_PAGE + 1}–
                {Math.min(currentPage * ROWS_PER_PAGE, filteredLogs.length)}
              </strong>{" "}
              daripada <strong>{filteredLogs.length}</strong> log
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                className="btn btn-sm btn-outline-secondary px-2"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                <i className="bi bi-chevron-double-left"></i>
              </button>

              <button
                className="btn btn-sm btn-outline-secondary px-2"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <i className="bi bi-chevron-left"></i>
              </button>

              <span
                className="btn btn-sm btn-success px-3"
                style={{ pointerEvents: "none" }}
              >
                {currentPage} / {totalPages}
              </span>

              <button
                className="btn btn-sm btn-outline-secondary px-2"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                <i className="bi bi-chevron-right"></i>
              </button>

              <button
                className="btn btn-sm btn-outline-secondary px-2"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                <i className="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedLog &&
        (() => {
          const style = getActionStyle(selectedLog.action || "");

          return (
            <div
              className="modal d-block"
              style={{ background: "rgba(0,0,0,.5)" }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedLog(null);
              }}
            >
              <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 rounded-4 overflow-hidden">
                  <div
                    className="px-4 pt-4 pb-3"
                    style={{
                      background: `${style.dot}18`,
                      borderBottom: `3px solid ${style.dot}`,
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: 48,
                          height: 48,
                          background: style.dot,
                        }}
                      >
                        <i className={`bi ${style.icon} text-white fs-4`}></i>
                      </div>

                      <div>
                        <h5 className="fw-bold mb-0">Detail Audit Log</h5>
                        <small className="text-muted">
                          {formatDateTime(selectedLog.created_at)}
                        </small>
                      </div>

                      <button
                        className="btn-close ms-auto"
                        onClick={() => setSelectedLog(null)}
                      ></button>
                    </div>
                  </div>

                  <div className="modal-body p-0">
                    <div className="list-group list-group-flush">
                      <div className="list-group-item px-4 py-3">
                        <div className="row">
                          <div className="col-md-4 text-muted small">
                            Pengguna
                          </div>
                          <div className="col-md-8 fw-semibold small">
                            {selectedLog.actor_name || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="list-group-item px-4 py-3">
                        <div className="row">
                          <div className="col-md-4 text-muted small">Role</div>
                          <div className="col-md-8 small">
                            {selectedLog.actor_role || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="list-group-item px-4 py-3">
                        <div className="row align-items-center">
                          <div className="col-md-4 text-muted small">
                            Jenis Tindakan
                          </div>
                          <div className="col-md-8">
                            <span className={`badge rounded-pill ${style.badge}`}>
                              <i className={`bi ${style.icon} me-1`}></i>
                              {style.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="list-group-item px-4 py-3">
                        <div className="row">
                          <div className="col-md-4 text-muted small">
                            Action
                          </div>
                          <div className="col-md-8 small font-monospace">
                            {selectedLog.action || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="list-group-item px-4 py-3">
                        <div className="row">
                          <div className="col-md-4 text-muted small">
                            Module
                          </div>
                          <div className="col-md-8 small">
                            {getModuleName(selectedLog)}
                          </div>
                        </div>
                      </div>

                      <div className="list-group-item px-4 py-3">
                        <div className="small text-muted mb-2">Keterangan</div>
                        <p className="mb-0 small">
                          {selectedLog.description || "-"}
                        </p>
                      </div>

                      <div className="list-group-item px-4 py-3">
                        <div className="row">
                          <div className="col-md-4 text-muted small">
                            Record ID
                          </div>
                          <div className="col-md-8 small font-monospace">
                            {selectedLog.record_id || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="list-group-item px-4 py-3">
                        <div className="row">
                          <div className="col-md-4 text-muted small">
                            District Environment ID
                          </div>
                          <div className="col-md-8 small font-monospace">
                            {selectedLog.district_environment_id || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="list-group-item px-4 py-3">
                        <div className="row">
                          <div className="col-md-4 text-muted small">
                            Tarikh / Masa
                          </div>
                          <div className="col-md-8 small fw-semibold">
                            {formatDateTime(selectedLog.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer border-0 px-4 pb-4 pt-2">
                    <button
                      className="btn btn-outline-secondary w-100 rounded-3"
                      onClick={() => setSelectedLog(null)}
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </DashboardLayout>
  );
}