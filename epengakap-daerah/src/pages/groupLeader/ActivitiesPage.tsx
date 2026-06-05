import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Activity = {
  id: string;
  activity_name: string | null;
  activity_date: string | null;
  location: string | null;
  description: string | null;
  group_name: string | null;
  district: string | null;
  district_environment_id: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ActivityForm = {
  activity_name: string;
  activity_date: string;
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

const STATUS_OPTIONS = [
  "Akan Datang",
  "Pendaftaran Dibuka",
  "Selesai",
  "Dibatalkan",
];

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

  if (value === "upcoming" || value === "akan datang") return "Akan Datang";
  if (value === "open" || value === "pendaftaran dibuka") {
    return "Pendaftaran Dibuka";
  }
  if (value === "completed" || value === "selesai") return "Selesai";
  if (value === "cancelled" || value === "dibatalkan") return "Dibatalkan";

  return status || "Akan Datang";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getActivityStatusBadge(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === "Selesai") {
    return "bg-success-subtle text-success border border-success-subtle";
  }

  if (normalized === "Pendaftaran Dibuka") {
    return "bg-primary-subtle text-primary border border-primary-subtle";
  }

  if (normalized === "Dibatalkan") {
    return "bg-danger-subtle text-danger border border-danger-subtle";
  }

  return "bg-warning-subtle text-warning border border-warning-subtle";
}

function isFutureActivity(activityDate?: string | null) {
  if (!activityDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(activityDate);
  date.setHours(0, 0, 0, 0);

  return date >= today;
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
      module: "Aktiviti Kumpulan",
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

export default function ActivitiesPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);

  const groupName = currentUser.group_name || "";
  const district = currentUser.district || "";
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [form, setForm] = useState<ActivityForm>({
    activity_name: "",
    activity_date: "",
    location: "",
    description: "",
    status: "Akan Datang",
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    setLoading(true);

    if (!groupName) {
      setActivities([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("activities")
      .select("*")
      .eq("group_name", groupName)
      .order("activity_date", { ascending: true });

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setActivities([]);
      setLoading(false);
      return;
    }

    setActivities(data || []);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const upcoming = activities.filter((activity) => {
      const status = normalizeStatus(activity.status);
      return (
        isFutureActivity(activity.activity_date) &&
        status !== "Selesai" &&
        status !== "Dibatalkan"
      );
    }).length;

    const completed = activities.filter(
      (activity) => normalizeStatus(activity.status) === "Selesai"
    ).length;

    const open = activities.filter(
      (activity) => normalizeStatus(activity.status) === "Pendaftaran Dibuka"
    ).length;

    const cancelled = activities.filter(
      (activity) => normalizeStatus(activity.status) === "Dibatalkan"
    ).length;

    return {
      total: activities.length,
      upcoming,
      completed,
      open,
      cancelled,
    };
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return activities.filter((activity) => {
      const status = normalizeStatus(activity.status);

      const matchSearch =
        !keyword ||
        (activity.activity_name || "").toLowerCase().includes(keyword) ||
        (activity.location || "").toLowerCase().includes(keyword) ||
        (activity.description || "").toLowerCase().includes(keyword) ||
        (activity.group_name || "").toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [activities, search, statusFilter]);

  const nextActivities = useMemo(() => {
    return activities
      .filter((activity) => {
        const status = normalizeStatus(activity.status);

        return (
          isFutureActivity(activity.activity_date) &&
          status !== "Selesai" &&
          status !== "Dibatalkan"
        );
      })
      .sort(
        (a, b) =>
          new Date(a.activity_date || "").getTime() -
          new Date(b.activity_date || "").getTime()
      )
      .slice(0, 3);
  }, [activities]);

  function resetForm() {
    setEditingActivity(null);

    setForm({
      activity_name: "",
      activity_date: "",
      location: "",
      description: "",
      status: "Akan Datang",
    });
  }

  function openAddModal() {
    resetForm();
    setShowActivityModal(true);
  }

  function openEditModal(activity: Activity) {
    setEditingActivity(activity);

    setForm({
      activity_name: activity.activity_name || "",
      activity_date: activity.activity_date || "",
      location: activity.location || "",
      description: activity.description || "",
      status: normalizeStatus(activity.status),
    });

    setShowActivityModal(true);
  }

  function openViewModal(activity: Activity) {
    setSelectedActivity(activity);
    setShowViewModal(true);
  }

  function openDeleteModal(activity: Activity) {
    setDeleteTarget(activity);
    setShowDeleteModal(true);
  }

  function validateForm() {
    if (!form.activity_name.trim()) {
      alert("Sila isi nama aktiviti.");
      return false;
    }

    if (!form.activity_date) {
      alert("Sila pilih tarikh aktiviti.");
      return false;
    }

    if (!form.location.trim()) {
      alert("Sila isi lokasi aktiviti.");
      return false;
    }

    if (!groupName) {
      alert("Kumpulan tidak dijumpai. Sila semak akaun Pemimpin Kumpulan.");
      return false;
    }

    return true;
  }

  async function saveActivity() {
    if (!validateForm()) return;

    setSaving(true);

    const payload = {
      activity_name: form.activity_name.trim(),
      activity_date: form.activity_date,
      location: form.location.trim(),
      description: form.description.trim() || null,
      group_name: groupName,
      district: district || null,
      district_environment_id: districtEnvironmentId || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    if (editingActivity) {
      const { error } = await supabase
        .from("activities")
        .update(payload)
        .eq("id", editingActivity.id);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "UPDATE",
        `Kemaskini aktiviti kumpulan: ${form.activity_name}`,
        editingActivity.id
      );
    } else {
      const { data, error } = await supabase
        .from("activities")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
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
        `Tambah aktiviti kumpulan: ${form.activity_name}`,
        data?.id || null
      );
    }

    await fetchActivities();
    resetForm();
    setShowActivityModal(false);
    setSaving(false);
  }

  async function cancelActivity() {
    if (!deleteTarget) return;

    setSaving(true);

    const { error } = await supabase
      .from("activities")
      .update({
        status: "Dibatalkan",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deleteTarget.id);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "CANCEL",
      `Batalkan aktiviti kumpulan: ${deleteTarget.activity_name}`,
      deleteTarget.id
    );

    await fetchActivities();
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setSaving(false);
  }

  if (!groupName) {
    return (
      <DashboardLayout role="groupLeader">
        <div className="alert alert-warning rounded-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Akaun anda belum dipautkan dengan kumpulan. Sila hubungi Pesuruhjaya
          Daerah untuk kemaskini kumpulan.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Aktiviti Kumpulan</h2>
          <p className="text-muted mb-0">
            Urus aktiviti untuk kumpulan <strong>{groupName}</strong>.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-success"
            onClick={fetchActivities}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          <button className="btn btn-success" onClick={openAddModal}>
            <i className="bi bi-calendar-plus me-1"></i>
            Tambah Aktiviti
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Jumlah Aktiviti</small>
              <h3 className="fw-bold mb-0">{stats.total}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Akan Datang</small>
              <h3 className="fw-bold text-warning mb-0">{stats.upcoming}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Pendaftaran Dibuka</small>
              <h3 className="fw-bold text-primary mb-0">{stats.open}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Selesai</small>
              <h3 className="fw-bold text-success mb-0">{stats.completed}</h3>
            </div>
          </div>
        </div>
      </div>

      {nextActivities.length > 0 && (
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3">Aktiviti Terdekat</h5>

            <div className="row g-3">
              {nextActivities.map((activity) => (
                <div className="col-md-4" key={activity.id}>
                  <div className="border rounded-4 p-3 h-100">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <i className="bi bi-calendar-event text-success fs-4"></i>
                      <span
                        className={`badge rounded-pill ${getActivityStatusBadge(
                          activity.status
                        )}`}
                      >
                        {normalizeStatus(activity.status)}
                      </span>
                    </div>

                    <h6 className="fw-bold mb-1">
                      {activity.activity_name || "-"}
                    </h6>

                    <small className="text-muted d-block mb-2">
                      {activity.location || "-"}
                    </small>

                    <strong>{formatDate(activity.activity_date)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-7">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Cari aktiviti, lokasi atau penerangan..."
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
                {STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("Semua Status");
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Aktiviti</th>
                <th className="px-4 py-3">Tarikh</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">
                      Memuatkan aktiviti...
                    </p>
                  </td>
                </tr>
              ) : filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
                    <i className="bi bi-calendar-x fs-1 d-block mb-2"></i>
                    Tiada aktiviti dijumpai.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((activity) => (
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
                      {formatDate(activity.activity_date)}
                    </td>

                    <td className="px-4 py-3">{activity.location || "-"}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`badge rounded-pill px-3 py-2 ${getActivityStatusBadge(
                          activity.status
                        )}`}
                      >
                        {normalizeStatus(activity.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-end">
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-light border"
                          onClick={() => openViewModal(activity)}
                          title="Lihat"
                        >
                          <i className="bi bi-eye text-primary"></i>
                        </button>

                        <button
                          className="btn btn-sm btn-light border"
                          onClick={() => openEditModal(activity)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil-square text-secondary"></i>
                        </button>

                        <button
                          className="btn btn-sm btn-light border"
                          onClick={() => openDeleteModal(activity)}
                          title="Batalkan"
                        >
                          <i className="bi bi-x-circle text-danger"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showActivityModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    {editingActivity ? "Edit Aktiviti" : "Tambah Aktiviti"}
                  </h5>
                  <small className="text-muted">
                    Aktiviti akan dipautkan kepada kumpulan {groupName}.
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowActivityModal(false);
                    resetForm();
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-md-12">
                    <label className="form-label">Nama Aktiviti</label>
                    <input
                      className="form-control"
                      value={form.activity_name}
                      onChange={(e) =>
                        setForm({ ...form, activity_name: e.target.value })
                      }
                      placeholder="Contoh: Latihan Kawad Kaki"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Tarikh Aktiviti</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.activity_date}
                      onChange={(e) =>
                        setForm({ ...form, activity_date: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Lokasi</label>
                    <input
                      className="form-control"
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                      placeholder="Contoh: Padang SK Kementah"
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Penerangan</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Penerangan ringkas aktiviti"
                    ></textarea>
                  </div>

                  <div className="col-md-12">
                    <div className="alert alert-info rounded-4 small mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      Kumpulan dikunci kepada <strong>{groupName}</strong>.
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowActivityModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  onClick={saveActivity}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingActivity
                    ? "Kemaskini Aktiviti"
                    : "Simpan Aktiviti"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedActivity && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Aktiviti</h5>

                <button
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{ width: 72, height: 72 }}
                  >
                    <i className="bi bi-calendar-event fs-2"></i>
                  </div>

                  <h5 className="fw-bold mb-1">
                    {selectedActivity.activity_name || "-"}
                  </h5>

                  <span
                    className={`badge rounded-pill px-3 py-2 ${getActivityStatusBadge(
                      selectedActivity.status
                    )}`}
                  >
                    {normalizeStatus(selectedActivity.status)}
                  </span>
                </div>

                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Tarikh</span>
                    <strong>{formatDate(selectedActivity.activity_date)}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Lokasi</span>
                    <strong>{selectedActivity.location || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kumpulan</span>
                    <strong>{selectedActivity.group_name || "-"}</strong>
                  </div>

                  <div className="list-group-item">
                    <span className="text-muted d-block mb-2">Penerangan</span>
                    <p className="mb-0">
                      {selectedActivity.description || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowViewModal(false)}
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
                  Edit Aktiviti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  Batalkan Aktiviti
                </h5>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu batalkan aktiviti ini?
                </p>

                <strong>{deleteTarget.activity_name || "-"}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Aktiviti tidak dipadam kekal. Status akan ditukar kepada
                  Dibatalkan.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                  disabled={saving}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-danger"
                  onClick={cancelActivity}
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Batalkan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}