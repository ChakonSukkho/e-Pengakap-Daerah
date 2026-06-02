import DashboardLayout from "../../components/layout/DashboardLayout";

export default function AssistantLeaderDashboard() {
  return (
    <DashboardLayout role="assistantLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Dashboard Penolong Pemimpin</h2>
          <p className="text-muted mb-0">
            Ringkasan kumpulan dan kehadiran ahli.
          </p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Ahli Kumpulan</div>
              <h2 className="fw-bold">45</h2>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Aktiviti Bulan Ini</div>
              <h2 className="fw-bold text-primary">3</h2>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Kehadiran</div>
              <h2 className="fw-bold text-success">92%</h2>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Lencana Dicapai</div>
              <h2 className="fw-bold text-warning">18</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">Aktiviti Akan Datang</h5>
            </div>

            <div className="card-body">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Aktiviti</th>
                    <th>Tarikh</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>Perkhemahan Daerah</td>
                    <td>15 Jun 2026</td>
                    <td>
                      <span className="badge bg-success">
                        Aktif
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>Khidmat Masyarakat</td>
                    <td>22 Jun 2026</td>
                    <td>
                      <span className="badge bg-primary">
                        Akan Datang
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>Latihan Mingguan</td>
                    <td>29 Jun 2026</td>
                    <td>
                      <span className="badge bg-warning text-dark">
                        Menunggu
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">Tugasan Saya</h5>
            </div>

            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item">
                  Semak kehadiran latihan minggu ini
                </li>

                <li className="list-group-item">
                  Kemaskini rekod ahli baru
                </li>

                <li className="list-group-item">
                  Bantu persediaan perkhemahan daerah
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}