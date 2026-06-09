import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string;
  ic_number: string | null;
  group_id: string | null;
  group_name: string | null;
  category: string | null;
  scout_category: string | null;
  gender: string | null;
  status: string | null;
  district: string | null;
  district_environment_id: string | null;
  deleted_at: string | null;
};

type Group = {
  id: string;
  group_name: string;
  school_name: string | null;
  status: string | null;
  district: string | null;
  district_environment_id: string | null;
  deleted_at: string | null;
};

type SystemUser = {
  id: string;
  full_name: string;
  email: string | null;
  role: string | null;
  status: string | null;
  group_id?: string | null;
  group_name?: string | null;
  district: string | null;
  district_environment_id: string | null;
  deleted_at: string | null;
};

type Activity = {
  id: string;
  activity_name: string;
  activity_date: string | null;
  location: string | null;
  status: string | null;
  group_id: string | null;
  group_name: string | null;
  district: string | null;
  district_environment_id: string | null;
  deleted_at: string | null;
};

type Attendance = {
  id: string;
  activity_id: string | null;
  member_id: string | null;
  status: string | null;
  district_environment_id?: string | null;
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

  if (value === "completed" || value === "selesai") return "Selesai";
  if (value === "cancelled" || value === "canceled" || value === "dibatalkan")
    return "Dibatalkan";

  return status || "Aktif";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (rows.length === 0) {
    alert("Tiada data untuk export.");
    return;
  }

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const safeValue = String(value).replace(/"/g, '""');
          return `"${safeValue}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export default function DistrictReportsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("Semua");
  const [groupFilter, setGroupFilter] = useState("Semua Kumpulan");

  const currentUser = useMemo(() => getCurrentUser(), []);
  const districtEnvironmentId = currentUser.district_environment_id || null;
  const district =
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    null;

  useEffect(() => {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      setLoading(false);
      return;
    }

    fetchReportData();
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

  function getPeriodStartDate() {
    const now = new Date();

    if (periodFilter === "Bulan Ini") {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (periodFilter === "3 Bulan") {
      return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    }

    if (periodFilter === "Tahun Ini") {
      return new Date(now.getFullYear(), 0, 1);
    }

    return null;
  }

  async function fetchReportData() {
    setLoading(true);

    try {
      let memberQuery = supabase
        .from("members")
        .select(
          "id, full_name, ic_number, group_id, group_name, category, scout_category, gender, status, district, district_environment_id, deleted_at"
        )
        .is("deleted_at", null);

      memberQuery = applyDistrictScope(memberQuery);

      let groupQuery = supabase
        .from("groups")
        .select(
          "id, group_name, school_name, status, district, district_environment_id, deleted_at"
        )
        .is("deleted_at", null);

      groupQuery = applyDistrictScope(groupQuery);

      let userQuery = supabase
        .from("system_users")
        .select(
          "id, full_name, email, role, status, group_id, group_name, district, district_environment_id, deleted_at"
        )
        .is("deleted_at", null);

      userQuery = applyDistrictScope(userQuery);

      let activityQuery = supabase
        .from("activities")
        .select(
          "id, activity_name, activity_date, location, status, group_id, group_name, district, district_environment_id, deleted_at"
        )
        .is("deleted_at", null);

      activityQuery = applyDistrictScope(activityQuery);

      const [
        memberResult,
        groupResult,
        userResult,
        activityResult,
        attendanceResult,
      ] = await Promise.all([
        memberQuery,
        groupQuery,
        userQuery,
        activityQuery,
        supabase
          .from("attendance")
          .select("id, activity_id, member_id, status, district_environment_id"),
      ]);

      if (memberResult.error) throw memberResult.error;
      if (groupResult.error) throw groupResult.error;
      if (userResult.error) throw userResult.error;
      if (activityResult.error) throw activityResult.error;

      setMembers((memberResult.data || []) as Member[]);
      setGroups((groupResult.data || []) as Group[]);
      setUsers((userResult.data || []) as SystemUser[]);
      setActivities((activityResult.data || []) as Activity[]);

      if (attendanceResult.error) {
        console.warn("Attendance report skipped:", attendanceResult.error.message);
        setAttendance([]);
      } else {
        const attendanceRows = (attendanceResult.data || []) as Attendance[];

        if (districtEnvironmentId) {
          setAttendance(
            attendanceRows.filter(
              (item) => item.district_environment_id === districtEnvironmentId
            )
          );
        } else {
          setAttendance(attendanceRows);
        }
      }
    } catch (error: any) {
      alert(error?.message || "Gagal memuatkan laporan.");
      setMembers([]);
      setGroups([]);
      setUsers([]);
      setActivities([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredActivities = useMemo(() => {
    const startDate = getPeriodStartDate();

    return activities.filter((activity) => {
      const matchGroup =
        groupFilter === "Semua Kumpulan" ||
        activity.group_name === groupFilter ||
        activity.group_id === groupFilter;

      const matchPeriod =
        !startDate ||
        !activity.activity_date ||
        new Date(activity.activity_date) >= startDate;

      return matchGroup && matchPeriod;
    });
  }, [activities, groupFilter, periodFilter]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (groupFilter === "Semua Kumpulan") return true;

      return (
        member.group_name === groupFilter ||
        member.group_id === groupFilter
      );
    });
  }, [members, groupFilter]);

  const reportStats = useMemo(() => {
    const activeMembers = filteredMembers.filter(
      (member) => normalizeStatus(member.status) === "Aktif"
    );

    const inactiveMembers = filteredMembers.filter(
      (member) => normalizeStatus(member.status) !== "Aktif"
    );

    const activeGroups = groups.filter(
      (group) => normalizeStatus(group.status) === "Aktif"
    );

    const activeActivities = filteredActivities.filter(
      (activity) => normalizeStatus(activity.status) === "Aktif"
    );

    const completedActivities = filteredActivities.filter(
      (activity) => normalizeStatus(activity.status) === "Selesai"
    );

    const cancelledActivities = filteredActivities.filter(
      (activity) => normalizeStatus(activity.status) === "Dibatalkan"
    );

    return {
      totalMembers: filteredMembers.length,
      activeMembers: activeMembers.length,
      inactiveMembers: inactiveMembers.length,
      totalGroups: groups.length,
      activeGroups: activeGroups.length,
      totalUsers: users.length,
      totalActivities: filteredActivities.length,
      activeActivities: activeActivities.length,
      completedActivities: completedActivities.length,
      cancelledActivities: cancelledActivities.length,
      totalAttendance: attendance.length,
      presentAttendance: attendance.filter(
        (item) =>
          String(item.status || "").toLowerCase() === "hadir" ||
          String(item.status || "").toLowerCase() === "present"
      ).length,
    };
  }, [filteredMembers, groups, users, filteredActivities, attendance]);

  const membersByCategory = useMemo(() => {
    const map = new Map<string, number>();

    filteredMembers.forEach((member) => {
      const category =
        member.category || member.scout_category || "Tidak Dinyatakan";

      map.set(category, (map.get(category) || 0) + 1);
    });

    return Array.from(map.entries()).map(([category, total]) => ({
      category,
      total,
    }));
  }, [filteredMembers]);

  const membersByGroup = useMemo(() => {
    return groups.map((group) => {
      const groupMembers = members.filter(
        (member) =>
          member.group_id === group.id || member.group_name === group.group_name
      );

      return {
        group_id: group.id,
        group_name: group.group_name,
        school_name: group.school_name || "-",
        total_members: groupMembers.length,
        active_members: groupMembers.filter(
          (member) => normalizeStatus(member.status) === "Aktif"
        ).length,
        inactive_members: groupMembers.filter(
          (member) => normalizeStatus(member.status) !== "Aktif"
        ).length,
        status: normalizeStatus(group.status),
      };
    });
  }, [groups, members]);

  const usersByRole = useMemo(() => {
    const roles = [
      "Pesuruhjaya Daerah",
      "Penolong Pesuruhjaya Daerah",
      "Penolong Pesuruhjaya",
      "Pemimpin Kumpulan",
      "Penolong Pemimpin",
    ];

    return roles.map((role) => ({
      role,
      total: users.filter((user) => user.role === role).length,
      active: users.filter(
        (user) => user.role === role && normalizeStatus(user.status) === "Aktif"
      ).length,
      inactive: users.filter(
        (user) => user.role === role && normalizeStatus(user.status) !== "Aktif"
      ).length,
    }));
  }, [users]);

  function exportMembersReport() {
    const rows = filteredMembers.map((member, index) => ({
      Bil: index + 1,
      Nama: member.full_name,
      IC: member.ic_number || "",
      Kumpulan: member.group_name || "",
      Kategori: member.category || member.scout_category || "",
      Jantina: member.gender || "",
      Status: normalizeStatus(member.status),
      Daerah: member.district || district || "",
    }));

    downloadCSV("laporan-ahli-pengakap.csv", rows);
  }

  function exportGroupsReport() {
    const rows = membersByGroup.map((item, index) => ({
      Bil: index + 1,
      Kumpulan: item.group_name,
      Sekolah: item.school_name,
      Jumlah_Ahli: item.total_members,
      Ahli_Aktif: item.active_members,
      Ahli_Tidak_Aktif: item.inactive_members,
      Status: item.status,
    }));

    downloadCSV("laporan-kumpulan.csv", rows);
  }

  function exportActivitiesReport() {
    const rows = filteredActivities.map((activity, index) => ({
      Bil: index + 1,
      Aktiviti: activity.activity_name,
      Tarikh: formatDate(activity.activity_date),
      Lokasi: activity.location || "",
      Kumpulan: activity.group_name || "",
      Status: normalizeStatus(activity.status),
      Daerah: activity.district || district || "",
    }));

    downloadCSV("laporan-aktiviti.csv", rows);
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Laporan Daerah</h2>
          <p className="text-muted mb-0">
            Ringkasan laporan ahli, kumpulan, pengguna dan aktiviti daerah.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-success"
            onClick={exportMembersReport}
            disabled={loading}
          >
            <i className="bi bi-file-earmark-spreadsheet me-1"></i>
            Export Ahli
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={exportGroupsReport}
            disabled={loading}
          >
            <i className="bi bi-file-earmark-spreadsheet me-1"></i>
            Export Kumpulan
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={exportActivitiesReport}
            disabled={loading}
          >
            <i className="bi bi-file-earmark-spreadsheet me-1"></i>
            Export Aktiviti
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Tempoh Aktiviti</label>
              <select
                className="form-select"
                value={periodFilter}
                onChange={(event) => setPeriodFilter(event.target.value)}
              >
                <option>Semua</option>
                <option>Bulan Ini</option>
                <option>3 Bulan</option>
                <option>Tahun Ini</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Kumpulan</label>
              <select
                className="form-select"
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
              >
                <option>Semua Kumpulan</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.group_name}>
                    {group.group_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-success w-100"
                onClick={fetchReportData}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh Laporan
              </button>
            </div>
          </div>
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
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <small className="text-muted">Jumlah Ahli</small>
                      <h3 className="fw-bold mb-0">
                        {reportStats.totalMembers}
                      </h3>
                    </div>
                    <i className="bi bi-people fs-3 text-success"></i>
                  </div>
                  <div className="small text-muted mt-2">
                    Aktif: {reportStats.activeMembers} | Tidak Aktif:{" "}
                    {reportStats.inactiveMembers}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <small className="text-muted">Jumlah Kumpulan</small>
                      <h3 className="fw-bold mb-0">
                        {reportStats.totalGroups}
                      </h3>
                    </div>
                    <i className="bi bi-building fs-3 text-primary"></i>
                  </div>
                  <div className="small text-muted mt-2">
                    Kumpulan aktif: {reportStats.activeGroups}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <small className="text-muted">Jumlah Pengguna</small>
                      <h3 className="fw-bold mb-0">
                        {reportStats.totalUsers}
                      </h3>
                    </div>
                    <i className="bi bi-person-badge fs-3 text-warning"></i>
                  </div>
                  <div className="small text-muted mt-2">
                    Akaun sistem daerah
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <small className="text-muted">Jumlah Aktiviti</small>
                      <h3 className="fw-bold mb-0">
                        {reportStats.totalActivities}
                      </h3>
                    </div>
                    <i className="bi bi-calendar-event fs-3 text-danger"></i>
                  </div>
                  <div className="small text-muted mt-2">
                    Selesai: {reportStats.completedActivities} | Dibatalkan:{" "}
                    {reportStats.cancelledActivities}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white border-0 pt-4 px-4">
                  <h5 className="fw-bold mb-0">Ahli Mengikut Kategori</h5>
                </div>

                <div className="card-body">
                  {membersByCategory.length === 0 ? (
                    <p className="text-muted mb-0">Tiada data kategori.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Kategori</th>
                            <th className="text-end">Jumlah</th>
                          </tr>
                        </thead>
                        <tbody>
                          {membersByCategory.map((item) => (
                            <tr key={item.category}>
                              <td>{item.category}</td>
                              <td className="text-end fw-bold">
                                {item.total}
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

            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-header bg-white border-0 pt-4 px-4">
                  <h5 className="fw-bold mb-0">Pengguna Mengikut Peranan</h5>
                </div>

                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Peranan</th>
                          <th className="text-end">Jumlah</th>
                          <th className="text-end">Aktif</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersByRole.map((item) => (
                          <tr key={item.role}>
                            <td>{item.role}</td>
                            <td className="text-end fw-bold">{item.total}</td>
                            <td className="text-end text-success fw-bold">
                              {item.active}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-1">Laporan Kumpulan</h5>
                <p className="text-muted mb-0 small">
                  Jumlah ahli mengikut kumpulan dalam daerah.
                </p>
              </div>
            </div>

            <div className="card-body table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Kumpulan</th>
                    <th>Sekolah</th>
                    <th>Jumlah Ahli</th>
                    <th>Aktif</th>
                    <th>Tidak Aktif</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {membersByGroup.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        Tiada data kumpulan.
                      </td>
                    </tr>
                  ) : (
                    membersByGroup.map((item) => (
                      <tr key={item.group_id}>
                        <td className="fw-semibold">{item.group_name}</td>
                        <td>{item.school_name}</td>
                        <td>{item.total_members}</td>
                        <td className="text-success fw-bold">
                          {item.active_members}
                        </td>
                        <td className="text-secondary fw-bold">
                          {item.inactive_members}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              item.status === "Aktif"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white border-0 pt-4 px-4">
              <h5 className="fw-bold mb-1">Laporan Aktiviti</h5>
              <p className="text-muted mb-0 small">
                Senarai aktiviti mengikut filter tempoh dan kumpulan.
              </p>
            </div>

            <div className="card-body table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Aktiviti</th>
                    <th>Tarikh</th>
                    <th>Lokasi</th>
                    <th>Kumpulan</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        Tiada aktiviti dijumpai.
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((activity) => (
                      <tr key={activity.id}>
                        <td className="fw-semibold">
                          {activity.activity_name}
                        </td>
                        <td>{formatDate(activity.activity_date)}</td>
                        <td>{activity.location || "-"}</td>
                        <td>{activity.group_name || "-"}</td>
                        <td>
                          <span
                            className={`badge ${
                              normalizeStatus(activity.status) === "Selesai"
                                ? "bg-success"
                                : normalizeStatus(activity.status) ===
                                  "Dibatalkan"
                                ? "bg-danger"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {normalizeStatus(activity.status)}
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