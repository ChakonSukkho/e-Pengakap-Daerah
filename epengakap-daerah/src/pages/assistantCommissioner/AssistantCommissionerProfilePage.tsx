import { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: string;
  district: string | null;
  district_environment_id?: string | null;
  status: string;
  profile_image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProfileForm = {
  full_name: string;
  phone: string;
  profile_image_url: string;
};

function getCurrentUser(): UserProfile | null {
  try {
    return JSON.parse(
      localStorage.getItem("user") ||
        localStorage.getItem("auth_user") ||
        "null"
    );
  } catch {
    return null;
  }
}

export default function AssistantCommissionerProfilePage() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    phone: "",
    profile_image_url: "",
  });

  useEffect(() => {
    if (!currentUser?.id) return;

    setUser(currentUser);
    setForm({
      full_name: currentUser.full_name || "",
      phone: currentUser.phone || "",
      profile_image_url: currentUser.profile_image_url || "",
    });
    setPreviewUrl(currentUser.profile_image_url || "");
  }, [currentUser]);

  function initials(name?: string | null) {
    return String(name || "-")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }

  function formatDate(value?: string | null) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function isAllowedRole(role?: string | null) {
    return (
      role === "Penolong Pesuruhjaya" ||
      role === "Penolong Pesuruhjaya Daerah" ||
      role === "Pesuruhjaya Daerah"
    );
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 12);

    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

    return `${digits.slice(0, 3)}-${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Sila pilih gambar jenis JPG, PNG atau WEBP sahaja.");
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
    setPreviewUrl(user?.profile_image_url || "");
  }

  async function uploadProfileImage(userId: string) {
    if (!selectedFile) return form.profile_image_url || null;

    setUploading(true);

    const fileExt = selectedFile.name.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profile-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("district-profile")
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setUploading(false);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("district-profile")
      .getPublicUrl(filePath);

    setUploading(false);
    return data.publicUrl;
  }

  async function insertAuditLog(
    action: string,
    description: string,
    oldValue?: any,
    newValue?: any
  ) {
    if (!user?.district_environment_id) return;

    await supabase.from("audit_logs").insert({
      actor_name: user.full_name || user.email || "Unknown User",
      actor_role: user.role || "Penolong Pesuruhjaya Daerah",
      action,
      module: "Profile",
      description,
      user_id: user.id,
      district_environment_id: user.district_environment_id,
      record_id: user.id,
      old_value: oldValue || null,
      new_value: newValue || null,
    });
  }

  async function saveProfile() {
    if (!user) return;

    if (!isAllowedRole(user.role)) {
      alert("Anda tidak mempunyai kebenaran untuk kemaskini profil ini.");
      return;
    }

    if (!form.full_name.trim()) {
      alert("Nama penuh wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const uploadedImageUrl = await uploadProfileImage(user.id);

      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        profile_image_url: uploadedImageUrl,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("system_users")
        .update(payload)
        .eq("id", user.id)
        .eq("district_environment_id", user.district_environment_id)
        .select()
        .single();

      if (error) {
        alert(error.message);
        setSaving(false);
        setUploading(false);
        return;
      }

      await insertAuditLog(
        "Kemaskini Profil",
        `${user.role} mengemaskini profil sendiri.`,
        user,
        data
      );

      localStorage.setItem("user", JSON.stringify(data));
      localStorage.setItem("auth_user", JSON.stringify(data));

      setUser(data);
      setForm({
        full_name: data.full_name || "",
        phone: data.phone || "",
        profile_image_url: data.profile_image_url || "",
      });
      setPreviewUrl(data.profile_image_url || "");
      setSelectedFile(null);

      alert("Profil berjaya dikemaskini.");
    } catch (error: any) {
      alert(error.message || "Gagal memuat naik gambar profil.");
    }

    setUploading(false);
    setSaving(false);
  }

  if (!user) {
    return (
      <DashboardLayout role="assistantCommissioner">
        <div className="alert alert-warning rounded-4 border-0 shadow-sm">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Sila log masuk semula.
        </div>
      </DashboardLayout>
    );
  }

  if (!isAllowedRole(user.role)) {
    return (
      <DashboardLayout role="assistantCommissioner">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <i className="bi bi-shield-lock fs-1 text-danger d-block mb-3"></i>
            <h4 className="fw-bold">Akses Ditolak</h4>
            <p className="text-muted mb-0">
              Anda tidak mempunyai kebenaran untuk melihat halaman ini.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="assistantCommissioner">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Profil Saya</h2>
          <p className="text-muted mb-0">
            Kemaskini nama, telefon dan gambar profil akaun.
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={saveProfile}
          disabled={saving || uploading}
        >
          <i className="bi bi-save me-1"></i>
          {saving || uploading ? "Menyimpan..." : "Simpan Profil"}
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="bg-success" style={{ height: 90 }}></div>

            <div
              className="card-body text-center p-4"
              style={{ marginTop: -55 }}
            >
              <div className="position-relative mx-auto mb-3" style={{ width: 120 }}>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile"
                    className="rounded-circle border border-4 border-light shadow-sm object-fit-cover bg-white"
                    style={{ width: 120, height: 120 }}
                  />
                ) : (
                  <div
                    className="rounded-circle bg-white border border-4 border-light text-success d-flex align-items-center justify-content-center fw-bold shadow-sm"
                    style={{ width: 120, height: 120, fontSize: 36 }}
                  >
                    {initials(user.full_name)}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-success btn-sm rounded-circle position-absolute bottom-0 end-0 shadow"
                  style={{ width: 38, height: 38 }}
                  onClick={openFilePicker}
                  title="Tukar gambar profil"
                >
                  <i className="bi bi-camera-fill"></i>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="d-none"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                />
              </div>

              <button
                type="button"
                className="btn btn-outline-success btn-sm rounded-pill mb-2"
                onClick={openFilePicker}
              >
                <i className="bi bi-image me-1"></i>
                Tukar Gambar
              </button>

              {selectedFile && (
                <div className="mb-3">
                  <div className="small text-muted mb-2">
                    Gambar dipilih: {selectedFile.name}
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={removeSelectedImage}
                  >
                    Batal Gambar
                  </button>
                </div>
              )}

              <div className="small text-muted mb-3">
                Gambar hanya akan disimpan selepas tekan{" "}
                <strong>Simpan Profil</strong>.
              </div>

              <h5 className="fw-bold mb-1">{user.full_name}</h5>
              <p className="text-muted small mb-3">{user.email}</p>

              <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
                {user.role}
              </span>

              <hr />

              <div className="text-start">
                <InfoRow label="Daerah" value={user.district || "-"} />
                <InfoRow label="Telefon" value={user.phone || "-"} />
                <InfoRow label="Status" value={user.status || "-"} />
                <InfoRow
                  label="Tarikh Daftar"
                  value={formatDate(user.created_at)}
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

              <Permission text="Lihat dashboard daerah sendiri" />
              <Permission text="Tambah dan edit ahli daerah" />
              <Permission text="Tambah dan edit kumpulan" />
              <Permission text="Tambah dan edit aktiviti daerah" />
              <Permission text="Generate laporan daerah sendiri" />

              <hr />

              <NoPermission text="Tidak boleh edit tetapan daerah" />
              <NoPermission text="Tidak boleh lihat audit log" />
              <NoPermission text="Tidak boleh akses Super Admin" />
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white p-4 border-0">
              <h5 className="fw-bold mb-0">Kemaskini Akaun</h5>
            </div>

            <div className="card-body p-4">
              <div className="alert alert-warning rounded-4 border-0">
                <i className="bi bi-shield-lock me-2"></i>
                Kata laluan tidak boleh ditukar di halaman ini untuk elak
                risiko keselamatan. Gunakan fungsi reset password / admin
                flow yang lebih selamat.
              </div>

              <div className="row g-3">
                <InputBox
                  label="Nama Penuh"
                  value={form.full_name}
                  onChange={(value) =>
                    setForm({ ...form, full_name: value })
                  }
                />

                <InputBox
                  label="Telefon"
                  value={form.phone}
                  onChange={(value) =>
                    setForm({ ...form, phone: formatPhone(value) })
                  }
                  placeholder="Contoh: 012-3456 789"
                />

                <ReadBox label="E-mel" value={user.email || "-"} />
                <ReadBox label="Role" value={user.role || "-"} />
                <ReadBox label="Daerah" value={user.district || "-"} />
                <ReadBox label="Status Akaun" value={user.status || "-"} />
              </div>
            </div>
          </div>

          <div className="alert alert-info mt-4 rounded-4 border-0 shadow-sm">
            <i className="bi bi-info-circle me-2"></i>
            Role ini membantu Pesuruhjaya Daerah mengurus data daerah, tetapi
            tidak boleh mengubah tetapan daerah, melihat audit log atau akses
            modul Super Admin.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-2">
      <span className="text-muted">{label}</span>
      <strong className="text-end">{value}</strong>
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

function NoPermission({ text }: { text: string }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-2 small">
      <i className="bi bi-x-circle-fill text-danger"></i>
      <span>{text}</span>
    </div>
  );
}

function InputBox({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">{label}</label>
      <input
        className="form-control rounded-3"
        value={value}
        placeholder={placeholder || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ReadBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">{label}</label>
      <input
        className="form-control rounded-3 bg-light"
        value={value}
        readOnly
      />
    </div>
  );
}