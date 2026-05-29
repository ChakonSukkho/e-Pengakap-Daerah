import DashboardLayout from "../../components/layout/DashboardLayout";

export default function ACMemberManagementPage() {
  return (
    <DashboardLayout role="assistantCommissioner">
      <h2 className="fw-bold">Ahli Pengakap</h2>
      <p className="text-muted">Senarai ahli di bawah daerah.</p>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kumpulan</th>
                <th>Kategori</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ahmad bin Ali</td>
                <td>SK Kementah</td>
                <td>Pengakap Kanak-Kanak</td>
                <td><span className="badge bg-success">Aktif</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}