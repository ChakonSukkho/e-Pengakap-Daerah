import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type MemberRow = {
  id: string;
  full_name?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  category?: string | null;
  scout_category?: string | null;
  gender?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

type GroupRow = {
  id: string;
  group_name?: string | null;
  school_name?: string | null;
  group_code?: string | null;
  group_type?: string | null;
  leader_name?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

type UserRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  status?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

type ActivityRow = {
  id: string;
  activity_name?: string | null;
  title?: string | null;
  group_name?: string | null;
  activity_date?: string | null;
  date?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
};

type AuditLogRow = {
  id: string;
  actor_name?: string | null;
  action?: string | null;
  module?: string | null;
  description?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
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

function getUserDistrict() {
  const currentUser = getCurrentUser();

  return (
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    ""
  );
}

function getUserState() {
  const currentUser = getCurrentUser();

  return (
    currentUser.state ||
    currentUser.state_name ||
    currentUser.negeri ||
    ""
  );
}

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "aktif" || value === "active") return "Aktif";
  if (
    value === "tidak aktif" ||
    value === "inactive" ||
    value === "suspended" ||
    value === "digantung"
  ) {
    return "Tidak Aktif";
  }

  if (value === "archived" || value === "arkib") return "Arkib";

  return status || "-";
}

function isActive(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();
  return value === "aktif" || value === "active";
}

function isInactive(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  return (
    value === "tidak aktif" ||
    value === "inactive" ||
    value === "suspended" ||
    value === "digantung"
  );
}

function normalizeRole(role?: string | null) {
  const value = String(role || "").trim();

  if (!value) return "-";
  if (value === "Penolong Pesuruhjaya") return "Penolong Pesuruhjaya Daerah";
  if (value === "District") return "Pesuruhjaya Daerah";

  return value;
}

function getMemberCategory(member: MemberRow) {
  return member.scout_category || member.category || "Tidak Ditetapkan";
}

function getActivityName(activity: ActivityRow) {
  return activity.activity_name || activity.title || "Aktiviti Tanpa Nama";
}

function getActivityDate(activity: ActivityRow) {
  return activity.activity_date || activity.date || activity.created_at || "";
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

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function softBg(index: number) {
  const classes = [
    "bg-success-subtle text-success",
    "bg-primary-subtle text-primary",
    "bg-warning-subtle text-warning",
    "bg-info-subtle text-info",
    "bg-danger-subtle text-danger",
    "bg-secondary-subtle text-secondary",
  ];

  return classes[index % classes.length];
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  colorClass,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: string;
  colorClass: string;
}) {
  return (
    <div className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <small className="text-muted">{title}</small>
            <h2 className="fw-bold mb-1">{value}</h2>
            <small className="text-muted">{subtitle}</small>
          </div>

          <div
            className={`rounded-4 d-flex align-items-center justify-content-center ${colorClass}`}
            style={{ width: 52, height: 52 }}
          >
            <i className={`bi ${icon} fs-4`}></i>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DistrictDashboard() {
  const currentUser = getCurrentUser();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);

  const [officialName, setOfficialName] = useState("");
  const [environmentStatus, setEnvironmentStatus] = useState("Aktif");
  const [loading, setLoading] = useState(true);

  const district = getUserDistrict();
  const state = getUserState();
  const districtEnvironmentId = currentUser.district_environment_id || "";

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyDistrictScope(query: any) {
    if (districtEnvironmentId) {
      return query.eq("district_environment_id", districtEnvironmentId);
    }

    if (district) {
      return query.eq("district", district);
    }

    return query;
  }

  async function loadDashboard() {
    setLoading(true);

    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      setLoading(false);
      return;
    }

    await Promise.all([
      fetchDistrictSettings(),
      fetchMembers(),
      fetchGroups(),
      fetchUsers(),
      fetchActivities(),
      fetchAuditLogs(),
    ]);

    setLoading(false);
  }

  async function fetchDistrictSettings() {
    try {
      let query = supabase.from("district_settings").select("*").limit(1);

      if (districtEnvironmentId) {
        query = query.eq("district_environment_id", districtEnvironmentId);
      } else if (district) {
        query = query.eq("district", district);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.warn("District settings error:", error.message);
        return;
      }

      if (data) {
        setOfficialName(data.official_name || "");
        setEnvironmentStatus(normalizeStatus(data.status));
        return;
      }

      // Fallback kepada district_environments kalau district_settings belum wujud.
      if (districtEnvironmentId) {
        const { data: environmentData, error: environmentError } = await supabase
          .from("district_environments")
          .select("official_name, status")
          .eq("id", districtEnvironmentId)
          .maybeSingle();

        if (!environmentError && environmentData) {
          setOfficialName(environmentData.official_name || "");
          setEnvironmentStatus(normalizeStatus(environmentData.status));
        }
      }
    } catch (error) {
      console.warn("Failed to fetch district settings:", error);
    }
  }

  async function fetchMembers() {
    let query = supabase
      .from("members")
      .select("*")
      .is("deleted_at", null);

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      console.error(error.message);
      setMembers([]);
      return;
    }

    setMembers(data || []);
  }

  async function fetchGroups() {
    let query = supabase
      .from("groups")
      .select("*")
      .is("deleted_at", null);

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      console.error(error.message);
      setGroups([]);
      return;
    }

    setGroups(data || []);
  }

  async function fetchUsers() {
    let query = supabase
      .from("system_users")
      .select("*")
      .is("deleted_at", null);

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      console.error(error.message);
      setUsers([]);
      return;
    }

    setUsers(data || []);
  }

  async function fetchActivities() {
    let query = supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      console.error(error.message);
      setActivities([]);
      return;
    }

    setActivities(data || []);
  }

  async function fetchAuditLogs() {
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      console.error(error.message);
      setAuditLogs([]);
      return;
    }

    setAuditLogs(data || []);
  }

  const stats = useMemo(() => {
    const activeMembers = members.filter((member) =>
      isActive(member.status)
    ).length;

    const inactiveMembers = members.filter((member) =>
      isInactive(member.status)
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
        normalizeRole(user.role) === "Penolong Pesuruhjaya Daerah" &&
        isActive(user.status)
    ).length;

    return {
      activeMembers,
      inactiveMembers,
      totalMembers: members.length,
      activeGroups,
      totalGroups: groups.length,
      groupLeaders,
      assistantLeaders,
      assistantCommissioners,
    };
  }, [members, groups, users]);

  const membersByCategory = useMemo(() => {
    const result: Record<string, number> = {};

    members.forEach((member) => {
      const category = getMemberCategory(member);
      result[category] = (result[category] || 0) + 1;
    });

    return Object.entries(result)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [members]);

  const membersByGroup = useMemo(() => {
    const result: Record<string, number> = {};

    members.forEach((member) => {
      const groupName = member.group_name || "Tanpa Kumpulan";
      result[groupName] = (result[groupName] || 0) + 1;
    });

    return Object.entries(result)
      .map(([groupName, count]) => ({ groupName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [members]);

  const upcomingActivities = useMemo(() => {
    const now = new Date();

    return activities
      .filter((activity) => {
        const dateValue = getActivityDate(activity);

        if (!dateValue) return false;

        const activityDate = new Date(dateValue);

        if (Number.isNaN(activityDate.getTime())) return false;

        return activityDate >= now;
      })
      .sort(
        (a, b) =>
          new Date(getActivityDate(a)).getTime() -
          new Date(getActivityDate(b)).getTime()
      )
      .slice(0, 4);
  }, [activities]);

  const recentGroups = useMemo(() => {
    return [...groups]
      .sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
      )
      .slice(0, 4);
  }, [groups]);

  if (loading) {
    return (
      <DashboardLayout role="district">
        <div className="text-center py-5">
          <div className="spinner-border text-success"></div>
          <p className="text-muted mt-3 mb-0">Memuatkan dashboard daerah...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="district">
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div
            className="card border-0 shadow-sm rounded-4 overflow-hidden h-100"
            style={{
              background:
                "linear-gradient(135deg, #198754 0%, #20c997 100%)",
            }}
          >
            <div className="card-body p-4 text-white">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <span className="badge bg-white text-success mb-3">
                    Dashboard Daerah
                  </span>

                  <h2 className="fw-bold mb-2">
                    Selamat datang,{" "}
                    {currentUser.full_name || currentUser.name || "Pengguna"}
                  </h2>

                  <p className="mb-1 opacity-75">
                    {officialName || `Majlis Pengakap Daerah ${district || "-"}`}
                  </p>

                  <p className="mb-0 opacity-75">
                    {district || "-"}
                    {state ? `, ${state}` : ""}
                  </p>
                </div>

                <div className="text-end">
                  <div className="bg-white bg-opacity-25 rounded-4 p-3">
                    <i className="bi bi-shield-check fs-1"></i>
                  </div>
                </div>
              </div>

              <div className="row g-3 mt-4">
                <div className="col-6 col-md-3">
                  <div className="bg-white bg-opacity-25 rounded-4 p-3">
                    <div className="fw-bold fs-4">{stats.totalMembers}</div>
                    <small className="opacity-75">Jumlah Ahli</small>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="bg-white bg-opacity-25 rounded-4 p-3">
                    <div className="fw-bold fs-4">{stats.totalGroups}</div>
                    <small className="opacity-75">Kumpulan</small>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="bg-white bg-opacity-25 rounded-4 p-3">
                    <div className="fw-bold fs-4">{stats.groupLeaders}</div>
                    <small className="opacity-75">Pemimpin</small>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="bg-white bg-opacity-25 rounded-4 p-3">
                    <div className="fw-bold fs-4">
                      {stats.assistantLeaders}
                    </div>
                    <small className="opacity-75">Penolong</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h5 className="fw-bold mb-1">Status Environment</h5>
                  <p className="text-muted small mb-0">Keadaan daerah semasa</p>
                </div>

                <span
                  className={`badge px-3 py-2 ${
                    environmentStatus === "Aktif"
                      ? "bg-success"
                      : "bg-warning text-dark"
                  }`}
                >
                  {environmentStatus}
                </span>
              </div>

              <div className="d-grid gap-2">
                <Link to="/district/users" className="btn btn-outline-success">
                  <i className="bi bi-person-plus me-1"></i>
                  Tambah Pengguna
                </Link>

                <Link to="/district/groups" className="btn btn-outline-success">
                  <i className="bi bi-building-add me-1"></i>
                  Urus Kumpulan
                </Link>

                <Link to="/district/members" className="btn btn-success">
                  <i className="bi bi-people me-1"></i>
                  Urus Ahli
                </Link>
              </div>

              <hr />

              <div className="small text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Semua statistik dipaparkan berdasarkan daerah anda sahaja.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <StatCard
            title="Ahli Aktif"
            value={stats.activeMembers}
            subtitle={`${percentage(
              stats.activeMembers,
              stats.totalMembers
            )}% daripada jumlah ahli`}
            icon="bi-person-check"
            colorClass="bg-success-subtle text-success"
          />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Ahli Tidak Aktif"
            value={stats.inactiveMembers}
            subtitle="Rekod ahli inactive"
            icon="bi-person-dash"
            colorClass="bg-secondary-subtle text-secondary"
          />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Kumpulan Aktif"
            value={stats.activeGroups}
            subtitle={`${stats.totalGroups} jumlah kumpulan`}
            icon="bi-building"
            colorClass="bg-primary-subtle text-primary"
          />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Penolong Pesuruhjaya"
            value={stats.assistantCommissioners}
            subtitle="Pegawai bantuan daerah"
            icon="bi-person-badge"
            colorClass="bg-info-subtle text-info"
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-bold mb-1">
                    Pecahan Ahli Mengikut Kategori
                  </h5>
                  <p className="text-muted small mb-0">
                    Ringkasan kategori ahli Pengakap.
                  </p>
                </div>

                <span className="badge bg-success-subtle text-success">
                  {stats.totalMembers} ahli
                </span>
              </div>

              {membersByCategory.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-pie-chart fs-1 d-block mb-2"></i>
                  Tiada data kategori ahli.
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {membersByCategory.map((item, index) => (
                    <div key={item.category}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className={`rounded-circle d-inline-block ${softBg(
                              index
                            )}`}
                            style={{ width: 10, height: 10 }}
                          ></span>
                          <span className="fw-semibold small">
                            {item.category}
                          </span>
                        </div>

                        <div className="small text-muted">
                          <strong>{item.count}</strong>{" "}
                          ({percentage(item.count, stats.totalMembers)}%)
                        </div>
                      </div>

                      <div className="progress" style={{ height: 9 }}>
                        <div
                          className="progress-bar bg-success"
                          style={{
                            width: `${percentage(
                              item.count,
                              stats.totalMembers
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-1">Ahli Mengikut Kumpulan</h5>
              <p className="text-muted small mb-4">
                Kumpulan dengan jumlah ahli tertinggi.
              </p>

              {membersByGroup.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-building fs-1 d-block mb-2"></i>
                  Tiada data kumpulan ahli.
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {membersByGroup.map((item, index) => (
                    <div
                      key={item.groupName}
                      className="d-flex align-items-center gap-3"
                    >
                      <div
                        className={`rounded-4 d-flex align-items-center justify-content-center fw-bold ${softBg(
                          index
                        )}`}
                        style={{ width: 42, height: 42 }}
                      >
                        {index + 1}
                      </div>

                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <span className="fw-semibold small">
                            {item.groupName}
                          </span>
                          <span className="small text-muted">
                            {item.count} ahli
                          </span>
                        </div>

                        <div className="progress mt-2" style={{ height: 7 }}>
                          <div
                            className="progress-bar bg-success"
                            style={{
                              width: `${percentage(
                                item.count,
                                stats.totalMembers
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-bold mb-1">Aktiviti Akan Datang</h5>
                  <p className="text-muted small mb-0">
                    Aktiviti terdekat dalam daerah.
                  </p>
                </div>

                <Link
                  to="/district/activities"
                  className="btn btn-sm btn-outline-success"
                >
                  Lihat Semua
                </Link>
              </div>

              {upcomingActivities.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-calendar-event fs-1 d-block mb-2"></i>
                  Tiada aktiviti akan datang.
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {upcomingActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="d-flex align-items-center gap-3 border rounded-4 p-3"
                    >
                      <div
                        className="rounded-4 bg-success-subtle text-success d-flex align-items-center justify-content-center"
                        style={{ width: 46, height: 46 }}
                      >
                        <i className="bi bi-calendar-check fs-5"></i>
                      </div>

                      <div className="flex-grow-1">
                        <div className="fw-semibold">
                          {getActivityName(activity)}
                        </div>
                        <small className="text-muted">
                          {activity.group_name || "Semua kumpulan"}
                        </small>
                      </div>

                      <div className="text-end small">
                        <strong>{formatDate(getActivityDate(activity))}</strong>
                        <div className="text-muted">
                          {activity.status || "Akan Datang"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-bold mb-1">Kumpulan Terkini</h5>
                  <p className="text-muted small mb-0">
                    Senarai kumpulan / sekolah terbaru.
                  </p>
                </div>

                <Link
                  to="/district/groups"
                  className="btn btn-sm btn-outline-success"
                >
                  Lihat Semua
                </Link>
              </div>

              {recentGroups.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-building fs-1 d-block mb-2"></i>
                  Tiada kumpulan direkodkan.
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {recentGroups.map((group) => (
                    <div
                      key={group.id}
                      className="d-flex align-items-center gap-3 border rounded-4 p-3"
                    >
                      <div
                        className="rounded-4 bg-primary-subtle text-primary d-flex align-items-center justify-content-center"
                        style={{ width: 46, height: 46 }}
                      >
                        <i className="bi bi-building fs-5"></i>
                      </div>

                      <div className="flex-grow-1">
                        <div className="fw-semibold">
                          {group.group_name || "-"}
                        </div>
                        <small className="text-muted">
                          {group.school_name || "Tiada sekolah"}
                        </small>
                      </div>

                      <span
                        className={`badge ${
                          isActive(group.status)
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {normalizeStatus(group.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-bold mb-1">Aktiviti Sistem Terkini</h5>
                  <p className="text-muted small mb-0">
                    Rekod tindakan penting dalam daerah.
                  </p>
                </div>

                <Link
                  to="/district/audit-log"
                  className="btn btn-sm btn-outline-success"
                >
                  Lihat Audit Log
                </Link>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-journal-text fs-1 d-block mb-2"></i>
                  Tiada audit log terkini.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Tindakan</th>
                        <th>Pengguna</th>
                        <th>Module</th>
                        <th>Masa</th>
                      </tr>
                    </thead>

                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            <div className="fw-semibold">
                              {log.description || log.action || "-"}
                            </div>
                          </td>

                          <td className="text-muted">
                            {log.actor_name || "-"}
                          </td>

                          <td>
                            <span className="badge bg-light text-muted">
                              {log.module || "-"}
                            </span>
                          </td>

                          <td className="text-muted text-nowrap">
                            {formatDateTime(log.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}