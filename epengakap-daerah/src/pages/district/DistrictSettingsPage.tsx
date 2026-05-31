import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type DistrictSetting = {
  id: string;
  state: string;
  district: string;
  official_name: string;
  email: string;
  phone: string;
  commissioner: string;
  address: string;
  status: string;
};

export default function DistrictSettingsPage() {
  const [settingId, setSettingId] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    state: "Selangor",
    district: "Petaling",
    official_name: "Majlis Pengakap Daerah Petaling",
    email: "petaling@pengakap.org.my",
    phone: "03-12345678",
    commissioner: "Encik Kamarul",
    address: "Pejabat Pengakap Daerah Petaling, Selangor",
    status: "Aktif",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data, error } = await supabase
      .from("district_settings")
      .select("*")
      .eq("district", "Petaling")
      .maybeSingle();

    if (error) {
      alert(error.message);
      return;
    }

    if (data) {
      setSettingId(data.id);
      setForm({
        state: data.state || "Selangor",
        district: data.district || "Petaling",
        official_name: data.official_name || "",
        email: data.email || "",
        phone: data.phone || "",
        commissioner: data.commissioner || "Encik Kamarul",
        address: data.address || "",
        status: data.status || "Aktif",
      });
    }
  }

  async function saveSettings() {
    if (!form.official_name.trim() || !form.email.trim()) {
      alert("Sila isi nama rasmi daerah dan email rasmi.");
      return;
    }

    setLoading(true);

    const payload = {
      ...form,
      updated_at: new Date().toISOString(),
    };

    if (settingId) {
      const { error } = await supabase
        .from("district_settings")
        .update(payload)
        .eq("id", settingId);

      if (error) {
        setLoading(false);
        alert(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("district_settings")
        .insert(payload)
        .select()
        .single();

      if (error) {
        setLoading(false);
        alert(error.message);
        return;
      }

      setSettingId(data.id);
    }

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    if (currentUser?.id) {
      const { error: userUpdateError } = await supabase
        .from("system_users")
        .update({
          full_name: form.commissioner,
          district: form.district,
        })
        .eq("id", currentUser.id);
      
      if (userUpdateError) {
        alert(userUpdateError.message);
        return;
      }
    
      const updatedUser = {
        ...currentUser,
        full_name: form.commissioner,
        district: form.district,
      };
    
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }

    setLoading(false);
    alert("Tetapan daerah berjaya disimpan.");
  }

  return (
    <DashboardLayout role="district">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Tetapan Daerah</h2>
        <p className="text-muted mb-0">Urus maklumat rasmi daerah.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white">
          <h5 className="fw-semibold mb-0">Maklumat Daerah</h5>
        </div>

        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Negeri</label>
              <input
                className="form-control"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Daerah</label>
              <input
                className="form-control"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Nama Rasmi Daerah</label>
              <input
                className="form-control"
                value={form.official_name}
                onChange={(e) =>
                  setForm({ ...form, official_name: e.target.value })
                }
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">E-mel Rasmi</label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Telefon Rasmi</label>
              <input
                className="form-control"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Pesuruhjaya Daerah</label>
              <input
                className="form-control"
                value={form.commissioner}
                onChange={(e) =>
                  setForm({ ...form, commissioner: e.target.value })
                }
              />
            </div>

            <div className="col-12">
              <label className="form-label">Alamat Pejabat Daerah</label>
              <textarea
                className="form-control"
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Status Environment</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option>Aktif</option>
                <option>Tidak Aktif</option>
              </select>
            </div>
          </div>

          <div
            className={`alert mt-4 mb-4 ${
              form.status === "Aktif" ? "alert-success" : "alert-warning"
            }`}
          >
            Status Environment: <strong>{form.status}</strong>
          </div>

          <button
            className="btn btn-success"
            onClick={saveSettings}
            disabled={loading}
          >
            <i className="bi bi-save me-1"></i>
            {loading ? "Menyimpan..." : "Simpan Tetapan"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}