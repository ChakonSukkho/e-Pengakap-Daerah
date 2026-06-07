import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Activity = {
  id: string;
  group_id: string | null;
  group_name: string | null;
  activity_name: string;
  activity_date: string;
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
  status: string;
  district?: string | null;
  district_environment_id?: string | null;
};

type ActivityForm = {
  activity_name: string;
  activity_date: string;
  location: string;
  description: string;
  group_id: string;
  group_name: string;
  status: string;
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

function getUserDistrict() {
  const currentUser = getCurrentUser();

  return (
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    ""
  );
}

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "aktif" || value === "active") return "Aktif";
  if (value === "tidak aktif" || value === "inactive") return "Tidak Aktif";
  if (value === "digantung" || value === "suspended") return "Digantung";

  return status || "Aktif";
}

async function addAuditLog(
  action: string,
  description: string,
  recordId?: string | null
) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name: currentUser.full_name || "Unknown User",
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

export default function DistrictActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);

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
  const district = getUserDistrict();
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [form, setForm] = useState<ActivityForm>({
    activity_name: "",
    activity_date: "",
    location: "",
    description: "",
    group_id: "",
    group_name: "",
    status: "Akan Datang",
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

  function applyDistrictScope(query: any) {
    if (districtEnvironmentId) {
      return query.eq("district_environment_id", districtEnvironmentId);
    }

    if (district) {
      return query.eq("district", district);
    }

    return query;
  }

  async function fetchActivities() {
    setLoading(true);

    let query = supabase
      .from("activities")
      .select("*")
      .is("deleted_at", null)
      .order("activity_date", { ascending: true });

    query = applyDistrictScope(query);

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

  async function fetchGroups() {
    let query = supabase
      .from("groups")
      .select(
        "id, group_name, school_name, status, district, district_environment_id"
      )
      .is("deleted_at", null)
      .order("group_name", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setGroups([]);
      return;
    }

    setGroups(
      (data || []).filter((group) => normalizeStatus(group.status) === "Aktif")
    );
  }

  const filteredActivities = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return activities.filter((activity) => {
      const matchSearch =
        !keyword ||
        (activity.activity_name || "").toLowerCase().includes(keyword) ||
        (activity.location || "").toLowerCase().includes(keyword) ||
        (activity.group_name || "").toLowerCase().includes(keyword) ||
        (activity.description || "").toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || activity.status === statusFilter;

      const matchGroup =
        groupFilter === "Semua Kumpulan" ||
        activity.group_name === groupFilter;

      return matchSearch && matchStatus && matchGroup;
    });
  }, [activities, search, statusFilter, groupFilter]);

  const upcomingCount = activities.filter(
    (a) => a.status === "Akan Datang"
  ).length;

  const openRegistrationCount = activities.filter(
    (a) => a.status === "Pendaftaran Dibuka"
  ).length;

  const completedCount = activities.filter(
    (a) => a.status === "Selesai"
  ).length;

  const cancelledCount = activities.filter(
    (a) => a.status === "Dibatalkan"
  ).length;

  function resetForm() {
    setEditingActivity(null);

    setForm({
      activity_name: "",
      activity_date: "",
      location: "",
      description: "",
      group_id: "",
      group_name: "",
      status: "Akan Datang",
    });
  }

  function openAddModal() {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      return;
    }

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
      group_id: activity.group_id || "",
      group_name: activity.group_name || "",
      status: activity.status || "Akan Datang",
    });

    setShowActivityModal(true);
  }

  function openViewModal(activity: Activity) {
    setSelectedActivity(activity);
    setShowViewModal(true);
  }

  function openCancelModal(activity: Activity) {
    setCancelTarget(activity);
    setShowCancelModal(true);
  }

  async function saveActivity() {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      return;
    }

    if (!form.activity_name.trim()) {
      alert("Sila isi nama aktiviti.");
      return;
    }

    if (!form.activity_date) {
      alert("Sila pilih tarikh aktiviti.");
      return;
    }

    if (!form.location.trim()) {
      alert("Sila isi lokasi aktiviti.");
      return;
    }

    if (!form.group_id) {
      alert("Sila pilih kumpulan / sekolah.");
      return;
    }

    setSaving(true);

    const selectedGroup = groups.find((group) => group.id === form.group_id);

    const payload: Record<string, any> = {
      activity_name: form.activity_name.trim(),
      activity_date: form.activity_date,
      location: form.location.trim(),
      description: form.description.trim() || null,
      group_id: form.group_id,
      group_name: selectedGroup?.group_name || form.group_name,
      status: form.status,
      district,
      district_environment_id: districtEnvironmentId || null,
      updated_at: new Date().toISOString(),
    };

    if (editingActivity) {
      let query = supabase
        .from("activities")
        .update(payload)
        .eq("id", editingActivity.id);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "UPDATE",
        `Kemaskini aktiviti ${form.activity_name}`,
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
        `Tambah aktiviti ${form.activity_name}`,
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
      .eq("id", cancelTarget.id);

    query = applyDistrictScope(query);

    const { error } = await query;

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "CANCEL",
      `Batalkan aktiviti ${cancelTarget.activity_name}`,
      cancelTarget.id
    );

    await fetchActivities();
    setShowCancelModal(false);
    setCancelTarget(null);
    setSaving(false);
  }

  function formatDate(date: string) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusBadge(status: string) {
    if (status === "Selesai") {
      return <span className="badge bg-success">Selesai</span>;
    }

    if (status === "Pendaftaran Dibuka") {
      return <span className="badge bg-primary">Pendaftaran Dibuka</span>;
    }

    if (status === "Dibatalkan") {
      return <span className="badge bg-danger">Dibatalkan</span>;
    }

    return <span className="badge bg-info text-dark">Akan Datang</span>;
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Aktiviti Daerah</h2>
          <p className="text-muted mb-0">
            Urus aktiviti mengikut kumpulan dan sekolah dalam daerah.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-success" onClick={openAddModal}>
            <i className="bi bi-plus-circle me-1"></i>
            Tambah Aktiviti
          </button>

          <button
            className="btn btn-outline-success"
            onClick={fetchActivities}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Jumlah Aktiviti</p>
              <h3 className="fw-bold mb-0">{activities.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Akan Datang</p>
              <h3 className="fw-bold text-info mb-0">{upcomingCount}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Pendaftaran Dibuka</p>
              <h3 className="fw-bold text-primary mb-0">
                {openRegistrationCount}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Selesai / Batal</p>
              <h3 className="fw-bold text-success mb-0">
                {completedCount} / {cancelledCount}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3">
            <div className="col-md-5">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  className="form-control ps-5 rounded-3"
                  placeholder="Cari aktiviti, lokasi atau kumpulan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-4">
              <select
                className="form-select rounded-3"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option>Semua Kumpulan</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.group_name}>
                    {group.group_name}
                    {group.school_name ? ` — ${group.school_name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <select
                className="form-select rounded-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                <option>Akan Datang</option>
                <option>Pendaftaran Dibuka</option>
                <option>Selesai</option>
                <option>Dibatalkan</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small text-muted">
              <tr>
                <th className="px-4 py-3">Aktiviti</th>
                <th className="px-4 py-3">Tarikh</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Kumpulan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">
                      Memuatkan aktiviti...
                    </p>
                  </td>
                </tr>
              ) : filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-calendar-x fs-1 d-block mb-2"></i>
                    Tiada aktiviti dijumpai.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="px-4 py-3">
                      <div className="fw-semibold">
                        {activity.activity_name}
                      </div>
                      <small className="text-muted">
                        {activity.description || "Tiada penerangan"}
                      </small>
                    </td>

                    <td className="px-4 py-3">
                      <i className="bi bi-calendar-event me-2 text-success"></i>
                      {formatDate(activity.activity_date)}
                    </td>

                    <td className="px-4 py-3 text-muted">
                      <i className="bi bi-geo-alt me-2"></i>
                      {activity.location || "-"}
                    </td>

                    <td className="px-4 py-3">
                      {activity.group_name || "-"}
                    </td>

                    <td className="px-4 py-3">
                      {getStatusBadge(activity.status)}
                    </td>

                    <td className="px-4 py-3 text-end">
                      <button
                        className="btn btn-sm btn-light border rounded-3 me-1"
                        onClick={() => openViewModal(activity)}
                        title="Lihat"
                      >
                        <i className="bi bi-eye"></i>
                      </button>

                      <button
                        className="btn btn-sm btn-light border rounded-3 me-1"
                        onClick={() => openEditModal(activity)}
                        title="Edit"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>

                      {activity.status !== "Dibatalkan" && (
                        <button
                          className="btn btn-sm btn-light border rounded-3 text-danger"
                          onClick={() => openCancelModal(activity)}
                          title="Batalkan"
                        >
                          <i className="bi bi-x-circle"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredActivities.length} daripada {activities.length}{" "}
          rekod
        </div>
      </div>

      {showActivityModal && (
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
                    Pilih kumpulan dan lengkapkan maklumat aktiviti.
                  </small>
                </div>

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
                        setForm({ ...form, activity_name: e.target.value })
                      }
                      placeholder="Contoh: Perkhemahan Unit Pengakap"
                      disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
                    >
                      <option>Akan Datang</option>
                      <option>Pendaftaran Dibuka</option>
                      <option>Selesai</option>
                      <option>Dibatalkan</option>
                    </select>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Kumpulan / Sekolah</label>
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
                      disabled={saving}
                    >
                      <option value="">Pilih Kumpulan / Sekolah</option>

                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.group_name}
                          {group.school_name ? ` — ${group.school_name}` : ""}
                        </option>
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
                      placeholder="Contoh: SK Setiawangsa"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Penerangan Aktiviti</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Contoh: Aktiviti latihan asas, kawad kaki, ikatan dan simpulan."
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
                    ? "Kemaskini Aktiviti"
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
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Aktiviti</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <h5 className="fw-bold mb-1">
                    {selectedActivity.activity_name}
                  </h5>
                  {getStatusBadge(selectedActivity.status)}
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
                      {selectedActivity.description || "Tiada penerangan."}
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
                <strong>{cancelTarget.activity_name}</strong>
                <p className="text-muted small mt-2 mb-0">
                  Status aktiviti akan ditukar kepada Dibatalkan.
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