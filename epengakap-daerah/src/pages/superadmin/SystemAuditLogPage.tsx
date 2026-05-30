import DashboardLayout from "../../components/layout/DashboardLayout";

export default function SystemAuditLogPage() {
  return (
    <DashboardLayout role="superadmin">
      <h2 className="fw-bold mb-1">Log Audit Sistem</h2>
      <p className="text-muted">Rekod aktiviti penting seluruh sistem.</p>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Tarikh</th>
                <th>Pengguna</th>
                <th>Role</th>
                <th>Tindakan</th>
                <th>Modul</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>29/05/2026 10:30 AM</td>
                <td>Ahmad Razali</td>
                <td>Super Admin</td>
                <td>Approve</td>
                <td>Permohonan Daerah</td>
                <td><span className="badge bg-success">Success</span></td>
              </tr>
              <tr>
                <td>29/05/2026 11:05 AM</td>
                <td>Encik Kamarul</td>
                <td>Pesuruhjaya Daerah</td>
                <td>Create</td>
                <td>Ahli Pengakap</td>
                <td><span className="badge bg-success">Success</span></td>
              </tr>
              <tr>
                <td>29/05/2026 11:20 AM</td>
                <td>System</td>
                <td>System</td>
                <td>Login</td>
                <td>Authentication</td>
                <td><span className="badge bg-info text-dark">Info</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}