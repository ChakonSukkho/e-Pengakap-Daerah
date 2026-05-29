import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";

export default function DistrictApplicationsPage() {
  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Permohonan Daerah</h2>
          <p className="text-muted mb-0">Senarai permohonan Pesuruhjaya Daerah.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Nama Pemohon</th>
                <th>Negeri</th>
                <th>Daerah</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ali bin Abu</td>
                <td>Selangor</td>
                <td>Petaling</td>
                <td><span className="badge bg-warning text-dark">Pending</span></td>
                <td>
                  <Link to="/superadmin/applications/1" className="btn btn-sm btn-success">
                    View
                  </Link>
                </td>
              </tr>
              <tr>
                <td>Siti Aminah</td>
                <td>Terengganu</td>
                <td>Kuala Terengganu</td>
                <td><span className="badge bg-info text-dark">More Info</span></td>
                <td>
                  <Link to="/superadmin/applications/2" className="btn btn-sm btn-success">
                    View
                  </Link>
                </td>
              </tr>
              <tr>
                <td>Abu bin Ali</td>
                <td>WP Kuala Lumpur</td>
                <td>Setiawangsa</td>
                <td><span className="badge bg-danger">Rejected</span></td>
                <td>
                  <Link to="/superadmin/applications/3" className="btn btn-sm btn-success">
                    View
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}