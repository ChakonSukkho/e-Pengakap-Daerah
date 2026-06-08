import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  category?: string | null;
  scout_category?: string | null;
  unit_pengakap?: string | null;
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
  deleted_at?: string | null;
};

type AttendanceRecord = {
  id?: string;
  activity_id?: string | null;
  member_id?: string | null;
  status?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  district_environment_id?: string | null;
  deleted_at?: string | null;
};

type MemberBadge = {
  id: string;
  member_id?: string | null;
  badge_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  district_environment_id?: string | null;
  deleted_at?: string | null;
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
  if (value === "open" || value === "pendaftaran dibuka") {
    return "Pendaftaran Dibuka";
  }
  if (value === "completed" || value === "selesai") return "Selesai";
  if (value === "cancelled" || value === "dibatalkan") return "Dibatalkan";

  return status || "-";
}

function getActivityName(activity: Activity) {
  return activity.activity_name || activity.title || "Aktiviti Tanpa Nama";
}

function getActivityDate(activity: Activity) {
  return activity.activity_date || activity.date || activity.created_at || "";
}

function getCategory(member: Member) {
  return (
    member.unit_pengakap ||
    member.scout_category ||
    member.category ||
    "Tidak Ditetapkan"
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isUpcomingActivity(activity: Activity) {
  const dateValue = getActivityDate(activity);
  if (!dateValue) return false;

  const status = normalizeStatus(activity.status);
  const activityDate = new Date(dateValue);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  activityDate.setHours(0, 0, 0, 0);

  return (
    activityDate >= today &&
    status !== "Selesai" &&
    status !== "Dibatalkan"
  );
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
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

export default function AssistantLeaderDashboard() {
  const currentUser = getCurrentUser();

  const groupId = currentUser.group_id || "";
  const groupName = currentUser.group_name || "";
  const district = currentUser.district || "";
  const districtEnvironmentId = currentUser.district_environment_id || "";
  const userName = currentUser.full_name || currentUser.name || "-";

  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    []
  );
  const [memberBadges, setMemberBadges] = useState<MemberBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);

    await Promise.all([
      fetchMembers(),
      fetchActivities(),
      fetchAttendance(),
      fetchBadges(),
    ]);

    setLoading(false);
  }

  async function fetchMembers() {
    if (!groupId && !groupName) {
      setMembers([]);
      return;
    }

    let query = supabase
      .from("members")
      .select("*")
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else {
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

    setMembers(data || []);
  }

  async function fetchActivities() {
    if (!groupId && !groupName) {
      setActivities([]);
      return;
    }

    let query = supabase
      .from("activities")
      .select("*")
      .is("deleted_at", null)
      .order("activity_date", { ascending: true });

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else {
      query = query.eq("group_name", groupName);
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

    setActivities(data || []);
  }

  async function fetchAttendance() {
    if (!groupId && !groupName) {
      setAttendanceRecords([]);
      return;
    }

    let query = supabase
      .from("attendance")
      .select("*")
      .is("deleted_at", null);

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else {
      query = query.eq("group_name", groupName);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Attendance table issue:", error.message);
      setAttendanceRecords([]);
      return;
    }

    setAttendanceRecords(data || []);
  }

  async function fetchBadges() {
    if (!groupId && !groupName) {
      setMemberBadges([]);
      return;
    }

    let query = supabase
      .from("member_badges")
      .select("*")
      .is("deleted_at", null);

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else {
      query = query.eq("group_name", groupName);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Member badges table issue:", error.message);
      setMemberBadges([]);
      return;
    }

    setMemberBadges(data || []);
  }

  const stats = useMemo(() => {
    const activeMembers = members.filter(
      (member) => normalizeStatus(member.status) === "Aktif"
    ).length;

    const inactiveMembers = members.filter(
      (member) => normalizeStatus(member.status) === "Tidak Aktif"
    ).length;

    const currentMonth = new Date().toISOString().slice(0, 7);

    const activitiesThisMonth = activities.filter((activity) => {
      const dateValue = getActivityDate(activity);
      return dateValue?.slice(0, 7) === currentMonth;
    }).length;

    const upcomingActivities = activities.filter(isUpcomingActivity).length;

    const attendanceTotal = attendanceRecords.length;
    const attendancePresent = attendanceRecords.filter((record) => {
      const status = record.status || "Hadir";
      return status === "Hadir" || status === "Lewat" || status === "Bersebab";
    }).length;

    const attendancePercentage = percentage(attendancePresent, attendanceTotal);

    return {
      totalMembers: members.length,
      activeMembers,
      inactiveMembers,
      activitiesThisMonth,
      upcomingActivities,
      attendancePercentage,
      badgesAchieved: memberBadges.length,
    };
  }, [members, activities, attendanceRecords, memberBadges]);

  const upcomingActivityList = useMemo(() => {
    return activities
      .filter(isUpcomingActivity)
      .sort(
        (a, b) =>
          new Date(getActivityDate(a)).getTime() -
          new Date(getActivityDate(b)).getTime()
      )
      .slice(0, 5);
  }, [activities]);

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

  const taskList = [
    "Bantu kemaskini rekod ahli kumpulan",
    "Pantau aktiviti kumpulan akan datang",
    "Semak maklumat ahli sebelum aktiviti",
    "Bantu Pemimpin Kumpulan mengurus laporan asas",
  ];

  if (loading) {
    return (
      <DashboardLayout role="assistantLeader">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success"></div>
            <p className="text-muted mt-3 mb-0">
              Memuatkan dashboard penolong pemimpin...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!groupId && !groupName) {
    return (
      <DashboardLayout role="assistantLeader">
        <div className="alert alert-warning rounded-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Akaun anda belum dipautkan dengan kumpulan. Sila hubungi Pemimpin
          Kumpulan atau Pesuruhjaya Daerah untuk kemaskini kumpulan anda.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="assistantLeader">
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
                    Penolong Pemimpin
                  </span>

                  <h2 className="fw-bold mb-2">
                    Dashboard Penolong Pemimpin
                  </h2>

                  <p className="mb-1 opacity-75">
                    {groupName || "Kumpulan Belum Ditetapkan"}
                  </p>

                  <p className="mb-0 opacity-75">
                    {district || "-"} · {userName}
                  </p>
                </div>

                <div className="bg-white bg-opacity-25 rounded-4 p-3">
                  <i className="bi bi-person-check fs-1"></i>
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
                      {stats.attendancePercentage}%
                    </div>
                    <small className="opacity-75">Kehadiran</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">Maklumat Scope</h5>

              <div className="alert alert-light border rounded-4 small mb-3">
                <i className="bi bi-shield-check text-success me-2"></i>
                Anda hanya boleh melihat data kumpulan sendiri sahaja.
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Kumpulan</small>
                <strong>{groupName || "-"}</strong>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Daerah</small>
                <strong>{district || "-"}</strong>
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
            title="Ahli Kumpulan"
            value={stats.totalMembers}
            subtitle={`${stats.activeMembers} ahli aktif`}
            icon="bi-people"
            colorClass="bg-success-subtle text-success"
          />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Aktiviti Bulan Ini"
            value={stats.activitiesThisMonth}
            subtitle={`${stats.upcomingActivities} aktiviti akan datang`}
            icon="bi-calendar-event"
            colorClass="bg-primary-subtle text-primary"
          />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Kehadiran"
            value={`${stats.attendancePercentage}%`}
            subtitle="Berdasarkan rekod attendance"
            icon="bi-clipboard-check"
            colorClass="bg-warning-subtle text-warning"
          />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Lencana Dicapai"
            value={stats.badgesAchieved}
            subtitle="Jumlah lencana ahli kumpulan"
            icon="bi-award"
            colorClass="bg-info-subtle text-info"
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Aktiviti Akan Datang</h5>
              <p className="text-muted small mb-0">
                Senarai aktiviti terdekat untuk kumpulan anda.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              {upcomingActivityList.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-calendar-x fs-1 d-block mb-2"></i>
                  Tiada aktiviti akan datang.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Aktiviti</th>
                        <th>Tarikh</th>
                        <th>Lokasi</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {upcomingActivityList.map((activity) => (
                        <tr key={activity.id}>
                          <td>
                            <div className="fw-semibold">
                              {getActivityName(activity)}
                            </div>
                            <small className="text-muted">
                              {activity.description || "Tiada penerangan"}
                            </small>
                          </td>

                          <td>{formatDate(getActivityDate(activity))}</td>
                          <td>{activity.location || "-"}</td>

                          <td>
                            <span className="badge rounded-pill bg-primary">
                              {normalizeStatus(activity.status)}
                            </span>
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

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Tugasan Saya</h5>
              <p className="text-muted small mb-0">
                Panduan tugas Penolong Pemimpin.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <ul className="list-group list-group-flush">
                {taskList.map((task) => (
                  <li
                    key={task}
                    className="list-group-item px-0 d-flex align-items-start gap-2"
                  >
                    <i className="bi bi-check-circle text-success mt-1"></i>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Taburan Unit</h5>
            </div>

            <div className="card-body p-4 pt-0">
              {membersByCategory.length === 0 ? (
                <div className="text-muted text-center py-4">
                  Tiada data ahli.
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {membersByCategory.map((item) => (
                    <div key={item.category}>
                      <div className="d-flex justify-content-between mb-1">
                        <small className="fw-semibold">{item.category}</small>
                        <small className="text-muted">{item.count}</small>
                      </div>

                      <div className="progress rounded-pill" style={{ height: 8 }}>
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
      </div>
    </DashboardLayout>
  );
}