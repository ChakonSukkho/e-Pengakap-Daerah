import DashboardLayout from "../../components/layout/DashboardLayout";

export default function MemberManagementPage() {
  return (
    <DashboardLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Ahli Pengakap</h2>
          <p className="text-muted mb-0">Urus maklumat ahli pengakap mengikut kumpulan.</p>
        </div>

        <button className="btn btn-success">
          <i className="bi bi-plus-circle me-1"></i>
          Tambah Ahli
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <input className="form-control" placeholder="Cari nama ahli..." />
            </div>
            <div className="col-md-3">
              <select className="form-select">
                <option>Semua Kumpulan</option>
                <option>SK Kementah</option>
                <option>SMK Seksyen 7</option>
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select">
                <option>Semua Kategori</option>
                <option>PKK</option>
                <option>PM</option>
                <option>PR</option>
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select">
                <option>Status</option>
                <option>Aktif</option>
                <option>Tidak Aktif</option>
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select">
                <option>Jantina</option>
                <option>Lelaki</option>
                <option>Perempuan</option>
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
                <th>Kumpulan</th>
                <th>Kategori</th>
                <th>Umur</th>
                <th>Jantina</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ahmad bin Ali</td>
                <td>SK Kementah</td>
                <td>Pengakap Kanak-Kanak</td>
                <td>11</td>
                <td>Lelaki</td>
                <td><span className="badge bg-success">Aktif</span></td>
                <td>
                  <button className="btn btn-sm btn-outline-success me-1">View</button>
                  <button className="btn btn-sm btn-outline-secondary">Edit</button>
                </td>
              </tr>
              <tr>
                <td>Nur Aisyah</td>
                <td>SMK Seksyen 7</td>
                <td>Pengakap Muda</td>
                <td>14</td>
                <td>Perempuan</td>
                <td><span className="badge bg-success">Aktif</span></td>
                <td>
                  <button className="btn btn-sm btn-outline-success me-1">View</button>
                  <button className="btn btn-sm btn-outline-secondary">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}