import DashboardLayout from "../../components/layout/DashboardLayout";

export default function SystemUsersPage() {
  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Pengguna Sistem</h2>
          <p className="text-muted mb-0">Urus semua pengguna sistem mengikut role.</p>
        </div>

        <button className="btn btn-success">
          <i className="bi bi-person-plus me-1"></i>
          Tambah Pengguna
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input className="form-control" placeholder="Cari nama atau email..." />
            </div>
            <div className="col-md-3">
              <select className="form-select">
                <option>Semua Role</option>
                <option>Super Admin</option>
                <option>Pesuruhjaya Daerah</option>
                <option>Pemimpin Kumpulan</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select">
                <option>Semua Status</option>
                <option>Aktif</option>
                <option>Tidak Aktif</option>
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
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Daerah</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ahmad Razali</td>
                <td>admin@epengakap.my</td>
                <td>Super Admin</td>
                <td>-</td>
                <td><span className="badge bg-success">Aktif</span></td>
                <td><button className="btn btn-sm btn-outline-success">Edit</button></td>
              </tr>
              <tr>
                <td>Encik Kamarul</td>
                <td>kamarul@petaling.my</td>
                <td>Pesuruhjaya Daerah</td>
                <td>Petaling</td>
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