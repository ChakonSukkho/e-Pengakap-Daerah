import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string;
  group_name: string;
  category: string;
  status: string;
  gender: string;
};

type Group = {
  id: string;
  group_name: string;
  school_name: string;
  leader_name: string;
  total_members: number;
  status: string;
};

type Activity = {
  id: string;
  activity_name: string;
  activity_date: string;
  location: string;
  group_name: string;
  status: string;
};

export default function AssistantCommissionerDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }

  async function fetchDashboard() {
    setLoading(true);

    const user = getCurrentUser();
    const district = user.district || "";

    let memberQuery = supabase.from("members").select("*");
    let groupQuery = supabase.from("groups").select("*");
    let activityQuery = supabase
      .from("activities")
      .select("*")
      .order("activity_date", { ascending: true });

    // Kalau nanti table ada column district, filter ikut district
    if (district) {
      // fallback sekarang guna semua data sebab table kau banyak guna group_name
      memberQuery = memberQuery;
      groupQuery = groupQuery;
      activityQuery = activityQuery;
    }

    const { data: memberData, error: memberError } = await memberQuery;
    const { data: groupData, error: groupError } = await groupQuery;
    const { data: activityData, error: activityError } = await activityQuery;

    if (memberError || groupError || activityError) {
      alert(memberError?.message || groupError?.message || activityError?.message);
      setLoading(false);
      return;
    }

    setMembers(memberData || []);
    setGroups(groupData || []);
    setActivities(activityData || []);
    setLoading(false);
  }

  const activeMembers = members.filter((m) => m.status === "Aktif").length;
  const activeGroups = groups.filter((g) => g.status === "Aktif").length;
  const upcomingActivities = activities.filter(
    (a) => a.status === "Akan Datang" || a.status === "Upcoming"
  ).length;

  const categoryCount: Record<string, number> = {};
  members.forEach((member) => {
    categoryCount[member.category] = (categoryCount[member.category] || 0) + 1;
  });

  return (
    <DashboardLayout role="assistantCommissioner">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold mb-1">Dashboard Penolong Pesuruhjaya</h2>
          <p className="text-muted mb-0">
            Paparan ringkasan pemantauan ahli, kumpulan dan aktiviti daerah.
          </p>
        </div>

        <button className="btn btn-outline-success" onClick={fetchDashboard}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

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
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body">
                  <div className="text-muted small">Jumlah Kumpulan</div>
                  <h3 className="fw-bold mb-0">{groups.length}</h3>
                  <small className="text-success">Aktif: {activeGroups}</small>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body">
                  <div className="text-muted small">Jumlah Ahli</div>
                  <h3 className="fw-bold mb-0">{members.length}</h3>
                  <small className="text-success">Aktif: {activeMembers}</small>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body">
                  <div className="text-muted small">Aktiviti Akan Datang</div>
                  <h3 className="fw-bold text-primary mb-0">
                    {upcomingActivities}
                  </h3>
                  <small className="text-muted">Dalam daerah</small>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body">
                  <div className="text-muted small">Laporan Bulanan</div>
                  <h3 className="fw-bold text-warning mb-0">0</h3>
                  <small className="text-muted">Belum connect report table</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white fw-bold">
                  Taburan Ahli Mengikut Kategori
                </div>

                <div className="card-body">
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
                            <span>{category}</span>
                            <span>
                              {count} ahli ({percent}%)
                            </span>
                          </div>
                          <div className="progress rounded-pill" style={{ height: 9 }}>
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
                <div className="card-header bg-white fw-bold">
                  Aktiviti Terkini
                </div>

                <div className="card-body">
                  {activities.length === 0 ? (
                    <p className="text-muted mb-0">Tiada aktiviti.</p>
                  ) : (
                    activities.slice(0, 5).map((activity) => (
                      <div
                        className="d-flex align-items-start gap-3 border-bottom pb-3 mb-3"
                        key={activity.id}
                      >
                        <div
                          className="bg-success-subtle text-success rounded-3 d-flex align-items-center justify-content-center"
                          style={{ width: 42, height: 42 }}
                        >
                          <i className="bi bi-calendar-event"></i>
                        </div>

                        <div>
                          <div className="fw-semibold">
                            {activity.activity_name}
                          </div>
                          <small className="text-muted">
                            {new Date(activity.activity_date).toLocaleDateString()} ·{" "}
                            {activity.location || "-"}
                          </small>
                          <div className="small text-muted">
                            {activity.group_name || "-"}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white fw-bold">Kumpulan Dalam Daerah</div>

            <div className="card-body table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Kumpulan</th>
                    <th>Sekolah</th>
                    <th>Pemimpin</th>
                    <th>Jumlah Ahli</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        Tiada kumpulan dijumpai.
                      </td>
                    </tr>
                  ) : (
                    groups.slice(0, 6).map((group) => (
                      <tr key={group.id}>
                        <td className="fw-semibold">{group.group_name}</td>
                        <td>{group.school_name}</td>
                        <td>{group.leader_name}</td>
                        <td>{group.total_members || 0}</td>
                        <td>
                          <span
                            className={`badge ${
                              group.status === "Aktif"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {group.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}