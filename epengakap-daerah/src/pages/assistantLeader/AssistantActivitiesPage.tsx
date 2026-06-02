import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Activity = {
  id: string;
  activity_name: string;
  activity_date: string;
  location: string;
  description: string;
  group_name: string;
  status: string;
};

export default function AssistantActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedActivity, setSelectedActivity] =
    useState<Activity | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    setLoading(true);

    const currentUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    const groupName =
      currentUser.group_name ||
      currentUser.district ||
      "";

    let query = supabase
      .from("activities")
      .select("*")
      .order("activity_date", {
        ascending: false,
      });

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

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      return (
        activity.activity_name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        activity.location
          ?.toLowerCase()
          .includes(search.toLowerCase())
      );
    });
  }, [activities, search]);

  return (
    <DashboardLayout role="assistantLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Aktiviti Kumpulan
          </h2>
          <p className="text-muted mb-0">
            Penolong Pemimpin boleh melihat
            semua aktiviti kumpulan.
          </p>
        </div>

        <button
          className="btn btn-outline-success"
          onClick={fetchActivities}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">
                Jumlah Aktiviti
              </div>
              <h3 className="fw-bold">
                {activities.length}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">
                Akan Datang
              </div>
              <h3 className="fw-bold text-primary">
                {
                  activities.filter(
                    (a) =>
                      a.status === "Akan Datang"
                  ).length
                }
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">
                Selesai
              </div>
              <h3 className="fw-bold text-success">
                {
                  activities.filter(
                    (a) =>
                      a.status === "Selesai"
                  ).length
                }
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body border-bottom">
          <input
            className="form-control"
            placeholder="Cari aktiviti..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Tarikh</th>
                <th>Aktiviti</th>
                <th>Lokasi</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-5"
                  >
                    <div className="spinner-border text-success"></div>
                  </td>
                </tr>
              ) : filteredActivities.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-5 text-muted"
                  >
                    Tiada aktiviti dijumpai.
                  </td>
                </tr>
              ) : (
                filteredActivities.map(
                  (activity) => (
                    <tr key={activity.id}>
                      <td>
                        {new Date(
                          activity.activity_date
                        ).toLocaleDateString()}
                      </td>

                      <td className="fw-semibold">
                        {
                          activity.activity_name
                        }
                      </td>

                      <td>
                        {activity.location}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            activity.status ===
                            "Selesai"
                              ? "bg-success"
                              : "bg-primary"
                          }`}
                        >
                          {
                            activity.status
                          }
                        </span>
                      </td>

                      <td>
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() =>
                            setSelectedActivity(
                              activity
                            )
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedActivity && (
        <div
          className="modal d-block"
          style={{
            background:
              "rgba(0,0,0,.55)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title">
                  Maklumat Aktiviti
                </h5>

                <button
                  className="btn-close"
                  onClick={() =>
                    setSelectedActivity(
                      null
                    )
                  }
                />
              </div>

              <div className="modal-body">
                <p>
                  <strong>
                    Aktiviti:
                  </strong>{" "}
                  {
                    selectedActivity.activity_name
                  }
                </p>

                <p>
                  <strong>
                    Tarikh:
                  </strong>{" "}
                  {new Date(
                    selectedActivity.activity_date
                  ).toLocaleDateString()}
                </p>

                <p>
                  <strong>
                    Lokasi:
                  </strong>{" "}
                  {
                    selectedActivity.location
                  }
                </p>

                <p>
                  <strong>
                    Status:
                  </strong>{" "}
                  {
                    selectedActivity.status
                  }
                </p>

                <p>
                  <strong>
                    Penerangan:
                  </strong>
                </p>

                <p className="text-muted">
                  {
                    selectedActivity.description
                  }
                </p>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setSelectedActivity(
                      null
                    )
                  }
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