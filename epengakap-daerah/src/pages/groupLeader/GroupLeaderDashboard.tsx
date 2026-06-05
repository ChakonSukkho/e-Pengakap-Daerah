import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  ic_number?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  category?: string | null;
  scout_category?: string | null;
  age?: number | null;
  gender?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

type Activity = {
  id: string;
  activity_name?: string | null;
  title?: string | null;
  activity_date?: string | null;
  date?: string | null;
  location?: string | null;
  description?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
};

type ScoutGroup = {
  id: string;
  group_name?: string | null;
  school_name?: string | null;
  group_code?: string | null;
  group_type?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
};

type CurrentUser = {
  id?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  district?: string;
  district_environment_id?: string;
  group_id?: string;
  group_name?: string;
};

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

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "active" || value === "aktif") return "Aktif";
  if (value === "inactive" || value === "tidak aktif") return "Tidak Aktif";
  if (value === "upcoming" || value === "akan datang") return "Akan Datang";
  if (value === "completed" || value === "selesai") return "Selesai";
  if (value === "cancelled" || value === "dibatalkan") return "Dibatalkan";

  return status || "-";
}

function isActive(status?: string | null) {
  const value = normalizeStatus(status);
  return value === "Aktif";
}

function getCategory(member: Member) {
  return member.scout_category || member.category || "Tidak Ditetapkan";
}

function getActivityName(activity: Activity) {
  return activity.activity_name || activity.title || "Aktiviti Tanpa Nama";
}

function getActivityDate(activity: Activity) {
  return activity.activity_date || activity.date || activity.created_at || "";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
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
            <h3 className="fw-bold mb-1">{value}</h3>
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

export default function GroupLeaderDashboard() {
  const currentUser = getCurrentUser();

  const groupId = currentUser.group_id || "";
  const groupName = currentUser.group_name || "";
  const district = currentUser.district || "";
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groupInfo, setGroupInfo] = useState<ScoutGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);

    await Promise.all([fetchGroupInfo(), fetchMembers(), fetchActivities()]);

    setLoading(false);
  }

  async function fetchGroupInfo() {
    if (!groupId && !groupName) {
      setGroupInfo(null);
      return;
    }

    let query = supabase.from("groups").select("*").limit(1);

    if (groupId) {
      query = query.eq("id", groupId);
    } else if (groupName) {
      query = query.eq("group_name", groupName);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(error.message);
      setGroupInfo(null);
      return;
    }

    setGroupInfo(data || null);
  }

  async function fetchMembers() {
    if (!groupId && !groupName) {
      setMembers([]);
      return;
    }

    let query = supabase
      .from("members")
      .select("*")
      .is("deleted_at", null);

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else if (groupName) {
      query = query.eq("group_name", groupName);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error.message);
      setMembers([]);
      return;
    }

    const sortedMembers = (data || []).sort((a, b) =>
      String(a.full_name || "").localeCompare(String(b.full_name || ""))
    );

    setMembers(sortedMembers);
  }

  async function fetchActivities() {
    if (!groupId && !groupName) {
      setActivities([]);
      return;
    }

    let query = supabase.from("activities").select("*");

    /**
     * Activities dalam sistem kau banyak guna group_name.
     * Jadi kita filter by group_name supaya lebih safe.
     */
    if (groupName) {
      query = query.eq("group_name", groupName);
    } else if (groupId) {
      query = query.eq("group_id", groupId);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error.message);
      setActivities([]);
      return;
    }

    const sortedActivities = (data || []).sort((a, b) => {
      const dateA = new Date(getActivityDate(a)).getTime();
      const dateB = new Date(getActivityDate(b)).getTime();
      return dateA - dateB;
    });

    setActivities(sortedActivities);
  }

  const stats = useMemo(() => {
    const activeMembers = members.filter((member) =>
      isActive(member.status)
    ).length;

    const inactiveMembers = members.filter(
      (member) => normalizeStatus(member.status) === "Tidak Aktif"
    ).length;

    const now = new Date();

    const upcomingActivities = activities.filter((activity) => {
      const dateValue = getActivityDate(activity);
      if (!dateValue) return false;

      const status = normalizeStatus(activity.status);
      const activityDate = new Date(dateValue);

      return (
        activityDate >= now &&
        status !== "Selesai" &&
        status !== "Dibatalkan"
      );
    }).length;

    const completedActivities = activities.filter(
      (activity) => normalizeStatus(activity.status) === "Selesai"
    ).length;

    return {
      totalMembers: members.length,
      activeMembers,
      inactiveMembers,
      upcomingActivities,
      totalActivities: activities.length,
      completedActivities,
    };
  }, [members, activities]);

  const membersByCategory = useMemo(() => {
    const result: Record<string, number> = {};

    members.forEach((member) => {
      const category = getCategory(member);
      result[category] = (result[category] || 0) + 1;
    });

    return Object.entries(result)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [members]);

  const genderBreakdown = useMemo(() => {
    const male = members.filter((member) => member.gender === "Lelaki").length;
    const female = members.filter(
      (member) => member.gender === "Perempuan"
    ).length;

    return { male, female };
  }, [members]);

  const latestMembers = useMemo(() => {
    return [...members]
      .sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
      )
      .slice(0, 5);
  }, [members]);

  const upcomingActivityList = useMemo(() => {
    const now = new Date();

    return activities
      .filter((activity) => {
        const dateValue = getActivityDate(activity);
        if (!dateValue) return false;

        const activityDate = new Date(dateValue);
        const status = normalizeStatus(activity.status);

        return (
          activityDate >= now &&
          status !== "Selesai" &&
          status !== "Dibatalkan"
        );
      })
      .slice(0, 5);
  }, [activities]);

  const displayGroupName =
    groupInfo?.group_name || groupName || "Kumpulan Belum Ditetapkan";

  if (loading) {
    return (
      <DashboardLayout role="groupLeader">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success"></div>
            <p className="text-muted mt-3 mb-0">
              Memuatkan dashboard kumpulan...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!groupId && !groupName) {
    return (
      <DashboardLayout role="groupLeader">
        <div className="alert alert-warning rounded-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Akaun anda belum dipautkan dengan kumpulan. Sila hubungi Pesuruhjaya
          Daerah untuk kemaskini <strong>group_id</strong> atau{" "}
          <strong>group_name</strong>.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="groupLeader">
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
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span className="badge bg-white text-success mb-3">
                    Pemimpin Kumpulan
                  </span>

                  <h2 className="fw-bold mb-2">Papan Pemuka Kumpulan</h2>

                  <p className="mb-1 opacity-75">
                    {displayGroupName}
                    {groupInfo?.school_name ? ` — ${groupInfo.school_name}` : ""}
                  </p>

                  <p className="mb-0 opacity-75">
                    {district || "-"} · {currentUser.full_name || currentUser.name || "-"}
                  </p>
                </div>

                <div className="bg-white bg-opacity-25 rounded-4 p-3">
                  <i className="bi bi-people-fill fs-1"></i>
                </div>
              </div>

              <div className="row g-3 mt-4">
                <div className="col-6 col-md-3">
                  <div className="bg-white bg-opacity-25 rounded-4 p-3">
                    <div className="fw-bold fs-4">{stats.totalMembers}</div>
                    <small className="opacity-75">Ahli</small>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="bg-white bg-opacity-25 rounded-4 p-3">
                    <div className="fw-bold fs-4">{stats.activeMembers}</div>
                    <small className="opacity-75">Aktif</small>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="bg-white bg-opacity-25 rounded-4 p-3">
                    <div className="fw-bold fs-4">
                      {stats.upcomingActivities}
                    </div>
                    <small className="opacity-75">Aktiviti</small>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="bg-white bg-opacity-25 rounded-4 p-3">
                    <div className="fw-bold fs-4">
                      {percentage(stats.activeMembers, stats.totalMembers)}%
                    </div>
                    <small className="opacity-75">Aktif</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">Maklumat Kumpulan</h5>

              <div className="mb-3">
                <small className="text-muted d-block">Nama Kumpulan</small>
                <strong>{displayGroupName}</strong>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Sekolah</small>
                <strong>{groupInfo?.school_name || "-"}</strong>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Daerah</small>
                <strong>{district || "-"}</strong>
              </div>

              <div className="mb-4">
                <small className="text-muted d-block">Status</small>
                <span
                  className={`badge rounded-pill ${
                    normalizeStatus(groupInfo?.status) === "Aktif"
                      ? "bg-success"
                      : "bg-secondary"
                  }`}
                >
                  {normalizeStatus(groupInfo?.status)}
                </span>
              </div>

              <button
                className="btn btn-outline-success w-100"
                onClick={fetchDashboard}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <StatCard
            title="Jumlah Ahli"
            value={stats.totalMembers}
            subtitle="Ahli dalam kumpulan"
            icon="bi-people"
            colorClass="bg-success-subtle text-success"
          />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Ahli Aktif"
            value={stats.activeMembers}
            subtitle={`${percentage(
              stats.activeMembers,
              stats.totalMembers
            )}% daripada ahli`}
            icon="bi-person-check"
            colorClass="bg-primary-subtle text-primary"
          />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Tidak Aktif"
            value={stats.inactiveMembers}
            subtitle="Ahli tidak aktif"
            icon="bi-person-dash"
            colorClass="bg-secondary-subtle text-secondary"
          />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Aktiviti Akan Datang"
            value={stats.upcomingActivities}
            subtitle={`${stats.totalActivities} jumlah aktiviti`}
            icon="bi-calendar-event"
            colorClass="bg-warning-subtle text-warning"
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-bold mb-1">Taburan Ahli Mengikut Kategori</h5>
                  <p className="text-muted small mb-0">
                    Ringkasan kategori ahli dalam kumpulan anda.
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
                  {membersByCategory.map((item) => (
                    <div key={item.category}>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="fw-semibold small">
                          {item.category}
                        </span>
                        <span className="small text-muted">
                          {item.count} ahli
                        </span>
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
              <h5 className="fw-bold mb-1">Ringkasan Jantina</h5>
              <p className="text-muted small mb-4">
                Pecahan ahli lelaki dan perempuan.
              </p>

              <div className="row g-3">
                <div className="col-6">
                  <div className="border rounded-4 p-4 text-center">
                    <i className="bi bi-person text-primary fs-2"></i>
                    <h3 className="fw-bold mt-2 mb-0">
                      {genderBreakdown.male}
                    </h3>
                    <small className="text-muted">Lelaki</small>
                  </div>
                </div>

                <div className="col-6">
                  <div className="border rounded-4 p-4 text-center">
                    <i className="bi bi-person text-danger fs-2"></i>
                    <h3 className="fw-bold mt-2 mb-0">
                      {genderBreakdown.female}
                    </h3>
                    <small className="text-muted">Perempuan</small>
                  </div>
                </div>
              </div>

              <hr />

              <div className="small text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Data ini dikira berdasarkan ahli dalam kumpulan anda sahaja.
              </div>
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
                    Aktiviti terdekat untuk kumpulan anda.
                  </p>
                </div>

                <a
                  href="/group-leader/activities"
                  className="btn btn-sm btn-outline-success"
                >
                  Lihat Semua
                </a>
              </div>

              {upcomingActivityList.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-calendar-event fs-1 d-block mb-2"></i>
                  Tiada aktiviti akan datang.
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {upcomingActivityList.map((activity) => (
                    <div
                      key={activity.id}
                      className="border rounded-4 p-3 d-flex align-items-center gap-3"
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
                          {activity.location || "Lokasi belum ditetapkan"}
                        </small>
                      </div>

                      <div className="text-end">
                        <small className="fw-semibold">
                          {formatDate(getActivityDate(activity))}
                        </small>
                        <div>
                          <span className="badge bg-light text-muted border">
                            {normalizeStatus(activity.status)}
                          </span>
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
                  <h5 className="fw-bold mb-1">Ahli Terkini</h5>
                  <p className="text-muted small mb-0">
                    Ahli terbaru dalam kumpulan anda.
                  </p>
                </div>

                <a
                  href="/group-leader/members"
                  className="btn btn-sm btn-outline-success"
                >
                  Lihat Ahli
                </a>
              </div>

              {latestMembers.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-people fs-1 d-block mb-2"></i>
                  Tiada ahli direkodkan.
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {latestMembers.map((member) => (
                    <div
                      key={member.id}
                      className="border rounded-4 p-3 d-flex align-items-center gap-3"
                    >
                      <div
                        className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                        style={{ width: 42, height: 42 }}
                      >
                        {getInitials(member.full_name || "-")}
                      </div>

                      <div className="flex-grow-1">
                        <div className="fw-semibold">
                          {member.full_name || "-"}
                        </div>
                        <small className="text-muted">
                          {getCategory(member)}
                        </small>
                      </div>

                      <span
                        className={`badge rounded-pill ${
                          normalizeStatus(member.status) === "Aktif"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {normalizeStatus(member.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}