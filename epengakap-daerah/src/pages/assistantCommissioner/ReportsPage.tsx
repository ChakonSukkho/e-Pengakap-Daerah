import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string;
  group_name: string;
  category: string;
  gender: string;
  status: string;
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

export default function ReportsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("*")
      .order("full_name", { ascending: true });

    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("*")
      .order("group_name", { ascending: true });

    const { data: activityData, error: activityError } = await supabase
      .from("activities")
      .select("*")
      .order("activity_date", { ascending: false });

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

  const membersByCategory = useMemo(() => {
    const result: Record<string, number> = {};

    members.forEach((member) => {
      const category = member.category || "Tidak Dinyatakan";
      result[category] = (result[category] || 0) + 1;
    });

    return result;
  }, [members]);

  const membersByGroup = useMemo(() => {
    const result: Record<string, number> = {};

    members.forEach((member) => {
      const group = member.group_name || "Tidak Dinyatakan";
      result[group] = (result[group] || 0) + 1;
    });

    return result;
  }, [members]);

  const activityByStatus = useMemo(() => {
    const result: Record<string, number> = {};

    activities.forEach((activity) => {
      const status = activity.status || "Tidak Dinyatakan";
      result[status] = (result[status] || 0) + 1;
    });

    return result;
  }, [activities]);

  function exportCsv() {
    const rows = [
      ["Jenis Laporan", "Nama", "Kumpulan/Sekolah", "Kategori/Status"],
      ...members.map((m) => [
        "Ahli",
        m.full_name,
        m.group_name,
        `${m.category} - ${m.status}`,
      ]),
      ...groups.map((g) => [
        "Kumpulan",
        g.group_name,
        g.school_name,
        g.status,
      ]),
      ...activities.map((a) => [
        "Aktiviti",
        a.activity_name,
        a.group_name,
        a.status,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "laporan-penolong-pesuruhjaya.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function getPercent(value: number, total: number) {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }

  return (
    <DashboardLayout role="assistantCommissioner">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold mb-1">Laporan Daerah</h2>
          <p className="text-muted mb-0">
            Ringkasan laporan ahli, kumpulan dan aktiviti dalam daerah.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-success" onClick={fetchReports}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          <button className="btn btn-success" onClick={exportCsv}>
            <i className="bi bi-download me-1"></i>
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success"></div>
            <p className="text-muted mt-3 mb-0">Memuatkan laporan...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body">
                  <div className="text-muted small">Jumlah Ahli</div>
                  <h3 className="fw-bold mb-0">{members.length}</h3>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body">
                  <div className="text-muted small">Ahli Aktif</div>
                  <h3 className="fw-bold text-success mb-0">
                    {members.filter((m) => m.status === "Aktif").length}
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body">
                  <div className="text-muted small">Jumlah Kumpulan</div>
                  <h3 className="fw-bold text-primary mb-0">{groups.length}</h3>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body">
                  <div className="text-muted small">Jumlah Aktiviti</div>
                  <h3 className="fw-bold text-warning mb-0">
                    {activities.length}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white fw-bold">
                  Laporan Ahli Mengikut Kategori
                </div>

                <div className="card-body">
                  {Object.entries(membersByCategory).length === 0 ? (
                    <p className="text-muted mb-0">Tiada data ahli.</p>
                  ) : (
                    Object.entries(membersByCategory).map(([category, count]) => {
                      const percent = getPercent(count, members.length);

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

            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white fw-bold">
                  Laporan Aktiviti Mengikut Status
                </div>

                <div className="card-body">
                  {Object.entries(activityByStatus).length === 0 ? (
                    <p className="text-muted mb-0">Tiada data aktiviti.</p>
                  ) : (
                    Object.entries(activityByStatus).map(([status, count]) => {
                      const percent = getPercent(count, activities.length);

                      return (
                        <div className="mb-3" key={status}>
                          <div className="d-flex justify-content-between small mb-1">
                            <span>{status}</span>
                            <span>
                              {count} aktiviti ({percent}%)
                            </span>
                          </div>

                          <div className="progress rounded-pill" style={{ height: 9 }}>
                            <div
                              className="progress-bar bg-primary"
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
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white fw-bold">
              Jumlah Ahli Mengikut Kumpulan
            </div>

            <div className="card-body table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Kumpulan</th>
                    <th>Jumlah Ahli</th>
                    <th>Peratus</th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(membersByGroup).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-muted">
                        Tiada data kumpulan.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(membersByGroup).map(([group, count]) => {
                      const percent = getPercent(count, members.length);

                      return (
                        <tr key={group}>
                          <td className="fw-semibold">{group}</td>
                          <td>{count}</td>
                          <td>{percent}%</td>
                        </tr>
                      );
                    })
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