import { useEffect, useMemo, useState } from "react";
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
  district_environment_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

type DistrictEnvironment = {
  id: string;
  state_id: string | null;
  district_id: string | null;
  official_name: string | null;
  official_email: string | null;
  official_phone: string | null;
  office_address: string | null;
  status: string | null;
  district_commissioner_user_id: string | null;
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
  logo_url: string;
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
  try {
    return JSON.parse(
      localStorage.getItem("user") ||
        localStorage.getItem("auth_user") ||
        "{}"
    );
  } catch {
    return {};
  }
}

function isSuperAdminRole(role?: string | null) {
  return String(role || "").trim() === "Super Admin";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "active" || value === "aktif") return "Aktif";
  if (value === "inactive" || value === "tidak aktif") return "Tidak Aktif";
  if (value === "suspended" || value === "digantung") return "Digantung";
  if (value === "pending") return "Pending";

  return status || "Aktif";
}

function normalizeEnvironmentStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "active" || value === "aktif") return "active";
  if (value === "inactive" || value === "tidak aktif") return "inactive";
  if (value === "suspended" || value === "digantung") return "Suspended";
  if (value === "pending") return "pending";

  return status || "active";
}

function normalizeMalaysiaPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatMalaysiaPhone(value: string) {
  const digits = normalizeMalaysiaPhone(value);

  if (!digits) return "";

  if (digits.startsWith("03")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)} ${digits.slice(6)}`;
  }

  if (digits.startsWith("011")) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function isValidMalaysiaPhone(value: string) {
  const digits = normalizeMalaysiaPhone(value);

  if (!digits) return false;
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

async function addAuditLog(
  action: string,
  description: string,
  recordId?: string | null
) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name: currentUser.full_name || "Unknown User",
      actor_role: currentUser.role || "Unknown Role",
      action,
      module: "Tetapan Daerah",
      description,
      user_id: currentUser.id || null,
      district_environment_id: currentUser.district_environment_id || null,
      record_id: recordId || null,
      ip_address: null,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Jangan block proses utama kalau audit log gagal.
  }
}

export default function DistrictSettingsPage() {
  const [settingId, setSettingId] = useState("");
  const [states, setStates] = useState<StateRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [environment, setEnvironment] = useState<DistrictEnvironment | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const currentUser = useMemo(() => getCurrentUser(), []);
  const isSuperAdmin = isSuperAdminRole(currentUser.role);
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [form, setForm] = useState<DistrictSettingForm>({
    state: "",
    district: "",
    official_name: "",
    email: "",
    phone: "",
    commissioner: "",
    address: "",
    status: "Aktif",
    logo_url: "",
  });

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getUserDistrict() {
    return (
      currentUser.district ||
      currentUser.district_name ||
      currentUser.daerah ||
      ""
    );
  }

  function getUserState() {
    return (
      currentUser.state ||
      currentUser.state_name ||
      currentUser.negeri ||
      ""
    );
  }

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

  async function fetchEnvironment() {
    if (!districtEnvironmentId) return null;

    const { data, error } = await supabase
      .from("district_environments")
      .select("*")
      .eq("id", districtEnvironmentId)
      .is("deleted_at", null)
      .maybeSingle<DistrictEnvironment>();

    if (error) {
      alert(error.message);
      return null;
    }

    setEnvironment(data || null);
    return data || null;
  }

  async function getStateName(stateId?: string | null) {
    if (!stateId) return getUserState();

    const { data } = await supabase
      .from("states")
      .select("state_name")
      .eq("id", stateId)
      .maybeSingle();

    return data?.state_name || getUserState();
  }

  async function getDistrictName(districtId?: string | null) {
    if (!districtId) return getUserDistrict();

    const { data } = await supabase
      .from("districts")
      .select("district_name")
      .eq("id", districtId)
      .maybeSingle();

    return data?.district_name || getUserDistrict();
  }

  async function getCommissionerName(userId?: string | null) {
    if (!userId) return currentUser.full_name || "";

    const { data } = await supabase
      .from("system_users")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    return data?.full_name || currentUser.full_name || "";
  }

  async function fetchSettings(stateList: StateRow[] = states) {
    const userDistrict = getUserDistrict();
    const userState = getUserState();

    const envData = await fetchEnvironment();

    let stateName = userState;
    let districtName = userDistrict;
    let commissionerName = currentUser.full_name || "";

    if (envData) {
      stateName = await getStateName(envData.state_id);
      districtName = await getDistrictName(envData.district_id);
      commissionerName = await getCommissionerName(
        envData.district_commissioner_user_id
      );
    }

    let query = supabase.from("district_settings").select("*").limit(1);

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    } else if (userDistrict) {
      query = query.eq("district", userDistrict);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      alert(error.message);
      return;
    }

    if (data) {
      const setting = data as DistrictSetting;

      setSettingId(setting.id);

      setForm({
        state: setting.state || stateName || "",
        district: setting.district || districtName || "",
        official_name:
          setting.official_name ||
          envData?.official_name ||
          (districtName ? `Majlis Pengakap Daerah ${districtName}` : ""),
        email: setting.email || envData?.official_email || "",
        phone: formatMalaysiaPhone(
          setting.phone || envData?.official_phone || ""
        ),
        commissioner: commissionerName || setting.commissioner || "",
        address: setting.address || envData?.office_address || "",
        status: normalizeStatus(setting.status || envData?.status),
        logo_url: setting.profile_image_url || "",
      });

      const matchedState = stateList.find(
        (item) =>
          item.state_name.toLowerCase() ===
          String(setting.state || stateName).toLowerCase()
      );

      if (matchedState) {
        setSelectedStateId(matchedState.id);
        await fetchDistrictsByState(matchedState.id);
      }

      return;
    }

    const defaultForm = {
      state: stateName || "",
      district: districtName || "",
      official_name:
        envData?.official_name ||
        (districtName ? `Majlis Pengakap Daerah ${districtName}` : ""),
      email: envData?.official_email || "",
      phone: formatMalaysiaPhone(envData?.official_phone || ""),
      commissioner: commissionerName || "",
      address: envData?.office_address || "",
      status: normalizeStatus(envData?.status),
      logo_url: "",
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

  async function uploadDistrictLogo(file: File) {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Format logo tidak sah. Sila upload JPG, PNG atau WEBP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Saiz logo terlalu besar. Maksimum 2MB.");
      return;
    }

    setUploadingLogo(true);

    const fileExt = file.name.split(".").pop();
    const safeDistrictId = districtEnvironmentId || "unknown";
    const fileName = `districts/${safeDistrictId}/logo-daerah-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("district-profile")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      alert(uploadError.message);
      setUploadingLogo(false);
      return;
    }

    const { data } = supabase.storage
      .from("district-profile")
      .getPublicUrl(fileName);

    const logoUrl = data.publicUrl;

    setForm((prev) => ({
      ...prev,
      logo_url: logoUrl,
    }));

    if (settingId) {
      const { error } = await supabase
        .from("district_settings")
        .update({
          profile_image_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settingId);

      if (error) {
        alert(error.message);
        setUploadingLogo(false);
        return;
      }

      await addAuditLog(
        "UPDATE",
        `Kemaskini logo rasmi daerah ${form.district || ""}`,
        settingId
      );
    }

    setUploadingLogo(false);
    alert("Logo daerah berjaya dikemaskini.");
  }

  function validateSettings() {
    if (!form.state.trim()) {
      alert("Maklumat negeri tiada. Sila hubungi Super Admin.");
      return false;
    }

    if (!form.district.trim()) {
      alert("Maklumat daerah tiada. Sila hubungi Super Admin.");
      return false;
    }

    if (!form.official_name.trim()) {
      alert("Sila isi nama rasmi daerah.");
      return false;
    }

    if (!form.email.trim()) {
      alert("Sila isi e-mel rasmi daerah.");
      return false;
    }

    if (!isValidEmail(form.email)) {
      alert("Format e-mel rasmi daerah tidak sah.");
      return false;
    }

    if (!form.phone.trim()) {
      alert("Sila isi telefon rasmi daerah.");
      return false;
    }

    if (!isValidMalaysiaPhone(form.phone)) {
      alert(
        "Nombor telefon rasmi tidak sah. Sila masukkan nombor Malaysia yang bermula dengan 0. Contoh: 012-345 6789."
      );
      return false;
    }

    if (!form.commissioner.trim()) {
      alert("Nama Pesuruhjaya Daerah tidak dijumpai. Sila hubungi Super Admin.");
      return false;
    }

    return true;
  }

  async function saveSettings() {
    if (!validateSettings()) return;

    setSaving(true);

    const payload: Record<string, any> = {
      district_environment_id: districtEnvironmentId || null,
      state: form.state.trim(),
      district: form.district.trim(),
      official_name: form.official_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: normalizeMalaysiaPhone(form.phone),
      commissioner: form.commissioner.trim(),
      address: form.address.trim() || null,
      status: form.status,
      profile_image_url: form.logo_url || null,
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

      await addAuditLog(
        "UPDATE",
        `Kemaskini tetapan daerah ${form.district}`,
        settingId
      );
    } else {
      const { data, error } = await supabase
        .from("district_settings")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      setSettingId(data.id);

      await addAuditLog(
        "CREATE",
        `Tambah tetapan daerah ${form.district}`,
        data.id
      );
    }

    if (environment) {
      const envPayload: Record<string, any> = {
        official_name: form.official_name.trim(),
        official_email: form.email.trim().toLowerCase(),
        official_phone: normalizeMalaysiaPhone(form.phone),
        office_address: form.address.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (isSuperAdmin) {
        envPayload.status = normalizeEnvironmentStatus(form.status);
      }

      await supabase
        .from("district_environments")
        .update(envPayload)
        .eq("id", environment.id);
    }

    setSaving(false);
    alert("Tetapan daerah berjaya disimpan.");

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
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Tetapan Daerah</h2>
          <p className="text-muted mb-0">
            Urus maklumat rasmi daerah dan logo MPD. Maklumat sistem dikawal
            oleh Super Admin.
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

      {!isSuperAdmin && (
        <div className="alert alert-info rounded-4 border-0 shadow-sm">
          <i className="bi bi-info-circle me-2"></i>
          Negeri, daerah, Pesuruhjaya Daerah dan status environment dikunci
          kerana maklumat ini ditetapkan oleh Super Admin semasa approval daerah.
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Maklumat Rasmi Daerah</h5>
              <p className="text-muted small mb-0">
                Maklumat ini digunakan sebagai identiti rasmi daerah, bukan
                profil user.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label">Nama Rasmi Daerah</label>
                  <input
                    className="form-control"
                    value={form.official_name}
                    onChange={(e) =>
                      setForm({ ...form, official_name: e.target.value })
                    }
                    placeholder="Contoh: Majlis Pengakap Daerah Kulim"
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
                  <label className="form-label">Telefon Rasmi Daerah</label>
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
                    Telefon ini untuk urusan rasmi daerah.
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
              </div>

              <div className="mt-4 d-flex gap-2">
                <button
                  className="btn btn-success"
                  onClick={saveSettings}
                  disabled={saving || uploadingLogo}
                >
                  <i className="bi bi-save me-1"></i>
                  {saving ? "Menyimpan..." : "Simpan Tetapan"}
                </button>

                <button
                  className="btn btn-outline-secondary"
                  onClick={loadPage}
                  disabled={saving || uploadingLogo}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mt-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Maklumat Sistem</h5>
              <p className="text-muted small mb-0">
                Maklumat ini dipaparkan untuk rujukan dan hanya boleh diubah
                oleh Super Admin.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Negeri</label>
                  <input
                    className="form-control bg-light"
                    value={form.state || "-"}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Daerah</label>
                  <input
                    className="form-control bg-light"
                    value={form.district || "-"}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Pesuruhjaya Daerah</label>
                  <input
                    className="form-control bg-light"
                    value={form.commissioner || "-"}
                    readOnly
                  />
                  <small className="text-muted">
                    Ini ialah akaun Pesuruhjaya yang ditetapkan oleh Super
                    Admin.
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status Environment</label>
                  <input
                    className="form-control bg-light"
                    value={form.status || "-"}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">Logo Daerah</h5>

              <div className="text-center mb-4">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="Logo Daerah"
                    className="rounded-circle border mb-3 bg-white"
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
                    {getInitials(form.district || "MPD")}
                  </div>
                )}

                <h6 className="fw-bold mb-0">
                  {form.official_name || "Majlis Pengakap Daerah"}
                </h6>

                <small className="text-muted d-block mt-1">
                  Logo rasmi daerah / MPD
                </small>

                <div className="mt-3">
                  <label className="btn btn-outline-success btn-sm">
                    {uploadingLogo ? "Uploading..." : "Upload Logo Daerah"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={uploadingLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (file) {
                          uploadDistrictLogo(file);
                        }

                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                <div className="small text-muted mt-2">
                  Logo ini untuk identiti rasmi daerah, bukan gambar profil
                  user.
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
                <small className="text-muted d-block">E-mel Rasmi</small>
                <strong>{form.email || "-"}</strong>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Telefon Rasmi</small>
                <strong>{formatMalaysiaPhone(form.phone) || "-"}</strong>
              </div>

              <div>
                <small className="text-muted d-block">Pesuruhjaya Daerah</small>
                <strong>{form.commissioner || "-"}</strong>
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
                : "Daerah ini tidak aktif atau sedang dikawal oleh Super Admin."}
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}