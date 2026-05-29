import DashboardLayout from "../../components/layout/DashboardLayout";

export default function GroupManagementPage() {
  return (
    <DashboardLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Kumpulan / Sekolah</h2>
          <p className="text-muted mb-0">Urus kumpulan pengakap dan sekolah dalam daerah.</p>
        </div>

        <button className="btn btn-success">
          <i className="bi bi-plus-circle me-1"></i>
          Tambah Kumpulan
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input className="form-control" placeholder="Cari kumpulan / sekolah..." />
            </div>
            <div className="col-md-3">
              <select className="form-select">
                <option>Semua Jenis</option>
                <option>Pengakap Kanak-Kanak</option>
                <option>Pengakap Muda</option>
                <option>Pengakap Remaja</option>
                <option>Campuran</option>
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
                <th>Kod</th>
                <th>Nama Kumpulan</th>
                <th>Sekolah</th>
                <th>Ketua Pemimpin</th>
                <th>Jumlah Ahli</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>01</td>
                <td>01 Petaling</td>
                <td>SK Kementah</td>
                <td>Ahmad bin Salleh</td>
                <td>45</td>
                <td><span className="badge bg-success">Aktif</span></td>
                <td><button className="btn btn-sm btn-outline-success">Edit</button></td>
              </tr>
              <tr>
                <td>02</td>
                <td>02 Petaling</td>
                <td>SMK Seksyen 7</td>
                <td>Farid bin Hassan</td>
                <td>63</td>
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