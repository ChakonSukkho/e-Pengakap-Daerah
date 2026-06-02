import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  district: string | null;
  status: string;
  password?: string;
  created_at?: string;
};

export default function AssistantCommissionerProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");

    if (currentUser) {
      setUser(currentUser);
      setForm({
        full_name: currentUser.full_name || "",
        email: currentUser.email || "",
        password: currentUser.password || "",
      });
    }
  }, []);

  function initials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }

  async function saveProfile() {
    if (!user) return;

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
    setSaving(false);
    alert("Profil berjaya dikemaskini.");
  }

  if (!user) {
    return (
      <DashboardLayout role="assistantCommissioner">
        <div className="alert alert-warning">
          Sila log masuk semula.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="assistantCommissioner">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold mb-1">Profil Saya</h2>
          <p className="text-muted mb-0">
            Maklumat akaun Penolong Pesuruhjaya.
          </p>
        </div>

        <button className="btn btn-success" onClick={saveProfile} disabled={saving}>
          <i className="bi bi-save me-1"></i>
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="bg-success" style={{ height: 90 }}></div>

            <div className="card-body text-center p-4" style={{ marginTop: -55 }}>
              <div
                className="rounded-circle bg-white border border-4 border-light text-success d-flex align-items-center justify-content-center fw-bold mx-auto shadow-sm mb-3"
                style={{ width: 100, height: 100, fontSize: 34 }}
              >
                {initials(user.full_name || "-")}
              </div>

              <h5 className="fw-bold mb-1">{user.full_name}</h5>
              <p className="text-muted small mb-3">{user.email}</p>

              <span className="badge rounded-pill bg-success-subtle text-success px-3 py-2">
                {user.role}
              </span>

              <hr />

              <div className="text-start">
                <InfoRow label="Daerah" value={user.district || "-"} />
                <InfoRow label="Status" value={user.status || "-"} />
                <InfoRow
                  label="Tarikh Daftar"
                  value={
                    user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "-"
                  }
                />
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mt-4">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                <i className="bi bi-shield-check text-success me-2"></i>
                Akses Role
              </h6>

              <Permission text="View semua ahli daerah" />
              <Permission text="View semua kumpulan daerah" />
              <Permission text="View aktiviti daerah" />
              <Permission text="Generate laporan daerah" />
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white p-4">
              <h5 className="fw-bold mb-0">Kemaskini Akaun</h5>
            </div>

            <div className="card-body p-4">
              <div className="row g-3">
                <InputBox
                  label="Nama Penuh"
                  value={form.full_name}
                  onChange={(v) => setForm({ ...form, full_name: v })}
                />

                <InputBox
                  label="E-mel"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                />

                <ReadBox label="Role" value={user.role} />
                <ReadBox label="Daerah" value={user.district || "-"} />

                <div className="col-md-6">
                  <label className="form-label">Kata Laluan</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </div>

                <ReadBox label="Status Akaun" value={user.status || "-"} />
              </div>
            </div>
          </div>

          <div className="alert alert-info mt-4">
            <i className="bi bi-info-circle me-2"></i>
            Role ini hanya untuk pemantauan daerah dan laporan. Tetapan daerah
            serta pengurusan pengguna dikawal oleh Pesuruhjaya Daerah.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="d-flex justify-content-between mb-2">
      <span className="text-muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Permission({ text }: { text: string }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-2 small">
      <i className="bi bi-check-circle-fill text-success"></i>
      <span>{text}</span>
    </div>
  );
}

function InputBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="col-md-6">
      <label className="form-label">{label}</label>
      <input
        className="form-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ReadBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-md-6">
      <label className="form-label">{label}</label>
      <input className="form-control bg-light" value={value} readOnly />
    </div>
  );
}