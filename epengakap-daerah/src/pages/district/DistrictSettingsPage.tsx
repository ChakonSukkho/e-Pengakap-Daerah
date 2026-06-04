import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type DistrictSetting = {
  id: string;
  state: string | null;
  district: string | null;
  official_name: string | null;
  email: string | null;
  phone: string | null;
  commissioner: string | null;
  address: string | null;
  status: string | null;
  profile_image_url: string | null;
  created_at?: string;
  updated_at?: string;
};

type DistrictSettingForm = {
  state: string;
  district: string;
  official_name: string;
  email: string;
  phone: string;
  commissioner: string;
  address: string;
  status: string;
  profile_image_url: string;
};

type StateRow = {
  id: string;
  state_name: string;
  state_code: string | null;
  status: string;
};

type DistrictRow = {
  id: string;
  state_id: string;
  district_name: string;
  district_code: string | null;
  status: string;
};

function getCurrentUser() {
  return JSON.parse(
    localStorage.getItem("user") ||
      localStorage.getItem("auth_user") ||
      "{}"
  );
}

async function addAuditLog(action: string, description: string) {
  const currentUser = getCurrentUser();

  await supabase.from("audit_logs").insert({
    actor_name: currentUser.full_name || currentUser.name || "Unknown User",
    actor_role: currentUser.role || "Unknown Role",
    action,
    module: "Tetapan Daerah",
    description,
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "active" || value === "aktif") return "Aktif";
  if (value === "inactive" || value === "tidak aktif") return "Tidak Aktif";

  return "Aktif";
}

function normalizeMalaysiaPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatMalaysiaPhone(value: string) {
  const digits = normalizeMalaysiaPhone(value);

  if (!digits) return "";
  if (digits.length <= 2) return digits;

  if (digits.startsWith("03")) {
    if (digits.length <= 6) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }

    return `${digits.slice(0, 2)}-${digits.slice(2, 6)} ${digits.slice(6)}`;
  }

  if (digits.startsWith("011")) {
    if (digits.length <= 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }

    return `${digits.slice(0, 3)}-${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function isValidMalaysiaPhone(value: string) {
  const digits = normalizeMalaysiaPhone(value);

  if (!digits.startsWith("0")) return false;

  return digits.length >= 9 && digits.length <= 11;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function DistrictSettingsPage() {
  const [settingId, setSettingId] = useState("");
  const [states, setStates] = useState<StateRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [selectedStateId, setSelectedStateId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const currentUser = getCurrentUser();
  const loginEmail = currentUser.email || "-";

  const [form, setForm] = useState<DistrictSettingForm>({
    state: "",
    district: "",
    official_name: "",
    email: "",
    phone: "",
    commissioner: "",
    address: "",
    status: "Aktif",
    profile_image_url: "",
  });

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);

    const stateList = await fetchStates();
    await fetchSettings(stateList);

    setLoading(false);
  }

  async function fetchStates() {
    const { data, error } = await supabase
      .from("states")
      .select("id, state_name, state_code, status")
      .in("status", ["active", "Aktif"])
      .order("state_name", { ascending: true });

    if (error) {
      alert(error.message);
      return [];
    }

    const stateList = data || [];
    setStates(stateList);

    return stateList;
  }

  async function fetchDistrictsByState(stateId: string) {
    if (!stateId) {
      setDistricts([]);
      return [];
    }

    const { data, error } = await supabase
      .from("districts")
      .select("id, state_id, district_name, district_code, status")
      .eq("state_id", stateId)
      .in("status", ["active", "Aktif"])
      .order("district_name", { ascending: true });

    if (error) {
      alert(error.message);
      return [];
    }

    const districtList = data || [];
    setDistricts(districtList);

    return districtList;
  }

  async function fetchSettings(stateList: StateRow[] = states) {
    const userDistrict =
      currentUser.district ||
      currentUser.district_name ||
      currentUser.daerah ||
      "";

    const userState =
      currentUser.state ||
      currentUser.state_name ||
      currentUser.negeri ||
      "";

    let query = supabase.from("district_settings").select("*").limit(1);

    if (userDistrict) {
      query = query.eq("district", userDistrict);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      alert(error.message);
      return;
    }

    if (data) {
      const setting = data as DistrictSetting;

      const stateName = setting.state || userState || "";
      const districtName = setting.district || userDistrict || "";

      setSettingId(setting.id);

      setForm({
        state: stateName,
        district: districtName,
        official_name: setting.official_name || "",
        email: setting.email || "",
        phone: formatMalaysiaPhone(setting.phone || ""),
        commissioner:
          setting.commissioner ||
          currentUser.full_name ||
          currentUser.name ||
          "",
        address: setting.address || "",
        status: normalizeStatus(setting.status),
        profile_image_url: setting.profile_image_url || "",
      });

      const matchedState = stateList.find(
        (item) => item.state_name.toLowerCase() === stateName.toLowerCase()
      );

      if (matchedState) {
        setSelectedStateId(matchedState.id);
        await fetchDistrictsByState(matchedState.id);
      }
    } else {
      const defaultForm = {
        state: userState || "",
        district: userDistrict || "",
        official_name: userDistrict
          ? `Majlis Pengakap Daerah ${userDistrict}`
          : "",
        email: "",
        phone: "",
        commissioner: currentUser.full_name || currentUser.name || "",
        address: "",
        status: "Aktif",
        profile_image_url: "",
      };

      setForm(defaultForm);

      const matchedState = stateList.find(
        (item) =>
          item.state_name.toLowerCase() ===
          String(defaultForm.state).toLowerCase()
      );

      if (matchedState) {
        setSelectedStateId(matchedState.id);
        await fetchDistrictsByState(matchedState.id);
      }
    }
  }

  async function uploadProfileImage(file: File) {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Format gambar tidak sah. Sila upload JPG, PNG atau WEBP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Saiz gambar terlalu besar. Maksimum 2MB.");
      return;
    }

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `district-profile-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("district-profile")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      alert(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("district-profile")
      .getPublicUrl(fileName);

    const imageUrl = data.publicUrl;
    
    const savedUser = getCurrentUser();

    const updatedUser = {
      ...savedUser,
      profile_image_url: imageUrl,
    };
    
    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("auth_user", JSON.stringify(updatedUser));
    
    window.dispatchEvent(new Event("userProfileUpdated"));

    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("auth_user", JSON.stringify(updatedUser));

    window.dispatchEvent(new Event("userProfileUpdated"));

    setForm({
      ...form,
      profile_image_url: imageUrl,
    });

    if (settingId) {
      const { error } = await supabase
        .from("district_settings")
        .update({
          profile_image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settingId);

      if (error) {
        alert(error.message);
        setUploading(false);
        return;
      }

      await addAuditLog(
        "UPDATE",
        `Kemaskini gambar profil daerah ${form.district || ""}`
      );
    }

    setUploading(false);
  }

  async function saveSettings() {
    if (!form.state.trim()) {
      alert("Sila pilih negeri.");
      return;
    }

    if (!form.district.trim()) {
      alert("Sila pilih daerah.");
      return;
    }

    if (!form.official_name.trim()) {
      alert("Sila isi nama rasmi daerah.");
      return;
    }

    if (!form.email.trim()) {
      alert("Sila isi e-mel rasmi.");
      return;
    }

    if (!isValidEmail(form.email)) {
      alert("Format e-mel rasmi tidak sah.");
      return;
    }

    if (!form.phone.trim()) {
      alert("Sila isi telefon rasmi.");
      return;
    }

    if (!isValidMalaysiaPhone(form.phone)) {
      alert(
        "Nombor telefon rasmi tidak sah. Sila guna format Malaysia seperti 012-345 6789."
      );
      return;
    }

    if (!form.commissioner.trim()) {
      alert("Sila isi nama Pesuruhjaya Daerah.");
      return;
    }

    setSaving(true);

    const payload = {
      state: form.state.trim(),
      district: form.district.trim(),
      official_name: form.official_name.trim(),
      email: form.email.trim(),
      phone: normalizeMalaysiaPhone(form.phone),
      commissioner: form.commissioner.trim(),
      address: form.address.trim() || null,
      status: form.status,
      profile_image_url: form.profile_image_url || null,
      updated_at: new Date().toISOString(),
    };

    if (settingId) {
      const { error } = await supabase
        .from("district_settings")
        .update(payload)
        .eq("id", settingId);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog("UPDATE", `Kemaskini tetapan daerah ${form.district}`);
    } else {
      const { data, error } = await supabase
        .from("district_settings")
        .insert(payload)
        .select()
        .single();

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      setSettingId(data.id);

      await addAuditLog("CREATE", `Tambah tetapan daerah ${form.district}`);
    }

    setSaving(false);
    alert("Tetapan daerah berjaya disimpan.");

    const savedUser = getCurrentUser();

    const updatedUser = {
      ...savedUser,
      name: form.commissioner,
      full_name: form.commissioner,
      email: savedUser.email,
      profile_image_url: form.profile_image_url,
      district: form.district,
      state: form.state,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("auth_user", JSON.stringify(updatedUser));

    window.dispatchEvent(new Event("userProfileUpdated"));
    await loadPage();
  }

  if (loading) {
    return (
      <DashboardLayout role="district" hideSearch>
        <div className="text-center py-5">
          <div className="spinner-border text-success"></div>
          <p className="text-muted mt-3 mb-0">Memuatkan tetapan daerah...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="district" hideSearch>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Tetapan Daerah</h2>
          <p className="text-muted mb-0">
            Urus maklumat rasmi dan status environment daerah.
          </p>
        </div>

        <span
          className={`badge px-3 py-2 ${
            form.status === "Aktif" ? "bg-success" : "bg-warning text-dark"
          }`}
        >
          {form.status}
        </span>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Maklumat Daerah</h5>
              <p className="text-muted small mb-0">
                Maklumat ini akan digunakan sebagai profil rasmi daerah.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Negeri</label>
                  <select
                    className="form-select"
                    value={selectedStateId}
                    onChange={(e) => {
                      const stateId = e.target.value;
                      const selectedState = states.find(
                        (state) => state.id === stateId
                      );

                      setSelectedStateId(stateId);

                      setForm({
                        ...form,
                        state: selectedState?.state_name || "",
                        district: "",
                      });

                      fetchDistrictsByState(stateId);
                    }}
                  >
                    <option value="">Pilih Negeri</option>

                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.state_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Daerah</label>
                  <select
                    className="form-select"
                    value={form.district}
                    disabled={!selectedStateId}
                    onChange={(e) =>
                      setForm({ ...form, district: e.target.value })
                    }
                  >
                    <option value="">Pilih Daerah</option>

                    {districts.map((district) => (
                      <option key={district.id} value={district.district_name}>
                        {district.district_name}
                      </option>
                    ))}
                  </select>

                  {!selectedStateId && (
                    <small className="text-muted">
                      Pilih negeri dahulu untuk lihat senarai daerah.
                    </small>
                  )}
                </div>

                <div className="col-md-12">
                  <label className="form-label">Nama Rasmi Daerah</label>
                  <input
                    className="form-control"
                    value={form.official_name}
                    onChange={(e) =>
                      setForm({ ...form, official_name: e.target.value })
                    }
                    placeholder="Contoh: Majlis Pengakap Daerah Petaling"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">E-mel Rasmi Daerah</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="contoh@pengakap.org.my"
                  />
                  <small className="text-muted">
                    Ini e-mel rasmi daerah, bukan e-mel login akaun.
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Telefon Rasmi</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    maxLength={13}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone: formatMalaysiaPhone(e.target.value),
                      })
                    }
                    placeholder="Contoh: 012-345 6789"
                  />
                  <small className="text-muted">
                    Format nombor Malaysia, contoh 012-345 6789 atau 03-1234
                    5678.
                  </small>
                </div>

                <div className="col-md-12">
                  <label className="form-label">Pesuruhjaya Daerah</label>
                  <input
                    className="form-control"
                    value={form.commissioner}
                    onChange={(e) =>
                      setForm({ ...form, commissioner: e.target.value })
                    }
                    placeholder="Nama Pesuruhjaya Daerah"
                  />
                  <small className="text-muted">
                    Ini hanya maklumat rasmi daerah, tidak mengubah nama akaun
                    login.
                  </small>
                </div>

                <div className="col-md-12">
                  <label className="form-label">Alamat Pejabat Daerah</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder="Alamat pejabat daerah"
                  ></textarea>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status Environment</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option>Aktif</option>
                    <option>Tidak Aktif</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 d-flex gap-2">
                <button
                  className="btn btn-success"
                  onClick={saveSettings}
                  disabled={saving || uploading}
                >
                  <i className="bi bi-save me-1"></i>
                  {saving ? "Menyimpan..." : "Simpan Tetapan"}
                </button>

                <button
                  className="btn btn-outline-secondary"
                  onClick={loadPage}
                  disabled={saving || uploading}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">Ringkasan Daerah</h5>

              <div className="text-center mb-4">
                {form.profile_image_url ? (
                  <img
                    src={form.profile_image_url}
                    alt="Profil Pesuruhjaya Daerah"
                    className="rounded-circle border mb-3"
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                    style={{ width: 120, height: 120, fontSize: 34 }}
                  >
                    {getInitials(form.commissioner || "PD")}
                  </div>
                )}

                <h6 className="fw-bold mb-0">
                  {form.commissioner || "Pesuruhjaya Daerah"}
                </h6>

                <small className="text-muted d-block">{loginEmail}</small>

                <small className="text-muted d-block mt-1">
                  {form.official_name || "Majlis Pengakap Daerah"}
                </small>

                <div className="mt-3">
                  <label className="btn btn-outline-success btn-sm">
                    {uploading ? "Uploading..." : "Upload Gambar"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (file) {
                          uploadProfileImage(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Nama Rasmi</small>
                <strong>{form.official_name || "-"}</strong>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Negeri / Daerah</small>
                <strong>
                  {form.state || "-"} / {form.district || "-"}
                </strong>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">E-mel Rasmi Daerah</small>
                <strong>{form.email || "-"}</strong>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Telefon Rasmi</small>
                <strong>{formatMalaysiaPhone(form.phone) || "-"}</strong>
              </div>

              <div>
                <small className="text-muted d-block">Status</small>
                <span
                  className={`badge ${
                    form.status === "Aktif"
                      ? "bg-success"
                      : "bg-warning text-dark"
                  }`}
                >
                  {form.status}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`alert ${
              form.status === "Aktif" ? "alert-success" : "alert-warning"
            } rounded-4`}
          >
            <strong>Status Environment: {form.status}</strong>
            <br />
            <span className="small">
              {form.status === "Aktif"
                ? "Daerah ini sedang aktif dan boleh digunakan oleh pengguna."
                : "Daerah ini tidak aktif. Pengguna mungkin tidak dapat menggunakan environment daerah ini."}
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}