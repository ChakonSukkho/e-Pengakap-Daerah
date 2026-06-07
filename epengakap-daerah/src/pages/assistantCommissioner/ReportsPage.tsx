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
  gender?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  deleted_at?: string | null;
};

type Group = {
  id: string;
  group_name?: string | null;
  school_name?: string | null;
  leader_name?: string | null;
  total_members?: number | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  deleted_at?: string | null;
  actual_member_count?: number;
  active_member_count?: number;
};

type Activity = {
  id: string;
  activity_name?: string | null;
  activity_date?: string | null;
  location?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  status?: string | null;
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
  if (value === "completed" || value === "selesai") return "Selesai";
  if (value === "cancelled" || value === "dibatalkan") return "Dibatalkan";
  if (value === "upcoming" || value === "akan datang") return "Akan Datang";

  return status || "Tidak Dinyatakan";
}

function getCategory(member: Member) {
  return member.scout_category || member.category || "Tidak Dinyatakan";
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
  if (!activity.activity_date) return false;

  const status = normalizeStatus(activity.status);
  const activityDate = new Date(activity.activity_date);
  activityDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    activityDate >= today &&
    status !== "Tidak Aktif" &&
    status !== "Selesai" &&
    status !== "Dibatalkan"
  );
}

export default function ReportsPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const districtEnvironmentId = currentUser.district_environment_id || "";
  const districtName = currentUser.district || "-";

  const isPesuruhjayaDaerah = currentUser.role === "Pesuruhjaya Daerah";

  const isPenolongPesuruhjaya =
    currentUser.role === "Penolong Pesuruhjaya" ||
    currentUser.role === "Penolong Pesuruhjaya Daerah";

  const canViewReports = isPesuruhjayaDaerah || isPenolongPesuruhjaya;

  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function insertAuditLog(action: string, description: string) {
    if (!districtEnvironmentId) return;

    await supabase.from("audit_logs").insert({
      actor_name:
        currentUser.full_name || currentUser.email || "Unknown User",
      actor_role: currentUser.role || "Penolong Pesuruhjaya Daerah",
      action,
      module: "Reports",
      description,
      user_id: currentUser.id || null,
      district_environment_id: districtEnvironmentId,
      record_id: null,
      old_value: null,
      new_value: null,
    });
  }

  async function fetchReports() {
    setLoading(true);

    if (!canViewReports) {
      alert("Anda tidak mempunyai akses ke halaman laporan.");
      setMembers([]);
      setGroups([]);
      setActivities([]);
      setLoading(false);
      return;
    }

    if (!districtEnvironmentId) {
      alert("Ralat: district_environment_id pengguna tidak dijumpai.");
      setMembers([]);
      setGroups([]);
      setActivities([]);
      setLoading(false);
      return;
    }

    const memberQuery = supabase
      .from("members")
      .select("*")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    const groupQuery = supabase
      .from("groups")
      .select("*")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null)
      .order("group_name", { ascending: true });

    const activityQuery = supabase
      .from("activities")
      .select("*")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null)
      .order("activity_date", { ascending: false });

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
          "Gagal memuatkan laporan."
      );
      setLoading(false);
      return;
    }

    const safeMembers = (memberData || []) as Member[];
    const safeGroups = (groupData || []) as Group[];

    const groupsWithCounts = safeGroups.map((group) => {
      const groupMembers = safeMembers.filter((member) => {
        if (member.group_id && group.id) return member.group_id === group.id;
        return member.group_name === group.group_name;
      });

      const activeGroupMembers = groupMembers.filter(
        (member) => normalizeStatus(member.status) === "Aktif"
      );

      return {
        ...group,
        actual_member_count: groupMembers.length,
        active_member_count: activeGroupMembers.length,
      };
    });

    setMembers(safeMembers);
    setGroups(groupsWithCounts);
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

  const upcomingActivities = activities.filter(isUpcomingActivity).length;

  const completedActivities = activities.filter(
    (activity) => normalizeStatus(activity.status) === "Selesai"
  ).length;

  const membersByCategory = useMemo(() => {
    const result: Record<string, number> = {};

    members.forEach((member) => {
      const category = getCategory(member);
      result[category] = (result[category] || 0) + 1;
    });

    return result;
  }, [members]);

  const membersByGender = useMemo(() => {
    const result: Record<string, number> = {};

    members.forEach((member) => {
      const gender = member.gender || "Tidak Dinyatakan";
      result[gender] = (result[gender] || 0) + 1;
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
      const status = normalizeStatus(activity.status);
      result[status] = (result[status] || 0) + 1;
    });

    return result;
  }, [activities]);

  function getPercent(value: number, total: number) {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }

  async function exportCsv() {
    const rows = [
      ["Laporan Daerah", districtName],
      ["Tarikh Export", new Date().toLocaleString("ms-MY")],
      [],
      ["Ringkasan"],
      ["Jumlah Ahli", members.length],
      ["Ahli Aktif", activeMembers],
      ["Ahli Tidak Aktif", inactiveMembers],
      ["Jumlah Kumpulan", groups.length],
      ["Kumpulan Aktif", activeGroups],
      ["Kumpulan Tidak Aktif", inactiveGroups],
      ["Jumlah Aktiviti", activities.length],
      ["Aktiviti Akan Datang", upcomingActivities],
      ["Aktiviti Selesai", completedActivities],
      [],
      ["Jenis Laporan", "Nama", "Kumpulan/Sekolah", "Kategori/Status", "Tarikh/Lokasi"],
      ...members.map((member) => [
        "Ahli",
        member.full_name || "-",
        member.group_name || "-",
        `${getCategory(member)} - ${normalizeStatus(member.status)}`,
        member.gender || "-",
      ]),
      ...groups.map((group) => [
        "Kumpulan",
        group.group_name || "-",
        group.school_name || "-",
        normalizeStatus(group.status),
        `Ahli: ${group.actual_member_count || 0}`,
      ]),
      ...activities.map((activity) => [
        "Aktiviti",
        activity.activity_name || "-",
        activity.group_name || "Semua Kumpulan",
        normalizeStatus(activity.status),
        `${formatDate(activity.activity_date)} - ${activity.location || "-"}`,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `laporan-penolong-pesuruhjaya-${districtName}.csv`;
    link.click();

    URL.revokeObjectURL(url);

    await insertAuditLog(
      "Export Laporan CSV",
      `${currentUser.role} export laporan CSV daerah ${districtName}.`
    );
  }

  if (!canViewReports) {
    return (
      <DashboardLayout role="assistantCommissioner">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <i className="bi bi-shield-lock fs-1 text-danger d-block mb-3"></i>
            <h4 className="fw-bold">Akses Ditolak</h4>
            <p className="text-muted mb-0">
              Anda tidak mempunyai kebenaran untuk melihat halaman laporan ini.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="assistantCommissioner">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Laporan Daerah</h2>
          <p className="text-muted mb-0">
            Ringkasan laporan ahli, kumpulan dan aktiviti untuk daerah{" "}
            <span className="fw-semibold">{districtName}</span>.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-success"
            onClick={fetchReports}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          <button
            className="btn btn-success"
            onClick={exportCsv}
            disabled={loading || !districtEnvironmentId}
          >
            <i className="bi bi-download me-1"></i>
            Export CSV
          </button>
        </div>
      </div>

      {!districtEnvironmentId && (
        <div className="alert alert-warning rounded-4 border-0 shadow-sm">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Akaun ini belum mempunyai district_environment_id. Laporan daerah
          tidak boleh dipaparkan.
        </div>
      )}

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
            <SummaryCard
              label="Jumlah Ahli"
              value={members.length}
              icon="bi-people"
              tone="primary"
              subtitle={`Aktif: ${activeMembers}`}
            />

            <SummaryCard
              label="Ahli Tidak Aktif"
              value={inactiveMembers}
              icon="bi-person-dash"
              tone="warning"
              subtitle="Perlu pemantauan"
            />

            <SummaryCard
              label="Jumlah Kumpulan"
              value={groups.length}
              icon="bi-building"
              tone="success"
              subtitle={`Aktif: ${activeGroups}`}
            />

            <SummaryCard
              label="Jumlah Aktiviti"
              value={activities.length}
              icon="bi-calendar-event"
              tone="info"
              subtitle={`Akan datang: ${upcomingActivities}`}
            />
          </div>

          <div className="row g-3 mb-4">
            <SummaryCard
              label="Kumpulan Tidak Aktif"
              value={inactiveGroups}
              icon="bi-building-dash"
              tone="secondary"
              subtitle={`Daripada ${groups.length} kumpulan`}
            />

            <SummaryCard
              label="Aktiviti Selesai"
              value={completedActivities}
              icon="bi-check-circle"
              tone="success"
              subtitle="Rekod aktiviti lengkap"
            />

            <SummaryCard
              label="Jantina Direkod"
              value={Object.keys(membersByGender).length}
              icon="bi-gender-ambiguous"
              tone="primary"
              subtitle="Kategori jantina"
            />

            <SummaryCard
              label="Kategori Ahli"
              value={Object.keys(membersByCategory).length}
              icon="bi-tags"
              tone="warning"
              subtitle="Jenis kategori pengakap"
            />
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <ReportCard title="Laporan Ahli Mengikut Kategori">
                {Object.entries(membersByCategory).length === 0 ? (
                  <p className="text-muted mb-0">Tiada data ahli.</p>
                ) : (
                  Object.entries(membersByCategory).map(([category, count]) => {
                    const percent = getPercent(count, members.length);

                    return (
                      <ProgressRow
                        key={category}
                        label={category}
                        count={`${count} ahli`}
                        percent={percent}
                      />
                    );
                  })
                )}
              </ReportCard>
            </div>

            <div className="col-lg-6">
              <ReportCard title="Laporan Ahli Mengikut Jantina">
                {Object.entries(membersByGender).length === 0 ? (
                  <p className="text-muted mb-0">Tiada data jantina.</p>
                ) : (
                  Object.entries(membersByGender).map(([gender, count]) => {
                    const percent = getPercent(count, members.length);

                    return (
                      <ProgressRow
                        key={gender}
                        label={gender}
                        count={`${count} ahli`}
                        percent={percent}
                      />
                    );
                  })
                )}
              </ReportCard>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <ReportCard title="Laporan Aktiviti Mengikut Status">
                {Object.entries(activityByStatus).length === 0 ? (
                  <p className="text-muted mb-0">Tiada data aktiviti.</p>
                ) : (
                  Object.entries(activityByStatus).map(([status, count]) => {
                    const percent = getPercent(count, activities.length);

                    return (
                      <ProgressRow
                        key={status}
                        label={status}
                        count={`${count} aktiviti`}
                        percent={percent}
                      />
                    );
                  })
                )}
              </ReportCard>
            </div>

            <div className="col-lg-6">
              <ReportCard title="Ringkasan Kumpulan">
                {groups.length === 0 ? (
                  <p className="text-muted mb-0">Tiada data kumpulan.</p>
                ) : (
                  <>
                    <ProgressRow
                      label="Aktif"
                      count={`${activeGroups} kumpulan`}
                      percent={getPercent(activeGroups, groups.length)}
                    />
                    <ProgressRow
                      label="Tidak Aktif"
                      count={`${inactiveGroups} kumpulan`}
                      percent={getPercent(inactiveGroups, groups.length)}
                    />
                  </>
                )}
              </ReportCard>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Jumlah Ahli Mengikut Kumpulan</h5>
              <p className="text-muted small mb-0">
                Bilangan ahli sebenar dikira daripada table members.
              </p>
            </div>

            <div className="card-body table-responsive p-0">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4 py-3">Kumpulan</th>
                    <th className="px-4 py-3">Sekolah</th>
                    <th className="px-4 py-3">Pemimpin</th>
                    <th className="px-4 py-3">Jumlah Ahli</th>
                    <th className="px-4 py-3">Aktif</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        Tiada data kumpulan.
                      </td>
                    </tr>
                  ) : (
                    groups.map((group) => (
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
                          <span className="badge bg-light text-dark border">
                            {group.actual_member_count || 0}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {group.active_member_count || 0}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`badge rounded-pill ${
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

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Aktiviti Terkini</h5>
              <p className="text-muted small mb-0">
                Senarai aktiviti terbaru dalam daerah sendiri.
              </p>
            </div>

            <div className="card-body table-responsive p-0">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4 py-3">Tarikh</th>
                    <th className="px-4 py-3">Aktiviti</th>
                    <th className="px-4 py-3">Lokasi</th>
                    <th className="px-4 py-3">Kumpulan</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        Tiada data aktiviti.
                      </td>
                    </tr>
                  ) : (
                    activities.slice(0, 8).map((activity) => (
                      <tr key={activity.id}>
                        <td className="px-4 py-3">
                          {formatDate(activity.activity_date)}
                        </td>

                        <td className="px-4 py-3 fw-semibold">
                          {activity.activity_name || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {activity.location || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {activity.group_name || "Semua Kumpulan"}
                        </td>

                        <td className="px-4 py-3">
                          <span className="badge rounded-pill bg-light text-dark border">
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

function SummaryCard({
  label,
  value,
  icon,
  tone,
  subtitle,
}: {
  label: string;
  value: number;
  icon: string;
  tone: "primary" | "success" | "warning" | "info" | "secondary";
  subtitle: string;
}) {
  return (
    <div className="col-md-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="text-muted small">{label}</div>
              <h3 className={`fw-bold text-${tone} mb-0`}>{value}</h3>
              <small className="text-muted">{subtitle}</small>
            </div>

            <div
              className={`bg-${tone}-subtle text-${tone} rounded-3 d-flex align-items-center justify-content-center`}
              style={{ width: 46, height: 46 }}
            >
              <i className={`bi ${icon} fs-4`}></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-header bg-white border-0 p-4">
        <h5 className="fw-bold mb-0">{title}</h5>
      </div>

      <div className="card-body p-4 pt-0">{children}</div>
    </div>
  );
}

function ProgressRow({
  label,
  count,
  percent,
}: {
  label: string;
  count: string;
  percent: number;
}) {
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between small mb-1">
        <span className="fw-semibold">{label}</span>
        <span className="text-muted">
          {count} ({percent}%)
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
}