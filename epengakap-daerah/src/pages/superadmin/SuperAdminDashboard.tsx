import DashboardLayout from "../../components/layout/DashboardLayout";

export default function SuperAdminDashboard() {
  return (
    <DashboardLayout>
      <h2 className="fw-bold">Super Admin Dashboard</h2>
      <p className="text-muted">Pantau permohonan daerah dan status sistem.</p>

      <div className="row g-3 mt-2">
        {[
          ["Jumlah Negeri", "14"],
          ["Daerah Berdaftar", "128"],
          ["Permohonan Pending", "7"],
          ["Permohonan Ditolak", "3"],
        ].map(([label, value]) => (
          <div className="col-md-3" key={label}>
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small">{label}</div>
                <h3 className="fw-bold">{value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-header bg-white fw-semibold">
          Permohonan Terkini
        </div>

        <div className="card-body">
          <table className="table table-hover">
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
                <td>Gombak</td>
                <td><span className="badge bg-warning text-dark">Pending</span></td>
                <td><a href="/superadmin/applications/1" className="btn btn-sm btn-success">View</a></td>
              </tr>
              <tr>
                <td>Abu bin Ali</td>
                <td>WP Kuala Lumpur</td>
                <td>Setiawangsa</td>
                <td><span className="badge bg-warning text-dark">Pending</span></td>
                <td><a href="/superadmin/applications/2" className="btn btn-sm btn-success">View</a></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}