import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Activity = {
  id: string;
  activity_name: string;
  activity_date: string;
  location: string;
  description: string | null;
  group_name: string;
  status: string;
  created_at?: string;
};

type ActivityForm = {
  activity_name: string;
  activity_date: string;
  location: string;
  description: string;
  status: string;
};

export default function DistrictActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState<ActivityForm>({
    activity_name: "",
    activity_date: "",
    location: "",
    description: "",
    status: "Akan Datang",
  });

  const currentUser = useMemo(() => {
    return JSON.parse(
      localStorage.getItem("user") ||
        localStorage.getItem("auth_user") ||
        "{}"
    );
  }, []);

  const groupName = currentUser.group_name || currentUser.district || "";

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    setLoading(true);

    let query = supabase
      .from("activities")
      .select("*")
      .order("activity_date", { ascending: true });

    if (groupName) {
      query = query.eq("group_name", groupName);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setActivities(data || []);
    setLoading(false);
  }

  function resetForm() {
    setForm({
      activity_name: "",
      activity_date: "",
      location: "",
      description: "",
      status: "Akan Datang",
    });
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();

    if (!form.activity_name.trim()) {
      alert("Nama aktiviti wajib diisi.");
      return;
    }

    if (!form.activity_date) {
      alert("Tarikh aktiviti wajib diisi.");
      return;
    }

    if (!form.location.trim()) {
      alert("Lokasi wajib diisi.");
      return;
    }

    if (!groupName) {
      alert("Group pemimpin tidak dijumpai. Sila semak data user login.");
      return;
    }

    setSaving(true);

    const payload = {
      group_name: groupName,
      activity_name: form.activity_name.trim(),
      activity_date: form.activity_date,
      location: form.location.trim(),
      description: form.description.trim(),
      status: form.status,
    };

    const { error } = await supabase.from("activities").insert(payload);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await fetchActivities();
    resetForm();
    setShowAddModal(false);
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
    if (status === "Selesai" || status === "Completed") {
      return (
        <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
          Selesai
        </span>
      );
    }

    if (status === "Pendaftaran Dibuka") {
      return (
        <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
          Pendaftaran Dibuka
        </span>
      );
    }

    if (status === "Dibatalkan") {
      return (
        <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2">
          Dibatalkan
        </span>
      );
    }

    return (
      <span className="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-3 py-2">
        {status || "Akan Datang"}
      </span>
    );
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

      return matchSearch && matchStatus;
    });
  }, [activities, search, statusFilter]);

  const upcomingCount = activities.filter(
    (a) => a.status === "Akan Datang" || a.status === "Upcoming"
  ).length;

  const completedCount = activities.filter(
    (a) => a.status === "Selesai" || a.status === "Completed"
  ).length;

  const openRegistrationCount = activities.filter(
    (a) => a.status === "Pendaftaran Dibuka"
  ).length;

  return (
    <DashboardLayout role="district">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Aktiviti Kumpulan</h2>
          <p className="text-muted mb-0">
            Jadual dan rekod aktiviti kumpulan.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-success"
            onClick={() => setShowAddModal(true)}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Tambah Aktiviti
          </button>

          <button className="btn btn-outline-success" onClick={fetchActivities}>
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
              <p className="text-muted small mb-1">Selesai</p>
              <h3 className="fw-bold text-success mb-0">{completedCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3">
            <div className="col-md-8">
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
                      Memuatkan aktiviti kumpulan...
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
                      {activity.location}
                    </td>

                    <td className="px-4 py-3">{activity.group_name}</td>

                    <td className="px-4 py-3">
                      {getStatusBadge(activity.status)}
                    </td>

                    <td className="px-4 py-3 text-end">
                      <button
                        className="btn btn-sm btn-light border rounded-3"
                        onClick={() => setSelectedActivity(activity)}
                      >
                        <i className="bi bi-eye"></i>
                      </button>
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

      {showAddModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <form onSubmit={handleAddActivity}>
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold">Tambah Aktiviti</h5>
                    <small className="text-muted">
                      Tambah aktiviti baharu untuk kumpulan ini.
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowAddModal(false)}
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
                        required
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
                        required
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
                        <option>Akan Datang</option>
                        <option>Pendaftaran Dibuka</option>
                        <option>Selesai</option>
                        <option>Dibatalkan</option>
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
                        required
                      />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label">Kumpulan</label>
                      <input
                        className="form-control"
                        value={groupName}
                        disabled
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
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowAddModal(false)}
                    disabled={saving}
                  >
                    Batal
                  </button>

                  <button className="btn btn-success" disabled={saving}>
                    {saving ? "Menyimpan..." : "Simpan Aktiviti"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedActivity && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Aktiviti</h5>
                <button
                  className="btn-close"
                  onClick={() => setSelectedActivity(null)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="mb-4">
                  <h5 className="fw-bold mb-1">
                    {selectedActivity.activity_name}
                  </h5>
                  <div>{getStatusBadge(selectedActivity.status)}</div>
                </div>

                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Tarikh</span>
                    <strong>{formatDate(selectedActivity.activity_date)}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Lokasi</span>
                    <strong>{selectedActivity.location}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kumpulan</span>
                    <strong>{selectedActivity.group_name}</strong>
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
                  onClick={() => setSelectedActivity(null)}
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