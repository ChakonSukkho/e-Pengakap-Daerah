import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/ui/StatCard";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";

const APPLICATION_TABLE = "district_applications";

type DistrictApplication = {
  id: string;
  applicant_name: string | null;
  full_name?: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  district: string | null;
  organization: string | null;
  status: string | null;
  admin_note: string | null;
  created_at: string;
};

type AuditLog = {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string | null;
  module: string | null;
  description: string | null;
  created_at: string;
};

function normalizeStatus(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(dateValue?: string | null) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(statusValue: string | null) {
  const status = statusValue || "Unknown";
  const normalized = normalizeStatus(statusValue);

  if (normalized === "approved" || normalized === "aktif" || normalized === "active") {
    return (
      <span className="badge bg-success-subtle text-success border border-success-subtle">
        Approved
      </span>
    );
  }

  if (normalized === "pending" || normalized === "menunggu") {
    return (
      <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
        Pending
      </span>
    );
  }

  if (normalized === "rejected" || normalized === "ditolak") {
    return (
      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
        Rejected
      </span>
    );
  }

  if (
    normalized === "more info" ||
    normalized === "more_info" ||
    normalized === "request_more_info"
  ) {
    return (
      <span className="badge bg-info-subtle text-info border border-info-subtle">
        More Info
      </span>
    );
  }

  return (
    <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
      {status}
    </span>
  );
}

async function countRows(
  tableName: string,
  filter?: {
    column: string;
    values: string[];
  }
) {
  let query = supabase.from(tableName).select("id", {
    count: "exact",
    head: true,
  });

  if (filter) {
    query = query.in(filter.column, filter.values);
  }

  const { count, error } = await query;

  if (error) {
    console.warn(`Count error for ${tableName}:`, error.message);
    return 0;
  }

  return count || 0;
}

async function countDistrictEnvironments(statusValues?: string[]) {
  let query = supabase
    .from("district_environments")
    .select("id", {
      count: "exact",
      head: true,
    })
    .is("deleted_at", null);

  if (statusValues && statusValues.length > 0) {
    query = query.in("status", statusValues);
  }

  const { count, error } = await query;

  if (error) {
    console.warn("Count district_environments error:", error.message);
    return 0;
  }

  return count || 0;
}

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);

  const [totalStates, setTotalStates] = useState(0);
  const [totalRegisteredDistricts, setTotalRegisteredDistricts] = useState(0);
  const [totalActiveEnvironments, setTotalActiveEnvironments] = useState(0);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [rejectedApplications, setRejectedApplications] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const [applications, setApplications] = useState<DistrictApplication[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    try {
      const [
        statesCount,
        registeredDistrictsCount,
        activeEnvCount,
        usersCount,
        approvedAppCount,
        pendingAppCount,
        rejectedAppCount,
        applicationsResult,
        auditLogsResult,
      ] = await Promise.all([
        countRows("states"),

        // Ini baru betul untuk daerah yang telah register/approved dalam sistem.
        countDistrictEnvironments(),

        countDistrictEnvironments(["active", "Active", "Aktif"]),

        countRows("system_users"),

        countRows(APPLICATION_TABLE, {
          column: "status",
          values: ["approved", "Approved"],
        }),

        countRows(APPLICATION_TABLE, {
          column: "status",
          values: ["pending", "Pending"],
        }),

        countRows(APPLICATION_TABLE, {
          column: "status",
          values: ["rejected", "Rejected"],
        }),

        supabase
          .from(APPLICATION_TABLE)
          .select(
            "id, applicant_name, email, phone, state, district, organization, status, admin_note, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(5),

        supabase
          .from("audit_logs")
          .select(
            "id, actor_name, actor_role, action, module, description, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (applicationsResult.error) throw applicationsResult.error;
      if (auditLogsResult.error) throw auditLogsResult.error;

      setTotalStates(statesCount);
      setTotalRegisteredDistricts(registeredDistrictsCount);
      setTotalActiveEnvironments(activeEnvCount);
      setTotalUsers(usersCount);

      setApprovedCount(approvedAppCount);
      setPendingCount(pendingAppCount);
      setRejectedCount(rejectedAppCount);

      setPendingApplications(pendingAppCount);
      setRejectedApplications(rejectedAppCount);

      setApplications(applicationsResult.data || []);
      setAuditLogs(auditLogsResult.data || []);
    } catch (error: any) {
      console.error("Failed to fetch Super Admin dashboard:", error);
      alert(
        `Gagal mendapatkan data dashboard Super Admin: ${
          error?.message || "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  const totalApplicationStatus = approvedCount + pendingCount + rejectedCount;

  const approvedPercent = useMemo(() => {
    if (totalApplicationStatus === 0) return 0;
    return Math.round((approvedCount / totalApplicationStatus) * 100);
  }, [approvedCount, totalApplicationStatus]);

  const pendingPercent = useMemo(() => {
    if (totalApplicationStatus === 0) return 0;
    return Math.round((pendingCount / totalApplicationStatus) * 100);
  }, [pendingCount, totalApplicationStatus]);

  const rejectedPercent = useMemo(() => {
    if (totalApplicationStatus === 0) return 0;
    return Math.round((rejectedCount / totalApplicationStatus) * 100);
  }, [rejectedCount, totalApplicationStatus]);

  const applicationStatusItems = [
    { label: "Approved", value: approvedPercent, count: approvedCount, color: "success" },
    { label: "Pending", value: pendingPercent, count: pendingCount, color: "warning" },
    { label: "Rejected", value: rejectedPercent, count: rejectedCount, color: "danger" },
  ];

  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Super Admin Dashboard</h2>
          <p className="text-muted mb-0">
            Pantau permohonan daerah, daerah berdaftar dan aktiviti sistem.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-success px-4"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          <Link to="/superadmin/applications" className="btn btn-success px-4">
            Semak Permohonan
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body py-5 text-center">
            <div className="spinner-border text-success" role="status"></div>
            <p className="text-muted mt-3 mb-0">Memuatkan data dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3">
            <div className="col-md-4 col-xl-2">
              <StatCard
                title="Negeri & Wilayah Persekutuan"
                value={totalStates.toString()}
                icon="bi-map"
                color="success"
              />
            </div>

            <div className="col-md-4 col-xl-2">
              <StatCard
                title="Daerah Berdaftar"
                value={totalRegisteredDistricts.toString()}
                icon="bi-building"
                color="primary"
              />
            </div>

            <div className="col-md-4 col-xl-2">
              <StatCard
                title="Environment Aktif"
                value={totalActiveEnvironments.toString()}
                icon="bi-check-circle"
                color="success"
              />
            </div>

            <div className="col-md-4 col-xl-2">
              <StatCard
                title="Pending"
                value={pendingApplications.toString()}
                icon="bi-hourglass-split"
                color="warning"
              />
            </div>

            <div className="col-md-4 col-xl-2">
              <StatCard
                title="Rejected"
                value={rejectedApplications.toString()}
                icon="bi-x-circle"
                color="danger"
              />
            </div>

            <div className="col-md-4 col-xl-2">
              <StatCard
                title="Pengguna Sistem"
                value={totalUsers.toLocaleString()}
                icon="bi-people"
                color="info"
              />
            </div>
          </div>

          <div className="row g-4 mt-2">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0 fw-semibold">Permohonan Terkini</h5>
                    <small className="text-muted">
                      5 permohonan daerah terbaru.
                    </small>
                  </div>

                  <Link
                    to="/superadmin/applications"
                    className="small text-success text-decoration-none"
                  >
                    Lihat Semua
                  </Link>
                </div>

                <div className="card-body px-4">
                  {applications.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="bi bi-inbox fs-1 text-muted"></i>
                      <p className="text-muted mt-2 mb-0">
                        Tiada permohonan daerah setakat ini.
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Nama Pemohon</th>
                            <th>Negeri</th>
                            <th>Daerah</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>

                        <tbody>
                          {applications.map((application) => {
                            const applicantName =
                              application.applicant_name ||
                              application.full_name ||
                              "-";

                            return (
                              <tr key={application.id}>
                                <td>
                                  <div className="fw-semibold">
                                    {applicantName}
                                  </div>
                                  <small className="text-muted">
                                    {application.email || "-"}
                                  </small>
                                </td>

                                <td>{application.state || "-"}</td>
                                <td>{application.district || "-"}</td>
                                <td>{getStatusBadge(application.status)}</td>

                                <td className="text-end">
                                  <Link
                                    to={`/superadmin/applications/${application.id}`}
                                    className="btn btn-sm btn-outline-success rounded-pill px-3"
                                  >
                                    View
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-header bg-white border-0 pt-4 px-4 fw-semibold">
                  Status Permohonan
                </div>

                <div className="card-body px-4">
                  {applicationStatusItems.map((item) => (
                    <div className="mb-3" key={item.label}>
                      <div className="d-flex justify-content-between small mb-1">
                        <span>
                          {item.label}{" "}
                          <span className="text-muted">({item.count})</span>
                        </span>
                        <span>{item.value}%</span>
                      </div>

                      <div className="progress bg-light" style={{ height: 8 }}>
                        <div
                          className={`progress-bar bg-${item.color}`}
                          style={{ width: `${item.value}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}

                  {totalApplicationStatus === 0 && (
                    <p className="text-muted small mb-0">
                      Belum ada data permohonan.
                    </p>
                  )}
                </div>
              </div>

              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Aktiviti Sistem</span>

                  <Link
                    to="/superadmin/audit-log"
                    className="small text-success text-decoration-none"
                  >
                    Lihat Semua
                  </Link>
                </div>

                <div className="card-body px-4">
                  {auditLogs.length === 0 ? (
                    <p className="text-muted small mb-0">
                      Tiada aktiviti sistem setakat ini.
                    </p>
                  ) : (
                    auditLogs.map((log) => (
                      <div className="border-bottom pb-2 mb-2" key={log.id}>
                        <div className="fw-semibold small">
                          {log.description ||
                            `${log.action || "Aktiviti"} - ${
                              log.module || "Sistem"
                            }`}
                        </div>

                        <small className="text-muted">
                          {log.actor_name || "System"} •{" "}
                          {log.module || "Sistem"} • {formatDate(log.created_at)}
                        </small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}