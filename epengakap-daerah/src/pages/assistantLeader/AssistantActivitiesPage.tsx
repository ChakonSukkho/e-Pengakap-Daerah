import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Activity = {
  id: string;
  activity_name: string | null;
  activity_date: string | null;
  location: string | null;
  description: string | null;
  group_id?: string | null;
  group_name: string | null;
  district: string | null;
  district_environment_id: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
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

const STATUS_OPTIONS = ["Akan Datang", "Aktif", "Selesai", "Dibatalkan"];

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
  if (value === "upcoming" || value === "akan datang") return "Akan Datang";
  if (value === "completed" || value === "selesai") return "Selesai";
  if (value === "cancelled" || value === "dibatalkan") return "Dibatalkan";

  return status || "Akan Datang";
}

function getStatusBadge(status?: string | null) {
  const value = normalizeStatus(status);

  if (value === "Selesai") return "bg-success";
  if (value === "Aktif") return "bg-primary";
  if (value === "Dibatalkan") return "bg-danger";
  return "bg-warning text-dark";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isUpcoming(activity: Activity) {
  if (!activity.activity_date) return false;

  const activityDate = new Date(activity.activity_date);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  activityDate.setHours(0, 0, 0, 0);

  const status = normalizeStatus(activity.status);

  return (
    activityDate >= today &&
    status !== "Selesai" &&
    status !== "Dibatalkan"
  );
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
  const [cancelTarget, setCancelTarget] = useState<Activity | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

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

    if (!groupId && !groupName) {
      setActivities([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("activities")
      .select("*")
      .is("deleted_at", null)
      .order("activity_date", { ascending: false });

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else {
      query = query.eq("group_name", groupName);
    }

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
    const upcoming = activities.filter(isUpcoming).length;
    const active = activities.filter(
      (activity) => normalizeStatus(activity.status) === "Aktif"
    ).length;
    const completed = activities.filter(
      (activity) => normalizeStatus(activity.status) === "Selesai"
    ).length;
    const cancelled = activities.filter(
      (activity) => normalizeStatus(activity.status) === "Dibatalkan"
    ).length;

    return {
      total: activities.length,
      upcoming,
      active,
      completed,
      cancelled,
    };
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return activities.filter((activity) => {
      const status = normalizeStatus(activity.status);

      const matchSearch =
        !keyword ||
        String(activity.activity_name || "").toLowerCase().includes(keyword) ||
        String(activity.location || "").toLowerCase().includes(keyword) ||
        String(activity.description || "").toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [activities, search, statusFilter]);

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
    setShowFormModal(true);
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
      alert("Sila pilih tarikh aktiviti.");
      return false;
    }

    if (!form.location.trim()) {
      alert("Sila isi lokasi aktiviti.");
      return false;
    }

    if (!groupId && !groupName) {
      alert("Akaun Penolong Pemimpin belum dipautkan dengan kumpulan.");
      return false;
    }

    if (!districtEnvironmentId) {
      alert("Akaun belum dipautkan dengan district environment.");
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
      group_id: groupId || null,
      group_name: groupName || null,
      district: district || null,
      district_environment_id: districtEnvironmentId,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    if (editingActivity) {
      let updateQuery = supabase
        .from("activities")
        .update(payload)
        .eq("id", editingActivity.id)
        .eq("district_environment_id", districtEnvironmentId)
        .is("deleted_at", null);

      if (groupId) {
        updateQuery = updateQuery.eq("group_id", groupId);
      } else {
        updateQuery = updateQuery.eq("group_name", groupName);
      }

      const { error } = await updateQuery;

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

    await fetchActivities();

    resetForm();
    setShowFormModal(false);
    setSaving(false);

    alert(
      editingActivity
        ? "Aktiviti berjaya dikemaskini."
        : "Aktiviti berjaya ditambah."
    );
  }

  async function cancelActivity() {
    if (!cancelTarget) return;

    setSaving(true);

    let cancelQuery = supabase
      .from("activities")
      .update({
        status: "Dibatalkan",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cancelTarget.id)
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null);

    if (groupId) {
      cancelQuery = cancelQuery.eq("group_id", groupId);
    } else {
      cancelQuery = cancelQuery.eq("group_name", groupName);
    }

    const { error } = await cancelQuery;

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

    await fetchActivities();

    setShowCancelModal(false);
    setCancelTarget(null);
    setSaving(false);

    alert("Aktiviti berjaya dibatalkan.");
  }

  if (!groupId && !groupName) {
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
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold mb-1">Aktiviti Kumpulan</h2>
          <p className="text-muted mb-0">
            Urus aktiviti untuk kumpulan <strong>{groupName || "-"}</strong>.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-success" onClick={fetchActivities}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          <button className="btn btn-success" onClick={openAddModal}>
            <i className="bi bi-calendar-plus me-1"></i>
            Tambah Aktiviti
          </button>
        </div>
      </div>

      <div className="alert alert-light border rounded-4 mb-4">
        <i className="bi bi-shield-check text-success me-2"></i>
        Penolong Pemimpin hanya boleh mengurus aktiviti dalam kumpulan sendiri.
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
              <h3 className="fw-bold text-primary mb-0">{stats.upcoming}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Aktif</small>
              <h3 className="fw-bold text-warning mb-0">{stats.active}</h3>
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
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
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

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Tarikh</th>
                <th className="px-4 py-3">Aktiviti</th>
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
                      {formatDate(activity.activity_date)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="fw-semibold">
                        {activity.activity_name || "-"}
                      </div>
                      <small className="text-muted">
                        {activity.description || "Tiada penerangan"}
                      </small>
                    </td>

                    <td className="px-4 py-3">{activity.location || "-"}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`badge rounded-pill ${getStatusBadge(
                          activity.status
                        )}`}
                      >
                        {normalizeStatus(activity.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-light border"
                          onClick={() => openViewModal(activity)}
                          title="Lihat"
                        >
                          <i className="bi bi-eye text-primary"></i>
                        </button>

                        <button
                          className="btn btn-light border"
                          onClick={() => openEditModal(activity)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil-square text-secondary"></i>
                        </button>

                        {normalizeStatus(activity.status) !== "Dibatalkan" && (
                          <button
                            className="btn btn-light border"
                            onClick={() => openCancelModal(activity)}
                            title="Batal Aktiviti"
                          >
                            <i className="bi bi-x-circle text-danger"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    {editingActivity ? "Edit Aktiviti" : "Tambah Aktiviti"}
                  </h5>
                  <small className="text-muted">
                    Aktiviti akan dipautkan kepada kumpulan {groupName || "-"}.
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowFormModal(false);
                    resetForm();
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
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
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Tarikh Aktiviti</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.activity_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          activity_date: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Lokasi</label>
                    <input
                      className="form-control"
                      value={form.location}
                      onChange={(event) =>
                        setForm({ ...form, location: event.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value })
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
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
                    <label className="form-label">Kumpulan</label>
                    <input
                      className="form-control bg-light"
                      value={groupName || "-"}
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
                    ? "Kemaskini"
                    : "Simpan"}
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
                <div className="list-group list-group-flush">
                  <InfoRow
                    label="Aktiviti"
                    value={selectedActivity.activity_name || "-"}
                  />
                  <InfoRow
                    label="Tarikh"
                    value={formatDate(selectedActivity.activity_date)}
                  />
                  <InfoRow
                    label="Lokasi"
                    value={selectedActivity.location || "-"}
                  />
                  <InfoRow
                    label="Kumpulan"
                    value={selectedActivity.group_name || "-"}
                  />
                  <InfoRow
                    label="Status"
                    value={normalizeStatus(selectedActivity.status)}
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
                  Edit
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
                  Batal Aktiviti
                </h5>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelTarget(null);
                  }}
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
                  Tutup
                </button>

                <button
                  className="btn btn-danger"
                  onClick={cancelActivity}
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Ya, Batal Aktiviti"}
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