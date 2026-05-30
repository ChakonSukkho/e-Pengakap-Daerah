import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/ui/StatCard";
import { Link } from "react-router-dom";

export default function SuperAdminDashboard() {
  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Super Admin Dashboard</h2>
          <p className="text-muted mb-0">
            Pantau permohonan daerah dan status keseluruhan sistem.
          </p>
        </div>

        <Link to="/superadmin/applications" className="btn btn-success">
          Semak Permohonan
        </Link>
      </div>

      <div className="row g-3">
        <div className="col-md-3">
          <StatCard title="Jumlah Negeri" value="14" icon="bi-map" />
        </div>
        <div className="col-md-3">
          <StatCard title="Daerah Berdaftar" value="128" icon="bi-building" color="primary" />
        </div>
        <div className="col-md-3">
          <StatCard title="Pending" value="7" icon="bi-hourglass-split" color="warning" />
        </div>
        <div className="col-md-3">
          <StatCard title="Pengguna Sistem" value="3,482" icon="bi-people" color="info" />
        </div>
      </div>

      <div className="row g-4 mt-2">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-semibold">Permohonan Terkini</h5>
              <Link to="/superadmin/applications" className="small text-success text-decoration-none">
                Lihat Semua
              </Link>
            </div>

            <div className="card-body">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Nama Pemohon</th>
                    <th>Negeri</th>
                    <th>Daerah</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ali bin Abu</td>
                    <td>Selangor</td>
                    <td>Petaling</td>
                    <td>
                      <span className="badge bg-warning text-dark">Pending</span>
                    </td>
                    <td>
                      <Link to="/superadmin/applications/1" className="btn btn-sm btn-outline-success">
                        View
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td>Siti Aminah</td>
                    <td>Terengganu</td>
                    <td>Kuala Terengganu</td>
                    <td>
                      <span className="badge bg-info text-dark">More Info</span>
                    </td>
                    <td>
                      <Link to="/superadmin/applications/2" className="btn btn-sm btn-outline-success">
                        View
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td>Abu bin Ali</td>
                    <td>WP Kuala Lumpur</td>
                    <td>Setiawangsa</td>
                    <td>
                      <span className="badge bg-danger">Rejected</span>
                    </td>
                    <td>
                      <Link to="/superadmin/applications/3" className="btn btn-sm btn-outline-success">
                        View
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white fw-semibold">
              Status Permohonan
            </div>
            <div className="card-body">
              {[
                ["Approved", "72%", "success"],
                ["Pending", "18%", "warning"],
                ["Rejected", "10%", "danger"],
              ].map(([label, value, color]) => (
                <div className="mb-3" key={label}>
                  <div className="d-flex justify-content-between small mb-1">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="progress" style={{ height: 8 }}>
                    <div className={`progress-bar bg-${color}`} style={{ width: value }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">
              Aktiviti Sistem
            </div>
            <div className="card-body">
              <div className="border-bottom pb-2 mb-2">
                <div className="fw-semibold small">Permohonan baru diterima</div>
                <small className="text-muted">5 minit lalu</small>
              </div>
              <div className="border-bottom pb-2 mb-2">
                <div className="fw-semibold small">Daerah Petaling diluluskan</div>
                <small className="text-muted">1 jam lalu</small>
              </div>
              <div>
                <div className="fw-semibold small">Audit log dikemaskini</div>
                <small className="text-muted">Hari ini</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}