import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type SystemUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  district: string | null;
  district_environment_id: string | null;
  group_id?: string | null;
  group_name?: string | null;
  status: string | null;
  profile_image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProfileForm = {
  full_name: string;
  phone: string;
  profile_image_url: string;
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

  if (!digits) return true;
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

function normalizeRole(role?: string | null) {
  if (role === "District") return "Pesuruhjaya Daerah";
  if (role === "Penolong Pesuruhjaya") return "Penolong Pesuruhjaya Daerah";
  return role || "-";
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
      module: "Profil Pengguna",
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

export default function DistrictProfilePage() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const userId = currentUser.id || "";
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [profile, setProfile] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    phone: "",
    profile_image_url: "",
  });

  useEffect(() => {
    fetchProfile();

    return () => {
      if (previewImageUrl && previewImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile() {
    if (!userId) {
      alert("Sesi login tidak dijumpai. Sila login semula.");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("system_users")
      .select("*")
      .eq("id", userId)
      .is("deleted_at", null)
      .maybeSingle<SystemUser>();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      alert("Profil pengguna tidak dijumpai.");
      setLoading(false);
      return;
    }

    setProfile(data);

    setForm({
      full_name: data.full_name || "",
      phone: formatMalaysiaPhone(data.phone || ""),
      profile_image_url:
        data.profile_image_url || currentUser.profile_image_url || "",
    });

    setSelectedImageFile(null);
    setPreviewImageUrl("");

    setLoading(false);
  }

  function updateLocalUser(payload: Partial<SystemUser>) {
    const savedUser = getCurrentUser();

    const updatedUser = {
      ...savedUser,
      ...payload,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("auth_user", JSON.stringify(updatedUser));
    window.dispatchEvent(new Event("userProfileUpdated"));
  }

  function handleSelectImage(file?: File) {
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

    if (previewImageUrl && previewImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewImageUrl);
    }

    const previewUrl = URL.createObjectURL(file);

    setSelectedImageFile(file);
    setPreviewImageUrl(previewUrl);
  }

  async function uploadSelectedProfileImage() {
    if (!selectedImageFile || !profile) return form.profile_image_url || "";

    const fileExt = selectedImageFile.name.split(".").pop();
    const folder = districtEnvironmentId || "unknown";
    const fileName = `users/${folder}/user-${profile.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("district-profile")
      .upload(fileName, selectedImageFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("district-profile")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function saveProfile() {
    if (!profile) return;

    if (!form.full_name.trim()) {
      alert("Sila isi nama penuh.");
      return;
    }

    if (form.phone && !isValidMalaysiaPhone(form.phone)) {
      alert(
        "Nombor telefon tidak sah. Sila masukkan nombor Malaysia yang bermula dengan 0. Contoh: 012-345 6789."
      );
      return;
    }

    setSavingProfile(true);

    try {
      let finalProfileImageUrl = form.profile_image_url || null;

      if (selectedImageFile) {
        finalProfileImageUrl = await uploadSelectedProfileImage();
      }

      const payload = {
        full_name: form.full_name.trim(),
        phone: normalizeMalaysiaPhone(form.phone) || null,
        profile_image_url: finalProfileImageUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("system_users")
        .update(payload)
        .eq("id", profile.id);

      if (error) {
        throw error;
      }

      updateLocalUser(payload);

      await addAuditLog(
        "UPDATE",
        `Kemaskini profil pengguna: ${payload.full_name}`,
        profile.id
      );

      setForm((prev) => ({
        ...prev,
        profile_image_url: finalProfileImageUrl || "",
      }));

      setSelectedImageFile(null);
      setPreviewImageUrl("");

      alert("Profil berjaya dikemaskini.");
      await fetchProfile();
    } catch (error: any) {
      alert(error?.message || "Gagal menyimpan profil.");
    }

    setSavingProfile(false);
  }

  function cancelImageChange() {
    if (previewImageUrl && previewImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewImageUrl);
    }

    setSelectedImageFile(null);
    setPreviewImageUrl("");
  }

  const displayImageUrl = previewImageUrl || form.profile_image_url;

  if (loading) {
    return (
      <DashboardLayout role="district">
        <div className="text-center py-5">
          <div className="spinner-border text-success"></div>
          <p className="text-muted mt-3 mb-0">Memuatkan profil...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout role="district">
        <div className="alert alert-warning rounded-4">
          Profil pengguna tidak dijumpai.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Profil Saya</h2>
          <p className="text-muted mb-0">
            Kemaskini maklumat akaun sendiri. E-mel, role dan daerah tidak boleh
            diubah di sini.
          </p>
        </div>

        <span className="badge bg-success px-3 py-2">
          {normalizeRole(profile.role)}
        </span>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4 text-center">
              {displayImageUrl ? (
                <img
                  src={displayImageUrl}
                  alt="Profile"
                  className="rounded-circle border mb-3"
                  style={{
                    width: 130,
                    height: 130,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                  style={{ width: 130, height: 130, fontSize: 38 }}
                >
                  {getInitials(form.full_name || "User")}
                </div>
              )}

              <h5 className="fw-bold mb-1">{form.full_name || "-"}</h5>
              <div className="text-muted small mb-2">{profile.email || "-"}</div>

              <span
                className={`badge ${
                  profile.status === "Aktif" ? "bg-success" : "bg-secondary"
                }`}
              >
                {profile.status || "-"}
              </span>

              <div className="mt-4">
                <label className="btn btn-outline-success btn-sm">
                  {selectedImageFile ? "Tukar Pilihan Gambar" : "Pilih Gambar Profil"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={savingProfile}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleSelectImage(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {selectedImageFile && (
                <div className="mt-3">
                  <div className="alert alert-warning rounded-4 small mb-2">
                    Gambar baru belum disimpan. Tekan{" "}
                    <strong>Simpan Profil</strong> untuk update.
                  </div>

                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={cancelImageChange}
                    disabled={savingProfile}
                  >
                    Batal Gambar
                  </button>
                </div>
              )}

              <div className="small text-muted mt-2">
                Gambar ini untuk avatar akaun anda sahaja.
              </div>

              <hr />

              <div className="text-start">
                <div className="mb-3">
                  <small className="text-muted d-block">Role</small>
                  <strong>{normalizeRole(profile.role)}</strong>
                </div>

                <div className="mb-3">
                  <small className="text-muted d-block">Daerah</small>
                  <strong>{profile.district || "-"}</strong>
                </div>

                <div className="mb-3">
                  <small className="text-muted d-block">Kumpulan</small>
                  <strong>{profile.group_name || "-"}</strong>
                </div>

                <div>
                  <small className="text-muted d-block">
                    District Environment
                  </small>
                  <code className="small">
                    {profile.district_environment_id || "-"}
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div className="alert alert-info rounded-4 mt-4 small">
            <i className="bi bi-info-circle me-2"></i>
            Logo rasmi daerah diurus dalam halaman{" "}
            <strong>Tetapan Daerah</strong>. Gambar di sini ialah avatar user.
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Maklumat Akaun Saya</h5>
              <p className="text-muted small mb-0">
                Nama penuh, nombor telefon peribadi dan gambar profil boleh
                dikemaskini sendiri.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label">Nama Penuh</label>
                  <input
                    className="form-control"
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
                    placeholder="Nama penuh"
                    disabled={savingProfile}
                  />
                  <small className="text-muted">
                    Nama ini akan dipaparkan sebagai nama akaun anda dalam sistem.
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">E-mel Login</label>
                  <input
                    type="email"
                    className="form-control bg-light"
                    value={profile.email || "-"}
                    readOnly
                  />
                  <small className="text-muted">
                    E-mel login hanya boleh ditukar oleh admin.
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">No Telefon Peribadi</label>
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
                    placeholder="012-345 6789"
                    disabled={savingProfile}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Role</label>
                  <input
                    className="form-control bg-light"
                    value={normalizeRole(profile.role)}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Daerah</label>
                  <input
                    className="form-control bg-light"
                    value={profile.district || "-"}
                    readOnly
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  className="btn btn-success"
                  onClick={saveProfile}
                  disabled={savingProfile}
                >
                  <i className="bi bi-save me-1"></i>
                  {savingProfile ? "Menyimpan..." : "Simpan Profil"}
                </button>

                {selectedImageFile && (
                  <span className="text-muted small ms-3">
                    Gambar baru akan disimpan bersama profil.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-2">Keselamatan Akaun</h5>
              <p className="text-muted mb-3">
                Untuk keselamatan, password dan e-mel login tidak boleh ditukar
                terus dari halaman ini.
              </p>

              <div className="alert alert-warning rounded-4 mb-0">
                <i className="bi bi-shield-lock me-2"></i>
                Jika terlupa password atau mahu tukar e-mel login, sila hubungi
                Pesuruhjaya Daerah atau Super Admin untuk reset / kemaskini
                akaun.
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}