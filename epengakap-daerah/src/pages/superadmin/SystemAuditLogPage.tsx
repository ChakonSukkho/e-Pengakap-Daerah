import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type AuditLog = {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string | null;
  module: string | null;
  module_name?: string | null;
  description: string | null;
  created_at: string;
  user_id?: string | null;
  district_environment_id?: string | null;
  record_id?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
};

type DistrictEnvironmentRaw = {
  id: string;
  state_id: string;
  district_id: string;
  district_commissioner_user_id: string;
  official_name: string | null;
  status: string;
  deleted_at: string | null;
};

type DistrictOption = {
  id: string;
  label: string;
  state_name: string;
  district_name: string;
};

type ActionStyle = {
  icon: string;
  badge: string;
  dot: string;
  label: string;
  color: string;
};

const ROWS_PER_PAGE = 15;

function getActionStyle(actionValue?: string | null): ActionStyle {
  const action = String(actionValue || "").toUpperCase();

  if (action.includes("LOGIN")) {
    return {
      icon: "bi-box-arrow-in-right",
      badge: "bg-info-subtle text-info border border-info-subtle",
      dot: "#0dcaf0",
      label: "LOGIN",
      color: "#0dcaf0",
    };
  }

  if (action.includes("LOGOUT")) {
    return {
      icon: "bi-box-arrow-right",
      badge: "bg-secondary-subtle text-secondary border border-secondary-subtle",
      dot: "#6c757d",
      label: "LOGOUT",
      color: "#6c757d",
    };
  }

  if (action.includes("CREATE") || action.includes("TAMBAH")) {
    return {
      icon: "bi-plus-circle-fill",
      badge: "bg-success-subtle text-success border border-success-subtle",
      dot: "#198754",
      label: "CREATE",
      color: "#198754",
    };
  }

  if (
    action.includes("UPDATE") ||
    action.includes("EDIT") ||
    action.includes("KEMASKINI")
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
    action.includes("DELETE") ||
    action.includes("SOFT_DELETE") ||
    action.includes("PADAM")
  ) {
    return {
      icon: "bi-trash-fill",
      badge: "bg-danger-subtle text-danger border border-danger-subtle",
      dot: "#dc3545",
      label: "DELETE",
      color: "#dc3545",
    };
  }

  if (
    action.includes("DEACTIVATE") ||
    action.includes("NYAHAKTIF") ||
    action.includes("SUSPEND") ||
    action.includes("GANTUNG")
  ) {
    return {
      icon: "bi-pause-circle-fill",
      badge: "bg-warning-subtle text-warning border border-warning-subtle",
      dot: "#ffc107",
      label: "DEACTIVATE",
      color: "#ffc107",
    };
  }

  if (action.includes("ACTIVATE") || action.includes("AKTIF")) {
    return {
      icon: "bi-power",
      badge: "bg-info-subtle text-info border border-info-subtle",
      dot: "#0dcaf0",
      label: "ACTIVATE",
      color: "#0dcaf0",
    };
  }

  if (action.includes("APPROVE") || action.includes("LULUS")) {
    return {
      icon: "bi-check-circle-fill",
      badge: "bg-success-subtle text-success border border-success-subtle",
      dot: "#198754",
      label: "APPROVE",
      color: "#198754",
    };
  }

  if (action.includes("REJECT") || action.includes("TOLAK")) {
    return {
      icon: "bi-x-circle-fill",
      badge: "bg-danger-subtle text-danger border border-danger-subtle",
      dot: "#dc3545",
      label: "REJECT",
      color: "#dc3545",
    };
  }

  if (action.includes("MORE_INFO")) {
    return {
      icon: "bi-info-circle-fill",
      badge: "bg-info-subtle text-info border border-info-subtle",
      dot: "#0dcaf0",
      label: "MORE INFO",
      color: "#0dcaf0",
    };
  }

  if (action.includes("CHANGE_COMMISSIONER")) {
    return {
      icon: "bi-person-gear",
      badge: "bg-primary-subtle text-primary border border-primary-subtle",
      dot: "#0d6efd",
      label: "CHANGE",
      color: "#0d6efd",
    };
  }

  return {
    icon: "bi-info-circle-fill",
    badge: "bg-light text-muted border",
    dot: "#adb5bd",
    label: actionValue || "INFO",
    color: "#adb5bd",
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("ms-MY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeOnly(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("ms-MY", {
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
  return log.module || log.module_name || "-";
}

function isToday(dateStr?: string | null) {
  if (!dateStr) return false;
  const today = new Date();
  const date = new Date(dateStr);
  return date.toDateString() === today.toDateString();
}

function isYesterday(dateStr?: string | null) {
  if (!dateStr) return false;
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

function safeJsonPreview(value?: string | null) {
  if (!value) return "-";

  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

export default function SystemAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Semua Jenis");
  const [moduleFilter, setModuleFilter] = useState("Semua Modul");
  const [districtFilter, setDistrictFilter] = useState("Semua Daerah");

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

    loadDistricts();
    fetchLogs("6 Jam Terkini", start, end);
  }, []);

  async function loadDistricts() {
    try {
      const [envResult, statesResult, districtsResult] = await Promise.all([
        supabase
          .from("district_environments")
          .select("*")
          .is("deleted_at", null),

        supabase.from("states").select("*"),

        supabase
          .from("districts")
          .select("id, state_id, district_name, district_code, status"),
      ]);

      if (envResult.error) throw envResult.error;
      if (statesResult.error) throw statesResult.error;
      if (districtsResult.error) throw districtsResult.error;

      const stateMap = new Map<string, string>();
      const districtMap = new Map<string, string>();

      (statesResult.data || []).forEach((state: any) => {
        stateMap.set(
          state.id,
          state.state_name || state.name || state.state || "-"
        );
      });

      (districtsResult.data || []).forEach((district: any) => {
        districtMap.set(district.id, district.district_name || "-");
      });

      const options: DistrictOption[] = (envResult.data || []).map(
        (environment: DistrictEnvironmentRaw) => {
          const stateName = stateMap.get(environment.state_id) || "-";
          const districtName = districtMap.get(environment.district_id) || "-";

          return {
            id: environment.id,
            state_name: stateName,
            district_name: districtName,
            label: `${stateName} - ${districtName}`,
          };
        }
      );

      setDistricts(options);
    } catch (error) {
      console.warn("Failed to load district environment filters:", error);
      setDistricts([]);
    }
  }

  async function fetchLogs(
    selectedMode = timeMode,
    customStart = startDateTime,
    customEnd = endDateTime
  ) {
    setLoading(true);

    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
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

      if (error) throw error;

      setLogs(data || []);
      setCurrentPage(1);
    } catch (error: any) {
      alert(error?.message || "Gagal mendapatkan audit log.");
    } finally {
      setLoading(false);
    }
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
    setDistrictFilter("Semua Daerah");
    setCurrentPage(1);

    fetchLogs("6 Jam Terkini", start, end);
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
      const label = getActionStyle(log.action).label;
      counts[label] = (counts[label] || 0) + 1;
    });

    return counts;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const style = getActionStyle(log.action);
      const moduleName = getModuleName(log);
      const keyword = search.toLowerCase().trim();

      const district = districts.find(
        (item) => item.id === log.district_environment_id
      );

      const districtLabel = district?.label || "-";

      const matchSearch =
        !keyword ||
        (log.actor_name || "").toLowerCase().includes(keyword) ||
        (log.actor_role || "").toLowerCase().includes(keyword) ||
        (log.action || "").toLowerCase().includes(keyword) ||
        moduleName.toLowerCase().includes(keyword) ||
        (log.description || "").toLowerCase().includes(keyword) ||
        districtLabel.toLowerCase().includes(keyword);

      const matchType =
        typeFilter === "Semua Jenis" || style.label === typeFilter;

      const matchModule =
        moduleFilter === "Semua Modul" || moduleName === moduleFilter;

      const matchDistrict =
        districtFilter === "Semua Daerah" ||
        log.district_environment_id === districtFilter;

      return matchSearch && matchType && matchModule && matchDistrict;
    });
  }, [logs, search, typeFilter, moduleFilter, districtFilter, districts]);

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
    districtFilter !== "Semua Daerah",
    search.length > 0,
  ].filter(Boolean).length;

  function exportCsv() {
    const rows = [
      [
        "Tarikh",
        "Pengguna",
        "Role",
        "Jenis",
        "Action",
        "Module",
        "District",
        "Description",
      ],
      ...filteredLogs.map((log) => {
        const style = getActionStyle(log.action);
        const district = districts.find(
          (item) => item.id === log.district_environment_id
        );

        return [
          formatDateTime(log.created_at),
          log.actor_name || "-",
          log.actor_role || "-",
          style.label,
          log.action || "-",
          getModuleName(log),
          district?.label || "-",
          log.description || "-",
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
    link.download = "superadmin-audit-log.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

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
      label: "APPROVE",
      icon: "bi-check-circle-fill",
      color: "#198754",
      bg: "#d1e7dd",
    },
  ];

  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Log Audit Sistem</h2>
          <p className="text-muted mb-0 small">
            Rekod tindakan penting seluruh sistem.{" "}
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
            onClick={() => fetchLogs()}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          <button
            className="btn btn-sm btn-success"
            onClick={exportCsv}
            disabled={filteredLogs.length === 0}
          >
            <i className="bi bi-download me-1"></i>
            Eksport CSV
          </button>
        </div>
      </div>

      {!loading && logs.length > 0 && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md">
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

          {STAT_CARDS.map((item) => (
            <div className="col-6 col-md" key={item.label}>
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 42,
                        height: 42,
                        background: item.bg,
                      }}
                    >
                      <i
                        className={`bi ${item.icon} fs-5`}
                        style={{ color: item.color }}
                      ></i>
                    </div>

                    <div>
                      <div className="fw-bold fs-5 lh-1">
                        {stats[item.label] || 0}
                      </div>
                      <small className="text-muted">{item.label}</small>
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
                disabled={loading}
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
                disabled={loading}
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
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>

                <input
                  className="form-control border-start-0 ps-0"
                  placeholder="Cari pengguna, role, modul, tindakan..."
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

            <div className="col-md-2">
              <select
                className="form-select form-select-sm"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option>Semua Jenis</option>
                {[
                  "LOGIN",
                  "LOGOUT",
                  "CREATE",
                  "UPDATE",
                  "DELETE",
                  "DEACTIVATE",
                  "ACTIVATE",
                  "APPROVE",
                  "REJECT",
                  "MORE INFO",
                  "CHANGE",
                  "INFO",
                ].map((item) => (
                  <option key={item}>{item}</option>
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
                {modules.map((module) => (
                  <option key={module}>{module}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={districtFilter}
                onChange={(e) => {
                  setDistrictFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="Semua Daerah">Semua Daerah</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.label}
                  </option>
                ))}
              </select>
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

              {districtFilter !== "Semua Daerah" && (
                <span className="badge bg-light text-dark border small d-flex align-items-center gap-1">
                  <i className="bi bi-building" style={{ fontSize: 10 }}></i>
                  {districts.find((item) => item.id === districtFilter)
                    ?.label || "Daerah"}
                  <button
                    className="btn-close btn-close-sm ms-1"
                    style={{ fontSize: 8 }}
                    onClick={() => setDistrictFilter("Semua Daerah")}
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
                      const style = getActionStyle(log.action);
                      const district = districts.find(
                        (item) => item.id === log.district_environment_id
                      );

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

                                  {district && (
                                    <span
                                      className="badge bg-light text-muted border small"
                                      style={{ fontSize: 10 }}
                                    >
                                      <i
                                        className="bi bi-building me-1"
                                        style={{ fontSize: 9 }}
                                      ></i>
                                      {district.label}
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
                  <th className="px-4 py-3">Daerah</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-end"></th>
                </tr>
              </thead>

              <tbody>
                {paginatedLogs.map((log) => {
                  const style = getActionStyle(log.action);
                  const district = districts.find(
                    (item) => item.id === log.district_environment_id
                  );

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
                            {(log.actor_name || "?")
                              .split(" ")
                              .map((word) => word[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
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

                      <td className="px-4 py-3 small">
                        {getModuleName(log)}
                      </td>

                      <td className="px-4 py-3 small">
                        {district?.label || "-"}
                      </td>

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
          <div className="card-footer bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center">
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
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
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
          const style = getActionStyle(selectedLog.action);
          const district = districts.find(
            (item) => item.id === selectedLog.district_environment_id
          );

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
                      <DetailRow
                        label="Pengguna"
                        value={selectedLog.actor_name || "-"}
                      />

                      <DetailRow
                        label="Role"
                        value={selectedLog.actor_role || "-"}
                      />

                      <div className="list-group-item px-4 py-3">
                        <div className="row align-items-center">
                          <div className="col-5 text-muted small">
                            Jenis Tindakan
                          </div>

                          <div className="col-7">
                            <span className={`badge rounded-pill ${style.badge}`}>
                              <i className={`bi ${style.icon} me-1`}></i>
                              {style.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <DetailRow
                        label="Action"
                        value={selectedLog.action || "-"}
                        mono
                      />

                      <DetailRow
                        label="Module"
                        value={getModuleName(selectedLog)}
                      />

                      <DetailRow
                        label="Daerah"
                        value={district?.label || "-"}
                      />

                      <DetailRow
                        label="Record ID"
                        value={selectedLog.record_id || "-"}
                        mono
                      />

                      <DetailRow
                        label="User ID"
                        value={selectedLog.user_id || "-"}
                        mono
                      />

                      <DetailRow
                        label="IP Address"
                        value={selectedLog.ip_address || "-"}
                      />

                      <div className="list-group-item px-4 py-3">
                        <div className="small text-muted mb-2">Keterangan</div>
                        <p className="mb-0 small">
                          {selectedLog.description || "-"}
                        </p>
                      </div>

                      <div className="list-group-item px-4 py-3">
                        <div className="small text-muted mb-2">Old Value</div>
                        <pre className="bg-light border rounded-3 p-3 small mb-0">
                          {safeJsonPreview(selectedLog.old_value)}
                        </pre>
                      </div>

                      <div className="list-group-item px-4 py-3">
                        <div className="small text-muted mb-2">New Value</div>
                        <pre className="bg-light border rounded-3 p-3 small mb-0">
                          {safeJsonPreview(selectedLog.new_value)}
                        </pre>
                      </div>

                      <DetailRow
                        label="Tarikh / Masa"
                        value={formatDateTime(selectedLog.created_at)}
                      />
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

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="list-group-item px-4 py-3">
      <div className="row">
        <div className="col-5 text-muted small">{label}</div>
        <div className={`col-7 small ${mono ? "font-monospace" : ""}`}>
          {value}
        </div>
      </div>
    </div>
  );
}