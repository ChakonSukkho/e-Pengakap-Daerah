import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/ui/StatCard";
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

type GroupRow = {
  id: string;
  group_name: string;
  school_name: string;
  leader_name: string;
  total_members: number;
  status: string;
};

export default function DistrictDashboard() {
  const [totalMembers, setTotalMembers] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [leadersCount, setLeadersCount] = useState(0);
  const [assistantLeadersCount, setAssistantLeadersCount] = useState(0);
  const [assistantCommissionersCount, setAssistantCommissionersCount] = useState(0);
  const [monthActivities, setMonthActivities] = useState(0);

  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [topGroups, setTopGroups] = useState<GroupRow[]>([]);

  const [categoryStats, setCategoryStats] = useState([
    { label: "Pengakap Kanak-Kanak", value: 0, percent: 0, color: "success" },
    { label: "Pengakap Muda", value: 0, percent: 0, color: "primary" },
    { label: "Pengakap Remaja", value: 0, percent: 0, color: "warning" },
    { label: "Pengakap Kelana", value: 0, percent: 0, color: "danger" },
  ]);

  const [genderStats, setGenderStats] = useState([
    { label: "Lelaki", value: 0, percent: 0 },
    { label: "Perempuan", value: 0, percent: 0 },
  ]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    const now = new Date();

    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    const { count: membersCount } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true });

    const { count: activeMembersCount } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("status", "Aktif");

    const { count: groupsCount } = await supabase
      .from("groups")
      .select("*", { count: "exact", head: true });

    const { count: usersCount } = await supabase
      .from("system_users")
      .select("*", { count: "exact", head: true });

    const { count: leaderCount } = await supabase
      .from("system_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "Pemimpin Kumpulan");

    const { count: assistantLeaderCount } = await supabase
      .from("system_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "Penolong Pemimpin");

    const { count: assistantCommissionerCount } = await supabase
      .from("system_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "Penolong Pesuruhjaya");

    const { count: activitiesCount } = await supabase
      .from("activities")
      .select("*", { count: "exact", head: true })
      .gte("activity_date", startMonth)
      .lte("activity_date", endMonth);

    const { data: membersData } = await supabase
      .from("members")
      .select("category, gender");

    const { data: groupsData } = await supabase
      .from("groups")
      .select("*")
      .order("total_members", { ascending: false })
      .limit(5);

    const { data: auditData } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    setTotalMembers(membersCount || 0);
    setActiveMembers(activeMembersCount || 0);
    setTotalGroups(groupsCount || 0);
    setTotalUsers(usersCount || 0);
    setLeadersCount(leaderCount || 0);
    setAssistantLeadersCount(assistantLeaderCount || 0);
    setAssistantCommissionersCount(assistantCommissionerCount || 0);
    setMonthActivities(activitiesCount || 0);
    setTopGroups(groupsData || []);
    setRecentLogs(auditData || []);

    const total = membersData?.length || 0;

    const categories = [
      { label: "Pengakap Kanak-Kanak", color: "success" },
      { label: "Pengakap Muda", color: "primary" },
      { label: "Pengakap Remaja", color: "warning" },
      { label: "Pengakap Kelana", color: "danger" },
    ];

    setCategoryStats(
      categories.map((category) => {
        const count =
          membersData?.filter((member) => member.category === category.label)
            .length || 0;

        return {
          label: category.label,
          value: count,
          percent: total > 0 ? Math.round((count / total) * 100) : 0,
          color: category.color,
        };
      })
    );

    const maleCount =
      membersData?.filter((member) => member.gender === "Lelaki").length || 0;

    const femaleCount =
      membersData?.filter((member) => member.gender === "Perempuan").length || 0;

    setGenderStats([
      {
        label: "Lelaki",
        value: maleCount,
        percent: total > 0 ? Math.round((maleCount / total) * 100) : 0,
      },
      {
        label: "Perempuan",
        value: femaleCount,
        percent: total > 0 ? Math.round((femaleCount / total) * 100) : 0,
      },
    ]);
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold mb-1">Papan Pemuka Daerah</h2>
          <p className="text-muted mb-0">
            Daerah Petaling, Selangor · Ringkasan operasi.
          </p>
        </div>

        <button className="btn btn-outline-success" onClick={fetchDashboardStats}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      <div className="row g-3">
        <div className="col-md-6 col-xl">
          <StatCard
            title="Ahli Aktif"
            value={activeMembers}
            icon="bi-people"
            color="primary"
          />
        </div>

        <div className="col-md-6 col-xl">
          <StatCard
            title="Jumlah Kumpulan"
            value={totalGroups}
            icon="bi-mortarboard"
            color="info"
          />
        </div>
        
        <div className="col-md-6 col-xl">
          <StatCard
            title="Penolong Pesuruhjaya"
            value={assistantCommissionersCount}
            icon="bi-shield-check"
            color="danger"
          />
        </div>

        <div className="col-md-6 col-xl">
          <StatCard
            title="Pemimpin"
            value={leadersCount}
            icon="bi-person-gear"
            color="warning"
          />
        </div>

        <div className="col-md-6 col-xl">
          <StatCard
            title="Penolong Pemimpin"
            value={assistantLeadersCount}
            icon="bi-person-plus"
            color="success"
          />
        </div>


      </div>

      <div className="row g-4 mt-2">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">
              Taburan Ahli Mengikut Kategori
            </div>

            <div className="card-body">
              {categoryStats.map((item) => (
                <div className="mb-3" key={item.label}>
                  <div className="d-flex justify-content-between small mb-1">
                    <span>{item.label}</span>
                    <span>
                      {item.value} ahli ({item.percent}%)
                    </span>
                  </div>

                  <div className="progress rounded-pill" style={{ height: 9 }}>
                    <div
                      className={`progress-bar bg-${item.color}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}

              {totalMembers === 0 && (
                <p className="text-muted small mb-0">
                  Tiada data ahli lagi.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">
              Taburan Jantina
            </div>

            <div className="card-body">
              <div className="d-flex justify-content-center align-items-center mb-3">
                <div
                  className="rounded-circle border d-flex flex-column align-items-center justify-content-center"
                  style={{
                    width: 150,
                    height: 150,
                    background:
                      "conic-gradient(#0d6efd 0deg, #0d6efd " +
                      genderStats[0].percent * 3.6 +
                      "deg, #d63384 " +
                      genderStats[0].percent * 3.6 +
                      "deg, #d63384 360deg)",
                  }}
                >
                  <div className="bg-white rounded-circle d-flex flex-column align-items-center justify-content-center"
                    style={{ width: 95, height: 95 }}
                  >
                    <strong>{totalMembers}</strong>
                    <small className="text-muted">Ahli</small>
                  </div>
                </div>
              </div>

              {genderStats.map((item, index) => (
                <div
                  key={item.label}
                  className="d-flex justify-content-between align-items-center border-bottom py-2"
                >
                  <div>
                    <span
                      className={`badge rounded-circle me-2 ${
                        index === 0 ? "bg-primary" : "bg-danger"
                      }`}
                    >
                      &nbsp;
                    </span>
                    {item.label}
                  </div>
                  <strong>
                    {item.value} ({item.percent}%)
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Notifikasi</div>

            <div className="card-body">
              <div className="d-flex align-items-start gap-2 border-bottom pb-3 mb-3">
                <span className="bg-info rounded-circle mt-2" style={{ width: 8, height: 8 }}></span>
                <div>
                  <div className="small fw-semibold">
                    {totalUsers} pengguna sistem berdaftar
                  </div>
                  <small className="text-muted">Dikemaskini hari ini</small>
                </div>
              </div>

              <div className="d-flex align-items-start gap-2 border-bottom pb-3 mb-3">
                <span className="bg-warning rounded-circle mt-2" style={{ width: 8, height: 8 }}></span>
                <div>
                  <div className="small fw-semibold">
                    {monthActivities} aktiviti bulan ini
                  </div>
                  <small className="text-muted">Daripada jadual aktiviti</small>
                </div>
              </div>

              <div className="d-flex align-items-start gap-2 border-bottom pb-3 mb-3">
                <span className="bg-success rounded-circle mt-2" style={{ width: 8, height: 8 }}></span>
                <div>
                  <div className="small fw-semibold">
                    {activeMembers} ahli aktif direkodkan
                  </div>
                  <small className="text-muted">Berdasarkan status ahli</small>
                </div>
              </div>

              <div className="d-flex align-items-start gap-2">
                <span className="bg-danger rounded-circle mt-2" style={{ width: 8, height: 8 }}></span>
                <div>
                  <div className="small fw-semibold">
                    {topGroups.filter((g) => !g.leader_name).length} kumpulan tiada pemimpin
                  </div>
                  <small className="text-muted">Perlu semakan daerah</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-header bg-white fw-semibold">
          Kumpulan Terbesar di Daerah
        </div>

        <div className="card-body table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Kumpulan</th>
                <th>Sekolah</th>
                <th>Pemimpin</th>
                <th className="text-end">Bil. Ahli</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {topGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    Tiada kumpulan direkodkan.
                  </td>
                </tr>
              ) : (
                topGroups.map((group) => (
                  <tr key={group.id}>
                    <td className="fw-semibold">{group.group_name}</td>
                    <td className="text-muted">{group.school_name}</td>
                    <td>{group.leader_name || "—"}</td>
                    <td className="text-end fw-semibold">
                      {group.total_members || 0}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          group.status === "Aktif"
                            ? "bg-success-subtle text-success"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        {group.status === "Aktif" ? "Aktif" : "Perlu Semakan"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-header bg-white fw-semibold">
          Aktiviti Sistem Terkini
        </div>

        <div className="card-body">
          {recentLogs.length === 0 ? (
            <p className="text-muted mb-0">Tiada aktiviti sistem terkini.</p>
          ) : (
            recentLogs.map((log) => (
              <div
                className="d-flex align-items-start gap-3 border-bottom py-2"
                key={log.id}
              >
                <div className="bg-success-subtle text-success rounded-circle px-2 py-1">
                  <i className="bi bi-clock-history"></i>
                </div>

                <div>
                  <div className="fw-semibold">
                    {log.description || log.action}
                  </div>
                  <small className="text-muted">
                    {log.actor_name || "-"} •{" "}
                    {new Date(log.created_at).toLocaleString()}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}