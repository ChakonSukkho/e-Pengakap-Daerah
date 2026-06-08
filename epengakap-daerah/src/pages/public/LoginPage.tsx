import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import pengakapLogo from "../../assets/newLogoIcon.png";

type SystemUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  password?: string | null;
  role: string | null;
  district: string | null;
  district_environment_id: string | null;
  group_id?: string | null;
  group_name?: string | null;
  status: string | null;
  phone?: string | null;
  profile_image_url?: string | null;
};

type DistrictEnvironment = {
  id: string;
  district_commissioner_user_id: string | null;
  district_id: string | null;
  status: string | null;
  deleted_at: string | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRole(value?: string | null) {
  const role = String(value || "").trim();

  if (role === "District") return "Pesuruhjaya Daerah";
  if (role === "Assistant Commissioner") return "Penolong Pesuruhjaya Daerah";
  if (role === "Penolong Pesuruhjaya") return "Penolong Pesuruhjaya Daerah";
  if (role === "Group Leader") return "Pemimpin Kumpulan";
  if (role === "Assistant Leader") return "Penolong Pemimpin";

  return role;
}

function normalizeStatus(value?: string | null) {
  const status = String(value || "").trim().toLowerCase();

  if (status === "aktif" || status === "active") return "Aktif";
  if (status === "tidak aktif" || status === "inactive") return "Tidak Aktif";
  if (status === "pending" || status === "menunggu") return "Pending";

  return value || "";
}

function isDistrictRole(role?: string | null) {
  const normalized = normalizeRole(role);

  return (
    normalized === "Pesuruhjaya Daerah" ||
    normalized === "Penolong Pesuruhjaya Daerah" ||
    normalized === "Pemimpin Kumpulan" ||
    normalized === "Penolong Pemimpin"
  );
}

function getDashboardPath(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case "Super Admin":
      return "/superadmin/dashboard";

    case "Pesuruhjaya Daerah":
      return "/district/dashboard";

    case "Penolong Pesuruhjaya Daerah":
      return "/assistant-commissioner/dashboard";

    case "Pemimpin Kumpulan":
      return "/group-leader/dashboard";

    case "Penolong Pemimpin":
      return "/assistant-leader/dashboard";

    default:
      return "/login";
  }
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("pesuruhjaya@petaling.gov.my");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function findDistrictEnvironment(user: SystemUser) {
    if (user.district_environment_id) {
      return user.district_environment_id;
    }

    const userRole = normalizeRole(user.role);

    if (userRole === "Pesuruhjaya Daerah") {
      const { data: environmentByCommissioner, error } = await supabase
        .from("district_environments")
        .select(
          "id, district_commissioner_user_id, district_id, status, deleted_at"
        )
        .eq("district_commissioner_user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle<DistrictEnvironment>();

      if (error) {
        console.warn("Failed to find district environment:", error.message);
      }

      if (environmentByCommissioner?.id) {
        return environmentByCommissioner.id;
      }
    }

    return null;
  }

  async function updateLastLogin(userId: string) {
    await supabase
      .from("system_users")
      .update({
        last_login_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }

  async function handleLogin() {
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      alert("Sila isi email dan kata laluan.");
      return;
    }

    setLoading(true);

    try {
      localStorage.removeItem("user");
      localStorage.removeItem("auth_user");

      const { data, error } = await supabase
        .from("system_users")
        .select("*")
        .eq("email", cleanEmail)
        .eq("password", cleanPassword)
        .in("status", ["Aktif", "active", "Active"])
        .maybeSingle<SystemUser>();

      if (error) throw error;

      if (!data) {
        alert("Email atau kata laluan tidak sah, atau akaun belum aktif.");
        return;
      }

      const userRole = normalizeRole(data.role);
      const userStatus = normalizeStatus(data.status);

      if (userStatus !== "Aktif") {
        alert("Akaun belum aktif. Sila hubungi pentadbir sistem.");
        return;
      }

      const districtEnvironmentId = await findDistrictEnvironment(data);

      if (isDistrictRole(userRole) && !districtEnvironmentId) {
        alert(
          "Akaun ini belum dihubungkan dengan district environment. Sila hubungi Super Admin."
        );
        return;
      }

      const loginUser = {
        id: data.id,
        full_name: data.full_name || "",
        name: data.full_name || "",
        email: data.email || "",
        role: userRole,
        district: data.district || null,
        district_environment_id: districtEnvironmentId,
        group_id: data.group_id || null,
        group_name: data.group_name || null,
        status: userStatus,
        phone: data.phone || null,
        profile_image_url: data.profile_image_url || null,
      };

      localStorage.setItem("user", JSON.stringify(loginUser));
      localStorage.setItem("auth_user", JSON.stringify(loginUser));

      await updateLastLogin(data.id);

      window.dispatchEvent(new Event("userProfileUpdated"));

      navigate(getDashboardPath(userRole), { replace: true });
    } catch (error: any) {
      console.error("Login error:", error);
      alert(error?.message || "Gagal log masuk.");
    } finally {
      setLoading(false);
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

            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h1 className="h3 fw-bold">Selamat datang kembali</h1>
                <p className="text-muted small">
                  Log masuk ke portal pengurusan daerah anda.
                </p>

                <form
                  className="mt-4"
                  onSubmit={(event) => {
                    event.preventDefault();
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
                        onChange={(event) => setEmail(event.target.value)}
                        className="form-control"
                        placeholder="user@example.com"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <label className="form-label">Kata Laluan</label>

                      <button
                        type="button"
                        className="btn btn-link p-0 small text-success text-decoration-none"
                        onClick={() =>
                          alert(
                            "Fungsi lupa kata laluan akan dibangunkan kemudian."
                          )
                        }
                      >
                        Lupa kata laluan?
                      </button>
                    </div>

                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-lock"></i>
                      </span>

                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="form-control"
                        placeholder="Masukkan kata laluan"
                        disabled={loading}
                      />

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        <i
                          className={`bi ${
                            showPassword ? "bi-eye-slash" : "bi-eye"
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
                      disabled={loading}
                    />
                    <label className="form-check-label small" htmlFor="remember">
                      Ingat saya
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-success w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Sedang log masuk...
                      </>
                    ) : (
                      <>
                        Log Masuk <i className="bi bi-arrow-right ms-1"></i>
                      </>
                    )}
                  </button>

                  <div className="alert alert-light border mt-4 mb-0">
                    <div className="fw-semibold mb-2">Akaun Demo</div>
                    <div className="small text-muted">
                      Super Admin: superadmin@epengakap.my / 123456
                      <br />
                      Pesuruhjaya: pesuruhjaya@petaling.gov.my / 123456
                      <br />
                      Penolong Pesuruhjaya: penolong@petaling.gov.my / 123456
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