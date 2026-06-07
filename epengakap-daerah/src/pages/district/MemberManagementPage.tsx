import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import FileUploadCard from "../../components/common/FileUploadCard";

type Member = {
  id: string;
  ic_number: string | null;
  full_name: string;
  email: string | null;
  group_id: string | null;
  group_name: string | null;
  category: string | null;
  scout_category: string | null;
  age: number | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  district: string | null;
  district_environment_id: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

type ScoutGroup = {
  id: string;
  group_name: string;
  school_name: string | null;
  status?: string;
  district?: string | null;
  district_environment_id?: string | null;
};

type MemberForm = {
  ic_number: string;
  full_name: string;
  email: string;
  group_id: string;
  group_name: string;
  category: string;
  age: string;
  gender: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  address: string;
  notes: string;
  status: string;
};

const CATEGORY_OPTIONS = [
  "Pengakap Kanak-Kanak",
  "Pengakap Muda",
  "Pengakap Remaja",
  "Pengakap Kelana",
];

const STATUS_OPTIONS = ["Aktif", "Tidak Aktif"];
const GENDER_OPTIONS = ["Lelaki", "Perempuan"];

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

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "active" || value === "aktif") return "Aktif";
  if (
    value === "inactive" ||
    value === "tidak aktif" ||
    value === "suspended" ||
    value === "digantung"
  ) {
    return "Tidak Aktif";
  }

  return status || "Aktif";
}

function normalizeMalaysianIC(value: string) {
  return value.replace(/\D/g, "").slice(0, 12);
}

function formatMalaysianIC(value: string) {
  const digits = normalizeMalaysianIC(value);

  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function isValidMalaysianIC(value: string) {
  const digits = normalizeMalaysianIC(value);

  if (digits.length !== 12) return false;

  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));

  if (Number.isNaN(month) || Number.isNaN(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

function displayMalaysianIC(value?: string | null) {
  if (!value) return "-";
  return formatMalaysianIC(value);
}

function normalizeMalaysianPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatMalaysianPhone(value: string) {
  const digits = normalizeMalaysianPhone(value);

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

function isValidMalaysianPhone(value: string) {
  const digits = normalizeMalaysianPhone(value);

  if (!digits) return false;
  if (!digits.startsWith("0")) return false;

  return digits.length >= 9 && digits.length <= 11;
}

function displayMalaysianPhone(value?: string | null) {
  if (!value) return "-";
  return formatMalaysianPhone(value);
}

function isValidEmail(email: string) {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
      module: "Ahli Pengakap",
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

export default function MemberManagementPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("Semua Kumpulan");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [genderFilter, setGenderFilter] = useState("Semua Jantina");
  const [phoneFilter, setPhoneFilter] = useState("");

  const [form, setForm] = useState<MemberForm>({
    ic_number: "",
    full_name: "",
    email: "",
    group_id: "",
    group_name: "",
    category: "Pengakap Kanak-Kanak",
    age: "",
    gender: "Lelaki",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    address: "",
    notes: "",
    status: "Aktif",
  });

  const currentUser = useMemo(() => getCurrentUser(), []);

  const districtEnvironmentId = currentUser.district_environment_id || null;

  const district =
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    null;

  useEffect(() => {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      setLoading(false);
      return;
    }

    fetchMembers();
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyDistrictScope(query: any) {
    if (districtEnvironmentId) {
      return query.eq("district_environment_id", districtEnvironmentId);
    }

    if (district) {
      return query.eq("district", district);
    }

    return query;
  }

  async function fetchMembers() {
    setLoading(true);

    let query = supabase
      .from("members")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setMembers([]);
      setLoading(false);
      return;
    }

    setMembers(data || []);
    setLoading(false);
  }

  async function fetchGroups() {
    let query = supabase
      .from("groups")
      .select("id, group_name, school_name, status, district, district_environment_id")
      .order("group_name", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setGroups([]);
      return;
    }

    const activeGroups = (data || []).filter(
      (group) => normalizeStatus(group.status) === "Aktif"
    );

    setGroups(activeGroups);
  }

  const filteredMembers = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    const cleanKeyword = search.replace(/\D/g, "");
    const cleanPhoneFilter = phoneFilter.replace(/\D/g, "");

    return members.filter((member) => {
      const memberStatus = normalizeStatus(member.status);
      const memberCategory = member.category || member.scout_category || "";
      const formattedIC = formatMalaysianIC(member.ic_number || "");
      const formattedPhone = formatMalaysianPhone(member.guardian_phone || "");

      const matchSearch =
        !keyword ||
        (member.full_name || "").toLowerCase().includes(keyword) ||
        (member.email || "").toLowerCase().includes(keyword) ||
        (member.guardian_email || "").toLowerCase().includes(keyword) ||
        (member.group_name || "").toLowerCase().includes(keyword) ||
        (member.ic_number || "").includes(cleanKeyword) ||
        formattedIC.toLowerCase().includes(keyword) ||
        (member.guardian_phone || "").includes(cleanKeyword) ||
        formattedPhone.toLowerCase().includes(keyword);

      const matchPhone =
        !cleanPhoneFilter ||
        (member.guardian_phone || "").includes(cleanPhoneFilter) ||
        formattedPhone.replace(/\D/g, "").includes(cleanPhoneFilter);

      const matchGroup =
        groupFilter === "Semua Kumpulan" || member.group_name === groupFilter;

      const matchCategory =
        categoryFilter === "Semua Kategori" || memberCategory === categoryFilter;

      const matchStatus =
        statusFilter === "Semua Status" || memberStatus === statusFilter;

      const matchGender =
        genderFilter === "Semua Jantina" || member.gender === genderFilter;

      return (
        matchSearch &&
        matchPhone &&
        matchGroup &&
        matchCategory &&
        matchStatus &&
        matchGender
      );
    });
  }, [
    members,
    search,
    phoneFilter,
    groupFilter,
    categoryFilter,
    statusFilter,
    genderFilter,
  ]);

  function resetForm() {
    setEditingMember(null);

    setForm({
      ic_number: "",
      full_name: "",
      email: "",
      group_id: "",
      group_name: "",
      category: "Pengakap Kanak-Kanak",
      age: "",
      gender: "Lelaki",
      guardian_name: "",
      guardian_phone: "",
      guardian_email: "",
      address: "",
      notes: "",
      status: "Aktif",
    });
  }

  function openAddModal() {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      return;
    }

    resetForm();
    setShowMemberModal(true);
  }

  function openViewModal(member: Member) {
    setSelectedMember(member);
    setShowViewModal(true);
  }

  function openEditModal(member: Member) {
    setEditingMember(member);

    setForm({
      ic_number: formatMalaysianIC(member.ic_number || ""),
      full_name: member.full_name || "",
      email: member.email || "",
      group_id: member.group_id || "",
      group_name: member.group_name || "",
      category: member.category || member.scout_category || "Pengakap Kanak-Kanak",
      age: member.age ? String(member.age) : "",
      gender: member.gender || "Lelaki",
      guardian_name: member.guardian_name || "",
      guardian_phone: formatMalaysianPhone(member.guardian_phone || ""),
      guardian_email: member.guardian_email || "",
      address: member.address || "",
      notes: member.notes || "",
      status: normalizeStatus(member.status),
    });

    setShowMemberModal(true);
  }

  function openDeleteModal(member: Member) {
    setDeleteTarget(member);
    setShowDeleteModal(true);
  }

  async function checkDuplicateIC(icNumber: string, ignoreMemberId?: string) {
    const cleanIC = normalizeMalaysianIC(icNumber);

    if (!cleanIC) return false;

    let query = supabase
      .from("members")
      .select("id")
      .eq("ic_number", cleanIC)
      .is("deleted_at", null)
      .limit(1);

    query = applyDistrictScope(query);

    if (ignoreMemberId) {
      query = query.neq("id", ignoreMemberId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
  }

  function validateForm() {
    if (!form.ic_number.trim()) {
      alert("Sila isi No IC / MyKid.");
      return false;
    }

    if (!isValidMalaysianIC(form.ic_number)) {
      alert(
        "No IC / MyKid tidak sah. Sila guna format 12 digit seperti 030101-03-1234."
      );
      return false;
    }

    if (!form.full_name.trim()) {
      alert("Sila isi nama penuh ahli.");
      return false;
    }

    if (form.email && !isValidEmail(form.email)) {
      alert("Format e-mel ahli tidak sah.");
      return false;
    }

    if (!form.group_id) {
      alert("Sila pilih kumpulan / sekolah.");
      return false;
    }

    const ageNumber = Number(form.age);

    if (!form.age || Number.isNaN(ageNumber) || ageNumber <= 0 || ageNumber > 100) {
      alert("Umur tidak sah.");
      return false;
    }

    if (!form.guardian_name.trim()) {
      alert("Sila isi nama penjaga.");
      return false;
    }

    if (!form.guardian_phone.trim()) {
      alert("Sila isi nombor telefon penjaga.");
      return false;
    }

    if (!isValidMalaysianPhone(form.guardian_phone)) {
      alert(
        "Nombor telefon penjaga tidak sah. Sila masukkan nombor Malaysia yang bermula dengan 0. Contoh: 012-345 6789."
      );
      return false;
    }

    if (form.guardian_email && !isValidEmail(form.guardian_email)) {
      alert("Format e-mel penjaga tidak sah.");
      return false;
    }

    return true;
  }

  async function saveMember() {
    if (!validateForm()) return;

    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      return;
    }

    setSaving(true);

    const isDuplicateIC = await checkDuplicateIC(form.ic_number, editingMember?.id);

    if (isDuplicateIC) {
      alert("No IC / MyKid ini sudah wujud dalam daerah ini.");
      setSaving(false);
      return;
    }

    const selectedGroup = groups.find((group) => group.id === form.group_id);

    const payload = {
      ic_number: normalizeMalaysianIC(form.ic_number),
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      group_id: form.group_id,
      group_name: selectedGroup?.group_name || form.group_name,
      category: form.category,
      scout_category: form.category,
      age: Number(form.age),
      gender: form.gender,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: normalizeMalaysianPhone(form.guardian_phone) || null,
      guardian_email: form.guardian_email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
      district: district || null,
      district_environment_id: districtEnvironmentId || null,
      updated_at: new Date().toISOString(),
    };

    if (editingMember) {
      let query = supabase
        .from("members")
        .update(payload)
        .eq("id", editingMember.id);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "UPDATE",
        `Kemaskini ahli Pengakap: ${form.full_name}`,
        editingMember.id
      );
    } else {
      const { data, error } = await supabase
        .from("members")
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

      await addAuditLog(
        "CREATE",
        `Tambah ahli Pengakap: ${form.full_name}`,
        data?.id || null
      );
    }

    await fetchMembers();
    resetForm();
    setShowMemberModal(false);
    setSaving(false);
  }

  async function deactivateMember() {
    if (!deleteTarget) return;

    setSaving(true);

    let query = supabase
      .from("members")
      .update({
        status: "Tidak Aktif",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deleteTarget.id);

    query = applyDistrictScope(query);

    const { error } = await query;

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "DEACTIVATE",
      `Nyahaktif ahli Pengakap: ${deleteTarget.full_name}`,
      deleteTarget.id
    );

    await fetchMembers();
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setSaving(false);
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Ahli Pengakap</h2>
          <p className="text-muted mb-0">
            Urus maklumat ahli pengakap mengikut kumpulan.
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline-success"
            onClick={() => setShowUploadModal(true)}
          >
            <i className="bi bi-upload me-1"></i>
            Import Fail
          </button>

          <button type="button" className="btn btn-success" onClick={openAddModal}>
            <i className="bi bi-plus-circle me-1"></i>
            Tambah Ahli
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Jumlah Ahli</small>
              <h4 className="fw-bold mb-0">{members.length}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Aktif</small>
              <h4 className="fw-bold text-success mb-0">
                {
                  members.filter(
                    (member) => normalizeStatus(member.status) === "Aktif"
                  ).length
                }
              </h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Tidak Aktif</small>
              <h4 className="fw-bold text-secondary mb-0">
                {
                  members.filter(
                    (member) => normalizeStatus(member.status) === "Tidak Aktif"
                  ).length
                }
              </h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Kumpulan</small>
              <h4 className="fw-bold mb-0">{groups.length}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4 rounded-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Cari nama, IC, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Filter no tel..."
                value={phoneFilter}
                maxLength={13}
                onChange={(e) => setPhoneFilter(formatMalaysianPhone(e.target.value))}
              />
            </div>

            <div className="col-md-2">
              <select
                className="form-select"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option>Semua Kumpulan</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.group_name}>
                    {group.group_name}
                    {group.school_name ? ` — ${group.school_name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option>Semua Kategori</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="col-md-1">
              <select
                className="form-select"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option>Semua Jantina</option>
                {GENDER_OPTIONS.map((gender) => (
                  <option key={gender}>{gender}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Nama</th>
                <th>No IC / MyKid</th>
                <th>Kumpulan</th>
                <th>Kategori</th>
                <th>Umur</th>
                <th>Jantina</th>
                <th>Telefon Penjaga</th>
                <th>Status</th>
                <th className="text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">Memuatkan data...</p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada ahli dijumpai.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                          style={{ width: 36, height: 36 }}
                        >
                          {getInitials(member.full_name || "-")}
                        </div>

                        <div>
                          <div className="fw-semibold">{member.full_name}</div>
                          <small className="text-muted">{member.email || "-"}</small>
                        </div>
                      </div>
                    </td>

                    <td>{displayMalaysianIC(member.ic_number)}</td>
                    <td>{member.group_name || "-"}</td>
                    <td>{member.category || member.scout_category || "-"}</td>
                    <td>{member.age || "-"}</td>
                    <td>{member.gender || "-"}</td>
                    <td>{displayMalaysianPhone(member.guardian_phone)}</td>

                    <td>
                      <span
                        className={`badge ${
                          normalizeStatus(member.status) === "Aktif"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {normalizeStatus(member.status)}
                      </span>
                    </td>

                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success me-1"
                        onClick={() => openViewModal(member)}
                      >
                        View
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary me-1"
                        onClick={() => openEditModal(member)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => openDeleteModal(member)}
                      >
                        Nyahaktif
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showViewModal && selectedMember && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Ahli</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold mx-auto mb-2"
                    style={{ width: 64, height: 64, fontSize: 22 }}
                  >
                    {getInitials(selectedMember.full_name || "-")}
                  </div>

                  <h5 className="fw-bold mb-0">{selectedMember.full_name}</h5>
                  <small className="text-muted">{selectedMember.email || "-"}</small>
                </div>

                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">No IC / MyKid</span>
                    <strong>{displayMalaysianIC(selectedMember.ic_number)}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kumpulan</span>
                    <strong>{selectedMember.group_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kategori</span>
                    <strong>
                      {selectedMember.category ||
                        selectedMember.scout_category ||
                        "-"}
                    </strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Umur</span>
                    <strong>{selectedMember.age || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Jantina</span>
                    <strong>{selectedMember.gender || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Penjaga</span>
                    <strong>{selectedMember.guardian_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Telefon Penjaga</span>
                    <strong>
                      {displayMalaysianPhone(selectedMember.guardian_phone)}
                    </strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Email Penjaga</span>
                    <strong>{selectedMember.guardian_email || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    <span
                      className={`badge ${
                        normalizeStatus(selectedMember.status) === "Aktif"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {normalizeStatus(selectedMember.status)}
                    </span>
                  </div>

                  <div className="list-group-item">
                    <span className="text-muted d-block mb-1">Alamat</span>
                    <strong>{selectedMember.address || "-"}</strong>
                  </div>

                  <div className="list-group-item">
                    <span className="text-muted d-block mb-1">Catatan</span>
                    <strong>{selectedMember.notes || "-"}</strong>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Tutup
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedMember);
                  }}
                >
                  Edit Ahli
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingMember ? "Edit Ahli Pengakap" : "Tambah Ahli Pengakap"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowMemberModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">No IC / MyKid</label>
                    <input
                      className="form-control"
                      value={form.ic_number}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          ic_number: formatMalaysianIC(e.target.value),
                        })
                      }
                      placeholder="030101-03-1234"
                      maxLength={14}
                      disabled={saving}
                    />

                    <small className="text-muted">
                      Format IC/MyKid: 12 digit, contoh 030101-03-1234
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Nama Penuh</label>
                    <input
                      className="form-control"
                      value={form.full_name}
                      onChange={(e) =>
                        setForm({ ...form, full_name: e.target.value })
                      }
                      placeholder="Ahmad bin Ali"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">E-mel Ahli / Penjaga</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="contoh@email.com"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kumpulan / Sekolah</label>
                    <select
                      className="form-select"
                      value={form.group_id}
                      onChange={(e) => {
                        const selectedGroup = groups.find(
                          (group) => group.id === e.target.value
                        );

                        setForm({
                          ...form,
                          group_id: e.target.value,
                          group_name: selectedGroup?.group_name || "",
                        });
                      }}
                      disabled={saving}
                    >
                      <option value="">Pilih Kumpulan / Sekolah</option>

                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.group_name}
                          {group.school_name ? ` — ${group.school_name}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kategori</label>
                    <select
                      className="form-select"
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      disabled={saving}
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Umur</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.age}
                      onChange={(e) =>
                        setForm({ ...form, age: e.target.value })
                      }
                      placeholder="11"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Jantina</label>
                    <select
                      className="form-select"
                      value={form.gender}
                      onChange={(e) =>
                        setForm({ ...form, gender: e.target.value })
                      }
                      disabled={saving}
                    >
                      {GENDER_OPTIONS.map((gender) => (
                        <option key={gender}>{gender}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Nama Penjaga</label>
                    <input
                      className="form-control"
                      value={form.guardian_name}
                      onChange={(e) =>
                        setForm({ ...form, guardian_name: e.target.value })
                      }
                      placeholder="Nama ibu/bapa/penjaga"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Telefon Penjaga</label>
                    <input
                      className="form-control"
                      value={form.guardian_phone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          guardian_phone: formatMalaysianPhone(e.target.value),
                        })
                      }
                      placeholder="012-345 6789"
                      maxLength={13}
                      disabled={saving}
                    />
                    <small className="text-muted">
                      Contoh: 012-345 6789 / 011-2345 6789 / 03-1234 5678
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email Penjaga</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.guardian_email}
                      onChange={(e) =>
                        setForm({ ...form, guardian_email: e.target.value })
                      }
                      placeholder="penjaga@email.com"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Alamat</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      disabled={saving}
                    ></textarea>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Catatan</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      disabled={saving}
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowMemberModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Tutup
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={saveMember}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingMember
                    ? "Kemaskini Ahli"
                    : "Simpan Ahli"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">Nyahaktif Ahli</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu nyahaktif ahli ini?
                </p>

                <strong>{deleteTarget.full_name}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Ahli tidak dipadam kekal. Status akan ditukar kepada Tidak Aktif.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deactivateMember}
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Nyahaktif"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Import Ahli Pengakap</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUploadModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <FileUploadCard />
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}