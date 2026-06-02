import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

export default function AssistantCommissionerActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    setLoading(true);

    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("activity_date", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setActivities(data || []);
    setLoading(false);
  }

  const filteredActivities = useMemo(() => {
    return activities.filter((a: any) =>
      a.activity_name
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [activities, search]);

  return (
    <DashboardLayout role="assistantCommissioner">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold">Aktiviti Daerah</h2>
          <p className="text-muted">
            Senarai semua aktiviti dalam daerah.
          </p>
        </div>

        <button
          className="btn btn-outline-success"
          onClick={fetchActivities}
        >
          Refresh
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body border-bottom">
          <input
            className="form-control"
            placeholder="Cari aktiviti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Tarikh</th>
                <th>Aktiviti</th>
                <th>Lokasi</th>
                <th>Kumpulan</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    Loading...
                  </td>
                </tr>
              ) : (
                filteredActivities.map((activity: any) => (
                  <tr key={activity.id}>
                    <td>
                      {new Date(
                        activity.activity_date
                      ).toLocaleDateString()}
                    </td>

                    <td>{activity.activity_name}</td>
                    <td>{activity.location}</td>
                    <td>{activity.group_name}</td>

                    <td>
                      <span className="badge bg-success">
                        {activity.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() =>
                          setSelectedActivity(activity)
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedActivity && (
        <div
          className="modal d-block"
          style={{
            background: "rgba(0,0,0,.55)",
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5>{selectedActivity.activity_name}</h5>

                <button
                  className="btn-close"
                  onClick={() =>
                    setSelectedActivity(null)
                  }
                />
              </div>

              <div className="modal-body">
                <p>
                  <strong>Lokasi:</strong>{" "}
                  {selectedActivity.location}
                </p>

                <p>
                  <strong>Kumpulan:</strong>{" "}
                  {selectedActivity.group_name}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {selectedActivity.status}
                </p>

                <p>
                  <strong>Penerangan:</strong>
                </p>

                <p>
                  {selectedActivity.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}