import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/ui/StatCard";
import { supabase } from "../../services/supabaseClient";

export default function DistrictDashboard() {
  const [totalMembers, setTotalMembers] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);

  const [categoryStats, setCategoryStats] = useState([
    { label: "Pengakap Kanak-Kanak", value: 0, percent: "0%", color: "success" },
    { label: "Pengakap Muda", value: 0, percent: "0%", color: "primary" },
    { label: "Pengakap Remaja", value: 0, percent: "0%", color: "warning" },
  ]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
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

    setTotalMembers(membersCount || 0);
    setActiveMembers(activeMembersCount || 0);
    setTotalGroups(groupsCount || 0);
    setTotalUsers(usersCount || 0);

    const { data: membersData } = await supabase
      .from("members")
      .select("category");

    const total = membersData?.length || 0;

    const categories = [
      { label: "Pengakap Kanak-Kanak", color: "success" },
      { label: "Pengakap Muda", color: "primary" },
      { label: "Pengakap Remaja", color: "warning" },
    ];

    const stats = categories.map((category) => {
      const count =
        membersData?.filter((member) => member.category === category.label)
          .length || 0;

      const percent = total > 0 ? `${Math.round((count / total) * 100)}%` : "0%";

      return {
        label: category.label,
        value: count,
        percent,
        color: category.color,
      };
    });

    setCategoryStats(stats);
  }

  return (
    <DashboardLayout role="district">
      <h2 className="fw-bold">Dashboard Daerah</h2>
      <p className="text-muted">Ringkasan data Pengakap daerah daripada database.</p>

      <div className="row g-3 mt-2">
        <div className="col-md-3">
          <StatCard title="Jumlah Ahli" value={totalMembers} icon="bi-people" />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Ahli Aktif"
            value={activeMembers}
            icon="bi-person-check"
            color="success"
          />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Kumpulan"
            value={totalGroups}
            icon="bi-mortarboard"
            color="primary"
          />
        </div>

        <div className="col-md-3">
          <StatCard
            title="Pengguna"
            value={totalUsers}
            icon="bi-person-gear"
            color="info"
          />
        </div>
      </div>

      <div className="row g-4 mt-2">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">
              Pecahan Ahli Mengikut Kategori
            </div>

            <div className="card-body">
              {categoryStats.map((item) => (
                <div className="mb-3" key={item.label}>
                  <div className="d-flex justify-content-between small mb-1">
                    <span>{item.label}</span>
                    <span>
                      {item.value} ahli ({item.percent})
                    </span>
                  </div>

                  <div className="progress" style={{ height: 8 }}>
                    <div
                      className={`progress-bar bg-${item.color}`}
                      style={{ width: item.percent }}
                    />
                  </div>
                </div>
              ))}

              {totalMembers === 0 && (
                <p className="text-muted small mb-0">
                  Tiada data ahli lagi. Tambah ahli untuk melihat statistik.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">
              Aktiviti Terkini
            </div>

            <div className="card-body">
              {[
                "Data ahli dimuatkan daripada Supabase",
                "Senarai kumpulan dikemaskini",
                "Pengguna daerah dikemaskini",
              ].map((item) => (
                <div
                  className="d-flex align-items-center gap-3 border-bottom py-2"
                  key={item}
                >
                  <div className="bg-success-subtle text-success rounded-circle px-2 py-1">
                    <i className="bi bi-check"></i>
                  </div>

                  <div>
                    <div className="fw-semibold">{item}</div>
                    <small className="text-muted">Dikemaskini hari ini</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}