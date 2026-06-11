import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string | null;
  member_no?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

type Group = {
  id: string;
  group_name: string | null;
  school_name?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

type SystemUser = {
  id: string;
  full_name: string | null;
  email?: string | null;
  role: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  deleted_at?: string | null;
};

type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  totalGroups: number;
  activeGroups: number;
  groupLeaders: number;
  assistantLeaders: number;
  assistantCommissioners: number;
};

function getCurrentUser() {
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

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "active" || value === "aktif") return "Aktif";

  if (
    value === "inactive" ||
    value === "tidak aktif" ||
    value === "suspended" ||
    value === "digantung"
  ) {
    return "Tidak Aktif";
  }

  return status || "Aktif";
}

function normalizeRole(role?: string | null) {
  if (role === "District") return "Pesuruhjaya Daerah";
  if (role === "Assistant Commissioner") return "Penolong Pesuruhjaya";
  if (role === "Penolong Pesuruhjaya Daerah") return "Penolong Pesuruhjaya";
  if (role === "Group Leader") return "Pemimpin Kumpulan";
  if (role === "Assistant Leader") return "Penolong Pemimpin";

  return role || "-";
}

function isActive(status?: string | null) {
  return normalizeStatus(status) === "Aktif";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getInitials(name?: string | null) {
  return String(name || "-")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function DistrictDashboard() {
  const currentUser = useMemo(() => getCurrentUser(), []);

  const districtEnvironmentId =
    currentUser.district_environment_id ||
    currentUser.districtEnvironmentId ||
    null;

  const district =
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    "-";

  const displayName =
    currentUser.full_name ||
    currentUser.name ||
    "Pesuruhjaya Daerah";

  const districtTitle =
    currentUser.district_name ||
    currentUser.district ||
    "Daerah";

  const scoutDistrict =
    currentUser.scout_district ||
    currentUser.daerah_pengakap ||
    currentUser.group_name ||
    "";

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);

  const stats = useMemo<DashboardStats>(() => {
    const activeMembers = members.filter((member) =>
      isActive(member.status)
    ).length;

    const inactiveMembers = members.filter(
      (member) => !isActive(member.status)
    ).length;

    const activeGroups = groups.filter((group) =>
      isActive(group.status)
    ).length;

    const groupLeaders = users.filter(
      (user) =>
        normalizeRole(user.role) === "Pemimpin Kumpulan" &&
        isActive(user.status)
    ).length;

    const assistantLeaders = users.filter(
      (user) =>
        normalizeRole(user.role) === "Penolong Pemimpin" &&
        isActive(user.status)
    ).length;

    const assistantCommissioners = users.filter(
      (user) =>
        normalizeRole(user.role) === "Penolong Pesuruhjaya" &&
        isActive(user.status)
    ).length;

    return {
      totalMembers: members.length,
      activeMembers,
      inactiveMembers,
      totalGroups: groups.length,
      activeGroups,
      groupLeaders,
      assistantLeaders,
      assistantCommissioners,
    };
  }, [members, groups, users]);

  const recentMembers = useMemo(() => {
    return [...members]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [members]);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyDistrictScope(query: any) {
    if (districtEnvironmentId && district && district !== "-") {
      return query.or(
        `district_environment_id.eq.${districtEnvironmentId},and(district_environment_id.is.null,district.eq.${district})`
      );
    }

    if (districtEnvironmentId) {
      return query.eq("district_environment_id", districtEnvironmentId);
    }

    if (district && district !== "-") {
      return query.eq("district", district);
    }

    return query;
  }

  async function fetchDashboardData() {
    setLoading(true);

    await Promise.all([fetchMembers(), fetchGroups(), fetchUsers()]);

    setLoading(false);
  }

  async function fetchMembers() {
    let query = supabase
      .from("members")
      .select(
        "id, full_name, member_no, group_id, group_name, status, district, district_environment_id, created_at, deleted_at"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      console.warn("Dashboard members error:", error.message);
      setMembers([]);
      return;
    }

    setMembers((data || []) as Member[]);
  }

  async function fetchGroups() {
    let query = supabase
      .from("groups")
      .select(
        "id, group_name, school_name, status, district, district_environment_id, created_at, deleted_at"
      )
      .is("deleted_at", null)
      .order("group_name", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      console.warn("Dashboard groups error:", error.message);
      setGroups([]);
      return;
    }

    setGroups((data || []) as Group[]);
  }

  async function fetchUsers() {
    let query = supabase
      .from("system_users")
      .select(
        "id, full_name, email, role, status, district, district_environment_id, group_id, group_name, deleted_at"
      )
      .is("deleted_at", null);

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      console.warn("Dashboard users error:", error.message);
      setUsers([]);
      return;
    }

    setUsers((data || []) as SystemUser[]);
  }

  function StatCard({
    title,
    value,
    subtitle,
    icon,
    variant = "success",
  }: {
    title: string;
    value: number | string;
    subtitle: string;
    icon: string;
    variant?: "success" | "primary" | "warning" | "secondary" | "info";
  }) {
    const bgClass =
      variant === "success"
        ? "bg-success-subtle text-success"
        : variant === "primary"
        ? "bg-primary-subtle text-primary"
        : variant === "warning"
        ? "bg-warning-subtle text-warning"
        : variant === "info"
        ? "bg-info-subtle text-info"
        : "bg-secondary-subtle text-secondary";

    return (
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body p-4">
          <div className="d-flex align-items-start justify-content-between gap-3">
            <div>
              <div className="text-muted mb-2">{title}</div>
              <h2 className="fw-bold mb-2">{value}</h2>
              <div className="small text-muted">{subtitle}</div>
            </div>

            <div
              className={`rounded-4 d-flex align-items-center justify-content-center ${bgClass}`}
              style={{
                width: 58,
                height: 58,
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              <i className={`bi ${icon}`}></i>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout role="district">
        <div className="text-center py-5">
          <div className="spinner-border text-success"></div>
          <p className="text-muted mt-3 mb-0">Memuatkan dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="district">
      <div className="row g-4 mb-4">
        <div className="col-xl-8">
          <div
            className="card border-0 shadow-sm rounded-4 overflow-hidden text-white h-100"
            style={{
              background:
                "linear-gradient(135deg, #047857 0%, #059669 45%, #10b981 100%)",
            }}
          >
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
                <div>
                  <span className="badge bg-white text-success px-3 py-2 rounded-3 mb-3">
                    Dashboard Daerah
                  </span>

                  <h1 className="fw-bold mb-3" style={{ fontSize: 38 }}>
                    Selamat datang, {displayName}
                  </h1>

                  <div className="fs-5 opacity-75 mb-1">
                    Majlis Pengakap Daerah {districtTitle}
                  </div>

                  <div className="fs-6 opacity-75">
                    {scoutDistrict || "Data daerah anda"}
                  </div>
                </div>

                <div
                  className="d-none d-md-flex align-items-center justify-content-center rounded-4"
                  style={{
                    width: 96,
                    height: 96,
                    background: "rgba(255,255,255,.22)",
                    fontSize: 48,
                  }}
                >
                  <i className="bi bi-shield-check"></i>
                </div>
              </div>

              <div className="row g-3 mt-2">
                <div className="col-6 col-xl">
                  <div
                    className="rounded-4 p-3 h-100"
                    style={{ background: "rgba(255,255,255,.20)" }}
                  >
                    <div className="fs-2 fw-bold">{stats.totalMembers}</div>
                    <div className="small opacity-75">Jumlah Ahli</div>
                  </div>
                </div>

                <div className="col-6 col-xl">
                  <div
                    className="rounded-4 p-3 h-100"
                    style={{ background: "rgba(255,255,255,.20)" }}
                  >
                    <div className="fs-2 fw-bold">{stats.activeGroups}</div>
                    <div className="small opacity-75">Kumpulan Aktif</div>
                  </div>
                </div>

                <div className="col-6 col-xl">
                  <div
                    className="rounded-4 p-3 h-100"
                    style={{ background: "rgba(255,255,255,.20)" }}
                  >
                    <div className="fs-2 fw-bold">{stats.groupLeaders}</div>
                    <div className="small opacity-75">Pemimpin Kumpulan</div>
                  </div>
                </div>

                <div className="col-6 col-xl">
                  <div
                    className="rounded-4 p-3 h-100"
                    style={{ background: "rgba(255,255,255,.20)" }}
                  >
                    <div className="fs-2 fw-bold">{stats.assistantLeaders}</div>
                    <div className="small opacity-75">Penolong Pemimpin</div>
                  </div>
                </div>

                <div className="col-6 col-xl">
                  <div
                    className="rounded-4 p-3 h-100"
                    style={{ background: "rgba(255,255,255,.20)" }}
                  >
                    <div className="fs-2 fw-bold">{stats.assistantCommissioners}</div>
                    <div className="small opacity-75">Penolong Pesuruhjaya</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h4 className="fw-bold mb-1">Status Daerah</h4>
                  <p className="text-muted mb-0">
                    Ringkasan operasi daerah anda
                  </p>
                </div>

                <span className="badge bg-success px-3 py-2">Aktif</span>
              </div>

              <div className="d-grid gap-2 mt-4">
                <Link
                  to="/district/users"
                  className="btn btn-outline-success rounded-3 py-2"
                >
                  <i className="bi bi-person-plus me-2"></i>
                  Tambah Pengguna
                </Link>

                <Link
                  to="/district/groups"
                  className="btn btn-outline-success rounded-3 py-2"
                >
                  <i className="bi bi-building-add me-2"></i>
                  Urus Kumpulan
                </Link>

                <Link
                  to="/district/members"
                  className="btn btn-success rounded-3 py-2"
                >
                  <i className="bi bi-people me-2"></i>
                  Urus Ahli
                </Link>

                <Link
                  to="/district/audit-log"
                  className="btn btn-light border rounded-3 py-2"
                >
                  <i className="bi bi-journal-text me-2"></i>
                  Lihat Log Audit
                </Link>
              </div>

              <hr className="my-4" />

              <div className="alert alert-light border rounded-4 mb-0">
                <i className="bi bi-info-circle text-success me-2"></i>
                Data dashboard ini hanya memaparkan rekod untuk daerah anda.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <StatCard
            title="Ahli Aktif"
            value={stats.activeMembers}
            subtitle={`${getPercent(
              stats.activeMembers,
              stats.totalMembers
            )}% daripada jumlah ahli`}
            icon="bi-person-check"
            variant="success"
          />
        </div>

        <div className="col-md-4">
          <StatCard
            title="Ahli Tidak Aktif"
            value={stats.inactiveMembers}
            subtitle="Rekod ahli inactive"
            icon="bi-person-dash"
            variant="secondary"
          />
        </div>

        <div className="col-md-4">
          <StatCard
            title="Kumpulan Aktif"
            value={stats.activeGroups}
            subtitle={`${stats.totalGroups} jumlah kumpulan`}
            icon="bi-building"
            variant="primary"
          />
        </div>

        {/* <div className="col-md-6 col-xl-3">
          <StatCard
            title="Penolong Pesuruhjaya"
            value={stats.assistantCommissioners}
            subtitle="Pegawai bantuan daerah"
            icon="bi-person-badge"
            variant="info"
          />
        </div> */}
      </div>

      <div className="row g-4">
        <div className="col-xl-7">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 p-4">
              <div className="d-flex justify-content-between align-items-center gap-3">
                <div>
                  <h5 className="fw-bold mb-1">Ahli Terbaru</h5>
                  <p className="text-muted small mb-0">
                    5 rekod ahli terkini dalam daerah anda.
                  </p>
                </div>

                <Link
                  to="/district/members"
                  className="btn btn-sm btn-outline-success"
                >
                  Lihat Semua
                </Link>
              </div>
            </div>

            <div className="card-body p-4 pt-0">
              {recentMembers.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                  Tiada ahli terbaru.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Kumpulan</th>
                        <th>Status</th>
                        <th>Daftar</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentMembers.map((member) => (
                        <tr key={member.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                                style={{
                                  width: 36,
                                  height: 36,
                                  flexShrink: 0,
                                }}
                              >
                                {getInitials(member.full_name)}
                              </div>

                              <div>
                                <div className="fw-semibold">
                                  {member.full_name || "-"}
                                </div>
                                <small className="text-muted">
                                  {member.member_no || "No keahlian belum diisi"}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>{member.group_name || "-"}</td>

                          <td>
                            <span
                              className={`badge ${
                                isActive(member.status)
                                  ? "bg-success"
                                  : "bg-secondary"
                              }`}
                            >
                              {normalizeStatus(member.status)}
                            </span>
                          </td>

                          <td>{formatDate(member.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Ringkasan Peranan</h5>
              <p className="text-muted small mb-0">
                Pecahan pengguna mengikut peranan dalam daerah.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="d-flex flex-column gap-3">
                <div className="p-3 rounded-4 border">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">Pemimpin Kumpulan</div>
                      <small className="text-muted">
                        Ketua / pemimpin untuk kumpulan sekolah
                      </small>
                    </div>

                    <span className="badge bg-primary rounded-pill px-3 py-2">
                      {stats.groupLeaders}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-4 border">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">Penolong Pemimpin</div>
                      <small className="text-muted">
                        Pembantu kepada Pemimpin Kumpulan
                      </small>
                    </div>

                    <span className="badge bg-success rounded-pill px-3 py-2">
                      {stats.assistantLeaders}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-4 border">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">Penolong Pesuruhjaya</div>
                      <small className="text-muted">
                        Pegawai bantuan di peringkat daerah
                      </small>
                    </div>

                    <span className="badge bg-info rounded-pill px-3 py-2">
                      {stats.assistantCommissioners}
                    </span>
                  </div>
                </div>
              </div>

              <div className="alert alert-info rounded-4 small mt-4 mb-0">
                <strong>Nota:</strong> “Penolong Pemimpin” dan “Penolong
                Pesuruhjaya” ialah dua peranan berbeza. Penolong Pemimpin
                membantu kumpulan/sekolah, manakala Penolong Pesuruhjaya membantu
                pentadbiran daerah.
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}