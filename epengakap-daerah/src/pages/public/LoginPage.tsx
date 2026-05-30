import { Link } from "react-router-dom";
import pengakapLogo from "../../assets/pengakap-logo.png";

export default function LoginPage() {
  return (
    <div className="min-vh-100">
      <div className="row g-0 min-vh-100">
        {/* Left brand panel */}
        <div className="col-lg-6 d-none d-lg-flex flex-column justify-content-between bg-dark text-white p-5">
          <Link to="/" className="d-flex align-items-center gap-3 text-white text-decoration-none">
            <div
              className="bg-white rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: 56,
                height: 56,
                overflow: "hidden",
              }}
            >
              <img
                src={pengakapLogo}
                alt="Persekutuan Pengakap Malaysia"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>

            <div>
              <div className="fw-bold">ePengakap Daerah</div>
              <small className="text-white-50">Portal Rasmi</small>
            </div>
          </Link>

          <div>
            <h2 className="fw-bold display-6">
              Pengurusan pengakap daerah yang{" "}
              <span className="text-success">bersepadu</span>.
            </h2>
            <p className="mt-3 text-white-50" style={{ maxWidth: 500 }}>
              Akses panel daerah anda untuk menguruskan ahli, kumpulan, sekolah
              dan pemimpin dalam satu sistem yang selamat.
            </p>
          </div>

          <small className="text-white-50">
            © 2026 ePengakap Daerah Developed by Bintara Solutions Sdn Bhd
          </small>
        </div>

        {/* Right form */}
        <div className="col-lg-6 d-flex align-items-center justify-content-center bg-light p-4">
          <div className="w-100" style={{ maxWidth: 430 }}>
            <div className="d-lg-none mb-4 d-flex align-items-center gap-3">
              <div
                className="bg-success text-white rounded-3 d-flex align-items-center justify-content-center"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-shield-check fs-4"></i>
              </div>
              <div className="fw-bold">ePengakap Daerah</div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h1 className="h3 fw-bold">Selamat datang kembali</h1>
                <p className="text-muted small">
                  Log masuk ke portal pengurusan daerah anda.
                </p>

                <form className="mt-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="mb-3">
                    <label className="form-label">E-mel</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-envelope"></i>
                      </span>
                      <input
                        type="email"
                        defaultValue="pesuruhjaya@petaling.gov.my"
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <label className="form-label">Kata Laluan</label>
                      <a href="#" className="small text-success text-decoration-none">
                        Lupa kata laluan?
                      </a>
                    </div>

                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-lock"></i>
                      </span>
                      <input
                        type="password"
                        defaultValue="password"
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-check mb-4">
                    <input className="form-check-input" type="checkbox" id="remember" />
                    <label className="form-check-label small" htmlFor="remember">
                      Ingat saya
                    </label>
                  </div>

                  <Link to="/district/dashboard" className="btn btn-success w-100">
                    Log Masuk <i className="bi bi-arrow-right ms-1"></i>
                  </Link>

                  <div className="row g-2 mt-3">
                    <div className="col-6">
                      <Link to="/superadmin" className="btn btn-outline-success btn-sm w-100">
                        Demo: Super Admin
                      </Link>
                    </div>
                    <div className="col-6">
                      <Link to="/district/dashboard" className="btn btn-outline-success btn-sm w-100">
                        Demo: Pesuruhjaya
                      </Link>
                    </div>
                  </div>
                </form>

                <div className="mt-4 text-center small text-muted">
                  Belum berdaftar?{" "}
                  <Link to="/register-district" className="text-success fw-semibold text-decoration-none">
                    Mohon Daftar Daerah
                  </Link>
                </div>
              </div>
            </div>

            <div className="text-center mt-3">
              <Link to="/" className="small text-muted text-decoration-none">
                ← Kembali ke halaman utama
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}