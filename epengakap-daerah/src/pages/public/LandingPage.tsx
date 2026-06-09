import { Link } from "react-router-dom";
import pengakapLogo from "../../assets/newLogo.png";

export default function LandingPage() {
  return (
    <div className="bg-light min-vh-100">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top py-3">
        <div className="container">
          <Link to="/" className="navbar-brand d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center"
              style={{ width: 120, height: 70 }}
            >
              <img
                src={pengakapLogo}
                alt="Logo ePengakap Daerah"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>

            <div>
              <div className="fw-bold" style={{ fontSize: "1.35rem" }}>
                ePengakap Daerah
              </div>
              <div className="text-muted" style={{ fontSize: "0.95rem" }}>
                Sistem Pengurusan Pengakap Daerah
              </div>
            </div>
          </Link>

          <div className="d-flex align-items-center gap-2">
            <Link
              to="/"
              className="btn btn-link text-dark text-decoration-none btn-sm"
            >
              Home
            </Link>

            <Link to="/login" className="btn btn-outline-success btn-sm">
              Login
            </Link>

            <Link to="/register-district" className="btn btn-success btn-sm">
              Daftar Pesuruhjaya Daerah
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
                Sistem Pengurusan Pengakap Daerah
              </h1>

              <p className="lead text-muted mb-4">
                Urus ahli, pemimpin, kumpulan dan data daerah secara berpusat,
                selamat dan tersusun dalam satu platform digital.
              </p>

              <div className="d-flex flex-wrap gap-2 mb-4">
                <Link to="/login" className="btn btn-success btn-lg">
                  Login
                  <i className="bi bi-arrow-right ms-2"></i>
                </Link>

                <Link
                  to="/register-district"
                  className="btn btn-outline-success btn-lg"
                >
                  Daftar Pesuruhjaya Daerah
                </Link>
              </div>

              <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-body">
                  <h6 className="fw-bold mb-3">Maklumat Ringkas</h6>

                  <div className="d-flex gap-3 mb-3">
                    <div className="text-success">
                      <i className="bi bi-check-circle-fill"></i>
                    </div>
                    <div className="small text-muted">
                      Pendaftaran daerah perlu mendapat kelulusan Super Admin.
                    </div>
                  </div>

                  <div className="d-flex gap-3 mb-3">
                    <div className="text-success">
                      <i className="bi bi-check-circle-fill"></i>
                    </div>
                    <div className="small text-muted">
                      Setiap daerah hanya boleh mempunyai satu environment
                      aktif.
                    </div>
                  </div>

                  <div className="d-flex gap-3">
                    <div className="text-success">
                      <i className="bi bi-check-circle-fill"></i>
                    </div>
                    <div className="small text-muted">
                      Data setiap daerah diasingkan mengikut daerah
                      masing-masing.
                    </div>
                  </div>
                </div>
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
                      <small className="text-muted">
                        Contoh paparan ringkasan daerah
                      </small>
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
                        <div
                          className="progress-bar bg-success"
                          style={{ width: "55%" }}
                        ></div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span>Pengakap Muda</span>
                        <span>30%</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div
                          className="progress-bar bg-primary"
                          style={{ width: "30%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between small mb-1">
                        <span>Pengakap Remaja</span>
                        <span>15%</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div
                          className="progress-bar bg-warning"
                          style={{ width: "15%" }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="alert alert-success-subtle border-0 mt-4 mb-0">
                    <div className="small text-success">
                      <i className="bi bi-info-circle me-2"></i>
                      Paparan ini ialah contoh dashboard selepas daerah
                      diluluskan.
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
              <div className="card border-0 shadow-sm h-100 rounded-4">
                <div className="card-body">
                  <i className="bi bi-building text-success fs-2"></i>
                  <h5 className="fw-bold mt-3">Multi-Daerah</h5>
                  <p className="text-muted small mb-0">
                    Setiap daerah mempunyai environment dan data tersendiri.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100 rounded-4">
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
              <div className="card border-0 shadow-sm h-100 rounded-4">
                <div className="card-body">
                  <i className="bi bi-person-gear text-success fs-2"></i>
                  <h5 className="fw-bold mt-3">Role Pengguna</h5>
                  <p className="text-muted small mb-0">
                    Akses berbeza untuk Super Admin, Pesuruhjaya, Penolong
                    Pesuruhjaya, Pemimpin dan Penolong Pemimpin.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100 rounded-4">
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
              <span className="badge bg-success-subtle text-success mb-3">
                Aliran Sistem
              </span>

              <h2 className="fw-bold">Aliran Pendaftaran Pesuruhjaya Daerah</h2>

              <p className="text-muted mb-0">
                Setiap permohonan perlu disemak oleh Super Admin sebelum
                Pesuruhjaya Daerah boleh menggunakan dashboard daerah.
              </p>
            </div>

            <div className="col-lg-7">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body">
                      <span className="badge bg-success mb-2">Step 1</span>
                      <h6 className="fw-bold">Daftar Pesuruhjaya</h6>
                      <p className="small text-muted mb-0">
                        Pesuruhjaya Daerah mengisi maklumat peribadi, daerah dan
                        dokumen sokongan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body">
                      <span className="badge bg-success mb-2">Step 2</span>
                      <h6 className="fw-bold">Pending Approval</h6>
                      <p className="small text-muted mb-0">
                        Permohonan akan berada dalam status menunggu kelulusan
                        Super Admin.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body">
                      <span className="badge bg-success mb-2">Step 3</span>
                      <h6 className="fw-bold">Semakan Super Admin</h6>
                      <p className="small text-muted mb-0">
                        Super Admin boleh approve, reject atau minta maklumat
                        tambahan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body">
                      <span className="badge bg-success mb-2">Step 4</span>
                      <h6 className="fw-bold">Dashboard Aktif</h6>
                      <p className="small text-muted mb-0">
                        Selepas diluluskan, district environment dicipta dan
                        daerah boleh mula mengurus data sendiri.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="alert alert-warning border-0 rounded-4 mt-4 mb-0">
            <div className="d-flex gap-3">
              <div>
                <i className="bi bi-shield-check text-warning fs-4"></i>
              </div>
              <div>
                <div className="fw-semibold">Kawalan Data Daerah</div>
                <div className="small text-muted">
                  Pengguna hanya boleh melihat dan mengurus data berdasarkan
                  role, daerah dan kumpulan masing-masing.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Summary */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold">Akses Mengikut Role</h2>
            <p className="text-muted">
              Setiap pengguna mempunyai skop akses yang berbeza.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            <div className="col-md-6 col-lg-4 col-xl">
              <div className="border rounded-4 p-4 h-100">
                <div className="mb-3 text-success fs-3">
                  <i className="bi bi-shield-lock"></i>
                </div>
                <h6 className="fw-bold">Super Admin</h6>
                <p className="small text-muted mb-0">
                  Mengurus permohonan daerah, kelulusan, senarai daerah,
                  pengguna sistem dan audit log keseluruhan.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4 col-xl">
              <div className="border rounded-4 p-4 h-100">
                <div className="mb-3 text-success fs-3">
                  <i className="bi bi-person-badge"></i>
                </div>
                <h6 className="fw-bold">Pesuruhjaya Daerah</h6>
                <p className="small text-muted mb-0">
                  Admin utama daerah yang boleh mengurus pengguna, kumpulan,
                  ahli, tetapan daerah dan dashboard daerah sendiri.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4 col-xl">
              <div className="border rounded-4 p-4 h-100">
                <div className="mb-3 text-success fs-3">
                  <i className="bi bi-person-check"></i>
                </div>
                <h6 className="fw-bold">Penolong Pesuruhjaya</h6>
                <p className="small text-muted mb-0">
                  Membantu Pesuruhjaya Daerah mengurus pemimpin, penolong
                  pemimpin, kumpulan dan ahli dalam daerah sendiri.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4 col-xl">
              <div className="border rounded-4 p-4 h-100">
                <div className="mb-3 text-success fs-3">
                  <i className="bi bi-people"></i>
                </div>
                <h6 className="fw-bold">Pemimpin Kumpulan</h6>
                <p className="small text-muted mb-0">
                  Mengurus penolong pemimpin dan ahli Pengakap dalam kumpulan
                  sendiri sahaja.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4 col-xl">
              <div className="border rounded-4 p-4 h-100">
                <div className="mb-3 text-success fs-3">
                  <i className="bi bi-person-plus"></i>
                </div>
                <h6 className="fw-bold">Penolong Pemimpin</h6>
                <p className="small text-muted mb-0">
                  Membantu mengurus, menambah dan mengemaskini ahli dalam
                  kumpulan sendiri sahaja.
                </p>
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

          <div className="d-flex flex-wrap justify-content-center gap-2">
            <Link
              to="/register-district"
              className="btn btn-light btn-lg text-success fw-semibold"
            >
              Daftar Pesuruhjaya Daerah
            </Link>

            <Link to="/login" className="btn btn-outline-light btn-lg">
              Login
            </Link>
          </div>
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