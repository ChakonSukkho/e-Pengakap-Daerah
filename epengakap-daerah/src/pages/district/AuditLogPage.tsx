import DashboardLayout from "../../components/layout/DashboardLayout";

export default function AuditLogPage() {
  return (
    <DashboardLayout>
      <h2 className="fw-bold mb-1">Log Audit</h2>
      <p className="text-muted">Rekod aktiviti penting dalam sistem.</p>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body">
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
                <td>Encik Kamarul</td>
                <td>Pesuruhjaya Daerah</td>
                <td>Create</td>
                <td>Ahli Pengakap</td>
                <td><span className="badge bg-success">Success</span></td>
              </tr>
              <tr>
                <td>29/05/2026 11:05 AM</td>
                <td>Ahmad bin Salleh</td>
                <td>Pemimpin Kumpulan</td>
                <td>Update</td>
                <td>Kumpulan / Sekolah</td>
                <td><span className="badge bg-success">Success</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}