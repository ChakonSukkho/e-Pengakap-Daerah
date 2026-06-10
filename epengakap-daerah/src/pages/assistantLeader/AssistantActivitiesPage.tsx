import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Activity = {
  id: string;
  activity_name: string | null;
  activity_date: string | null;
  activity_end_at: string | null;
  location: string | null;
  description: string | null;
  group_id: string | null;
  group_name: string | null;
  district: string | null;
  district_environment_id: string | null;
  status: string | null;
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
  location: string;
  description: string;
  status: string;
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

const STATUS_OPTIONS = ["Aktif", "Tidak Aktif", "Dibatalkan"];

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
  recordId?: string | null,
  oldValue?: any,
  newValue?: any
) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name:
        currentUser.full_name || currentUser.name || "Penolong Pemimpin",
      actor_role: currentUser.role || "Penolong Pemimpin",
      action,
      module: "Aktiviti Kumpulan",
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

export default function AssistantActivitiesPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);

  const groupId = currentUser.group_id || "";
  const fallbackGroupName = currentUser.group_name || "";
  const district = currentUser.district || "";
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [activities, setActivities] = useState<Activity[]>([]);
  const [group, setGroup] = useState<ScoutGroup | null>(null);

  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Activity | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [form, setForm] = useState<ActivityForm>({
    activity_name: "",
    activity_date: "",
    activity_end_at: "",
    location: "",
    description: "",
    status: "Aktif",
  });

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  async function fetchAll() {
    setLoading(true);

    await fetchGroup();
    await fetchActivities();

    setLoading(false);
  }

  async function fetchGroup() {
    if (!groupId && !fallbackGroupName) {
      setGroup(null);
      return;
    }

    let query = supabase
      .from("groups")
      .select(
        "id, group_name, school_name, status, district, district_environment_id"
      )
      .is("deleted_at", null)
      .limit(1);

    if (groupId) {
      query = query.eq("id", groupId);
    } else {
      query = query.eq("group_name", fallbackGroupName);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    } else if (district) {
      query = query.eq("district", district);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Fetch group warning:", error.message);
      setGroup(null);
      return;
    }

    setGroup(((data || [])[0] as ScoutGroup) || null);
  }

  function getLatestGroupName() {
    return group?.group_name || fallbackGroupName || "";
  }

  function getLatestGroupId() {
    return group?.id || groupId || "";
  }

  function getLiveGroupName(activity?: Activity | null) {
    if (activity?.group_id && group?.id && activity.group_id === group.id) {
      return group.group_name;
    }

    if (group?.group_name) {
      return group.group_name;
    }

    return activity?.group_name || fallbackGroupName || "-";
  }

  async function fetchActivities() {
    if (!groupId && !fallbackGroupName) {
      setActivities([]);
      return;
    }

    let query = supabase
      .from("activities")
      .select(
        "id, activity_name, activity_date, activity_end_at, location, description, group_id, group_name, district, district_environment_id, status, created_at, updated_at, deleted_at"
      )
      .is("deleted_at", null)
      .order("activity_date", { ascending: true });

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else {
      query = query.eq("group_name", fallbackGroupName);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    } else if (district) {
      query = query.eq("district", district);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setActivities([]);
      return;
    }

    setActivities((data || []) as Activity[]);
  }

  const stats = useMemo(() => {
    const upcoming = activities.filter(
      (activity) => getAutoActivityStatus(activity, now).label === "Akan Datang"
    ).length;

    const running = activities.filter(
      (activity) =>
        getAutoActivityStatus(activity, now).label === "Sedang Berlangsung"
    ).length;

    const completed = activities.filter(
      (activity) => getAutoActivityStatus(activity, now).label === "Selesai"
    ).length;

    const cancelled = activities.filter(
      (activity) =>
        getAutoActivityStatus(activity, now).label === "Dibatalkan"
    ).length;

    return {
      total: activities.length,
      upcoming,
      running,
      completed,
      cancelled,
    };
  }, [activities, now]);

  const filteredActivities = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return activities.filter((activity) => {
      const autoStatus = getAutoActivityStatus(activity, now);
      const liveGroupName = getLiveGroupName(activity);

      const matchSearch =
        !keyword ||
        (activity.activity_name || "").toLowerCase().includes(keyword) ||
        (activity.location || "").toLowerCase().includes(keyword) ||
        (activity.description || "").toLowerCase().includes(keyword) ||
        liveGroupName.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || autoStatus.label === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [activities, group, search, statusFilter, now]);

  function resetForm() {
    setEditingActivity(null);

    setForm({
      activity_name: "",
      activity_date: "",
      activity_end_at: "",
      location: "",
      description: "",
      status: "Aktif",
    });
  }

  function openAddModal() {
    resetForm();
    setShowFormModal(true);
  }

  function openEditModal(activity: Activity) {
    setEditingActivity(activity);

    setForm({
      activity_name: activity.activity_name || "",
      activity_date: toDateTimeLocalValue(activity.activity_date),
      activity_end_at: toDateTimeLocalValue(activity.activity_end_at),
      location: activity.location || "",
      description: activity.description || "",
      status: normalizeStatus(activity.status),
    });

    setShowFormModal(true);
  }

  function openViewModal(activity: Activity) {
    setSelectedActivity(activity);
    setShowViewModal(true);
  }

  function openCancelModal(activity: Activity) {
    setCancelTarget(activity);
    setShowCancelModal(true);
  }

  function validateForm() {
    if (!form.activity_name.trim()) {
      alert("Sila isi nama aktiviti.");
      return false;
    }

    if (!form.activity_date) {
      alert("Sila pilih tarikh dan masa mula aktiviti.");
      return false;
    }

    if (!form.activity_end_at) {
      alert("Sila pilih tarikh dan masa tamat aktiviti.");
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

    if (!form.location.trim()) {
      alert("Sila isi lokasi aktiviti.");
      return false;
    }

    if (!getLatestGroupId() && !getLatestGroupName()) {
      alert("Akaun Penolong Pemimpin belum dipautkan dengan kumpulan.");
      return false;
    }

    if (!districtEnvironmentId && !district) {
      alert("Akaun belum dipautkan dengan daerah.");
      return false;
    }

    return true;
  }

  async function saveActivity() {
    if (!validateForm()) return;

    setSaving(true);

    const payload = {
      activity_name: form.activity_name.trim(),
      activity_date: new Date(form.activity_date).toISOString(),
      activity_end_at: new Date(form.activity_end_at).toISOString(),
      location: form.location.trim(),
      description: form.description.trim() || null,
      status: form.status,
      group_id: getLatestGroupId() || null,
      group_name: getLatestGroupName() || null,
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

      if (groupId) {
        query = query.eq("group_id", groupId);
      } else {
        query = query.eq("group_name", fallbackGroupName);
      }

      if (districtEnvironmentId) {
        query = query.eq("district_environment_id", districtEnvironmentId);
      } else if (district) {
        query = query.eq("district", district);
      }

      const { error } = await query;

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "UPDATE",
        `Penolong Pemimpin kemaskini aktiviti: ${form.activity_name}`,
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
        `Penolong Pemimpin tambah aktiviti: ${form.activity_name}`,
        data?.id || null,
        null,
        payload
      );
    }

    await fetchAll();

    resetForm();
    setShowFormModal(false);
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

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else {
      query = query.eq("group_name", fallbackGroupName);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    } else if (district) {
      query = query.eq("district", district);
    }

    const { error } = await query;

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "UPDATE",
      `Penolong Pemimpin batal aktiviti: ${cancelTarget.activity_name || "-"}`,
      cancelTarget.id,
      cancelTarget,
      {
        status: "Dibatalkan",
        updated_at: new Date().toISOString(),
      }
    );

    await fetchAll();

    setShowCancelModal(false);
    setCancelTarget(null);
    setSaving(false);
  }

  if (!groupId && !fallbackGroupName) {
    return (
      <DashboardLayout role="assistantLeader">
        <div className="alert alert-warning rounded-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Akaun anda belum dipautkan dengan kumpulan. Sila hubungi Pemimpin
          Kumpulan atau Pesuruhjaya Daerah untuk kemaskini kumpulan anda.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="assistantLeader">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Aktiviti</h2>
          <p className="text-muted mb-0">
            Urus aktiviti untuk kumpulan{" "}
            <strong>{getLatestGroupName() || "-"}</strong>.
          </p>
        </div>

        <button type="button" className="btn btn-success" onClick={openAddModal}>
          <i className="bi bi-plus-circle me-1"></i>
          Tambah Aktiviti
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Jumlah Aktiviti</small>
              <h4 className="fw-bold mb-0">{stats.total}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Akan Datang</small>
              <h4 className="fw-bold text-warning mb-0">{stats.upcoming}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Berlangsung</small>
              <h4 className="fw-bold text-primary mb-0">{stats.running}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Selesai</small>
              <h4 className="fw-bold text-success mb-0">{stats.completed}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-8">
              <input
                className="form-control"
                placeholder="Cari aktiviti, lokasi, penerangan..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>Semua Status</option>
                <option>Akan Datang</option>
                <option>Sedang Berlangsung</option>
                <option>Selesai</option>
                <option>Dibatalkan</option>
                <option>Tidak Aktif</option>
              </select>
            </div>

            <div className="col-md-1">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("Semua Status");
                }}
                title="Reset filter"
                aria-label="Reset filter"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Aktiviti</th>
                <th className="px-4 py-3">Kumpulan</th>
                <th className="px-4 py-3">Mula</th>
                <th className="px-4 py-3">Tamat</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
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
                      <td className="px-4 py-3">
                        <div className="fw-semibold">
                          {activity.activity_name || "-"}
                        </div>
                        <small className="text-muted">
                          {activity.description || "Tiada penerangan"}
                        </small>
                      </td>

                      <td className="px-4 py-3">
                        {getLiveGroupName(activity)}
                      </td>

                      <td className="px-4 py-3">
                        {formatDateTime(activity.activity_date)}
                      </td>

                      <td className="px-4 py-3">
                        {formatDateTime(activity.activity_end_at)}
                      </td>

                      <td className="px-4 py-3">{activity.location || "-"}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`badge rounded-pill px-3 py-2 ${autoStatus.badgeClass}`}
                        >
                          <i className={`bi ${autoStatus.icon} me-1`}></i>
                          {autoStatus.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-end">
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

                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            onClick={() => openEditModal(activity)}
                            title="Edit aktiviti"
                            aria-label="Edit aktiviti"
                          >
                            <i className="bi bi-pencil-square text-secondary"></i>
                          </button>

                          {normalizeStatus(activity.status) !==
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

        <div className="card-footer bg-white p-4 small text-muted">
          Memaparkan {filteredActivities.length} daripada {activities.length}{" "}
          rekod
        </div>
      </div>

      {showFormModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    {editingActivity ? "Edit Aktiviti" : "Tambah Aktiviti"}
                  </h5>
                  <small className="text-muted">
                    Aktiviti akan dipautkan kepada kumpulan{" "}
                    {getLatestGroupName() || "-"}.
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowFormModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body p-4">
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
                      placeholder="Contoh: Jambori"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Mula</label>
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
                    <label className="form-label">Tamat</label>
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
                    <label className="form-label">Status Manual</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          status: event.target.value,
                        })
                      }
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    <small className="text-muted">
                      Status auto akan ikut masa mula dan tamat. Status manual
                      hanya untuk Aktif, Tidak Aktif atau Dibatalkan.
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kumpulan</label>
                    <input
                      className="form-control bg-light"
                      value={getLatestGroupName() || "-"}
                      readOnly
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Lokasi</label>
                    <input
                      className="form-control"
                      value={form.location}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          location: event.target.value,
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
                      onChange={(event) =>
                        setForm({
                          ...form,
                          description: event.target.value,
                        })
                      }
                      placeholder="Catatan atau penerangan aktiviti"
                      disabled={saving}
                    ></textarea>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Daerah</label>
                    <input
                      className="form-control bg-light"
                      value={district || "-"}
                      readOnly
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kumpulan Terkini</label>
                    <input
                      className="form-control bg-light"
                      value={getLatestGroupName() || "-"}
                      readOnly
                    />
                  </div>
                </div>

                <div className="alert alert-info rounded-4 small mt-4 mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Penolong Pemimpin hanya boleh tambah dan edit aktiviti untuk
                  kumpulan sendiri sahaja.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowFormModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  className="btn btn-success"
                  onClick={saveActivity}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Menyimpan...
                    </>
                  ) : editingActivity ? (
                    "Simpan Perubahan"
                  ) : (
                    "Simpan Aktiviti"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedActivity && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Aktiviti</h5>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedActivity(null);
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <h5 className="fw-bold">
                  {selectedActivity.activity_name || "-"}
                </h5>

                <p className="text-muted mb-3">
                  {getLiveGroupName(selectedActivity)}
                </p>

                <div className="list-group list-group-flush">
                  <InfoRow
                    label="Kumpulan"
                    value={getLiveGroupName(selectedActivity)}
                  />

                  <InfoRow
                    label="Mula"
                    value={formatDateTime(selectedActivity.activity_date)}
                  />

                  <InfoRow
                    label="Tamat"
                    value={formatDateTime(selectedActivity.activity_end_at)}
                  />

                  <InfoRow
                    label="Lokasi"
                    value={selectedActivity.location || "-"}
                  />

                  <InfoRow
                    label="Status"
                    value={getAutoActivityStatus(selectedActivity, now).label}
                  />

                  <div className="list-group-item">
                    <span className="text-muted d-block mb-2">Penerangan</span>
                    <strong>{selectedActivity.description || "-"}</strong>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedActivity(null);
                  }}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedActivity);
                  }}
                >
                  <i className="bi bi-pencil-square me-1"></i>
                  Edit Aktiviti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && cancelTarget && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  Batalkan Aktiviti
                </h5>

                <button
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
                  Rekod tidak dipadam kekal. Status aktiviti akan ditukar kepada
                  Dibatalkan.
                </p>
              </div>

              <div className="modal-footer">
                <button
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-group-item d-flex justify-content-between gap-3">
      <span className="text-muted">{label}</span>
      <strong className="text-end">{value}</strong>
    </div>
  );
}