import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type UserProfile = {
  id: string;
  full_name: string | null;
  name?: string | null;
  email: string | null;
  phone?: string | null;
  profile_image_url?: string | null;
  role: string | null;
  district: string | null;
  district_environment_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProfileForm = {
  full_name: string;
  email: string;
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
  if (role === "Assistant Leader") return "Penolong Pemimpin";
  return role || "Penolong Pemimpin";
}

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "active" || value === "aktif") return "Aktif";
  if (value === "inactive" || value === "tidak aktif") return "Tidak Aktif";
  if (value === "suspended" || value === "digantung") return "Digantung";

  return status || "Aktif";
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

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function addAuditLog(action: string, description: string) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name:
        currentUser.full_name || currentUser.name || "Penolong Pemimpin",
      actor_role: currentUser.role || "Penolong Pemimpin",
      action,
      module: "Profil Penolong Pemimpin",
      description,
      user_id: currentUser.id || null,
      district_environment_id: currentUser.district_environment_id || null,
      record_id: currentUser.id || null,
      ip_address: null,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Jangan block update profile kalau audit log gagal.
  }
}

export default function AssistantProfilePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    email: "",
    phone: "",
    profile_image_url: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const currentUser = getCurrentUser();

    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("system_users")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle<UserProfile>();

    if (error) {
      alert(error.message);
      setUser(currentUser);

      setForm({
        full_name: currentUser.full_name || currentUser.name || "",
        email: currentUser.email || "",
        phone: formatMalaysiaPhone(currentUser.phone || ""),
        profile_image_url: currentUser.profile_image_url || "",
      });

      setPreviewUrl(currentUser.profile_image_url || "");
      setLoading(false);
      return;
    }

    const profile = data || currentUser;

    setUser(profile);

    setForm({
      full_name: profile.full_name || profile.name || "",
      email: profile.email || "",
      phone: formatMalaysiaPhone(profile.phone || ""),
      profile_image_url: profile.profile_image_url || "",
    });

    setPreviewUrl(profile.profile_image_url || "");

    localStorage.setItem("user", JSON.stringify(profile));
    localStorage.setItem("auth_user", JSON.stringify(profile));

    window.dispatchEvent(new Event("userProfileUpdated"));

    setLoading(false);
  }

  function validateForm() {
    const fullName = form.full_name.trim();
    const phone = form.phone.trim();

    if (!fullName) {
      alert("Nama penuh wajib diisi.");
      return false;
    }

    if (fullName.length < 3) {
      alert("Nama penuh mestilah sekurang-kurangnya 3 aksara.");
      return false;
    }

    if (phone && !isValidMalaysiaPhone(phone)) {
      alert(
        "Nombor telefon tidak sah. Sila masukkan nombor Malaysia yang bermula dengan 0. Contoh: 012-345 6789."
      );
      return false;
    }

    return true;
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Sila pilih fail gambar sahaja.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Saiz gambar maksimum ialah 2MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function removeSelectedImage() {
    setSelectedFile(null);
    setPreviewUrl("");
    setForm((prev) => ({
      ...prev,
      profile_image_url: "",
    }));
  }

  async function uploadProfileImage() {
    if (!selectedFile || !user?.id) {
      return form.profile_image_url || null;
    }

    const extension = selectedFile.name.split(".").pop() || "png";
    const filePath = `profile-images/${user.id}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("district-profile")
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("district-profile")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function saveProfile() {
    if (!user?.id) {
      alert("Profil pengguna tidak dijumpai.");
      return;
    }

    if (!validateForm()) return;

    setSaving(true);

    try {
      const uploadedImageUrl = await uploadProfileImage();

      const payload = {
        full_name: form.full_name.trim(),
        phone: normalizeMalaysiaPhone(form.phone) || null,
        profile_image_url: uploadedImageUrl,
        updated_at: new Date().toISOString(),
      };

      let updateQuery = supabase
        .from("system_users")
        .update(payload)
        .eq("id", user.id)
        .eq("role", "Penolong Pemimpin")
        .is("deleted_at", null);

      if (user.district_environment_id) {
        updateQuery = updateQuery.eq(
          "district_environment_id",
          user.district_environment_id
        );
      }

      const { data, error } = await updateQuery.select("*").single<UserProfile>();

      if (error) throw error;

      const updatedUser = {
        ...user,
        ...data,
        name: data.full_name || user.name || "",
      };

      setUser(updatedUser);

      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("auth_user", JSON.stringify(updatedUser));

      window.dispatchEvent(new Event("userProfileUpdated"));

      setForm({
        full_name: updatedUser.full_name || "",
        email: updatedUser.email || "",
        phone: formatMalaysiaPhone(updatedUser.phone || ""),
        profile_image_url: updatedUser.profile_image_url || "",
      });

      setPreviewUrl(updatedUser.profile_image_url || "");
      setSelectedFile(null);

      await addAuditLog(
        "UPDATE",
        `Kemaskini profil penolong pemimpin: ${payload.full_name}`
      );

      alert("Profil berjaya dikemaskini.");
    } catch (error: any) {
      alert(error?.message || "Gagal kemaskini profil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="assistantLeader">
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
      <DashboardLayout role="assistantLeader">
        <div className="alert alert-warning rounded-4">
          Maklumat pengguna tidak dijumpai. Sila log masuk semula.
        </div>
      </DashboardLayout>
    );
  }

  const userName = user.full_name || user.name || "-";
  const role = normalizeRole(user.role);
  const status = normalizeStatus(user.status);

  return (
    <DashboardLayout role="assistantLeader">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold mb-1">Profil Saya</h2>
          <p className="text-muted mb-0">
            Maklumat akaun Penolong Pemimpin.
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="d-none"
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0] || null)
                }
              />

              <div
                className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                style={{
                  width: 100,
                  height: 100,
                  fontSize: 32,
                  overflow: "hidden",
                }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={userName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  getInitials(userName)
                )}
              </div>

              <div className="d-flex justify-content-center gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  onClick={openFilePicker}
                >
                  <i className="bi bi-camera me-1"></i>
                  Tukar Gambar
                </button>

                {previewUrl && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={removeSelectedImage}
                  >
                    Buang
                  </button>
                )}
              </div>

              <h5 className="fw-bold mb-1">{userName}</h5>
              <p className="text-muted mb-3">{user.email || "-"}</p>

              <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                {role}
              </span>

              <hr />

              <div className="text-start">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Status</span>
                  <span
                    className={`badge rounded-pill ${
                      status === "Aktif"
                        ? "bg-success"
                        : status === "Digantung"
                        ? "bg-warning text-dark"
                        : "bg-secondary"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Daerah</span>
                  <strong>{user.district || "-"}</strong>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Kumpulan</span>
                  <strong>{user.group_name || "-"}</strong>
                </div>

                <div className="d-flex justify-content-between">
                  <span className="text-muted">Telefon</span>
                  <strong>{formatMalaysiaPhone(user.phone || "") || "-"}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="alert alert-light border mt-4 mb-0 rounded-4">
            <i className="bi bi-shield-check text-success me-2"></i>
            Role ini hanya boleh melihat dan mengurus data kumpulan sendiri.
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Maklumat Akaun</h5>
              <p className="text-muted small mb-0">
                Anda boleh kemaskini nama, telefon dan gambar profil sahaja.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Nama Penuh</label>
                  <input
                    className="form-control"
                    value={form.full_name}
                    onChange={(event) =>
                      setForm({ ...form, full_name: event.target.value })
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">E-mel</label>
                  <input
                    type="email"
                    className="form-control bg-light"
                    value={form.email}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">No Telefon</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    maxLength={13}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        phone: formatMalaysiaPhone(event.target.value),
                      })
                    }
                    placeholder="012-345 6789"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Role</label>
                  <input className="form-control bg-light" value={role} readOnly />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status Akaun</label>
                  <input
                    className="form-control bg-light"
                    value={status}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Daerah</label>
                  <input
                    className="form-control bg-light"
                    value={user.district || "-"}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Kumpulan</label>
                  <input
                    className="form-control bg-light"
                    value={user.group_name || "-"}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Tarikh Daftar</label>
                  <input
                    className="form-control bg-light"
                    value={formatDate(user.created_at)}
                    readOnly
                  />
                </div>
              </div>

              <div className="alert alert-warning rounded-4 mt-4 mb-0 small">
                <i className="bi bi-shield-lock me-2"></i>
                Kata laluan dan email tidak boleh ditukar di halaman ini.
                Gunakan flow admin/reset password untuk elak risiko keselamatan.
              </div>
            </div>
          </div>

          <div className="alert alert-info mt-4 mb-0 rounded-4">
            <i className="bi bi-info-circle me-2"></i>
            Selepas tekan Simpan Perubahan, gambar dan nama akan dikemaskini pada
            Topbar secara automatik.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}