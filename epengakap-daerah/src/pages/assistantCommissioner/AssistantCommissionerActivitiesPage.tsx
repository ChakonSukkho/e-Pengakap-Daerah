import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Activity = {
  id: string;
  activity_name: string;
  activity_date?: string | null;
  location?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  description?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type Group = {
  id: string;
  group_name: string;
  school_name?: string | null;
  status?: string | null;
  district_environment_id?: string | null;
};

type ActivityForm = {
  activity_name: string;
  activity_date: string;
  location: string;
  group_id: string;
  group_name: string;
  description: string;
  status: string;
};

export default function AssistantCommissionerActivitiesPage() {
  const currentUser = JSON.parse(
    localStorage.getItem("user") ||
      localStorage.getItem("auth_user") ||
      "{}"
  );

  const districtEnvironmentId = currentUser.district_environment_id || "";
  const userDistrict = currentUser.district || "";

  const isPesuruhjayaDaerah = currentUser.role === "Pesuruhjaya Daerah";

  const isPenolongPesuruhjaya =
    currentUser.role === "Penolong Pesuruhjaya" ||
    currentUser.role === "Penolong Pesuruhjaya Daerah";

  const canViewActivities = isPesuruhjayaDaerah || isPenolongPesuruhjaya;
  const canAddActivity = isPesuruhjayaDaerah || isPenolongPesuruhjaya;
  const canEditActivity = isPesuruhjayaDaerah || isPenolongPesuruhjaya;
  const canDeactivateActivity = isPesuruhjayaDaerah || isPenolongPesuruhjaya;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [groupFilter, setGroupFilter] = useState("Semua Kumpulan");

  const [selectedActivity, setSelectedActivity] =
    useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] =
    useState<Activity | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);

  const [form, setForm] = useState<ActivityForm>({
    activity_name: "",
    activity_date: "",
    location: "",
    group_id: "",
    group_name: "",
    description: "",
    status: "Aktif",
  });

  useEffect(() => {
    fetchPageData();
  }, []);

  async function insertAuditLog(
    action: string,
    description: string,
    recordId?: string,
    oldValue?: any,
    newValue?: any
  ) {
    if (!districtEnvironmentId) return;

    await supabase.from("audit_logs").insert({
      actor_name: currentUser.full_name || currentUser.email || "Unknown User",
      actor_role: currentUser.role || "Penolong Pesuruhjaya Daerah",
      action,
      module: "Activities",
      description,
      user_id: currentUser.id || null,
      district_environment_id: districtEnvironmentId,
      record_id: recordId || null,
      old_value: oldValue || null,
      new_value: newValue || null,
    });
  }

  async function fetchPageData() {
    setLoading(true);

    if (!canViewActivities) {
      alert("Anda tidak mempunyai akses ke halaman ini.");
      setActivities([]);
      setGroups([]);
      setLoading(false);
      return;
    }

    if (!districtEnvironmentId) {
      alert("Ralat: district_environment_id pengguna tidak dijumpai.");
      setActivities([]);
      setGroups([]);
      setLoading(false);
      return;
    }

    const { data: activityData, error: activityError } = await supabase
      .from("activities")
      .select("*")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null)
      .order("activity_date", { ascending: false });

    if (activityError) {
      alert(activityError.message);
      setLoading(false);
      return;
    }

    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("id, group_name, school_name, status, district_environment_id")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null)
      .order("group_name", { ascending: true });

    if (groupError) {
      alert(groupError.message);
      setLoading(false);
      return;
    }

    setActivities(activityData || []);
    setGroups(groupData || []);
    setLoading(false);
  }

  function openAddModal() {
    if (!canAddActivity) {
      alert("Anda tidak mempunyai kebenaran untuk tambah aktiviti.");
      return;
    }

    setEditingActivity(null);
    setForm({
      activity_name: "",
      activity_date: "",
      location: "",
      group_id: "",
      group_name: "",
      description: "",
      status: "Aktif",
    });
    setShowFormModal(true);
  }

  function openEditModal(activity: Activity) {
    if (!canEditActivity) {
      alert("Anda tidak mempunyai kebenaran untuk edit aktiviti.");
      return;
    }

    setEditingActivity(activity);
    setForm({
      activity_name: activity.activity_name || "",
      activity_date: activity.activity_date
        ? activity.activity_date.slice(0, 10)
        : "",
      location: activity.location || "",
      group_id: activity.group_id || "",
      group_name: activity.group_name || "",
      description: activity.description || "",
      status: activity.status || "Aktif",
    });
    setShowFormModal(true);
  }

  function handleGroupChange(groupId: string) {
    const selectedGroup = groups.find((group) => group.id === groupId);

    setForm({
      ...form,
      group_id: groupId,
      group_name: selectedGroup?.group_name || "",
    });
  }

  async function handleSaveActivity(e: React.FormEvent) {
    e.preventDefault();

    if (!editingActivity && !canAddActivity) {
      alert("Anda tidak mempunyai kebenaran untuk tambah aktiviti.");
      return;
    }

    if (editingActivity && !canEditActivity) {
      alert("Anda tidak mempunyai kebenaran untuk edit aktiviti.");
      return;
    }

    if (!districtEnvironmentId) {
      alert("Ralat: district_environment_id pengguna tidak dijumpai.");
      return;
    }

    if (!form.activity_name.trim()) {
      alert("Nama aktiviti wajib diisi.");
      return;
    }

    if (!form.activity_date) {
      alert("Tarikh aktiviti wajib diisi.");
      return;
    }

    setSaving(true);

    const payload = {
      activity_name: form.activity_name.trim(),
      activity_date: form.activity_date,
      location: form.location.trim() || null,
      group_id: form.group_id || null,
      group_name: form.group_name || null,
      description: form.description.trim() || null,
      status: form.status || "Aktif",
      district: userDistrict,
      district_environment_id: districtEnvironmentId,
      updated_at: new Date().toISOString(),
    };

    if (editingActivity) {
      const { error } = await supabase
        .from("activities")
        .update(payload)
        .eq("id", editingActivity.id)
        .eq("district_environment_id", districtEnvironmentId)
        .is("deleted_at", null);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await insertAuditLog(
        "Kemaskini Aktiviti",
        `${currentUser.role} mengemaskini aktiviti ${payload.activity_name}.`,
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
        })
        .select()
        .single();

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await insertAuditLog(
        "Tambah Aktiviti",
        `${currentUser.role} menambah aktiviti ${payload.activity_name}.`,
        data?.id,
        null,
        data
      );
    }

    setSaving(false);
    setShowFormModal(false);
    setEditingActivity(null);
    await fetchPageData();
  }

  async function handleDeactivateActivity(activity: Activity) {
    if (!canDeactivateActivity) {
      alert("Anda tidak mempunyai kebenaran untuk nyahaktif aktiviti.");
      return;
    }

    const confirmDeactivate = window.confirm(
      `Nyahaktif aktiviti ${activity.activity_name}? Data tidak akan dipadam kekal.`
    );

    if (!confirmDeactivate) return;

    const deactivatedAt = new Date().toISOString();

    const { error } = await supabase
      .from("activities")
      .update({
        status: "Tidak Aktif",
        deleted_at: deactivatedAt,
        updated_at: deactivatedAt,
      })
      .eq("id", activity.id)
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null);

    if (error) {
      alert(error.message);
      return;
    }

    await insertAuditLog(
      "Nyahaktif Aktiviti",
      `${currentUser.role} menyahaktif aktiviti ${activity.activity_name}.`,
      activity.id,
      activity,
      {
        status: "Tidak Aktif",
        deleted_at: deactivatedAt,
      }
    );

    await fetchPageData();
  }

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        (activity.activity_name || "").toLowerCase().includes(keyword) ||
        (activity.location || "").toLowerCase().includes(keyword) ||
        (activity.group_name || "").toLowerCase().includes(keyword) ||
        (activity.description || "").toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || activity.status === statusFilter;

      const matchGroup =
        groupFilter === "Semua Kumpulan" ||
        activity.group_id === groupFilter ||
        activity.group_name === groupFilter;

      return matchSearch && matchStatus && matchGroup;
    });
  }, [activities, search, statusFilter, groupFilter]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalActivities = activities.length;

  const activeActivities = activities.filter(
    (activity) => activity.status === "Aktif"
  ).length;

  const upcomingActivities = activities.filter((activity) => {
    if (!activity.activity_date) return false;

    const activityDate = new Date(activity.activity_date);
    activityDate.setHours(0, 0, 0, 0);

    return activityDate >= today && activity.status !== "Tidak Aktif";
  }).length;

  const pastActivities = activities.filter((activity) => {
    if (!activity.activity_date) return false;

    const activityDate = new Date(activity.activity_date);
    activityDate.setHours(0, 0, 0, 0);

    return activityDate < today;
  }).length;

  function formatDate(date?: string | null) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ms-MY");
  }

  function getStatusBadge(status?: string | null) {
    if (status === "Aktif") {
      return "bg-success-subtle text-success border border-success-subtle";
    }

    if (status === "Selesai") {
      return "bg-primary-subtle text-primary border border-primary-subtle";
    }

    if (status === "Tidak Aktif") {
      return "bg-warning-subtle text-warning border border-warning-subtle";
    }

    return "bg-secondary-subtle text-secondary border border-secondary-subtle";
  }

  if (!canViewActivities) {
    return (
      <DashboardLayout role="assistantCommissioner">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <i className="bi bi-shield-lock fs-1 text-danger d-block mb-3"></i>
            <h4 className="fw-bold">Akses Ditolak</h4>
            <p className="text-muted mb-0">
              Anda tidak mempunyai kebenaran untuk melihat halaman ini.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="assistantCommissioner">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Aktiviti Daerah</h2>
          <p className="text-muted mb-0">
            Senarai aktiviti dalam daerah sendiri sahaja.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-success" onClick={fetchPageData}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          {canAddActivity && (
            <button className="btn btn-success" onClick={openAddModal}>
              <i className="bi bi-plus-circle me-1"></i>
              Tambah Aktiviti
            </button>
          )}
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Jumlah Aktiviti</div>
              <h3 className="fw-bold mb-0">{totalActivities}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Aktif</div>
              <h3 className="fw-bold text-success mb-0">{activeActivities}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Akan Datang</div>
              <h3 className="fw-bold text-primary mb-0">
                {upcomingActivities}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Lepas</div>
              <h3 className="fw-bold text-secondary mb-0">{pastActivities}</h3>
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

            <div className="col-md-3">
              <select
                className="form-select rounded-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                <option>Aktif</option>
                <option>Selesai</option>
                <option>Tidak Aktif</option>
              </select>
            </div>

            <div className="col-md-4">
              <select
                className="form-select rounded-3"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option>Semua Kumpulan</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.group_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small text-muted">
              <tr>
                <th className="px-4 py-3">Tarikh</th>
                <th className="px-4 py-3">Aktiviti</th>
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
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
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
                        {activity.activity_name}
                      </div>
                      <small className="text-muted">
                        Kod: {activity.id.slice(0, 8)}
                      </small>
                    </td>

                    <td className="px-4 py-3">{activity.location || "-"}</td>

                    <td className="px-4 py-3">
                      {activity.group_name || "Semua Kumpulan"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`badge rounded-pill px-3 py-2 ${getStatusBadge(
                          activity.status
                        )}`}
                      >
                        {activity.status || "Aktif"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-end">
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-light border rounded-3"
                          onClick={() => setSelectedActivity(activity)}
                          title="Lihat"
                        >
                          <i className="bi bi-eye"></i>
                        </button>

                        {canEditActivity && (
                          <button
                            className="btn btn-sm btn-light border rounded-3"
                            onClick={() => openEditModal(activity)}
                            title="Edit"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        )}

                        {canDeactivateActivity &&
                          activity.status !== "Tidak Aktif" && (
                            <button
                              className="btn btn-sm btn-light border rounded-3 text-warning"
                              onClick={() =>
                                handleDeactivateActivity(activity)
                              }
                              title="Nyahaktif"
                            >
                              <i className="bi bi-slash-circle"></i>
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

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredActivities.length} daripada {activities.length}{" "}
          rekod
        </div>
      </div>

      {selectedActivity && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {selectedActivity.activity_name}
                </h5>

                <button
                  className="btn-close"
                  onClick={() => setSelectedActivity(null)}
                />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Tarikh</div>
                      <div className="fw-bold">
                        {formatDate(selectedActivity.activity_date)}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Status</div>
                      <div className="fw-bold">
                        {selectedActivity.status || "Aktif"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Lokasi</div>
                      <div className="fw-bold">
                        {selectedActivity.location || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Kumpulan</div>
                      <div className="fw-bold">
                        {selectedActivity.group_name || "Semua Kumpulan"}
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Penerangan</div>
                      <div className="fw-bold">
                        {selectedActivity.description || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedActivity(null)}
                >
                  Tutup
                </button>

                {canEditActivity && (
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      setSelectedActivity(null);
                      openEditModal(selectedActivity);
                    }}
                  >
                    Edit Aktiviti
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <form
              className="modal-content border-0 rounded-4"
              onSubmit={handleSaveActivity}
            >
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingActivity ? "Edit Aktiviti" : "Tambah Aktiviti"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowFormModal(false)}
                />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Nama Aktiviti
                    </label>
                    <input
                      className="form-control rounded-3"
                      value={form.activity_name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          activity_name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Tarikh Aktiviti
                    </label>
                    <input
                      type="date"
                      className="form-control rounded-3"
                      value={form.activity_date}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          activity_date: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Lokasi</label>
                    <input
                      className="form-control rounded-3"
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Kumpulan</label>
                    <select
                      className="form-select rounded-3"
                      value={form.group_id}
                      onChange={(e) => handleGroupChange(e.target.value)}
                    >
                      <option value="">Semua Kumpulan</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.group_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Status</label>
                    <select
                      className="form-select rounded-3"
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                    >
                      <option>Aktif</option>
                      <option>Selesai</option>
                      <option>Tidak Aktif</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">Penerangan</label>
                    <textarea
                      className="form-control rounded-3"
                      rows={4}
                      value={form.description}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="alert alert-light border small mt-3 mb-0">
                  Data akan disimpan dalam daerah pengguna semasa sahaja.
                  <br />
                  <strong>district_environment_id:</strong>{" "}
                  {districtEnvironmentId || "-"}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowFormModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}