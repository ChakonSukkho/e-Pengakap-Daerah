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
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    setLoading(true);

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const groupName = currentUser.group_name || currentUser.district || "";

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
        (activity.group_name || "").toLowerCase().includes(keyword);

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

  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Aktiviti Kumpulan</h2>
          <p className="text-muted mb-0">
            Jadual dan rekod aktiviti kumpulan.
          </p>
        </div>

        <button className="btn btn-outline-success" onClick={fetchActivities}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Jumlah Aktiviti</p>
              <h3 className="fw-bold mb-0">{activities.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Akan Datang</p>
              <h3 className="fw-bold text-info mb-0">{upcomingCount}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
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
                <option>Upcoming</option>
                <option>Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success"></div>
              <p className="text-muted mt-3 mb-0">
                Memuatkan aktiviti kumpulan...
              </p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              Tiada aktiviti dijumpai.
            </div>
          ) : (
            <div className="row g-4">
              {filteredActivities.map((activity) => (
                <div className="col-md-6" key={activity.id}>
                  <div className="border rounded-4 p-4 h-100 hover-shadow">
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                      <h5 className="fw-bold mb-0">
                        {activity.activity_name}
                      </h5>

                      {getStatusBadge(activity.status)}
                    </div>

                    <div className="small text-muted mb-2">
                      <i className="bi bi-calendar-event me-2"></i>
                      {new Date(activity.activity_date).toLocaleDateString()}
                    </div>

                    <div className="small text-muted mb-2">
                      <i className="bi bi-geo-alt me-2"></i>
                      {activity.location || "-"}
                    </div>

                    <div className="small text-muted mb-3">
                      <i className="bi bi-people me-2"></i>
                      {activity.group_name || "-"}
                    </div>

                    <p className="text-muted small mb-4">
                      {activity.description || "Tiada penerangan aktiviti."}
                    </p>

                    <div className="d-flex gap-2 border-top pt-3">
                      <button
                        className="btn btn-sm btn-outline-success flex-fill"
                        onClick={() => setSelectedActivity(activity)}
                      >
                        Butiran
                      </button>

                      <button
                        className="btn btn-sm btn-outline-primary flex-fill"
                        onClick={() =>
                          alert(
                            "Module kehadiran belum siap. Next kita buat Attendance Module."
                          )
                        }
                      >
                        Daftar Kehadiran
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredActivities.length} daripada {activities.length} rekod
        </div>
      </div>

      {selectedActivity && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Butiran Aktiviti</h5>
                <button
                  className="btn-close"
                  onClick={() => setSelectedActivity(null)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Aktiviti</span>
                    <strong>{selectedActivity.activity_name}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Tarikh</span>
                    <strong>
                      {new Date(selectedActivity.activity_date).toLocaleDateString()}
                    </strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Lokasi</span>
                    <strong>{selectedActivity.location || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kumpulan</span>
                    <strong>{selectedActivity.group_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    {getStatusBadge(selectedActivity.status)}
                  </div>

                  <div className="list-group-item">
                    <div className="text-muted mb-1">Penerangan</div>
                    <div>{selectedActivity.description || "-"}</div>
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