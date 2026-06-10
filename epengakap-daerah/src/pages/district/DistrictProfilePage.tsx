import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type SystemUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;

  state?: string | null;
  negeri?: string | null;
  district: string | null;
  district_environment_id: string | null;

  group_id?: string | null;
  group_name?: string | null;

  member_no?: string | null;
  status: string | null;

  profile_image_url?: string | null;
  profile_image_offset_x?: number | null;
  profile_image_offset_y?: number | null;
  profile_image_zoom?: number | null;

  tauliah_no?: string | null;
  tauliah_type?: string | null;
  tauliah_status?: string | null;
  tauliah_start_date?: string | null;
  tauliah_end_date?: string | null;
  tauliah_recorded_at?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type StateOption = {
  id: string;
  state_name: string | null;
  status?: string | null;
};

type DistrictOption = {
  id: string;
  state_id: string | null;
  district_name: string | null;
  status?: string | null;
};

type GroupOption = {
  id: string;
  group_name: string | null;
  school_name?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  status?: string | null;
};

type ProfileForm = {
  full_name: string;
  phone: string;
  member_no: string;

  state: string;
  district: string;
  group_id: string;
  group_name: string;

  profile_image_url: string;
  profile_image_offset_x: number;
  profile_image_offset_y: number;
  profile_image_zoom: number;

  tauliah_no: string;
  tauliah_type: string;
  tauliah_status: string;
  tauliah_start_date: string;
  tauliah_end_date: string;
};

const TAULIAH_STATUS_OPTIONS = [
  "Tiada",
  "Aktif",
  "Tamat Tempoh",
  "Dibatalkan",
];

const TAULIAH_TYPE_OPTIONS = ["Sementara", "Tetap"];

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
  return String(name || "User")
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
  if (role === "Assistant Commissioner") return "Penolong Pesuruhjaya Daerah";
  if (role === "Group Leader") return "Pemimpin Kumpulan";
  if (role === "Assistant Leader") return "Penolong Pemimpin";
  return role || "-";
}

function formatDateDisplay(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function clampOffset(value: number) {
  if (Number.isNaN(value)) return 0;
  if (value < -260) return -260;
  if (value > 260) return 260;
  return Math.round(value);
}

function clampZoom(value: number) {
  if (Number.isNaN(value)) return 1;
  if (value < 1) return 1;
  if (value > 3) return 3;
  return Number(value.toFixed(2));
}

function getStatusBadgeClass(status?: string | null) {
  if (status === "Aktif" || status === "Ada") return "bg-success";
  if (status === "Tiada") return "bg-secondary";
  if (status === "Tamat Tempoh") return "bg-warning text-dark";
  if (status === "Dibatalkan" || status === "Tidak Aktif") return "bg-danger";
  return "bg-secondary";
}

async function addAuditLog(
  action: string,
  description: string,
  recordId?: string | null
) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name: currentUser.full_name || currentUser.name || "Unknown User",
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
  const [states, setStates] = useState<StateOption[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  const [showImageAdjustModal, setShowImageAdjustModal] = useState(false);
  const [draggingImage, setDraggingImage] = useState(false);
  const [lastPointer, setLastPointer] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    phone: "",
    member_no: "",

    state: "",
    district: "",
    group_id: "",
    group_name: "",

    profile_image_url: "",
    profile_image_offset_x: 0,
    profile_image_offset_y: 0,
    profile_image_zoom: 1,

    tauliah_no: "",
    tauliah_type: "",
    tauliah_status: "Tiada",
    tauliah_start_date: "",
    tauliah_end_date: "",
  });

  const selectedState = useMemo(() => {
    return states.find((state) => state.state_name === form.state) || null;
  }, [states, form.state]);

  const filteredDistricts = useMemo(() => {
    if (!selectedState?.id) return [];

    return districts.filter(
      (district) => district.state_id === selectedState.id
    );
  }, [districts, selectedState]);

  const filteredGroups = useMemo(() => {
    return groups;
  }, [groups]);

  const displayImageUrl = previewImageUrl || form.profile_image_url;

  useEffect(() => {
    fetchPageData();

    return () => {
      if (previewImageUrl && previewImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (profile) {
      fetchGroups(form.district || profile.district || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, form.district]);

  async function fetchPageData() {
    setLoading(true);

    await Promise.all([fetchStates(), fetchDistricts()]);
    await fetchProfile();

    setLoading(false);
  }

  async function fetchStates() {
    const { data, error } = await supabase
      .from("states")
      .select("id, state_name, status")
      .order("state_name", { ascending: true });

    if (error) {
      console.warn("States error:", error.message);
      setStates([]);
      return;
    }

    setStates(data || []);
  }

  async function fetchDistricts() {
    const { data, error } = await supabase
      .from("districts")
      .select("id, state_id, district_name, status")
      .order("district_name", { ascending: true });

    if (error) {
      console.warn("Districts error:", error.message);
      setDistricts([]);
      return;
    }

    setDistricts(data || []);
  }

  async function fetchGroups(selectedDistrict?: string) {
    let query = supabase
      .from("groups")
      .select(
        "id, group_name, school_name, district, district_environment_id, status"
      )
      .is("deleted_at", null)
      .order("group_name", { ascending: true });

    // Priority 1: Ambil semua kumpulan dalam district environment yang sama
    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Groups error:", error.message);
      setGroups([]);
      return;
    }

    // Kalau data baru ada district_environment_id, guna data tu terus
    if (data && data.length > 0) {
      setGroups(data);
      return;
    }

    // Fallback untuk old data yang district_environment_id masih null
    if (selectedDistrict) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("groups")
        .select(
          "id, group_name, school_name, district, district_environment_id, status"
        )
        .is("deleted_at", null)
        .eq("district", selectedDistrict)
        .order("group_name", { ascending: true });

      if (fallbackError) {
        console.warn("Groups fallback error:", fallbackError.message);
        setGroups([]);
        return;
      }

      setGroups(fallbackData || []);
      return;
    }

    setGroups([]);
  }

  async function fetchProfile() {
    if (!userId) {
      alert("Sesi login tidak dijumpai. Sila login semula.");
      return;
    }

    const { data, error } = await supabase
      .from("system_users")
      .select("*")
      .eq("id", userId)
      .is("deleted_at", null)
      .maybeSingle<SystemUser>();

    if (error) {
      alert(error.message);
      return;
    }

    if (!data) {
      alert("Profil pengguna tidak dijumpai.");
      return;
    }

    const row: any = data;

    setProfile(data);

    const nextDistrict = data.district || currentUser.district || "";
    await fetchGroups(nextDistrict);

    setForm({
      full_name: data.full_name || "",
      phone: formatMalaysiaPhone(data.phone || ""),
      member_no: data.member_no || "",

      state: row.state || row.negeri || currentUser.state || "",
      district: nextDistrict,
      group_id: data.group_id || "",
      group_name: data.group_name || currentUser.group_name || "",

      profile_image_url:
        data.profile_image_url || currentUser.profile_image_url || "",
      profile_image_offset_x: clampOffset(
        Number(row.profile_image_offset_x ?? 0)
      ),
      profile_image_offset_y: clampOffset(
        Number(row.profile_image_offset_y ?? 0)
      ),
      profile_image_zoom: clampZoom(Number(row.profile_image_zoom ?? 1)),

      tauliah_no: data.tauliah_no || "",
      tauliah_type: data.tauliah_type || "",
      tauliah_status: data.tauliah_status || "Tiada",
      tauliah_start_date: data.tauliah_start_date || "",
      tauliah_end_date: data.tauliah_end_date || "",
    });

    setSelectedImageFile(null);
    setPreviewImageUrl("");
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

    setForm((prev) => ({
      ...prev,
      profile_image_offset_x: 0,
      profile_image_offset_y: 0,
      profile_image_zoom: 1,
    }));

    setShowImageAdjustModal(true);
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

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("district-profile")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  function cancelImageChange() {
    if (previewImageUrl && previewImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewImageUrl);
    }

    setSelectedImageFile(null);
    setPreviewImageUrl("");
    setShowImageAdjustModal(false);
    stopImageDrag();

    setForm((prev) => ({
      ...prev,
      profile_image_offset_x: clampOffset(
        Number(profile?.profile_image_offset_x ?? 0)
      ),
      profile_image_offset_y: clampOffset(
        Number(profile?.profile_image_offset_y ?? 0)
      ),
      profile_image_zoom: clampZoom(Number(profile?.profile_image_zoom ?? 1)),
    }));
  }

  function resetImagePosition() {
    setForm((prev) => ({
      ...prev,
      profile_image_offset_x: 0,
      profile_image_offset_y: 0,
      profile_image_zoom: 1,
    }));
  }

  function zoomInImage() {
    setForm((prev) => ({
      ...prev,
      profile_image_zoom: clampZoom(prev.profile_image_zoom + 0.1),
    }));
  }

  function zoomOutImage() {
    setForm((prev) => ({
      ...prev,
      profile_image_zoom: clampZoom(prev.profile_image_zoom - 0.1),
    }));
  }

  function startImageDrag(clientX: number, clientY: number) {
    setDraggingImage(true);
    setLastPointer({ x: clientX, y: clientY });
  }

  function moveImageDrag(clientX: number, clientY: number) {
    if (!draggingImage || !lastPointer) return;

    const deltaX = clientX - lastPointer.x;
    const deltaY = clientY - lastPointer.y;

    setForm((prev) => ({
      ...prev,
      profile_image_offset_x: clampOffset(prev.profile_image_offset_x + deltaX),
      profile_image_offset_y: clampOffset(prev.profile_image_offset_y + deltaY),
    }));

    setLastPointer({ x: clientX, y: clientY });
  }

  function stopImageDrag() {
    setDraggingImage(false);
    setLastPointer(null);
  }

  function openImageAdjustModal() {
    if (!displayImageUrl) {
      alert("Sila upload gambar profil dahulu.");
      return;
    }

    setShowImageAdjustModal(true);
  }

  function closeImageAdjustModal() {
    stopImageDrag();
    setShowImageAdjustModal(false);
  }

  function validateTauliah() {
    if (form.tauliah_status !== "Tiada") {
      if (!form.tauliah_no.trim()) {
        alert("Sila isi No Tauliah.");
        return false;
      }

      if (!form.tauliah_type) {
        alert("Sila pilih Jenis Tauliah.");
        return false;
      }

      if (!form.tauliah_start_date) {
        alert("Sila isi Tarikh Mula Tauliah.");
        return false;
      }

      if (
        form.tauliah_start_date &&
        form.tauliah_end_date &&
        form.tauliah_end_date < form.tauliah_start_date
      ) {
        alert("Tarikh Tamat Tauliah tidak boleh lebih awal daripada tarikh mula.");
        return false;
      }
    }

    return true;
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

    if (form.state && !form.district) {
      alert("Sila pilih daerah.");
      return;
    }

    if (!validateTauliah()) return;

    setSavingProfile(true);

    try {
      let finalProfileImageUrl = form.profile_image_url || null;

      if (selectedImageFile) {
        finalProfileImageUrl = await uploadSelectedProfileImage();
      }

      const selectedGroup = groups.find((group) => group.id === form.group_id);

      const finalGroupName =
        selectedGroup?.group_name ||
        selectedGroup?.school_name ||
        form.group_name ||
        null;

      const hasTauliah = form.tauliah_status !== "Tiada";

      const payload = {
        full_name: form.full_name.trim(),
        phone: normalizeMalaysiaPhone(form.phone) || null,
        member_no: form.member_no.trim() || null,

        state: form.state || null,
        district: form.district || null,
        group_id: form.group_id || null,
        group_name: finalGroupName,

        profile_image_url: finalProfileImageUrl,
        profile_image_offset_x: clampOffset(form.profile_image_offset_x),
        profile_image_offset_y: clampOffset(form.profile_image_offset_y),
        profile_image_zoom: clampZoom(form.profile_image_zoom),

        tauliah_status: form.tauliah_status || "Tiada",
        tauliah_no: hasTauliah ? form.tauliah_no.trim() || null : null,
        tauliah_type: hasTauliah ? form.tauliah_type || null : null,
        tauliah_start_date: hasTauliah
          ? form.tauliah_start_date || null
          : null,
        tauliah_end_date: hasTauliah ? form.tauliah_end_date || null : null,
        tauliah_recorded_at:
          hasTauliah && !profile.tauliah_recorded_at
            ? new Date().toISOString()
            : profile.tauliah_recorded_at || null,

        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("system_users")
        .update(payload)
        .eq("id", profile.id);

      if (error) throw error;

      updateLocalUser(payload);

      await addAuditLog(
        "UPDATE",
        `Kemaskini profil, organisasi dan tauliah pengguna: ${payload.full_name}`,
        profile.id
      );

      setForm((prev) => ({
        ...prev,
        group_name: finalGroupName || "",
        profile_image_url: finalProfileImageUrl || "",
        profile_image_offset_x: payload.profile_image_offset_x,
        profile_image_offset_y: payload.profile_image_offset_y,
        profile_image_zoom: payload.profile_image_zoom,
      }));

      setSelectedImageFile(null);
      setPreviewImageUrl("");
      setShowImageAdjustModal(false);

      alert("Profil berjaya dikemaskini.");
      await fetchProfile();
    } catch (error: any) {
      alert(error?.message || "Gagal menyimpan profil.");
    }

    setSavingProfile(false);
  }

  function ProfileAvatar({
    size = 96,
    fontSize = 30,
  }: {
    size?: number;
    fontSize?: number;
  }) {
    if (!displayImageUrl) {
      return (
        <div
          className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold"
          style={{
            width: size,
            height: size,
            fontSize,
            flexShrink: 0,
          }}
        >
          {getInitials(form.full_name || "User")}
        </div>
      );
    }

    const scaleRatio = size / 320;

    return (
      <div
        className="rounded-circle border overflow-hidden bg-dark"
        style={{
          width: size,
          height: size,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <img
          src={displayImageUrl}
          alt="Profile"
          draggable={false}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: size,
            height: size,
            objectFit: "cover",
            transform: `translate(calc(-50% + ${
              form.profile_image_offset_x * scaleRatio
            }px), calc(-50% + ${
              form.profile_image_offset_y * scaleRatio
            }px)) scale(${form.profile_image_zoom})`,
            transformOrigin: "center center",
          }}
        />
      </div>
    );
  }

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
            Kemaskini maklumat profil, organisasi dan tauliah akaun anda.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span
            className="badge bg-success d-inline-flex align-items-center justify-content-center"
            style={{
              height: 40,
              paddingInline: 16,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
            }}
          >
            {normalizeRole(profile.role)}
          </span>
          
          <button
            className="btn btn-success d-inline-flex align-items-center justify-content-center gap-1"
            style={{
              height: 40,
              paddingInline: 16,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
            }}
            onClick={saveProfile}
            disabled={savingProfile}
          >
            <i className="bi bi-save"></i>
            {savingProfile ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <ProfileAvatar size={96} fontSize={30} />

            <div className="flex-grow-1">
              <h5 className="fw-bold mb-1">{form.full_name || "-"}</h5>
              <div className="text-muted small mb-2">{profile.email || "-"}</div>

              <div className="d-flex gap-2 flex-wrap align-items-center">
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm"
                  onClick={openImageAdjustModal}
                  disabled={!displayImageUrl || savingProfile}
                >
                  <i className="bi bi-arrows-move me-1"></i>
                  Edit Posisi Gambar
                </button>

                <label className="btn btn-outline-secondary btn-sm mb-0">
                  <i className="bi bi-upload me-1"></i>
                  Tukar Gambar
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

                {selectedImageFile && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={cancelImageChange}
                    disabled={savingProfile}
                  >
                    Batal Gambar
                  </button>
                )}

                <span className={`badge ${getStatusBadgeClass(profile.status)}`}>
                  {profile.status || "-"}
                </span>
              </div>

              {selectedImageFile ? (
                <div className="alert alert-warning rounded-4 small mt-3 mb-0">
                  Gambar baru belum disimpan. Laraskan posisi gambar, kemudian
                  tekan <strong>Simpan Profil</strong>.
                </div>
              ) : displayImageUrl ? (
                <div className="text-muted small mt-2">
                  Tekan <strong>Edit Posisi Gambar</strong> untuk laraskan crop
                  gambar tanpa tukar gambar baru.
                </div>
              ) : (
                <div className="text-muted small mt-2">
                  Sila upload gambar profil dahulu.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Maklumat Peribadi</h5>
              <p className="text-muted small mb-0">
                Kemaskini maklumat asas pengguna.
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
                  <label className="form-label">No Keahlian</label>
                  <input
                    className="form-control"
                    value={form.member_no}
                    onChange={(e) =>
                      setForm({ ...form, member_no: e.target.value })
                    }
                    placeholder="Contoh: MY-SEL-0001"
                    disabled={savingProfile}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Maklumat Organisasi</h5>
              <p className="text-muted small mb-0">
                Kemaskini negeri, daerah dan kumpulan / sekolah pengguna.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Jawatan</label>
                  <input
                    className="form-control bg-light"
                    value={normalizeRole(profile.role)}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status Akaun</label>
                  <input
                    className="form-control bg-light"
                    value={profile.status || "-"}
                    readOnly
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Negeri</label>
                  <select
                    className="form-select"
                    value={form.state}
                    disabled={savingProfile}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        state: e.target.value,
                        district: "",
                        group_id: "",
                        group_name: "",
                      })
                    }
                  >
                    <option value="">Pilih Negeri</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.state_name || ""}>
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
                    disabled={savingProfile || !form.state}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        district: e.target.value,
                        group_id: "",
                        group_name: "",
                      })
                    }
                  >
                    <option value="">
                      {form.state ? "Pilih Daerah" : "Pilih negeri dahulu"}
                    </option>

                    {filteredDistricts.map((district) => (
                      <option
                        key={district.id}
                        value={district.district_name || ""}
                      >
                        {district.district_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-12">
                  <label className="form-label">Kumpulan / Sekolah</label>
                  <select
                    className="form-select"
                    value={form.group_id}
                    disabled={savingProfile || !form.district}
                    onChange={(e) => {
                      const selectedGroup = groups.find(
                        (group) => group.id === e.target.value
                      );
                    
                      setForm({
                        ...form,
                        group_id: selectedGroup?.id || "",
                        group_name:
                          selectedGroup?.group_name ||
                          selectedGroup?.school_name ||
                          "",
                      });
                    }}
                  >
                    <option value="">
                      {form.district
                        ? "Pilih Kumpulan / Sekolah"
                        : "Pilih daerah dahulu"}
                    </option>

                    {filteredGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {(group.group_name || group.school_name || "-") +
                          (group.district ? ` — ${group.district}` : "")}
                      </option>
                    ))}
                  </select>

                  <small className="text-muted">
                    Boleh dibiarkan kosong jika akaun tidak terikat kepada satu
                    kumpulan tertentu.
                  </small>
                </div>
              </div>

              <div className="alert alert-light border rounded-4 mt-4 mb-0">
                <i className="bi bi-info-circle me-2 text-success"></i>
                District Environment ID disembunyikan kerana ia hanya digunakan
                oleh sistem untuk kawalan data daerah.
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Maklumat Tauliah</h5>
              <p className="text-muted small mb-0">
                Tambah atau kemaskini maklumat tauliah pengguna.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Status Tauliah</label>
                  <select
                    className="form-select"
                    value={form.tauliah_status}
                    disabled={savingProfile}
                    onChange={(e) => {
                      const nextStatus = e.target.value;

                      setForm({
                        ...form,
                        tauliah_status: nextStatus,
                        tauliah_no: nextStatus === "Tiada" ? "" : form.tauliah_no,
                        tauliah_type:
                          nextStatus === "Tiada" ? "" : form.tauliah_type,
                        tauliah_start_date:
                          nextStatus === "Tiada"
                            ? ""
                            : form.tauliah_start_date,
                        tauliah_end_date:
                          nextStatus === "Tiada" ? "" : form.tauliah_end_date,
                      });
                    }}
                  >
                    {TAULIAH_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Jenis Tauliah</label>
                  <select
                    className="form-select"
                    value={form.tauliah_type}
                    disabled={savingProfile || form.tauliah_status === "Tiada"}
                    onChange={(e) =>
                      setForm({ ...form, tauliah_type: e.target.value })
                    }
                  >
                    <option value="">Pilih Jenis Tauliah</option>
                    {TAULIAH_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-12">
                  <label className="form-label">No Tauliah</label>
                  <input
                    className="form-control"
                    value={form.tauliah_no}
                    disabled={savingProfile || form.tauliah_status === "Tiada"}
                    onChange={(e) =>
                      setForm({ ...form, tauliah_no: e.target.value })
                    }
                    placeholder="Contoh: SEL-PD-001/2026"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Tarikh Mula Tauliah</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.tauliah_start_date}
                    disabled={savingProfile || form.tauliah_status === "Tiada"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tauliah_start_date: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Tarikh Tamat Tauliah</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.tauliah_end_date}
                    disabled={savingProfile || form.tauliah_status === "Tiada"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tauliah_end_date: e.target.value,
                      })
                    }
                  />
                  <small className="text-muted">
                    Boleh kosong jika tauliah tidak mempunyai tarikh tamat.
                  </small>
                </div>
              </div>

              <div className="alert alert-light border rounded-4 mt-4 mb-0">
                <i className="bi bi-info-circle me-2 text-success"></i>
                Jika status dipilih <strong>Tiada</strong>, maklumat tauliah
                lain akan dikosongkan semasa simpan.
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
                Super Admin untuk reset atau kemaskini akaun.
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-0">Ringkasan Profil</h5>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="mb-3">
                <small className="text-muted d-block">Jawatan</small>
                <strong>{normalizeRole(profile.role)}</strong>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Negeri</small>
                <strong>{form.state || "-"}</strong>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Daerah</small>
                <strong>{form.district || "-"}</strong>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">Kumpulan / Sekolah</small>
                <strong>{form.group_name || "Tidak ditetapkan"}</strong>
              </div>

              <div className="mb-3">
                <small className="text-muted d-block">No Keahlian</small>
                <strong>{form.member_no || "-"}</strong>
              </div>

              <div>
                <small className="text-muted d-block">Status Akaun</small>
                <span className={`badge ${getStatusBadgeClass(profile.status)}`}>
                  {profile.status || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white border-0 p-4">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0">Ringkasan Tauliah</h5>
                <span
                  className={`badge ${getStatusBadgeClass(
                    form.tauliah_status
                  )}`}
                >
                  {form.tauliah_status || "Tiada"}
                </span>
              </div>
            </div>

            <div className="card-body p-4 pt-0">
              {form.tauliah_status === "Tiada" ? (
                <div className="alert alert-light border rounded-4 mb-0">
                  <i className="bi bi-info-circle me-2 text-success"></i>
                  Belum ada rekod tauliah. Pilih status selain{" "}
                  <strong>Tiada</strong> untuk tambah maklumat tauliah.
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <small className="text-muted d-block">No Tauliah</small>
                    <strong>{form.tauliah_no || "-"}</strong>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block">Jenis Tauliah</small>
                    <strong>{form.tauliah_type || "-"}</strong>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block">
                      Tarikh Mula Tauliah
                    </small>
                    <strong>{formatDateDisplay(form.tauliah_start_date)}</strong>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block">
                      Tarikh Tamat Tauliah
                    </small>
                    <strong>{formatDateDisplay(form.tauliah_end_date)}</strong>
                  </div>

                  <div>
                    <small className="text-muted d-block">Direkod Pada</small>
                    <strong>
                      {formatDateDisplay(profile.tauliah_recorded_at)}
                    </strong>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="alert alert-info rounded-4 mt-4 small">
            <i className="bi bi-info-circle me-2"></i>
            Logo rasmi daerah diurus dalam halaman{" "}
            <strong>Tetapan Daerah</strong>. Gambar di sini ialah avatar user.
          </div>
        </div>
      </div>

      {showImageAdjustModal && displayImageUrl && (
        <div
          className="modal d-block"
          style={{
            background: "rgba(0,0,0,.78)",
            zIndex: 1055,
          }}
          onMouseMove={(e) => moveImageDrag(e.clientX, e.clientY)}
          onMouseUp={stopImageDrag}
          onMouseLeave={stopImageDrag}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            if (touch) moveImageDrag(touch.clientX, touch.clientY);
          }}
          onTouchEnd={stopImageDrag}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content border-0 rounded-4 overflow-hidden"
              style={{ background: "#101010" }}
            >
              <div className="modal-header border-0 text-white">
                <button
                  type="button"
                  className="btn btn-sm text-white"
                  onClick={closeImageAdjustModal}
                >
                  <i className="bi bi-x-lg fs-5"></i>
                </button>

                <h6 className="modal-title fw-semibold mb-0">
                  Drag gambar untuk laras
                </h6>

                <button
                  type="button"
                  className="btn btn-sm text-white"
                  onClick={closeImageAdjustModal}
                >
                  <i className="bi bi-check-lg fs-4 text-success"></i>
                </button>
              </div>

              <div className="modal-body p-0">
                <div
                  className="position-relative mx-auto"
                  style={{
                    width: "100%",
                    maxWidth: 520,
                    height: 420,
                    background: "#050505",
                    overflow: "hidden",
                    cursor: draggingImage ? "grabbing" : "grab",
                    userSelect: "none",
                    touchAction: "none",
                  }}
                  onMouseDown={(e) => startImageDrag(e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    if (touch) startImageDrag(touch.clientX, touch.clientY);
                  }}
                >
                  <img
                    src={displayImageUrl}
                    alt="Adjust profile"
                    draggable={false}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 320,
                      height: 320,
                      objectFit: "cover",
                      transform: `translate(calc(-50% + ${form.profile_image_offset_x}px), calc(-50% + ${form.profile_image_offset_y}px)) scale(${form.profile_image_zoom})`,
                      transformOrigin: "center center",
                      pointerEvents: "none",
                    }}
                  />

                  <div
                    className="position-absolute top-0 start-0 w-100 h-100"
                    style={{
                      background:
                        "radial-gradient(circle at center, transparent 0 34%, rgba(0,0,0,.68) 35% 100%)",
                      pointerEvents: "none",
                    }}
                  />

                  <div
                    className="position-absolute top-50 start-50 translate-middle rounded-circle border border-2 border-light"
                    style={{
                      width: 280,
                      height: 280,
                      pointerEvents: "none",
                    }}
                  />

                  <div
                    className="position-absolute end-0 top-50 translate-middle-y me-3 bg-dark rounded-pill overflow-hidden"
                    style={{ zIndex: 5 }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="btn btn-dark d-block border-bottom"
                      onClick={(e) => {
                        e.stopPropagation();
                        zoomInImage();
                      }}
                    >
                      <i className="bi bi-plus-lg"></i>
                    </button>

                    <button
                      type="button"
                      className="btn btn-dark d-block"
                      onClick={(e) => {
                        e.stopPropagation();
                        zoomOutImage();
                      }}
                    >
                      <i className="bi bi-dash-lg"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={resetImagePosition}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>
                  Reset
                </button>

                <div className="text-white small">
                  Zoom: {Math.round(form.profile_image_zoom * 100)}%
                </div>

                <button
                  type="button"
                  className="btn btn-success rounded-pill px-4"
                  onClick={closeImageAdjustModal}
                >
                  <i className="bi bi-check-lg me-1"></i>
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}