import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type DistrictApplication = {
  id: string;
  applicant_name: string;
  email: string;
  phone: string;
  state: string;
  district: string;
  organization: string;
  status: string;
  admin_note: string;
};

export default function DistrictApplicationsPage() {
  const [applications, setApplications] = useState<DistrictApplication[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  useEffect(() => {
    fetchApplications();
  }, []);

async function fetchApplications() {
  const { data, error } = await supabase
    .from("district_applications")
    .select(`
      id,
      applicant_name,
      email,
      phone,
      state,
      district,
      organization,
      status,
      admin_note,
      created_at
    `)
    .order("created_at", { ascending: false });

  console.log("Applications data:", data);
  console.log("Applications error:", error);

  if (error) {
    alert(error.message);
    return;
  }

  setApplications(data || []);
}
  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("district_applications")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchApplications();
  }

  const filteredApplications = applications.filter((application) => {
    const matchSearch =
      application.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
      application.email.toLowerCase().includes(search.toLowerCase()) ||
      application.district.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "Semua Status" || application.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Permohonan Daerah</h2>
          <p className="text-muted mb-0">
            Senarai permohonan Pesuruhjaya Daerah.
          </p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <input
                className="form-control"
                placeholder="Cari nama, email atau daerah..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
                <option>More Info</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Nama Pemohon</th>
                <th>Email</th>
                <th>Negeri</th>
                <th>Daerah</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada permohonan dijumpai.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((application) => (
                  <tr key={application.id}>
                    <td>{application.applicant_name}</td>
                    <td>{application.email}</td>
                    <td>{application.state}</td>
                    <td>{application.district}</td>
                    <td>
                      <span
                        className={`badge ${
                          application.status === "Approved"
                            ? "bg-success"
                            : application.status === "Rejected"
                            ? "bg-danger"
                            : application.status === "More Info"
                            ? "bg-info text-dark"
                            : "bg-warning text-dark"
                        }`}
                      >
                        {application.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/superadmin/applications/${application.id}`}
                        className="btn btn-sm btn-outline-success me-1"
                      >
                        View
                      </Link>

                      <button
                        className="btn btn-sm btn-success me-1"
                        onClick={() => updateStatus(application.id, "Approved")}
                      >
                        Approve
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => updateStatus(application.id, "Rejected")}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}