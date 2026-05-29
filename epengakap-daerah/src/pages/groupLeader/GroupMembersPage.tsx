import DashboardLayout from "../../components/layout/DashboardLayout";

export default function GroupMembersPage() {
  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Ahli Kumpulan</h2>
          <p className="text-muted mb-0">Urus ahli untuk kumpulan sendiri.</p>
        </div>

        <button className="btn btn-success">
          <i className="bi bi-plus-circle me-1"></i>
          Tambah Ahli
        </button>
      </div>

      <div className="card border-0 shadow-sm">
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
                <td><button className="btn btn-sm btn-outline-success">Edit</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}