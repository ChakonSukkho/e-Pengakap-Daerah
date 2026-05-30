import DashboardLayout from "../../components/layout/DashboardLayout";

export default function DistrictManagementPage() {
  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Senarai Daerah</h2>
          <p className="text-muted mb-0">Pantau semua daerah yang telah didaftarkan.</p>
        </div>

        <button className="btn btn-success">
          <i className="bi bi-plus-circle me-1"></i>
          Tambah Daerah
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input className="form-control" placeholder="Cari daerah..." />
            </div>
            <div className="col-md-3">
              <select className="form-select">
                <option>Semua Negeri</option>
                <option>Selangor</option>
                <option>Terengganu</option>
                <option>WP Kuala Lumpur</option>
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
                <th>Negeri</th>
                <th>Daerah</th>
                <th>Pesuruhjaya</th>
                <th>Jumlah Ahli</th>
                <th>Kumpulan</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Selangor</td>
                <td>Petaling</td>
                <td>Encik Kamarul</td>
                <td>1,245</td>
                <td>42</td>
                <td><span className="badge bg-success">Aktif</span></td>
                <td><button className="btn btn-sm btn-outline-success">View</button></td>
              </tr>
              <tr>
                <td>Terengganu</td>
                <td>Kuala Terengganu</td>
                <td>Pn. Siti Aminah</td>
                <td>880</td>
                <td>28</td>
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