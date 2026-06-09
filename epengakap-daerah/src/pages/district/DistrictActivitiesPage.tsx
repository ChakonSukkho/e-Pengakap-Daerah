import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Activity = {
  id: string;
  group_id: string | null;
  group_name: string | null;
  activity_name: string;
  activity_date: string;
  activity_end_at: string | null;
  location: string | null;
  description: string | null;
  status: string;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type ScoutGroup = {
  id: string;
  group_name: string;
  school_name: string | null;
  status: string | null;
  district?: string | null;
  district_environment_id?: string | null;
};

type ActivityForm = {
  activity_name: string;
  activity_date: string;
  activity_end_at: string;
  location: string;
  description: string;
  group_id: string;
  group_name: string;
  status: string;
};

const AUTO_STATUS_OPTIONS = [
  "Semua Status",
  "Akan Datang",
  "Bermula",
  "Sedang Berlangsung",
  "Hampir Tamat",
  "Selesai",
  "Dibatalkan",
];

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

  if (value === "aktif" || value === "active") return "Aktif";
  if (value === "tidak aktif" || value === "inactive") return "Tidak Aktif";
  if (value === "digantung" || value === "suspended") return "Digantung";
  if (
    value === "dibatalkan" ||
    value === "cancelled" ||
    value === "canceled"
  ) {
    return "Dibatalkan";
  }

  if (value === "selesai" || value === "completed") return "Selesai";

  return status || "Aktif";
}

function isDistrictLevelRole(role?: string | null) {
  return (
    role === "Pesuruhjaya Daerah" ||
    role === "Penolong Pesuruhjaya" ||
    role === "Penolong Pesuruhjaya Daerah"
  );
}

function isGroupLevelRole(role?: string | null) {
  return role === "Pemimpin Kumpulan" || role === "Penolong Pemimpin";
}

function canCancelActivity(role?: string | null) {
  return (
    role === "Pesuruhjaya Daerah" ||
    role === "Penolong Pesuruhjaya" ||
    role === "Penolong Pesuruhjaya Daerah" ||
    role === "Pemimpin Kumpulan"
  );
}

function canManageActivity(role?: string | null) {
  return (
    role === "Pesuruhjaya Daerah" ||
    role === "Penolong Pesuruhjaya" ||
    role === "Penolong Pesuruhjaya Daerah" ||
    role === "Pemimpin Kumpulan" ||
    role === "Penolong Pemimpin"
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
}

function getAutoActivityStatus(activity: Activity, currentTime = new Date()) {
  const manualStatus = normalizeStatus(activity.status);

  if (manualStatus === "Dibatalkan") {
    return {
      label: "Dibatalkan",
      badgeClass: "bg-danger",
      icon: "bi-x-circle",
    };
  }

  const startTime = new Date(activity.activity_date);

  if (Number.isNaN(startTime.getTime())) {
    return {
      label: "Tarikh Tidak Sah",
      badgeClass: "bg-secondary",
      icon: "bi-exclamation-circle",
    };
  }

  const endTime = activity.activity_end_at
    ? new Date(activity.activity_end_at)
    : new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

  if (Number.isNaN(endTime.getTime())) {
    return {
      label: "Tarikh Tidak Sah",
      badgeClass: "bg-secondary",
      icon: "bi-exclamation-circle",
    };
  }

  if (currentTime < startTime) {
    return {
      label: "Akan Datang",
      badgeClass: "bg-info text-dark",
      icon: "bi-clock",
    };
  }

  if (currentTime >= startTime && currentTime <= endTime) {
    const minutesFromStart =
      (currentTime.getTime() - startTime.getTime()) / 1000 / 60;

    const minutesToEnd =
      (endTime.getTime() - currentTime.getTime()) / 1000 / 60;

    if (minutesFromStart <= 15) {
      return {
        label: "Bermula",
        badgeClass: "bg-primary",
        icon: "bi-play-circle",
      };
    }

    if (minutesToEnd <= 15) {
      return {
        label: "Hampir Tamat",
        badgeClass: "bg-warning text-dark",
        icon: "bi-hourglass-split",
      };
    }

    return {
      label: "Sedang Berlangsung",
      badgeClass: "bg-success",
      icon: "bi-broadcast",
    };
  }

  return {
    label: "Selesai",
    badgeClass: "bg-bg-success",
    icon: "bi-check-circle",
  };
}

async function addAuditLog(
  action: string,
  description: string,
  recordId?: string | null,
  oldValue?: any,
  newValue?: any
) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name:
        currentUser.full_name || currentUser.name || currentUser.email || "Unknown User",
      actor_role: currentUser.role || "Unknown Role",
      action,
      module: "Aktiviti",
      description,
      user_id: currentUser.id || null,
      district_environment_id: currentUser.district_environment_id || null,
      record_id: recordId || null,
      old_value: oldValue || null,
      new_value: newValue || null,
      ip_address: null,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Jangan block proses utama kalau audit log gagal.
  }
}

export default function DistrictActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);

  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [groupFilter, setGroupFilter] = useState("Semua Kumpulan");

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Activity | null>(null);

  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const currentUser = useMemo(() => getCurrentUser(), []);
  const role = currentUser.role || "";
  const districtEnvironmentId = currentUser.district_environment_id || "";
  const district =
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    "";
  const groupId = currentUser.group_id || "";
  const groupName = currentUser.group_name || "";

  const [form, setForm] = useState<ActivityForm>({
    activity_name: "",
    activity_date: "",
    activity_end_at: "",
    location: "",
    description: "",
    group_id: "",
    group_name: "",
    status: "Aktif",
  });

  useEffect(() => {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      setLoading(false);
      return;
    }

    fetchActivities();
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
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

  function applyGroupScopeForQuery(query: any) {
    if (!isGroupLevelRole(role)) return query;

    if (groupId) {
      return query.eq("group_id", groupId);
    }

    if (groupName) {
      return query.eq("group_name", groupName);
    }

    return query;
  }

  function applyGroupScopeForUpdate(query: any, record: Activity) {
    if (!isGroupLevelRole(role)) return query;

    if (groupId) {
      return query.eq("group_id", groupId);
    }

    if (groupName) {
      return query.eq("group_name", groupName);
    }

    if (record.group_id) {
      return query.eq("group_id", record.group_id);
    }

    return query.eq("group_name", record.group_name || "");
  }

  async function fetchActivities() {
    setLoading(true);

    let query = supabase
      .from("activities")
      .select(
        "id, group_id, group_name, activity_name, activity_date, activity_end_at, location, description, status, district, district_environment_id, created_at, updated_at, deleted_at"
      )
      .is("deleted_at", null)
      .order("activity_date", { ascending: true });

    query = applyDistrictScope(query);
    query = applyGroupScopeForQuery(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setActivities([]);
      setLoading(false);
      return;
    }

    setActivities((data || []) as Activity[]);
    setLoading(false);
  }

  async function fetchGroups() {
    let query = supabase
      .from("groups")
      .select(
        "id, group_name, school_name, status, district, district_environment_id"
      )
      .is("deleted_at", null)
      .order("group_name", { ascending: true });

    query = applyDistrictScope(query);

    if (isGroupLevelRole(role)) {
      if (groupId) {
        query = query.eq("id", groupId);
      } else if (groupName) {
        query = query.eq("group_name", groupName);
      }
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setGroups([]);
      return;
    }

    const activeGroups = ((data || []) as ScoutGroup[]).filter(
      (group) => normalizeStatus(group.status) === "Aktif"
    );

    setGroups(activeGroups);
  }

  const filteredActivities = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return activities.filter((activity) => {
      const autoStatus = getAutoActivityStatus(activity, now);

      const matchSearch =
        !keyword ||
        (activity.activity_name || "").toLowerCase().includes(keyword) ||
        (activity.location || "").toLowerCase().includes(keyword) ||
        (activity.group_name || "").toLowerCase().includes(keyword) ||
        (activity.description || "").toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || autoStatus.label === statusFilter;

      const matchGroup =
        groupFilter === "Semua Kumpulan" ||
        activity.group_name === groupFilter ||
        activity.group_id === groupFilter;

      return matchSearch && matchStatus && matchGroup;
    });
  }, [activities, search, statusFilter, groupFilter, now]);

  const upcomingCount = useMemo(
    () =>
      activities.filter(
        (activity) => getAutoActivityStatus(activity, now).label === "Akan Datang"
      ).length,
    [activities, now]
  );

  const runningCount = useMemo(
    () =>
      activities.filter((activity) => {
        const label = getAutoActivityStatus(activity, now).label;
        return (
          label === "Bermula" ||
          label === "Sedang Berlangsung" ||
          label === "Hampir Tamat"
        );
      }).length,
    [activities, now]
  );

  const completedCount = useMemo(
    () =>
      activities.filter(
        (activity) => getAutoActivityStatus(activity, now).label === "Selesai"
      ).length,
    [activities, now]
  );

  const cancelledCount = useMemo(
    () =>
      activities.filter(
        (activity) =>
          getAutoActivityStatus(activity, now).label === "Dibatalkan"
      ).length,
    [activities, now]
  );

  function resetForm() {
    setEditingActivity(null);

    const defaultGroup = groups[0] || null;

    setForm({
      activity_name: "",
      activity_date: "",
      activity_end_at: "",
      location: "",
      description: "",
      group_id: isGroupLevelRole(role)
        ? groupId || defaultGroup?.id || ""
        : "",
      group_name: isGroupLevelRole(role)
        ? groupName || defaultGroup?.group_name || ""
        : "",
      status: "Aktif",
    });
  }

  function openAddModal() {
    if (!canManageActivity(role)) {
      alert("Anda tidak mempunyai kebenaran untuk menambah aktiviti.");
      return;
    }

    resetForm();
    setShowActivityModal(true);
  }

  function openEditModal(activity: Activity) {
    if (!canManageActivity(role)) {
      alert("Anda tidak mempunyai kebenaran untuk mengemaskini aktiviti.");
      return;
    }

    setEditingActivity(activity);

    setForm({
      activity_name: activity.activity_name || "",
      activity_date: toDateTimeLocalValue(activity.activity_date),
      activity_end_at: toDateTimeLocalValue(activity.activity_end_at),
      location: activity.location || "",
      description: activity.description || "",
      group_id: activity.group_id || "",
      group_name: activity.group_name || "",
      status:
        normalizeStatus(activity.status) === "Dibatalkan"
          ? "Dibatalkan"
          : "Aktif",
    });

    setShowActivityModal(true);
  }

  function openViewModal(activity: Activity) {
    setSelectedActivity(activity);
    setShowViewModal(true);
  }

  function openCancelModal(activity: Activity) {
    if (!canCancelActivity(role)) {
      alert("Anda tidak mempunyai kebenaran untuk membatalkan aktiviti.");
      return;
    }

    setCancelTarget(activity);
    setShowCancelModal(true);
  }

  function validateForm() {
    if (!form.activity_name.trim()) {
      alert("Sila isi nama aktiviti.");
      return false;
    }

    if (!form.activity_date) {
      alert("Sila isi tarikh dan masa mula aktiviti.");
      return false;
    }

    if (!form.activity_end_at) {
      alert("Sila isi tarikh dan masa tamat aktiviti.");
      return false;
    }

    const startTime = new Date(form.activity_date);
    const endTime = new Date(form.activity_end_at);

    if (Number.isNaN(startTime.getTime())) {
      alert("Tarikh dan masa mula tidak sah.");
      return false;
    }

    if (Number.isNaN(endTime.getTime())) {
      alert("Tarikh dan masa tamat tidak sah.");
      return false;
    }

    if (endTime <= startTime) {
      alert("Masa tamat mesti selepas masa mula.");
      return false;
    }

    if (!form.group_id && !form.group_name) {
      alert("Sila pilih kumpulan.");
      return false;
    }

    if (!form.location.trim()) {
      alert("Sila isi lokasi aktiviti.");
      return false;
    }

    return true;
  }

  async function saveActivity() {
    if (!validateForm()) return;

    setSaving(true);

    const selectedGroup = groups.find((group) => group.id === form.group_id);

    const payload = {
      activity_name: form.activity_name.trim(),
      activity_date: new Date(form.activity_date).toISOString(),
      activity_end_at: new Date(form.activity_end_at).toISOString(),
      location: form.location.trim() || null,
      description: form.description.trim() || null,
      group_id: selectedGroup?.id || form.group_id || null,
      group_name: selectedGroup?.group_name || form.group_name || null,
      status: form.status || "Aktif",
      district: district || null,
      district_environment_id: districtEnvironmentId || null,
      updated_at: new Date().toISOString(),
    };

    if (editingActivity) {
      let query = supabase
        .from("activities")
        .update(payload)
        .eq("id", editingActivity.id)
        .is("deleted_at", null);

      query = applyDistrictScope(query);
      query = applyGroupScopeForUpdate(query, editingActivity);

      const { error } = await query;

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "UPDATE",
        `Kemaskini aktiviti: ${form.activity_name}`,
        editingActivity.id,
        editingActivity,
        payload
      );
    } else {
      const { data, error } = await supabase
        .from("activities")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
          deleted_at: null,
        })
        .select("id")
        .single();

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "CREATE",
        `Tambah aktiviti: ${form.activity_name}`,
        data?.id || null,
        null,
        payload
      );
    }

    await fetchActivities();
    resetForm();
    setShowActivityModal(false);
    setSaving(false);
  }

  async function cancelActivity() {
    if (!cancelTarget) return;

    if (!canCancelActivity(role)) {
      alert("Anda tidak mempunyai kebenaran untuk membatalkan aktiviti.");
      return;
    }

    setSaving(true);

    const payload = {
      status: "Dibatalkan",
      updated_at: new Date().toISOString(),
    };

    let query = supabase
      .from("activities")
      .update(payload)
      .eq("id", cancelTarget.id)
      .is("deleted_at", null);

    query = applyDistrictScope(query);
    query = applyGroupScopeForUpdate(query, cancelTarget);

    const { error } = await query;

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "CANCEL",
      `Batalkan aktiviti: ${cancelTarget.activity_name}`,
      cancelTarget.id,
      cancelTarget,
      payload
    );

    await fetchActivities();
    setCancelTarget(null);
    setShowCancelModal(false);
    setSaving(false);
  }

  return (
    <DashboardLayout role={isDistrictLevelRole(role) ? "district" : "groupLeader"}>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Aktiviti</h2>
          <p className="text-muted mb-0">
            Status aktiviti dikira automatik mengikut tarikh dan masa mula/tamat.
          </p>
          <small className="text-muted">
            Masa semasa: {formatDateTime(now.toISOString())}
          </small>
        </div>

        <button
          type="button"
          className="btn btn-success"
          onClick={openAddModal}
          disabled={!canManageActivity(role)}
        >
          <i className="bi bi-plus-circle me-1"></i>
          Tambah Aktiviti
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <small className="text-muted">Akan Datang</small>
              <h3 className="fw-bold mb-0">{upcomingCount}</h3>
              <i className="bi bi-clock text-info fs-3"></i>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <small className="text-muted">Sedang Berlangsung</small>
              <h3 className="fw-bold mb-0">{runningCount}</h3>
              <i className="bi bi-broadcast text-success fs-3"></i>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <small className="text-muted">Selesai</small>
              <h3 className="fw-bold mb-0">{completedCount}</h3>
              <i className="bi bi-check-circle text-secondary fs-3"></i>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body">
              <small className="text-muted">Dibatalkan</small>
              <h3 className="fw-bold mb-0">{cancelledCount}</h3>
              <i className="bi bi-x-circle text-danger fs-3"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Carian</label>
              <input
                className="form-control"
                placeholder="Cari aktiviti, lokasi, kumpulan..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Status Auto</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {AUTO_STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
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
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Aktiviti</th>
                <th>Kumpulan</th>
                <th>Mula</th>
                <th>Tamat</th>
                <th>Lokasi</th>
                <th>Status Auto</th>
                <th className="text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">Memuatkan aktiviti...</p>
                  </td>
                </tr>
              ) : filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <i className="bi bi-calendar-x fs-1 d-block mb-2"></i>
                    Tiada aktiviti dijumpai.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((activity) => {
                  const autoStatus = getAutoActivityStatus(activity, now);

                  return (
                    <tr key={activity.id}>
                      <td>
                        <div className="fw-semibold">
                          {activity.activity_name}
                        </div>
                        <small className="text-muted">
                          {activity.description || "-"}
                        </small>
                      </td>

                      <td>{activity.group_name || "-"}</td>
                      <td>{formatDateTime(activity.activity_date)}</td>
                      <td>{formatDateTime(activity.activity_end_at)}</td>
                      <td>{activity.location || "-"}</td>

                      <td>
                        <span className={`badge ${autoStatus.badgeClass}`}>
                          <i className={`bi ${autoStatus.icon} me-1`}></i>
                          {autoStatus.label}
                        </span>
                      </td>

                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success me-1"
                          onClick={() => openViewModal(activity)}
                        >
                          View
                        </button>

                        {canManageActivity(role) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary me-1"
                            onClick={() => openEditModal(activity)}
                          >
                            Edit
                          </button>
                        )}

                        {canCancelActivity(role) &&
                          normalizeStatus(activity.status) !== "Dibatalkan" &&
                          autoStatus.label !== "Selesai" && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => openCancelModal(activity)}
                            >
                              Batal
                            </button>
                          )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showActivityModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingActivity ? "Edit Aktiviti" : "Tambah Aktiviti"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowActivityModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <div className="alert alert-info">
                  <strong>Status aktiviti dikira automatik.</strong>
                  <div className="small">
                    Isi masa mula dan masa tamat. Sistem akan auto paparkan Akan
                    Datang, Bermula, Sedang Berlangsung, Hampir Tamat atau
                    Selesai.
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-12">
                    <label className="form-label">Nama Aktiviti</label>
                    <input
                      className="form-control"
                      value={form.activity_name}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          activity_name: event.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Tarikh & Masa Mula</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={form.activity_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          activity_date: event.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Tarikh & Masa Tamat</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={form.activity_end_at}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          activity_end_at: event.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kumpulan</label>
                    <select
                      className="form-select"
                      value={form.group_id}
                      onChange={(event) => {
                        const selectedGroup = groups.find(
                          (group) => group.id === event.target.value
                        );

                        setForm({
                          ...form,
                          group_id: event.target.value,
                          group_name: selectedGroup?.group_name || "",
                        });
                      }}
                      disabled={saving || isGroupLevelRole(role)}
                    >
                      <option value="">Pilih Kumpulan</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.group_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Status Manual</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value })
                      }
                      disabled={saving}
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Dibatalkan">Dibatalkan</option>
                    </select>
                    <small className="text-muted">
                      Manual status hanya untuk cancel/aktifkan semula. Status
                      masa dikira auto.
                    </small>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Lokasi</label>
                    <input
                      className="form-control"
                      value={form.location}
                      onChange={(event) =>
                        setForm({ ...form, location: event.target.value })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Penerangan</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form.description}
                      onChange={(event) =>
                        setForm({ ...form, description: event.target.value })
                      }
                      disabled={saving}
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowActivityModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={saveActivity}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingActivity
                    ? "Simpan Perubahan"
                    : "Simpan Aktiviti"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedActivity && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Aktiviti</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                {(() => {
                  const autoStatus = getAutoActivityStatus(
                    selectedActivity,
                    now
                  );

                  return (
                    <>
                      <h5 className="fw-bold">
                        {selectedActivity.activity_name}
                      </h5>

                      <span className={`badge ${autoStatus.badgeClass} mb-3`}>
                        <i className={`bi ${autoStatus.icon} me-1`}></i>
                        {autoStatus.label}
                      </span>

                      <div className="list-group list-group-flush">
                        <div className="list-group-item d-flex justify-content-between">
                          <span>Kumpulan</span>
                          <strong>{selectedActivity.group_name || "-"}</strong>
                        </div>

                        <div className="list-group-item d-flex justify-content-between">
                          <span>Mula</span>
                          <strong>
                            {formatDateTime(selectedActivity.activity_date)}
                          </strong>
                        </div>

                        <div className="list-group-item d-flex justify-content-between">
                          <span>Tamat</span>
                          <strong>
                            {formatDateTime(selectedActivity.activity_end_at)}
                          </strong>
                        </div>

                        <div className="list-group-item d-flex justify-content-between">
                          <span>Lokasi</span>
                          <strong>{selectedActivity.location || "-"}</strong>
                        </div>

                        <div className="list-group-item">
                          <span className="text-muted d-block mb-1">
                            Penerangan
                          </span>
                          <strong>{selectedActivity.description || "-"}</strong>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && cancelTarget && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  Batalkan Aktiviti
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCancelModal(false)}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu batalkan aktiviti ini?
                </p>

                <strong>{cancelTarget.activity_name}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Rekod tidak dipadam. Status akan ditukar kepada Dibatalkan.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowCancelModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={cancelActivity}
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Ya, Batalkan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}