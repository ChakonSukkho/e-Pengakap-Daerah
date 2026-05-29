import DashboardLayout from "../../components/layout/DashboardLayout";

export default function UserManagementPage() {
  return (
    <DashboardLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Pengurusan Pengguna</h2>
          <p className="text-muted mb-0">Urus pengguna dan role dalam daerah.</p>
        </div>

        <button className="btn btn-success">
          <i className="bi bi-plus-circle me-1"></i>
          Tambah Pengguna
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input className="form-control" placeholder="Cari nama pengguna..." />
            </div>
            <div className="col-md-3">
              <select className="form-select">
                <option>Semua Role</option>
                <option>Penolong Pesuruhjaya</option>
                <option>Pemimpin Kumpulan</option>
                <option>Penolong Pemimpin</option>
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
        <div className="card-body">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Nama</th>
                <th>E-mel</th>
                <th>Role</th>
                <th>Kumpulan</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ahmad bin Salleh</td>
                <td>ahmad@example.com</td>
                <td>Pemimpin Kumpulan</td>
                <td>SK Kementah</td>
                <td><span className="badge bg-success">Aktif</span></td>
                <td><button className="btn btn-sm btn-outline-success">Edit</button></td>
              </tr>
              <tr>
                <td>Siti Aminah</td>
                <td>siti@example.com</td>
                <td>Penolong Pesuruhjaya</td>
                <td>-</td>
                <td><span className="badge bg-success">Aktif</span></td>
                <td><button className="btn btn-sm btn-outline-success">Edit</button></td>
              </tr>
              <tr>
                <td>Ali bin Abu</td>
                <td>ali@example.com</td>
                <td>Penolong Pemimpin</td>
                <td>SK Kementah</td>
                <td><span className="badge bg-secondary">Tidak Aktif</span></td>
                <td><button className="btn btn-sm btn-outline-success">Edit</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}