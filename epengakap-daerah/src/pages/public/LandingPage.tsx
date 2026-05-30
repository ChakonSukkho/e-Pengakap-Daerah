import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="bg-light min-vh-100">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top">
        <div className="container">
          <Link to="/" className="navbar-brand d-flex align-items-center gap-2">
            <div
              className="bg-success text-white rounded-3 d-flex align-items-center justify-content-center"
              style={{ width: 42, height: 42 }}
            >
              <i className="bi bi-shield-check fs-4"></i>
            </div>

            <div>
              <div className="fw-bold">ePengakap Daerah</div>
              <small className="text-muted">Sistem Pengurusan Pengakap</small>
            </div>
          </Link>

          <div className="d-flex gap-2">
            <Link to="/login" className="btn btn-outline-success btn-sm">
              Log Masuk
            </Link>
            <Link to="/register-district" className="btn btn-success btn-sm">
              Daftar Daerah
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-5">
        <div className="container py-lg-5">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <span className="badge bg-success-subtle text-success mb-3">
                MVP Fasa 1
              </span>

              <h1 className="display-5 fw-bold mb-3">
                Sistem Pengurusan Pengakap Daerah yang Berpusat dan Tersusun
              </h1>

              <p className="lead text-muted mb-4">
                ePengakap Daerah membantu Pesuruhjaya Daerah mengurus ahli,
                pemimpin, kumpulan, sekolah dan data daerah dalam satu platform
                yang selamat dan mudah digunakan.
              </p>

              <div className="d-flex flex-wrap gap-2 mb-4">
                <Link to="/login" className="btn btn-success btn-lg">
                  Log Masuk
                  <i className="bi bi-arrow-right ms-2"></i>
                </Link>

                <Link to="/register-district" className="btn btn-outline-success btn-lg">
                  Daftar Pesuruhjaya Daerah
                </Link>
              </div>

              <div className="row g-3">
                <div className="col-4">
                  <div className="fw-bold fs-4">14</div>
                  <small className="text-muted">Negeri</small>
                </div>
                <div className="col-4">
                  <div className="fw-bold fs-4">128+</div>
                  <small className="text-muted">Daerah</small>
                </div>
                <div className="col-4">
                  <div className="fw-bold fs-4">100%</div>
                  <small className="text-muted">Data Terasing</small>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card border-0 shadow-lg rounded-4">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h5 className="fw-bold mb-1">Dashboard Daerah</h5>
                      <small className="text-muted">Contoh paparan ringkasan daerah</small>
                    </div>
                    <span className="badge bg-success">Aktif</span>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <div className="bg-light rounded-3 p-3">
                        <small className="text-muted">Ahli Aktif</small>
                        <h3 className="fw-bold mb-0">1,245</h3>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded-3 p-3">
                        <small className="text-muted">Kumpulan</small>
                        <h3 className="fw-bold mb-0">42</h3>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded-3 p-3">
                        <small className="text-muted">Pemimpin</small>
                        <h3 className="fw-bold mb-0">86</h3>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded-3 p-3">
                        <small className="text-muted">Pen. Pemimpin</small>
                        <h3 className="fw-bold mb-0">103</h3>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-3 p-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-semibold">Pecahan Ahli</span>
                      <small className="text-muted">Kategori</small>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span>Pengakap Kanak-Kanak</span>
                        <span>55%</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div className="progress-bar bg-success" style={{ width: "55%" }}></div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span>Pengakap Muda</span>
                        <span>30%</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div className="progress-bar bg-primary" style={{ width: "30%" }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between small mb-1">
                        <span>Pengakap Remaja</span>
                        <span>15%</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div className="progress-bar bg-warning" style={{ width: "15%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold">Ciri Utama Sistem</h2>
            <p className="text-muted">
              Direka untuk membantu pengurusan daerah dengan lebih sistematik.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <i className="bi bi-building text-success fs-2"></i>
                  <h5 className="fw-bold mt-3">Multi-Daerah</h5>
                  <p className="text-muted small mb-0">
                    Setiap daerah mempunyai data dan environment tersendiri.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <i className="bi bi-people text-success fs-2"></i>
                  <h5 className="fw-bold mt-3">Pengurusan Ahli</h5>
                  <p className="text-muted small mb-0">
                    Rekod ahli, kategori, kumpulan dan penjaga boleh diuruskan.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <i className="bi bi-person-gear text-success fs-2"></i>
                  <h5 className="fw-bold mt-3">Role Pengguna</h5>
                  <p className="text-muted small mb-0">
                    Akses berbeza untuk Super Admin, Pesuruhjaya dan Pemimpin.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <i className="bi bi-journal-check text-success fs-2"></i>
                  <h5 className="fw-bold mt-3">Audit Log</h5>
                  <p className="text-muted small mb-0">
                    Tindakan penting direkodkan untuk rujukan dan pemantauan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-5">
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-lg-5">
              <h2 className="fw-bold">Aliran Pendaftaran Daerah</h2>
              <p className="text-muted">
                Setiap permohonan daerah perlu disemak oleh Super Admin sebelum
                dashboard daerah boleh digunakan.
              </p>
            </div>

            <div className="col-lg-7">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <span className="badge bg-success mb-2">Step 1</span>
                      <h6 className="fw-bold">Daftar Pesuruhjaya</h6>
                      <p className="small text-muted mb-0">
                        Pesuruhjaya Daerah mengisi maklumat dan dokumen sokongan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <span className="badge bg-success mb-2">Step 2</span>
                      <h6 className="fw-bold">Pending Approval</h6>
                      <p className="small text-muted mb-0">
                        Permohonan akan berada dalam status menunggu kelulusan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <span className="badge bg-success mb-2">Step 3</span>
                      <h6 className="fw-bold">Semakan Admin</h6>
                      <p className="small text-muted mb-0">
                        Super Admin boleh approve, reject atau minta maklumat tambahan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <span className="badge bg-success mb-2">Step 4</span>
                      <h6 className="fw-bold">Dashboard Aktif</h6>
                      <p className="small text-muted mb-0">
                        Selepas diluluskan, daerah boleh mula mengurus data sendiri.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-5 bg-success text-white">
        <div className="container text-center">
          <h2 className="fw-bold">Mulakan Pengurusan Daerah Anda</h2>
          <p className="text-white-50 mb-4">
            Daftar sebagai Pesuruhjaya Daerah dan tunggu kelulusan Super Admin.
          </p>

          <Link to="/register-district" className="btn btn-light btn-lg text-success fw-semibold">
            Daftar Daerah Sekarang
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 bg-dark text-white">
        <div className="container d-flex flex-column flex-md-row justify-content-between gap-2">
          <div>
            <strong>ePengakap Daerah</strong>
            <div className="small text-white-50">
              Sistem Pengurusan Pengakap Daerah
            </div>
          </div>

          <div className="small text-white-50">
            © 2026 ePengakap Daerah Developed by Bintara Solutions Sdn Bhd
          </div>
        </div>
      </footer>
    </div>
  );
}