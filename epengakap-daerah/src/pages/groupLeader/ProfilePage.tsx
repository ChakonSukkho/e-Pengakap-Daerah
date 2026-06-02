import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  district: string | null;
  group_name?: string | null;
  status: string;
  password?: string;
  created_at?: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  function getInitials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  function loadProfile() {
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");

    if (!currentUser) {
      setLoading(false);
      return;
    }

    setUser(currentUser);
    setForm({
      full_name: currentUser.full_name || "",
      email: currentUser.email || "",
      password: currentUser.password || "",
    });

    setLoading(false);
  }

  async function addAuditLog(action: string, description: string) {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    await supabase.from("audit_logs").insert({
      actor_name: currentUser.full_name || "Pemimpin Kumpulan",
      actor_role: currentUser.role || "Pemimpin Kumpulan",
      action,
      module: "Profil Pemimpin",
      description,
    });
  }

  async function saveProfile() {
    if (!user) return;

    if (!form.full_name.trim() || !form.email.trim()) {
      alert("Sila isi nama dan email.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("system_users")
      .update({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);

    await addAuditLog("UPDATE", `Kemaskini profil pemimpin: ${form.full_name}`);

    setSaving(false);
    alert("Profil berjaya dikemaskini.");
  }

  if (loading) {
    return (
      <DashboardLayout role="groupLeader">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success"></div>
            <p className="text-muted mt-3 mb-0">Memuatkan profil...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout role="groupLeader">
        <div className="alert alert-warning">
          Maklumat pengguna tidak dijumpai. Sila log masuk semula.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold mb-1">Profil Saya</h2>
          <p className="text-muted mb-0">
            Urus maklumat akaun Pemimpin Kumpulan.
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={saveProfile}
          disabled={saving}
        >
          <i className="bi bi-save me-1"></i>
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body text-center p-4">
              <div
                className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                style={{ width: 86, height: 86, fontSize: 30 }}
              >
                {getInitials(user.full_name || "-")}
              </div>

              <h5 className="fw-bold mb-1">{user.full_name}</h5>
              <p className="text-muted mb-3">{user.email}</p>

              <span className="badge rounded-pill bg-primary-subtle text-primary px-3 py-2">
                {user.role}
              </span>

              <hr />

              <div className="text-start">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Status</span>
                  <span
                    className={`badge ${
                      user.status === "Aktif" ? "bg-success" : "bg-secondary"
                    }`}
                  >
                    {user.status}
                  </span>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Daerah</span>
                  <strong>{user.district || "-"}</strong>
                </div>

                <div className="d-flex justify-content-between">
                  <span className="text-muted">Kumpulan</span>
                  <strong>{user.group_name || user.district || "-"}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white p-4">
              <h5 className="fw-bold mb-0">Maklumat Akaun</h5>
            </div>

            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Nama Penuh</label>
                  <input
                    className="form-control"
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">E-mel</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Role</label>
                  <input className="form-control" value={user.role} readOnly />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status Akaun</label>
                  <input
                    className="form-control"
                    value={user.status || "-"}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Daerah</label>
                  <input
                    className="form-control"
                    value={user.district || "-"}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Kumpulan</label>
                  <input
                    className="form-control"
                    value={user.group_name || user.district || "-"}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Kata Laluan</label>
                  <input
                    className="form-control"
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                  <small className="text-muted">
                    Untuk development sahaja. Production nanti guna reset password.
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Tarikh Daftar</label>
                  <input
                    className="form-control"
                    value={
                      user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "-"
                    }
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="alert alert-info mt-4 mb-0">
            <i className="bi bi-info-circle me-2"></i>
            Perubahan nama dan email akan dikemaskini pada sesi login semasa.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}