import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string | null;
  group_id?: string | null;
  group_name: string | null;
  category: string | null;
  scout_category?: string | null;
  status: string | null;
  gender: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  deleted_at?: string | null;
};

type Group = {
  id: string;
  group_name: string | null;
  school_name: string | null;
  leader_name: string | null;
  status: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  deleted_at?: string | null;
};

type Activity = {
  id: string;
  activity_name: string | null;
  activity_date: string | null;
  location: string | null;
  group_name: string | null;
  status: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  deleted_at?: string | null;
};

type CurrentUser = {
  id?: string;
  full_name?: string;
  email?: string;
  role?: string;
  district?: string;
  district_environment_id?: string;
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

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isUpcomingActivity(activity: Activity) {
  const status = normalizeStatus(activity.status);
  const date = activity.activity_date ? new Date(activity.activity_date) : null;

  if (status === "Akan Datang") return true;
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date >= today && status !== "Dibatalkan" && status !== "Selesai";
}

function getCategory(member: Member) {
  return member.scout_category || member.category || "Tidak Ditetapkan";
}

export default function AssistantCommissionerDashboard() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const districtEnvironmentId = currentUser.district_environment_id || "";
  const districtName = currentUser.district || "-";

  const isPesuruhjayaDaerah = currentUser.role === "Pesuruhjaya Daerah";

  const isPenolongPesuruhjaya =
    currentUser.role === "Penolong Pesuruhjaya" ||
    currentUser.role === "Penolong Pesuruhjaya Daerah";

  const canViewDashboard = isPesuruhjayaDaerah || isPenolongPesuruhjaya;

  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDashboard() {
    if (!canViewDashboard) {
      alert("Anda tidak mempunyai akses ke halaman ini.");
      setMembers([]);
      setGroups([]);
      setActivities([]);
      setLoading(false);
      return;
    }

    if (!districtEnvironmentId) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Pesuruhjaya Daerah atau Super Admin."
      );
      setMembers([]);
      setGroups([]);
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const memberQuery = supabase
      .from("members")
      .select("*")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const groupQuery = supabase
      .from("groups")
      .select("*")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const activityQuery = supabase
      .from("activities")
      .select("*")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null)
      .order("activity_date", { ascending: true });

    const [
      { data: memberData, error: memberError },
      { data: groupData, error: groupError },
      { data: activityData, error: activityError },
    ] = await Promise.all([memberQuery, groupQuery, activityQuery]);

    if (memberError || groupError || activityError) {
      alert(
        memberError?.message ||
          groupError?.message ||
          activityError?.message ||
          "Gagal memuatkan dashboard."
      );
      setLoading(false);
      return;
    }

    setMembers((memberData || []) as Member[]);
    setGroups((groupData || []) as Group[]);
    setActivities((activityData || []) as Activity[]);
    setLoading(false);
  }

  const activeMembers = members.filter(
    (member) => normalizeStatus(member.status) === "Aktif"
  ).length;

  const inactiveMembers = members.filter(
    (member) => normalizeStatus(member.status) === "Tidak Aktif"
  ).length;

  const activeGroups = groups.filter(
    (group) => normalizeStatus(group.status) === "Aktif"
  ).length;

  const inactiveGroups = groups.filter(
    (group) => normalizeStatus(group.status) === "Tidak Aktif"
  ).length;

  const upcomingActivities = activities.filter(isUpcomingActivity);

  const completedActivities = activities.filter(
    (activity) => normalizeStatus(activity.status) === "Selesai"
  ).length;

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = {};

    members.forEach((member) => {
      const category = getCategory(member);
      counts[category] = (counts[category] || 0) + 1;
    });

    return counts;
  }, [members]);

  const genderCount = useMemo(() => {
    const counts: Record<string, number> = {};

    members.forEach((member) => {
      const gender = member.gender || "Tidak Ditetapkan";
      counts[gender] = (counts[gender] || 0) + 1;
    });

    return counts;
  }, [members]);

  const recentActivities = upcomingActivities
    .slice()
    .sort((a, b) => {
      const dateA = a.activity_date ? new Date(a.activity_date).getTime() : 0;
      const dateB = b.activity_date ? new Date(b.activity_date).getTime() : 0;

      return dateA - dateB;
    })
    .slice(0, 5);

  const groupsWithMemberCount = groups.map((group) => {
    const totalMembers = members.filter((member) => {
      if (member.group_id && group.id) return member.group_id === group.id;
      return member.group_name === group.group_name;
    }).length;

    const activeMemberCount = members.filter((member) => {
      const sameGroup =
        member.group_id && group.id
          ? member.group_id === group.id
          : member.group_name === group.group_name;

      return sameGroup && normalizeStatus(member.status) === "Aktif";
    }).length;

    return {
      ...group,
      total_members: totalMembers,
      active_members: activeMemberCount,
    };
  });

  if (!canViewDashboard) {
    return (
      <DashboardLayout role="assistantCommissioner" hideSearch>
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <i className="bi bi-shield-lock fs-1 text-danger d-block mb-3"></i>
            <h4 className="fw-bold">Akses Ditolak</h4>
            <p className="text-muted mb-0">
              Anda tidak mempunyai kebenaran untuk melihat dashboard ini.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="assistantCommissioner" hideSearch>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Dashboard Penolong Pesuruhjaya</h2>
          <p className="text-muted mb-0">
            Paparan ringkasan pemantauan ahli, kumpulan dan aktiviti untuk
            daerah <span className="fw-semibold">{districtName}</span>.
          </p>
        </div>

        <button
          className="btn btn-outline-success"
          onClick={fetchDashboard}
          disabled={loading || !districtEnvironmentId}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      {!districtEnvironmentId && (
        <div className="alert alert-warning rounded-4 border-0 shadow-sm">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Akaun ini belum dihubungkan dengan district environment. Data daerah
          tidak boleh dipaparkan.
        </div>
      )}

      {loading ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success"></div>
            <p className="text-muted mt-3 mb-0">Memuatkan dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted small">Jumlah Kumpulan</div>
                      <h3 className="fw-bold mb-0">{groups.length}</h3>
                      <small className="text-success">
                        Aktif: {activeGroups}
                      </small>
                    </div>

                    <div
                      className="bg-success-subtle text-success rounded-3 d-flex align-items-center justify-content-center"
                      style={{ width: 46, height: 46 }}
                    >
                      <i className="bi bi-building fs-4"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted small">Jumlah Ahli</div>
                      <h3 className="fw-bold mb-0">{members.length}</h3>
                      <small className="text-success">
                        Aktif: {activeMembers}
                      </small>
                    </div>

                    <div
                      className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center"
                      style={{ width: 46, height: 46 }}
                    >
                      <i className="bi bi-people fs-4"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted small">Ahli Tidak Aktif</div>
                      <h3 className="fw-bold text-warning mb-0">
                        {inactiveMembers}
                      </h3>
                      <small className="text-muted">Perlu pemantauan</small>
                    </div>

                    <div
                      className="bg-warning-subtle text-warning rounded-3 d-flex align-items-center justify-content-center"
                      style={{ width: 46, height: 46 }}
                    >
                      <i className="bi bi-person-dash fs-4"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="text-muted small">
                        Aktiviti Akan Datang
                      </div>
                      <h3 className="fw-bold text-info mb-0">
                        {upcomingActivities.length}
                      </h3>
                      <small className="text-muted">Dalam daerah</small>
                    </div>

                    <div
                      className="bg-info-subtle text-info rounded-3 d-flex align-items-center justify-content-center"
                      style={{ width: 46, height: 46 }}
                    >
                      <i className="bi bi-calendar-event fs-4"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="text-muted small">Kumpulan Tidak Aktif</div>
                  <h4 className="fw-bold text-secondary mb-0">
                    {inactiveGroups}
                  </h4>
                  <small className="text-muted">Daripada {groups.length}</small>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="text-muted small">Aktiviti Selesai</div>
                  <h4 className="fw-bold text-success mb-0">
                    {completedActivities}
                  </h4>
                  <small className="text-muted">
                    Rekod aktiviti daerah
                  </small>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="text-muted small">Jumlah Aktiviti</div>
                  <h4 className="fw-bold text-primary mb-0">
                    {activities.length}
                  </h4>
                  <small className="text-muted">
                    Semua aktiviti daerah sendiri
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white border-0 p-4">
                  <h5 className="fw-bold mb-1">
                    Taburan Ahli Mengikut Kategori
                  </h5>
                  <p className="text-muted small mb-0">
                    Ringkasan kategori ahli dalam daerah sendiri.
                  </p>
                </div>

                <div className="card-body p-4 pt-0">
                  {Object.keys(categoryCount).length === 0 ? (
                    <p className="text-muted mb-0">Tiada data ahli.</p>
                  ) : (
                    Object.entries(categoryCount).map(([category, count]) => {
                      const percent = members.length
                        ? Math.round((count / members.length) * 100)
                        : 0;

                      return (
                        <div className="mb-3" key={category}>
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="fw-semibold">{category}</span>
                            <span className="text-muted">
                              {count} ahli ({percent}%)
                            </span>
                          </div>

                          <div
                            className="progress rounded-pill"
                            style={{ height: 9 }}
                          >
                            <div
                              className="progress-bar bg-success"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white border-0 p-4">
                  <h5 className="fw-bold mb-1">Ringkasan Jantina</h5>
                  <p className="text-muted small mb-0">
                    Statistik asas ahli mengikut jantina.
                  </p>
                </div>

                <div className="card-body p-4 pt-0">
                  {Object.keys(genderCount).length === 0 ? (
                    <p className="text-muted mb-0">Tiada data jantina.</p>
                  ) : (
                    Object.entries(genderCount).map(([gender, count]) => {
                      const percent = members.length
                        ? Math.round((count / members.length) * 100)
                        : 0;

                      return (
                        <div
                          className="d-flex justify-content-between align-items-center border-bottom py-2"
                          key={gender}
                        >
                          <div>
                            <div className="fw-semibold">{gender}</div>
                            <small className="text-muted">{percent}%</small>
                          </div>

                          <span className="badge bg-success">{count}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white border-0 p-4">
                  <h5 className="fw-bold mb-1">Aktiviti Akan Datang</h5>
                  <p className="text-muted small mb-0">
                    5 aktiviti terdekat dalam daerah.
                  </p>
                </div>

                <div className="card-body p-4 pt-0">
                  {recentActivities.length === 0 ? (
                    <p className="text-muted mb-0">
                      Tiada aktiviti akan datang.
                    </p>
                  ) : (
                    recentActivities.map((activity) => (
                      <div
                        className="d-flex align-items-start gap-3 border-bottom pb-3 mb-3"
                        key={activity.id}
                      >
                        <div
                          className="bg-success-subtle text-success rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 42, height: 42 }}
                        >
                          <i className="bi bi-calendar-event"></i>
                        </div>

                        <div>
                          <div className="fw-semibold">
                            {activity.activity_name || "-"}
                          </div>

                          <small className="text-muted">
                            {formatDate(activity.activity_date)} ·{" "}
                            {activity.location || "-"}
                          </small>

                          <div className="small text-muted">
                            {activity.group_name || "Semua Kumpulan"}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-7">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white border-0 p-4">
                  <h5 className="fw-bold mb-1">Kumpulan Dalam Daerah</h5>
                  <p className="text-muted small mb-0">
                    Senarai ringkas kumpulan untuk pemantauan Penolong
                    Pesuruhjaya.
                  </p>
                </div>

                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="px-4 py-3">Kumpulan</th>
                          <th className="px-4 py-3">Sekolah</th>
                          <th className="px-4 py-3">Pemimpin</th>
                          <th className="px-4 py-3">Ahli</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {groupsWithMemberCount.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="text-center py-4 text-muted"
                            >
                              Tiada kumpulan dijumpai.
                            </td>
                          </tr>
                        ) : (
                          groupsWithMemberCount.slice(0, 6).map((group) => (
                            <tr key={group.id}>
                              <td className="px-4 py-3 fw-semibold">
                                {group.group_name || "-"}
                              </td>

                              <td className="px-4 py-3">
                                {group.school_name || "-"}
                              </td>

                              <td className="px-4 py-3">
                                {group.leader_name || "-"}
                              </td>

                              <td className="px-4 py-3">
                                <div>
                                  <span className="badge bg-light text-dark border">
                                    {group.total_members}
                                  </span>
                                </div>
                                <small className="text-muted">
                                  Aktif: {group.active_members}
                                </small>
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={`badge ${
                                    normalizeStatus(group.status) === "Aktif"
                                      ? "bg-success"
                                      : "bg-secondary"
                                  }`}
                                >
                                  {normalizeStatus(group.status)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {groupsWithMemberCount.length > 6 && (
                  <div className="card-footer bg-white border-top small text-muted">
                    Memaparkan 6 daripada {groupsWithMemberCount.length}{" "}
                    kumpulan.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}