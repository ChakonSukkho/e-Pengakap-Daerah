import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string;
  email: string;
  group_name: string;
  category: string;
  age: number;
  gender: string;
  status: string;
};

type Activity = {
  id: string;
  activity_name: string;
  activity_date: string;
  location: string;
  description: string;
  group_name: string;
  status: string;
};

export default function GroupLeaderDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const userGroup = currentUser.group_name || currentUser.district || "";

    setGroupName(userGroup || "Kumpulan");

    const { data: memberData } = await supabase
      .from("members")
      .select("*")
      .eq("group_name", userGroup)
      .order("full_name", { ascending: true });

    const { data: activityData } = await supabase
      .from("activities")
      .select("*")
      .eq("group_name", userGroup)
      .order("activity_date", { ascending: true })
      .limit(5);

    setMembers(memberData || []);
    setActivities(activityData || []);
  }

  const activeMembers = members.filter((m) => m.status === "Aktif").length;
  const upcomingActivities = activities.filter(
    (a) => a.status === "Upcoming" || a.status === "Akan Datang"
  ).length;

  const categories = [
    "Pengakap Kanak-Kanak",
    "Pengakap Muda",
    "Pengakap Remaja",
    "Pengakap Kelana",
  ];

  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2">
              <i className="bi bi-building me-2"></i>
              {groupName || "Kumpulan Belum Ditetapkan"}
            </span>
            <span className="badge bg-light text-muted border px-3 py-2">
              Pemimpin Kumpulan
            </span>
          </div>

          <h2 className="fw-bold mb-1">Papan Pemuka Kumpulan</h2>
          <p className="text-muted mb-0">
            Pantau ahli, aktiviti, kehadiran dan pencapaian kumpulan anda.
          </p>
        </div>

        <button className="btn btn-outline-success rounded-3" onClick={fetchDashboard}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        {[
          {
            label: "Ahli Kumpulan",
            value: members.length,
            sub: `Aktif: ${activeMembers}`,
            icon: "bi-people",
            color: "success",
          },
          {
            label: "Aktiviti Akan Datang",
            value: upcomingActivities,
            sub: "Jadual aktiviti",
            icon: "bi-calendar-event",
            color: "primary",
          },
          {
            label: "Kadar Kehadiran",
            value: "92%",
            sub: "Berdasarkan rekod",
            icon: "bi-clipboard-check",
            color: "success",
          },
          {
            label: "Lencana Dianugerah",
            value: 0,
            sub: "Jumlah pencapaian",
            icon: "bi-award",
            color: "warning",
          },
        ].map((card) => (
          <div className="col-md-3" key={card.label}>
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small mb-1">{card.label}</div>
                  <h3 className={`fw-bold mb-1 text-${card.color}`}>
                    {card.value}
                  </h3>
                  <small className="text-muted">{card.sub}</small>
                </div>
        
                <div
                  className={`bg-${card.color}-subtle text-${card.color} rounded-4 d-flex align-items-center justify-content-center`}
                  style={{ width: 52, height: 52 }}
                >
                  <i className={`bi ${card.icon} fs-4`}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white fw-semibold">
              Taburan Ahli Mengikut Kategori
            </div>

            <div className="card-body">
              {categories.map((category) => {
                const count = members.filter(
                  (member) => member.category === category
                ).length;

                const percent =
                  members.length > 0
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
              })}

              {members.length === 0 && (
                <p className="text-muted mb-0">
                  Tiada ahli untuk kumpulan ini.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white fw-semibold">
              Aktiviti Akan Datang
            </div>

            <div className="card-body">
              {activities.length === 0 ? (
                <p className="text-muted mb-0">
                  Tiada aktiviti akan datang.
                </p>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="d-flex align-items-start gap-3 border-bottom pb-3 mb-3"
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-0">Ahli Kumpulan</h6>
            <small className="text-muted">
              Senarai ringkas ahli kumpulan semasa
            </small>
          </div>
                    
          <span className="badge bg-success-subtle text-success px-3 py-2">
            {members.length} ahli
          </span>
        </div>

        <div className="card-body table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Nama Ahli</th>
                <th>Kumpulan</th>
                <th>Email</th>
                <th>Kategori</th>
                <th>Umur</th>
                <th>Jantina</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    Tiada ahli dijumpai untuk kumpulan ini.
                  </td>
                </tr>
              ) : (
                members.slice(0, 6).map((member) => (
                  <tr key={member.id}>
                    <td className="fw-semibold">{member.full_name}</td>
                    <td><span className="badge bg-primary">{member.group_name}</span></td>
                    <td>{member.email}</td>
                    <td>{member.category}</td>
                    <td>{member.age}</td>
                    <td>{member.gender}</td>
                    <td>
                      <span
                        className={`badge ${
                          member.status === "Aktif"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}