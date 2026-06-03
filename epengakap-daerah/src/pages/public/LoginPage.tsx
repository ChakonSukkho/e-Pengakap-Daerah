import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import pengakapLogo from "../../assets/newLogoIcon.png";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("pesuruhjaya@petaling.gov.my");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      alert("Sila isi email dan kata laluan.");
      return;
    }

    const { data, error } = await supabase
      .from("system_users")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .eq("status", "Aktif")
      .maybeSingle()

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

if (!data) {
  alert("Email atau kata laluan tidak sah.");
  return;
}

    localStorage.setItem("user", JSON.stringify(data));

    switch (data.role) {
      case "Super Admin":
        navigate("/superadmin");
        break;

      case "Pesuruhjaya Daerah":
        navigate("/district/dashboard");
        break;

      case "Penolong Pesuruhjaya":
        navigate("/assistant-commissioner/dashboard");
        break;

      case "Pemimpin Kumpulan":
        navigate("/group-leader/dashboard");
        break;

      case "Penolong Pemimpin":
        navigate("/assistant-leader/dashboard");
        break;

      default:
        navigate("/");
    }
  }

  return (
    <div className="min-vh-100">
      <div className="row g-0 min-vh-100">
        <div className="col-lg-6 d-none d-lg-flex flex-column justify-content-between bg-dark text-white p-5">
          <Link
            to="/"
            className="d-flex align-items-center gap-3 text-white text-decoration-none"
          >
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

        <div className="col-lg-6 d-flex align-items-center justify-content-center bg-light p-4">
          <div className="w-100" style={{ maxWidth: 430 }}>
            <div className="d-lg-none mb-4 d-flex align-items-center gap-3">
              <img
                src={pengakapLogo}
                alt="Persekutuan Pengakap Malaysia"
                style={{
                  width: 50,
                  height: 50,
                  objectFit: "contain",
                }}
              />
              <div className="fw-bold">ePengakap Daerah</div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h1 className="h3 fw-bold">Selamat datang kembali</h1>
                <p className="text-muted small">
                  Log masuk ke portal pengurusan daerah anda.
                </p>

                <form
                  className="mt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin();
                  }}
                >
                  <div className="mb-3">
                    <label className="form-label">E-mel</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-envelope"></i>
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="form-control"
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <label className="form-label">Kata Laluan</label>
                      <a
                        href="#"
                        className="small text-success text-decoration-none"
                      >
                        Lupa kata laluan?
                      </a>
                    </div>

                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-lock"></i>
                      </span>

                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form-control"
                        placeholder="Masukkan kata laluan"
                      />

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i
                          className={`bi ${
                            showPassword
                              ? "bi-eye-slash"
                              : "bi-eye"
                          }`}
                        ></i>
                      </button>
                    </div>
                  </div>

                  <div className="form-check mb-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="remember"
                    />
                    <label className="form-check-label small" htmlFor="remember">
                      Ingat saya
                    </label>
                  </div>

                  <button type="submit" className="btn btn-success w-100">
                    Log Masuk <i className="bi bi-arrow-right ms-1"></i>
                  </button>

                  <div className="alert alert-light border mt-4 mb-0">
                    <div className="fw-semibold mb-2">Akaun Demo</div>
                    <div className="small text-muted">
                      Super Admin: superadmin@epengakap.my / 123456
                      <br />
                      Pesuruhjaya: pesuruhjaya@petaling.gov.my / 123456
                    </div>
                  </div>
                </form>

                <div className="mt-4 text-center small text-muted">
                  Belum berdaftar?{" "}
                  <Link
                    to="/register-district"
                    className="text-success fw-semibold text-decoration-none"
                  >
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