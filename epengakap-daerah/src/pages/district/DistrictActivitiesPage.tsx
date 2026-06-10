import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Activity = {
  id: string;
  activity_name: string | null;
  activity_date: string | null;
  activity_end_at: string | null;
  group_id: string | null;
  group_name: string | null;
  location: string | null;
  description: string | null;
  status: string | null;
  district: string | null;
  district_environment_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type ScoutGroup = {
  id: string;
  group_name: string;
  school_name: string | null;
  status: string | null;
  district: string | null;
  district_environment_id: string | null;
};

type ActivityForm = {
  activity_name: string;
  activity_date: string;
  activity_end_at: string;
  group_id: string;
  group_name: string;
  location: string;
  description: string;
  status: string;
};

const STATUS_OPTIONS = ["Aktif", "Tidak Aktif", "Dibatalkan"];

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

function normalizeRole(role?: string | null) {
  if (role === "Penolong Pesuruhjaya") return "Penolong Pesuruhjaya Daerah";
  if (role === "District") return "Pesuruhjaya Daerah";
  return role || "";
}

function isGroupLevelRole(role?: string | null) {
  const cleanRole = normalizeRole(role);
  return cleanRole === "Pemimpin Kumpulan" || cleanRole === "Penolong Pemimpin";
}

function canManageActivity(role?: string | null) {
  const cleanRole = normalizeRole(role);

  return [
    "Pesuruhjaya Daerah",
    "Penolong Pesuruhjaya Daerah",
    "Pemimpin Kumpulan",
    "Penolong Pemimpin",
  ].includes(cleanRole);
}

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "active" || value === "aktif") return "Aktif";
  if (value === "inactive" || value === "tidak aktif") return "Tidak Aktif";
  if (value === "cancelled" || value === "canceled" || value === "dibatalkan") {
    return "Dibatalkan";
  }

  return status || "Aktif";
}

function isActive(status?: string | null) {
  return normalizeStatus(status) === "Aktif";
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
    hour12: true,
  });
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function getAutoActivityStatus(activity: Activity, now = new Date()) {
  const manualStatus = normalizeStatus(activity.status);

  if (manualStatus === "Dibatalkan") {
    return {
      label: "Dibatalkan",
      icon: "bi-x-circle",
      badgeClass: "bg-danger",
    };
  }

  if (!isActive(activity.status)) {
    return {
      label: "Tidak Aktif",
      icon: "bi-dash-circle",
      badgeClass: "bg-secondary",
    };
  }

  const start = activity.activity_date ? new Date(activity.activity_date) : null;
  const end = activity.activity_end_at
    ? new Date(activity.activity_end_at)
    : null;

  if (start && !Number.isNaN(start.getTime()) && now < start) {
    return {
      label: "Akan Datang",
      icon: "bi-clock",
      badgeClass: "bg-warning text-dark",
    };
  }

  if (end && !Number.isNaN(end.getTime()) && now > end) {
    return {
      label: "Selesai",
      icon: "bi-check-circle",
      badgeClass: "bg-success",
    };
  }

  return {
    label: "Sedang Berlangsung",
    icon: "bi-play-circle",
    badgeClass: "bg-primary",
  };
}

async function addAuditLog(
  action: string,
  description: string,
  recordId?: string | null
) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name: currentUser.full_name || currentUser.name || "Unknown User",
      actor_role: currentUser.role || "Unknown Role",
      action,
      module: "Aktiviti",
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

export default function ActivityManagementPage() {
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
    group_id: "",
    group_name: "",
    location: "",
    description: "",
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

    if (groupId) return query.eq("group_id", groupId);
    if (groupName) return query.eq("group_name", groupName);

    return query;
  }

  function applyGroupScopeForUpdate(query: any, record: Activity) {
    if (!isGroupLevelRole(role)) return query;

    if (groupId) return query.eq("group_id", groupId);
    if (groupName) return query.eq("group_name", groupName);
    if (record.group_id) return query.eq("group_id", record.group_id);

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

    setGroups(
      ((data || []) as ScoutGroup[]).filter(
        (group) => normalizeStatus(group.status) === "Aktif"
      )
    );
  }

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();

    groups.forEach((group) => {
      map.set(group.id, group.group_name);
    });

    return map;
  }, [groups]);

  function getLiveGroupName(activity: Activity) {
    if (activity.group_id && groupNameById.has(activity.group_id)) {
      return groupNameById.get(activity.group_id) || activity.group_name || "-";
    }

    return activity.group_name || "-";
  }

  const filteredActivities = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return activities.filter((activity) => {
      const autoStatus = getAutoActivityStatus(activity, now);
      const liveGroupName = getLiveGroupName(activity);

      const matchSearch =
        !keyword ||
        (activity.activity_name || "").toLowerCase().includes(keyword) ||
        (activity.location || "").toLowerCase().includes(keyword) ||
        liveGroupName.toLowerCase().includes(keyword) ||
        (activity.description || "").toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || autoStatus.label === statusFilter;

      const matchGroup =
        groupFilter === "Semua Kumpulan" ||
        activity.group_id === groupFilter ||
        liveGroupName === groupFilter;

      return matchSearch && matchStatus && matchGroup;
    });
  }, [
    activities,
    groups,
    groupNameById,
    search,
    statusFilter,
    groupFilter,
    now,
  ]);

  const upcomingCount = useMemo(
    () =>
      activities.filter(
        (activity) => getAutoActivityStatus(activity, now).label === "Akan Datang"
      ).length,
    [activities, now]
  );

  const runningCount = useMemo(
    () =>
      activities.filter(
        (activity) =>
          getAutoActivityStatus(activity, now).label === "Sedang Berlangsung"
      ).length,
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
      group_id: isGroupLevelRole(role) ? groupId || defaultGroup?.id || "" : "",
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
      group_name: getLiveGroupName(activity),

      // IMPORTANT: jangan paksa jadi Aktif
      // Kalau DB status = Tidak Aktif, modal edit pun akan tunjuk Tidak Aktif
      status: normalizeStatus(activity.status),
    });

    setShowActivityModal(true);
  }

  function openViewModal(activity: Activity) {
    setSelectedActivity(activity);
    setShowViewModal(true);
  }

  function openCancelModal(activity: Activity) {
    if (!canManageActivity(role)) {
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
        editingActivity.id
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
        data?.id || null
      );
    }

    await fetchActivities();
    resetForm();
    setShowActivityModal(false);
    setSaving(false);
  }

  async function cancelActivity() {
    if (!cancelTarget) return;

    setSaving(true);

    let query = supabase
      .from("activities")
      .update({
        status: "Dibatalkan",
        updated_at: new Date().toISOString(),
      })
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
      `Batalkan aktiviti: ${cancelTarget.activity_name || "-"}`,
      cancelTarget.id
    );

    await fetchActivities();
    setCancelTarget(null);
    setShowCancelModal(false);
    setSaving(false);
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Aktiviti</h2>
          <p className="text-muted mb-0">
            Urus aktiviti kumpulan dan pantau status secara automatik.
          </p>
        </div>

        {canManageActivity(role) && (
          <button type="button" className="btn btn-success" onClick={openAddModal}>
            <i className="bi bi-plus-circle me-1"></i>
            Tambah Aktiviti
          </button>
        )}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Akan Datang</small>
              <h4 className="fw-bold text-warning mb-0">{upcomingCount}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Berlangsung</small>
              <h4 className="fw-bold text-primary mb-0">{runningCount}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Selesai</small>
              <h4 className="fw-bold text-success mb-0">{completedCount}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Dibatalkan</small>
              <h4 className="fw-bold text-danger mb-0">{cancelledCount}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Cari aktiviti, kumpulan, lokasi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                disabled={isGroupLevelRole(role)}
              >
                <option>Semua Kumpulan</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.group_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                <option>Akan Datang</option>
                <option>Sedang Berlangsung</option>
                <option>Selesai</option>
                <option>Dibatalkan</option>
                <option>Tidak Aktif</option>
              </select>
            </div>

            <div className="col-md-2">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("Semua Status");
                  setGroupFilter("Semua Kumpulan");
                }}
              >
                Reset
              </button>
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
                <th>Status</th>
                <th className="text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">
                      Memuatkan aktiviti...
                    </p>
                  </td>
                </tr>
              ) : filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <i className="bi bi-calendar-event fs-1 d-block mb-2"></i>
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
                          {activity.activity_name || "-"}
                        </div>
                        <small className="text-muted">
                          {activity.description || "-"}
                        </small>
                      </td>

                      <td>{getLiveGroupName(activity)}</td>
                      <td>{formatDateTime(activity.activity_date)}</td>
                      <td>{formatDateTime(activity.activity_end_at)}</td>
                      <td>{activity.location || "-"}</td>

                      <td>
                        <span
                          className={`badge rounded-pill ${autoStatus.badgeClass}`}
                        >
                          <i className={`bi ${autoStatus.icon} me-1`}></i>
                          {autoStatus.label}
                        </span>
                      </td>

                      <td className="text-end">
                        <div className="btn-group">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            onClick={() => openViewModal(activity)}
                            title="Lihat aktiviti"
                            aria-label="Lihat aktiviti"
                          >
                            <i className="bi bi-eye text-primary"></i>
                          </button>

                          {canManageActivity(role) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              onClick={() => openEditModal(activity)}
                              title="Edit aktiviti"
                              aria-label="Edit aktiviti"
                            >
                              <i className="bi bi-pencil-square text-secondary"></i>
                            </button>
                          )}

                          {canManageActivity(role) &&
                            normalizeStatus(activity.status) !==
                              "Dibatalkan" && (
                              <button
                                type="button"
                                className="btn btn-sm btn-light border"
                                onClick={() => openCancelModal(activity)}
                                title="Batalkan aktiviti"
                                aria-label="Batalkan aktiviti"
                              >
                                <i className="bi bi-x-circle text-danger"></i>
                              </button>
                            )}
                        </div>
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
                <div className="row g-3">
                  <div className="col-md-12">
                    <label className="form-label">Nama Aktiviti</label>
                    <input
                      className="form-control"
                      value={form.activity_name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          activity_name: e.target.value,
                        })
                      }
                      placeholder="Contoh: Jambori"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kumpulan</label>
                    <select
                      className="form-select"
                      value={form.group_id}
                      onChange={(e) => {
                        const selectedGroup = groups.find(
                          (group) => group.id === e.target.value
                        );

                        setForm({
                          ...form,
                          group_id: e.target.value,
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
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status: e.target.value,
                        })
                      }
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Mula</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={form.activity_date}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          activity_date: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Tamat</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={form.activity_end_at}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          activity_end_at: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Lokasi</label>
                    <input
                      className="form-control"
                      value={form.location}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          location: e.target.value,
                        })
                      }
                      placeholder="Contoh: Taman Pengakap"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Penerangan</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          description: e.target.value,
                        })
                      }
                      placeholder="Catatan atau penerangan aktiviti"
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
                <h5 className="fw-bold">
                  {selectedActivity.activity_name || "-"}
                </h5>

                <div className="list-group list-group-flush mt-3">
                  <div className="list-group-item d-flex justify-content-between">
                    <span>Kumpulan</span>
                    <strong>{getLiveGroupName(selectedActivity)}</strong>
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

                  <div className="list-group-item d-flex justify-content-between">
                    <span>Status</span>
                    <strong>
                      {getAutoActivityStatus(selectedActivity, now).label}
                    </strong>
                  </div>

                  <div className="list-group-item">
                    <span className="d-block text-muted mb-1">Penerangan</span>
                    <strong>{selectedActivity.description || "-"}</strong>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Tutup
                </button>

                {canManageActivity(role) && (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => {
                      setShowViewModal(false);
                      openEditModal(selectedActivity);
                    }}
                  >
                    <i className="bi bi-pencil-square me-1"></i>
                    Edit Aktiviti
                  </button>
                )}
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
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelTarget(null);
                  }}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu batalkan aktiviti ini?
                </p>

                <strong>{cancelTarget.activity_name || "-"}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Aktiviti tidak dipadam. Status akan ditukar kepada Dibatalkan.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelTarget(null);
                  }}
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