import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string | null;
  ic_number?: string | null;
  email?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  category?: string | null;
  scout_category?: string | null;
  unit_pengakap?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
};

type Activity = {
  id: string;
  activity_name: string | null;
  activity_date: string | null;
  location?: string | null;
  group_name?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  status?: string | null;
};

type AttendanceRecord = {
  id?: string;
  activity_id: string;
  member_id: string;
  attendance_date?: string | null;
  status: string;
  notes?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  recorded_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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

const ATTENDANCE_STATUSES = ["Hadir", "Tidak Hadir", "Lewat", "Bersebab"];

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

function getInitials(name?: string | null) {
  return String(name || "-")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMemberUnit(member?: Member | null) {
  return (
    member?.unit_pengakap ||
    member?.scout_category ||
    member?.category ||
    "Tidak Ditetapkan"
  );
}

function statusBadge(status?: string | null) {
  const value = status || "Hadir";

  if (value === "Hadir") {
    return "bg-success-subtle text-success border border-success-subtle";
  }

  if (value === "Tidak Hadir") {
    return "bg-danger-subtle text-danger border border-danger-subtle";
  }

  if (value === "Lewat") {
    return "bg-warning-subtle text-warning border border-warning-subtle";
  }

  return "bg-info-subtle text-info border border-info-subtle";
}

function activityStatusBadge(status?: string | null) {
  const value = String(status || "Akan Datang").toLowerCase();

  if (value.includes("selesai") || value.includes("completed")) {
    return "bg-success-subtle text-success border border-success-subtle";
  }

  if (value.includes("buka") || value.includes("open")) {
    return "bg-info-subtle text-info border border-info-subtle";
  }

  if (value.includes("batal")) {
    return "bg-danger-subtle text-danger border border-danger-subtle";
  }

  return "bg-warning-subtle text-warning border border-warning-subtle";
}

function calculatePercentage(hadir: number, total: number) {
  if (!total) return 0;
  return Math.round((hadir / total) * 100);
}

async function addAuditLog(
  action: string,
  description: string,
  recordId?: string | null
) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name:
        currentUser.full_name || currentUser.name || "Pemimpin Kumpulan",
      actor_role: currentUser.role || "Pemimpin Kumpulan",
      action,
      module: "Kehadiran",
      description,
      user_id: currentUser.id || null,
      district_environment_id: currentUser.district_environment_id || null,
      record_id: recordId || null,
      ip_address: null,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Jangan block proses utama kalau audit log gagal.
  }
}

export default function AttendancePage() {
  const currentUser = useMemo(() => getCurrentUser(), []);

  const groupId = currentUser.group_id || "";
  const groupName = currentUser.group_name || "";
  const district = currentUser.district || "";
  const districtEnvironmentId = currentUser.district_environment_id || "";
  const recordedBy =
    currentUser.full_name || currentUser.name || "Pemimpin Kumpulan";

  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>(
    []
  );

  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedActivityId && members.length > 0) {
      loadExistingAttendance(selectedActivityId, members);
    }
  }, [selectedActivityId, members.length]);

  async function fetchData() {
    setLoading(true);

    await Promise.all([fetchMembers(), fetchActivities(), fetchHistory()]);

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
    } else if (groupName) {
      query = query.eq("group_name", groupName);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setMembers([]);
      return;
    }

    const activeMembers = (data || []).filter((member) => {
      const status = String(member.status || "Aktif").toLowerCase();
      return status === "aktif" || status === "active";
    });

    setMembers(activeMembers);
  }

  async function fetchActivities() {
    if (!groupName && !district) {
      setActivities([]);
      return;
    }

    let query = supabase
      .from("activities")
      .select("*")
      .order("activity_date", { ascending: false });

    if (groupName) {
      query = query.eq("group_name", groupName);
    } else if (district) {
      query = query.eq("district", district);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setActivities([]);
      return;
    }

    const activityList = data || [];
    setActivities(activityList);

    if (!selectedActivityId && activityList.length > 0) {
      setSelectedActivityId(activityList[0].id);
    }
  }

  async function fetchHistory() {
    if (!groupId && !groupName) {
      setAttendanceHistory([]);
      return;
    }

    let query = supabase
      .from("attendance")
      .select("*")
      .is("deleted_at", null)
      .order("attendance_date", { ascending: false });

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
      // Kalau table belum ada, user akan nampak SQL yang perlu run dalam final response.
      console.error(error.message);
      setAttendanceHistory([]);
      return;
    }

    setAttendanceHistory(data || []);
  }

  async function loadExistingAttendance(activityId: string, memberList = members) {
    setLoadingAttendance(true);

    const initialAttendance: Record<string, string> = {};
    const initialNotes: Record<string, string> = {};

    memberList.forEach((member) => {
      initialAttendance[member.id] = "Hadir";
      initialNotes[member.id] = "";
    });

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("activity_id", activityId)
      .is("deleted_at", null);

    if (error) {
      alert(error.message);
      setAttendance(initialAttendance);
      setNotes(initialNotes);
      setLoadingAttendance(false);
      return;
    }

    (data || []).forEach((record: AttendanceRecord) => {
      if (record.member_id) {
        initialAttendance[record.member_id] = record.status || "Hadir";
        initialNotes[record.member_id] = record.notes || "";
      }
    });

    setAttendance(initialAttendance);
    setNotes(initialNotes);
    setLoadingAttendance(false);
  }

  function updateAttendance(memberId: string, status: string) {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: status,
    }));
  }

  function updateNotes(memberId: string, value: string) {
    setNotes((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  }

  function bulkSetAttendance(status: string) {
    const updatedAttendance: Record<string, string> = {};

    filteredMembers.forEach((member) => {
      updatedAttendance[member.id] = status;
    });

    setAttendance((prev) => ({
      ...prev,
      ...updatedAttendance,
    }));
  }

  async function saveAttendance() {
    if (!selectedActivityId) {
      alert("Sila pilih aktiviti dahulu.");
      return;
    }

    if (members.length === 0) {
      alert("Tiada ahli dalam kumpulan ini.");
      return;
    }

    const selectedActivity = activities.find(
      (activity) => activity.id === selectedActivityId
    );

    if (!selectedActivity) {
      alert("Aktiviti tidak dijumpai.");
      return;
    }

    setSaving(true);

    const attendanceDate =
      selectedActivity.activity_date || new Date().toISOString().slice(0, 10);

    const memberIds = members.map((member) => member.id);

    // Ambil rekod sedia ada dulu supaya save sentiasa update row yang sama.
    // Ini lebih reliable daripada upsert onConflict sebab sesetengah DB schema
    // ada partial unique index yang Supabase REST susah match.
    const { data: existingRows, error: existingError } = await supabase
      .from("attendance")
      .select("id, member_id")
      .eq("activity_id", selectedActivityId)
      .in("member_id", memberIds)
      .is("deleted_at", null);

    if (existingError) {
      alert(existingError.message);
      setSaving(false);
      return;
    }

    const existingMap = new Map(
      (existingRows || []).map((row: any) => [row.member_id, row.id])
    );

    const basePayload = {
      activity_id: selectedActivityId,
      attendance_date: attendanceDate,
      district: district || selectedActivity.district || null,
      district_environment_id:
        districtEnvironmentId || selectedActivity.district_environment_id || null,
      group_id: groupId || null,
      group_name: groupName || selectedActivity.group_name || null,
      recorded_by: recordedBy,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    const updatePromises = members.map((member) => {
      const payload = {
        ...basePayload,
        member_id: member.id,
        status: attendance[member.id] || "Hadir",
        notes: notes[member.id]?.trim() || null,
      };

      const existingId = existingMap.get(member.id);

      if (existingId) {
        return supabase.from("attendance").update(payload).eq("id", existingId);
      }

      return supabase
        .from("attendance")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        });
    });

    const results = await Promise.all(updatePromises);
    const failed = results.find((result) => result.error);

    if (failed?.error) {
      alert(failed.error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "UPDATE",
      `Kemaskini kehadiran untuk aktiviti ${selectedActivity.activity_name || "-"}`,
      selectedActivityId
    );

    await fetchHistory();
    await loadExistingAttendance(selectedActivityId, members);

    setSaving(false);
    alert("Kehadiran berjaya disimpan.");
  }

  function exportCSV() {
    const selectedActivity = activities.find(
      (activity) => activity.id === selectedActivityId
    );

    const headers = [
      "BIL",
      "NAMA AHLI",
      "NO KP",
      "UNIT",
      "AKTIVITI",
      "TARIKH",
      "STATUS",
      "CATATAN",
    ];

    const rows = filteredMembers.map((member, index) => [
      index + 1,
      member.full_name || "",
      member.ic_number || "",
      getMemberUnit(member),
      selectedActivity?.activity_name || "",
      selectedActivity?.activity_date || "",
      attendance[member.id] || "Hadir",
      notes[member.id] || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `kehadiran-${groupName || "kumpulan"}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const selectedActivity = activities.find(
      (activity) => activity.id === selectedActivityId
    );

    const summary = attendanceSummary;

    const rows = filteredMembers
      .map(
        (member, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${member.full_name || "-"}</td>
          <td>${member.ic_number || "-"}</td>
          <td>${getMemberUnit(member)}</td>
          <td>${attendance[member.id] || "Hadir"}</td>
          <td>${notes[member.id] || "-"}</td>
        </tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Popup blocked. Sila allow popup untuk export PDF.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Kehadiran</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin-bottom: 4px; }
            .muted { color: #6b7280; }
            .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0; }
            .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
            .card small { color: #6b7280; display: block; }
            .card strong { font-size: 22px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th { background: #0f7a3b; color: white; text-align: left; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            @page { size: A4 landscape; margin: 12mm; }
          </style>
        </head>
        <body>
          <h1>Laporan Kehadiran Kumpulan</h1>
          <div class="muted">Kumpulan: <strong>${groupName || "-"}</strong></div>
          <div class="muted">Aktiviti: <strong>${selectedActivity?.activity_name || "-"}</strong></div>
          <div class="muted">Tarikh: <strong>${formatDate(selectedActivity?.activity_date)}</strong></div>
          <div class="muted">Lokasi: <strong>${selectedActivity?.location || "-"}</strong></div>

          <div class="summary">
            <div class="card"><small>Jumlah Ahli</small><strong>${summary.total}</strong></div>
            <div class="card"><small>Hadir</small><strong>${summary.hadir}</strong></div>
            <div class="card"><small>Tidak Hadir</small><strong>${summary.tidakHadir}</strong></div>
            <div class="card"><small>Lewat</small><strong>${summary.lewat}</strong></div>
            <div class="card"><small>Peratus Hadir</small><strong>${summary.percentage}%</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Bil</th>
                <th>Nama Ahli</th>
                <th>No KP</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  const selectedActivity = useMemo(() => {
    return activities.find((activity) => activity.id === selectedActivityId) || null;
  }, [activities, selectedActivityId]);

  const filteredMembers = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return members.filter((member) => {
      const status = attendance[member.id] || "Hadir";
      const matchSearch =
        !keyword ||
        String(member.full_name || "").toLowerCase().includes(keyword) ||
        String(member.ic_number || "").toLowerCase().includes(keyword) ||
        getMemberUnit(member).toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [members, attendance, search, statusFilter]);

  const attendanceSummary = useMemo(() => {
    const total = members.length;
    const hadir = members.filter(
      (member) => (attendance[member.id] || "Hadir") === "Hadir"
    ).length;
    const tidakHadir = members.filter(
      (member) => attendance[member.id] === "Tidak Hadir"
    ).length;
    const lewat = members.filter((member) => attendance[member.id] === "Lewat")
      .length;
    const bersebab = members.filter(
      (member) => attendance[member.id] === "Bersebab"
    ).length;

    return {
      total,
      hadir,
      tidakHadir,
      lewat,
      bersebab,
      percentage: calculatePercentage(hadir + lewat + bersebab, total),
    };
  }, [members, attendance]);

  const activityHistory = useMemo(() => {
    const activityMap = new Map(activities.map((activity) => [activity.id, activity]));
    const grouped: Record<
      string,
      {
        activity: Activity | null;
        total: number;
        hadir: number;
        tidakHadir: number;
        lewat: number;
        bersebab: number;
      }
    > = {};

    attendanceHistory.forEach((record) => {
      if (!grouped[record.activity_id]) {
        grouped[record.activity_id] = {
          activity: activityMap.get(record.activity_id) || null,
          total: 0,
          hadir: 0,
          tidakHadir: 0,
          lewat: 0,
          bersebab: 0,
        };
      }

      grouped[record.activity_id].total += 1;

      if (record.status === "Hadir") grouped[record.activity_id].hadir += 1;
      if (record.status === "Tidak Hadir") grouped[record.activity_id].tidakHadir += 1;
      if (record.status === "Lewat") grouped[record.activity_id].lewat += 1;
      if (record.status === "Bersebab") grouped[record.activity_id].bersebab += 1;
    });

    return Object.values(grouped).slice(0, 6);
  }, [attendanceHistory, activities]);

  const selectedMemberHistory = useMemo(() => {
    if (!selectedMember) return [];

    const activityMap = new Map(activities.map((activity) => [activity.id, activity]));

    return attendanceHistory
      .filter((record) => record.member_id === selectedMember.id)
      .map((record) => ({
        ...record,
        activity: activityMap.get(record.activity_id) || null,
      }));
  }, [selectedMember, attendanceHistory, activities]);

  if (!groupId && !groupName) {
    return (
      <DashboardLayout role="groupLeader">
        <div className="alert alert-warning rounded-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Akaun anda belum dipautkan dengan kumpulan. Sila hubungi Pesuruhjaya
          Daerah untuk kemaskini kumpulan anda.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Kehadiran Ahli</h2>
          <p className="text-muted mb-0">
            Rekod kehadiran ahli untuk kumpulan <strong>{groupName || "-"}</strong>.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-success"
            onClick={exportCSV}
            disabled={!selectedActivityId || members.length === 0}
          >
            <i className="bi bi-file-earmark-spreadsheet me-1"></i>
            Export CSV
          </button>

          <button
            className="btn btn-outline-danger"
            onClick={exportPDF}
            disabled={!selectedActivityId || members.length === 0}
          >
            <i className="bi bi-file-earmark-pdf me-1"></i>
            Export PDF
          </button>

          <button
            className="btn btn-success"
            onClick={saveAttendance}
            disabled={saving || !selectedActivityId || members.length === 0}
          >
            <i className="bi bi-save me-1"></i>
            {saving ? "Menyimpan..." : "Simpan Kehadiran"}
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="row g-3 align-items-end">
            <div className="col-lg-7">
              <label className="form-label fw-semibold">Pilih Aktiviti</label>
              <select
                className="form-select"
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
              >
                <option value="">Pilih Aktiviti</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.activity_name || "-"} - {formatDate(activity.activity_date)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-lg-5">
              {selectedActivity ? (
                <div className="border rounded-4 p-3 bg-light">
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <div className="fw-bold">{selectedActivity.activity_name}</div>
                      <small className="text-muted d-block">
                        <i className="bi bi-calendar-event me-1"></i>
                        {formatDate(selectedActivity.activity_date)}
                      </small>
                      <small className="text-muted d-block">
                        <i className="bi bi-geo-alt me-1"></i>
                        {selectedActivity.location || "-"}
                      </small>
                    </div>

                    <span
                      className={`badge rounded-pill ${activityStatusBadge(
                        selectedActivity.status
                      )}`}
                    >
                      {selectedActivity.status || "Akan Datang"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="alert alert-warning rounded-4 mb-0">
                  Tiada aktiviti dipilih.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-2">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Jumlah Ahli</small>
              <h3 className="fw-bold mb-0">{attendanceSummary.total}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Hadir</small>
              <h3 className="fw-bold text-success mb-0">{attendanceSummary.hadir}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Tidak Hadir</small>
              <h3 className="fw-bold text-danger mb-0">
                {attendanceSummary.tidakHadir}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Lewat</small>
              <h3 className="fw-bold text-warning mb-0">{attendanceSummary.lewat}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Bersebab</small>
              <h3 className="fw-bold text-info mb-0">{attendanceSummary.bersebab}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Peratus</small>
              <h3 className="fw-bold text-success mb-0">
                {attendanceSummary.percentage}%
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Cari nama ahli, No KP atau unit..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                {ATTENDANCE_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                <button
                  className="btn btn-sm btn-outline-success"
                  onClick={() => bulkSetAttendance("Hadir")}
                  disabled={filteredMembers.length === 0}
                >
                  Semua Hadir
                </button>

                <button
                  className="btn btn-sm btn-outline-warning"
                  onClick={() => bulkSetAttendance("Lewat")}
                  disabled={filteredMembers.length === 0}
                >
                  Semua Lewat
                </button>

                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => bulkSetAttendance("Tidak Hadir")}
                  disabled={filteredMembers.length === 0}
                >
                  Semua Tidak Hadir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Senarai Kehadiran</h5>
              <p className="text-muted small mb-0">
                Tandakan status kehadiran setiap ahli untuk aktiviti dipilih.
              </p>
            </div>

            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4 py-3">Ahli</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Catatan</th>
                    <th className="px-4 py-3 text-end">Sejarah</th>
                  </tr>
                </thead>

                <tbody>
                  {loading || loadingAttendance ? (
                    <tr>
                      <td colSpan={4} className="text-center py-5">
                        <div className="spinner-border text-success"></div>
                        <p className="text-muted mt-3 mb-0">
                          Memuatkan kehadiran...
                        </p>
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-5 text-muted">
                        <i className="bi bi-people fs-1 d-block mb-2"></i>
                        Tiada ahli dijumpai.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="px-4 py-3">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                              style={{ width: 40, height: 40 }}
                            >
                              {getInitials(member.full_name)}
                            </div>

                            <div>
                              <div className="fw-semibold">
                                {member.full_name || "-"}
                              </div>
                              <small className="text-muted">
                                {getMemberUnit(member)}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3" style={{ minWidth: 260 }}>
                          <div className="btn-group btn-group-sm flex-wrap" role="group">
                            {ATTENDANCE_STATUSES.map((status) => (
                              <button
                                key={status}
                                type="button"
                                className={`btn ${
                                  (attendance[member.id] || "Hadir") === status
                                    ? "btn-success"
                                    : "btn-outline-secondary"
                                }`}
                                onClick={() => updateAttendance(member.id, status)}
                              >
                                {status}
                              </button>
                            ))}
                          </div>

                          <div className="mt-2">
                            <span
                              className={`badge rounded-pill ${statusBadge(
                                attendance[member.id]
                              )}`}
                            >
                              {attendance[member.id] || "Hadir"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3" style={{ minWidth: 220 }}>
                          <input
                            className="form-control form-control-sm"
                            placeholder="Catatan jika ada"
                            value={notes[member.id] || ""}
                            onChange={(e) => updateNotes(member.id, e.target.value)}
                          />
                        </td>

                        <td className="px-4 py-3 text-end">
                          <button
                            className="btn btn-sm btn-light border"
                            onClick={() => setSelectedMember(member)}
                            title="Sejarah ahli"
                          >
                            <i className="bi bi-clock-history text-primary"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Sejarah Aktiviti</h5>
              <p className="text-muted small mb-0">
                Ringkasan kehadiran aktiviti terkini.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              {activityHistory.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-calendar-check fs-1 d-block mb-2"></i>
                  Tiada sejarah kehadiran lagi.
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {activityHistory.map((item) => {
                    const percentage = calculatePercentage(
                      item.hadir + item.lewat + item.bersebab,
                      item.total
                    );

                    return (
                      <div
                        key={item.activity?.id || Math.random()}
                        className="border rounded-4 p-3"
                      >
                        <div className="fw-semibold mb-1">
                          {item.activity?.activity_name || "Aktiviti Tidak Dijumpai"}
                        </div>
                        <small className="text-muted d-block mb-2">
                          {formatDate(item.activity?.activity_date)}
                        </small>

                        <div className="d-flex justify-content-between small mb-2">
                          <span>Hadir/Lewat/Bersebab</span>
                          <strong>
                            {item.hadir + item.lewat + item.bersebab}/{item.total}
                          </strong>
                        </div>

                        <div className="progress rounded-pill" style={{ height: 8 }}>
                          <div
                            className="progress-bar bg-success"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>

                        <div className="small text-muted mt-2">
                          {percentage}% kehadiran
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedMember && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Sejarah Kehadiran Ahli</h5>
                  <small className="text-muted">
                    {selectedMember.full_name || "-"} · {getMemberUnit(selectedMember)}
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => setSelectedMember(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {selectedMemberHistory.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-clock-history fs-1 d-block mb-2"></i>
                    Tiada sejarah kehadiran untuk ahli ini.
                  </div>
                ) : (
                  <div className="table-responsive border rounded-4">
                    <table className="table align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Aktiviti</th>
                          <th>Tarikh</th>
                          <th>Status</th>
                          <th>Catatan</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedMemberHistory.map((record) => (
                          <tr key={record.id || `${record.activity_id}-${record.member_id}`}>
                            <td>{record.activity?.activity_name || "-"}</td>
                            <td>{formatDate(record.attendance_date)}</td>
                            <td>
                              <span
                                className={`badge rounded-pill ${statusBadge(
                                  record.status
                                )}`}
                              >
                                {record.status}
                              </span>
                            </td>
                            <td>{record.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedMember(null)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
