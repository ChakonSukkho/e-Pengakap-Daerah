import DashboardLayout from "../../components/layout/DashboardLayout";

export default function AssistantMembersPage() {
  return (
    <DashboardLayout role="assistantLeader">
      <h2 className="fw-bold">Ahli Kumpulan</h2>
      <p className="text-muted">Senarai ahli kumpulan untuk rujukan dan kemaskini.</p>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kategori</th>
                <th>Umur</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ahmad bin Ali</td>
                <td>Pengakap Kanak-Kanak</td>
                <td>11</td>
                <td><span className="badge bg-success">Aktif</span></td>
                <td><button className="btn btn-sm btn-outline-success">View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}