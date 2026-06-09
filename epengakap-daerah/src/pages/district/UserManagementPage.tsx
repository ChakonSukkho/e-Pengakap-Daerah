import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Medal = {
  name: string;
  date: string;
  serial_no: string;
};

type SystemUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  district: string | null;
  district_environment_id: string | null;
  group_id: string | null;
  group_name: string | null;
  status: string | null;
  notes: string | null;
  tauliah_type: string | null;
  tauliah_no: string | null;
  tauliah_date: string | null;
  tauliah_status: string | null;
  certificate_no?: string | null;
  medal_no?: string | null;
  medals: Medal[] | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type ScoutGroup = {
  id: string;
  group_name: string;
  school_name: string | null;
  status: string | null;
  district: string | null;
  district_environment_id: string | null;
};

type UserForm = {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  district: string;
  group_id: string;
  group_name: string;
  status: string;
  password: string;
  notes: string;
  tauliah_type: string;
  tauliah_no: string;
  tauliah_date: string;
  tauliah_status: string;
  medals: Medal[];
};

const ROLE_OPTIONS = [
  "Penolong Pesuruhjaya Daerah",
  "Pemimpin Kumpulan",
  "Penolong Pemimpin",
];

const STATUS_OPTIONS = ["Aktif", "Tidak Aktif", "Digantung"];
const TAULIAH_TYPE_OPTIONS = ["Tiada", "Sementara", "Tetap"];

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

function getUserDistrict() {
  const currentUser = getCurrentUser();

  return (
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    ""
  );
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function displayPhone(value?: string | null) {
  if (!value) return "-";
  return formatMalaysiaPhone(value);
}

function roleRequiresGroup(role: string) {
  return role === "Pemimpin Kumpulan" || role === "Penolong Pemimpin";
}

function normalizeRole(role?: string | null) {
  if (role === "Penolong Pesuruhjaya") return "Penolong Pesuruhjaya Daerah";
  if (role === "District") return "Pesuruhjaya Daerah";
  return role || "-";
}

function roleRequiresTauliah(role: string) {
  return [
    "Pesuruhjaya Daerah",
    "Penolong Pesuruhjaya Daerah",
    "Pemimpin Kumpulan",
    "Penolong Pemimpin",
  ].includes(normalizeRole(role));
}

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim();

  if (value === "Active") return "Aktif";
  if (value === "active") return "Aktif";
  if (value === "aktif") return "Aktif";

  if (value === "Inactive") return "Tidak Aktif";
  if (value === "inactive") return "Tidak Aktif";
  if (value === "tidak aktif") return "Tidak Aktif";

  if (value === "Suspended") return "Digantung";
  if (value === "suspended") return "Digantung";
  if (value === "digantung") return "Digantung";

  return status || "Aktif";
}

function normalizeTauliahType(value?: string | null) {
  return value || "Tiada";
}

function normalizeTauliahStatus(value?: string | null) {
  return value || "Tiada";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTauliahBadge(type?: string | null) {
  const tauliahType = normalizeTauliahType(type);

  if (tauliahType === "Tetap") {
    return "bg-success-subtle text-success border border-success-subtle";
  }

  if (tauliahType === "Sementara") {
    return "bg-warning-subtle text-warning border border-warning-subtle";
  }

  return "bg-light text-muted border";
}

function emptyMedal(): Medal {
  return {
    name: "",
    date: "",
    serial_no: "",
  };
}

function normalizeMedals(value: any): Medal[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        name: String(item?.name || "").trim(),
        date: String(item?.date || "").trim(),
        serial_no: String(item?.serial_no || "").trim(),
      }))
      .filter((item) => item.name || item.date || item.serial_no);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeMedals(parsed);
    } catch {
      return [];
    }
  }

  return [];
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
      module: "Pengurusan Pengguna",
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

export default function UserManagementPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmRemoveMedalIndex, setConfirmRemoveMedalIndex] = useState<
    number | null
  >(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Semua Role");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [groupFilter, setGroupFilter] = useState("Semua Kumpulan");
  const [tauliahFilter, setTauliahFilter] = useState("Semua Tauliah");

  const [showUserModal, setShowUserModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SystemUser | null>(
    null
  );

  const currentUser = useMemo(() => getCurrentUser(), []);
  const district = getUserDistrict();
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [form, setForm] = useState<UserForm>({
    full_name: "",
    email: "",
    phone: "",
    role: "Pemimpin Kumpulan",
    district,
    group_id: "",
    group_name: "",
    status: "Aktif",
    password: "123456",
    notes: "",
    tauliah_type: "Tiada",
    tauliah_no: "",
    tauliah_date: "",
    tauliah_status: "Tiada",
    medals: [],
  });

  useEffect(() => {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      setLoading(false);
      return;
    }

    fetchUsers();
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

  async function fetchUsers() {
    setLoading(true);

    let query = supabase
      .from("system_users")
      .select("*")
      .is("deleted_at", null)
      .not("role", "in", '("Super Admin","Pesuruhjaya Daerah","District")')
      .order("created_at", { ascending: false });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setUsers([]);
      setLoading(false);
      return;
    }

    setUsers((data || []) as SystemUser[]);
    setLoading(false);
  }

  async function fetchGroups() {
    let query = supabase
      .from("groups")
      .select(
        "id, group_name, school_name, status, district, district_environment_id"
      )
      .is("deleted_at", null)
      .order("group_name", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setGroups([]);
      return;
    }

    setGroups(
      ((data || []) as ScoutGroup[]).filter(
        (group) => normalizeStatus(group.status) === "Aktif"
      )
    );
  }

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();

    groups.forEach((group) => {
      map.set(group.id, group.group_name);
    });

    return map;
  }, [groups]);

  function getLiveGroupName(user: SystemUser) {
    if (user.group_id && groupNameById.has(user.group_id)) {
      return groupNameById.get(user.group_id) || user.group_name || "-";
    }

    return user.group_name || "-";
  }

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    const cleanKeyword = search.replace(/\D/g, "");

    return users.filter((user) => {
      const liveGroupName = getLiveGroupName(user);
      const role = normalizeRole(user.role);
      const status = normalizeStatus(user.status);
      const tauliahType = normalizeTauliahType(user.tauliah_type);
      const phoneFormatted = formatMalaysiaPhone(user.phone || "");
      const medals = normalizeMedals(user.medals);

      const matchSearch =
        !keyword ||
        (user.full_name || "").toLowerCase().includes(keyword) ||
        (user.email || "").toLowerCase().includes(keyword) ||
        (user.role || "").toLowerCase().includes(keyword) ||
        liveGroupName.toLowerCase().includes(keyword) ||
        (user.tauliah_no || "").toLowerCase().includes(keyword) ||
        medals.some(
          (medal) =>
            medal.name.toLowerCase().includes(keyword) ||
            medal.date.toLowerCase().includes(keyword) ||
            medal.serial_no.toLowerCase().includes(keyword)
        ) ||
        (user.phone || "").includes(cleanKeyword) ||
        phoneFormatted.toLowerCase().includes(keyword);

      const matchRole = roleFilter === "Semua Role" || role === roleFilter;

      const matchStatus =
        statusFilter === "Semua Status" || status === statusFilter;

      const matchGroup =
        groupFilter === "Semua Kumpulan" ||
        user.group_id === groupFilter ||
        liveGroupName === groupFilter;

      const matchTauliah =
        tauliahFilter === "Semua Tauliah" || tauliahType === tauliahFilter;

      return matchSearch && matchRole && matchStatus && matchGroup && matchTauliah;
    });
  }, [
    users,
    groups,
    groupNameById,
    search,
    roleFilter,
    statusFilter,
    groupFilter,
    tauliahFilter,
  ]);

  const userStats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => normalizeStatus(user.status) === "Aktif")
        .length,
      leaders: users.filter(
        (user) => normalizeRole(user.role) === "Pemimpin Kumpulan"
      ).length,
      tauliahAda: users.filter(
        (user) => normalizeTauliahStatus(user.tauliah_status) === "Ada"
      ).length,
    };
  }, [users]);

  function resetForm() {
    setEditingUser(null);
    setConfirmRemoveMedalIndex(null);

    setForm({
      full_name: "",
      email: "",
      phone: "",
      role: "Pemimpin Kumpulan",
      district,
      group_id: "",
      group_name: "",
      status: "Aktif",
      password: "123456",
      notes: "",
      tauliah_type: "Tiada",
      tauliah_no: "",
      tauliah_date: "",
      tauliah_status: "Tiada",
      medals: [],
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
    setConfirmRemoveMedalIndex(null);
    setShowUserModal(true);
  }

  function openViewModal(user: SystemUser) {
    setSelectedUser(user);
    setShowViewModal(true);
  }

  function openEditModal(user: SystemUser) {
    const role = normalizeRole(user.role);
    const tauliahType = normalizeTauliahType(user.tauliah_type);

    setEditingUser(user);
    setConfirmRemoveMedalIndex(null);

    setForm({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: formatMalaysiaPhone(user.phone || ""),
      role,
      district: user.district || district,
      group_id: user.group_id || "",
      group_name: getLiveGroupName(user) === "-" ? "" : getLiveGroupName(user),
      status: normalizeStatus(user.status),
      password: "",
      notes: user.notes || "",
      tauliah_type: tauliahType,
      tauliah_no: tauliahType === "Tiada" ? "" : user.tauliah_no || "",
      tauliah_date: tauliahType === "Tiada" ? "" : user.tauliah_date || "",
      tauliah_status:
        tauliahType === "Tiada"
          ? "Tiada"
          : normalizeTauliahStatus(user.tauliah_status),
      medals: normalizeMedals(user.medals),
    });

    setShowUserModal(true);
  }

  function openDeactivateModal(user: SystemUser) {
    setDeactivateTarget(user);
    setShowDeactivateModal(true);
  }

  async function checkDuplicateEmail(email: string, ignoreUserId?: string) {
    let query = supabase
      .from("system_users")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .is("deleted_at", null)
      .limit(1);

    if (ignoreUserId) {
      query = query.neq("id", ignoreUserId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
  }

  function validateForm() {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      return false;
    }

    if (!form.full_name.trim()) {
      alert("Sila isi nama penuh pengguna.");
      return false;
    }

    if (!form.email.trim()) {
      alert("Sila isi e-mel pengguna.");
      return false;
    }

    if (!isValidEmail(form.email)) {
      alert("Format e-mel tidak sah.");
      return false;
    }

    if (form.phone && !isValidMalaysiaPhone(form.phone)) {
      alert(
        "Nombor telefon tidak sah. Sila masukkan nombor Malaysia yang bermula dengan 0. Contoh: 012-345 6789."
      );
      return false;
    }

    if (!form.role) {
      alert("Sila pilih role pengguna.");
      return false;
    }

    if (form.role === "Super Admin" || form.role === "Pesuruhjaya Daerah") {
      alert("Role ini tidak boleh dicipta melalui modul daerah.");
      return false;
    }

    if (roleRequiresGroup(form.role) && !form.group_id) {
      alert("Pemimpin Kumpulan / Penolong Pemimpin wajib pilih kumpulan.");
      return false;
    }

    if (!editingUser && !form.password.trim()) {
      alert("Sila isi password sementara.");
      return false;
    }

    if (roleRequiresTauliah(form.role)) {
      if (!form.tauliah_type) {
        alert("Sila pilih jenis tauliah.");
        return false;
      }

      if (form.tauliah_type !== "Tiada") {
        if (!form.tauliah_no.trim()) {
          alert("Sila isi No Tauliah.");
          return false;
        }

        if (!form.tauliah_date) {
          alert("Sila pilih Tarikh Tauliah.");
          return false;
        }
      }
    }

    const medalRows = form.medals.filter(
      (medal) => medal.name.trim() || medal.date || medal.serial_no.trim()
    );

    for (let index = 0; index < medalRows.length; index += 1) {
      const medal = medalRows[index];

      if (!medal.name.trim()) {
        alert(`Sila isi Nama Pingat untuk pingat #${index + 1}.`);
        return false;
      }

      if (!medal.date) {
        alert(`Sila pilih Tarikh Pingat untuk pingat #${index + 1}.`);
        return false;
      }
    }

    return true;
  }

  function handleRoleChange(role: string) {
    const nextForm: UserForm = {
      ...form,
      role,
    };

    if (!roleRequiresGroup(role)) {
      nextForm.group_id = "";
      nextForm.group_name = "";
    }

    if (!roleRequiresTauliah(role)) {
      nextForm.tauliah_type = "Tiada";
      nextForm.tauliah_no = "";
      nextForm.tauliah_date = "";
      nextForm.tauliah_status = "Tiada";
      nextForm.medals = [];
      setConfirmRemoveMedalIndex(null);
    }

    setForm(nextForm);
  }

  function handleTauliahTypeChange(type: string) {
    if (type === "Tiada") {
      setForm({
        ...form,
        tauliah_type: "Tiada",
        tauliah_no: "",
        tauliah_date: "",
        tauliah_status: "Tiada",
      });

      return;
    }

    setForm({
      ...form,
      tauliah_type: type,
      tauliah_status: "Ada",
    });
  }

  async function saveUser() {
    if (!validateForm()) return;

    setSaving(true);

    const duplicateEmail = await checkDuplicateEmail(form.email, editingUser?.id);

    if (duplicateEmail) {
      alert("E-mel ini sudah digunakan oleh pengguna lain.");
      setSaving(false);
      return;
    }

    const selectedGroup = groups.find((group) => group.id === form.group_id);
    const isTauliahRole = roleRequiresTauliah(form.role);
    const hasTauliah = isTauliahRole && form.tauliah_type !== "Tiada";

    const cleanMedals = isTauliahRole
      ? form.medals
          .filter(
            (medal) =>
              medal.name.trim() || medal.date || medal.serial_no.trim()
          )
          .map((medal) => ({
            name: medal.name.trim(),
            date: medal.date,
            serial_no: medal.serial_no.trim(),
          }))
      : [];

    const payload: Record<string, any> = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: normalizeMalaysiaPhone(form.phone) || null,
      role: form.role,
      district,
      district_environment_id: districtEnvironmentId || null,
      group_id: roleRequiresGroup(form.role) ? form.group_id : null,
      group_name: roleRequiresGroup(form.role)
        ? selectedGroup?.group_name || form.group_name
        : null,
      status: form.status,
      notes: form.notes.trim() || null,
      tauliah_type: isTauliahRole ? form.tauliah_type : "Tiada",
      tauliah_no: hasTauliah ? form.tauliah_no.trim() : null,
      tauliah_date: hasTauliah ? form.tauliah_date : null,
      tauliah_status: hasTauliah ? "Ada" : "Tiada",
      medals: cleanMedals,
      certificate_no: null,
      medal_no: null,
      updated_at: new Date().toISOString(),
    };

    if (!editingUser || form.password.trim()) {
      payload.password = form.password.trim() || "123456";
    }

    if (editingUser) {
      let query = supabase
        .from("system_users")
        .update(payload)
        .eq("id", editingUser.id);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "UPDATE",
        `Kemaskini pengguna: ${form.full_name}`,
        editingUser.id
      );
    } else {
      const { data, error } = await supabase
        .from("system_users")
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
        `Tambah pengguna: ${form.full_name}`,
        data?.id || null
      );
    }

    await fetchUsers();
    resetForm();
    setShowUserModal(false);
    setSaving(false);
  }

  async function deactivateUser() {
    if (!deactivateTarget) return;

    setSaving(true);

    let query = supabase
      .from("system_users")
      .update({
        status: "Tidak Aktif",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deactivateTarget.id);

    query = applyDistrictScope(query);

    const { error } = await query;

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "DEACTIVATE",
      `Nyahaktif pengguna: ${deactivateTarget.full_name || "-"}`,
      deactivateTarget.id
    );

    await fetchUsers();
    setShowDeactivateModal(false);
    setDeactivateTarget(null);
    setSaving(false);
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Pengurusan Pengguna</h2>
          <p className="text-muted mb-0">
            Urus pengguna daerah, role, kumpulan dan maklumat tauliah pemimpin.
          </p>
        </div>

        <button className="btn btn-success" onClick={openAddModal}>
          <i className="bi bi-person-plus me-1"></i>
          Tambah Pengguna
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Jumlah Pengguna</small>
              <h4 className="fw-bold mb-0">{userStats.total}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Aktif</small>
              <h4 className="fw-bold text-success mb-0">{userStats.active}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Pemimpin Kumpulan</small>
              <h4 className="fw-bold mb-0">{userStats.leaders}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Ada Tauliah</small>
              <h4 className="fw-bold text-primary mb-0">
                {userStats.tauliahAda}
              </h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  className="form-control"
                  placeholder="Cari nama, email, phone, tauliah..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-2">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option>Semua Role</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <select
                className="form-select"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option>Semua Kumpulan</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.group_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <select
                className="form-select"
                value={tauliahFilter}
                onChange={(e) => setTauliahFilter(e.target.value)}
              >
                <option>Semua Tauliah</option>
                {TAULIAH_TYPE_OPTIONS.map((type) => (
                  <option key={type}>{type}</option>
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

            <div className="col-md-1">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("Semua Role");
                  setStatusFilter("Semua Status");
                  setGroupFilter("Semua Kumpulan");
                  setTauliahFilter("Semua Tauliah");
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Kumpulan</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Tauliah</th>
                <th className="px-4 py-3">Pingat</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">
                      Memuatkan pengguna...
                    </p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    <i className="bi bi-people fs-1 d-block mb-2"></i>
                    Tiada pengguna dijumpai.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const name = user.full_name || "-";
                  const role = normalizeRole(user.role);
                  const tauliahType = normalizeTauliahType(user.tauliah_type);
                  const status = normalizeStatus(user.status);
                  const medals = normalizeMedals(user.medals);

                  return (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: 40, height: 40 }}
                          >
                            {getInitials(name)}
                          </div>

                          <div>
                            <div className="fw-semibold">{name}</div>
                            <small className="text-muted">
                              {user.email || "-"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="fw-semibold">{role}</span>
                      </td>

                      <td className="px-4 py-3">
                        {getLiveGroupName(user) !== "-" ? (
                          <span>{getLiveGroupName(user)}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3">{displayPhone(user.phone)}</td>

                      <td className="px-4 py-3">
                        {tauliahType === "Tiada" ? (
                          <span className="badge rounded-pill bg-light text-muted border">
                            Tiada Tauliah
                          </span>
                        ) : (
                          <div>
                            <span
                              className={`badge rounded-pill ${getTauliahBadge(
                                tauliahType
                              )}`}
                            >
                              {tauliahType}
                            </span>

                            <div className="small text-muted mt-1">
                              {user.tauliah_no || "-"}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {medals.length === 0 ? (
                          <span className="small text-muted">Tiada pingat</span>
                        ) : (
                          <div className="small">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <i className="bi bi-award text-warning"></i>
                              <span className="fw-semibold">
                                {medals.length} pingat
                              </span>
                            </div>

                            <div className="text-muted">
                              {medals
                                .slice(0, 2)
                                .map((medal) => medal.name)
                                .join(", ")}
                              {medals.length > 2 ? "..." : ""}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
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
                      </td>

                      <td className="px-4 py-3 text-end">
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-light border"
                            onClick={() => openViewModal(user)}
                            title="Lihat"
                          >
                            <i className="bi bi-eye text-primary"></i>
                          </button>

                          <button
                            className="btn btn-sm btn-light border"
                            onClick={() => openEditModal(user)}
                            title="Edit"
                          >
                            <i className="bi bi-pencil-square text-secondary"></i>
                          </button>

                          <button
                            className="btn btn-sm btn-light border"
                            onClick={() => openDeactivateModal(user)}
                            title="Nyahaktif"
                          >
                            <i className="bi bi-person-dash text-danger"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUserModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    {editingUser ? "Edit Pengguna" : "Tambah Pengguna"}
                  </h5>
                  <small className="text-muted">
                    Tambah pengguna daerah dan maklumat tauliah pemimpin.
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowUserModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-4">
                  <div className="col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 mb-4">
                      <div className="card-body p-4">
                        <h6 className="fw-bold mb-3">
                          <i className="bi bi-person-circle text-success me-2"></i>
                          Maklumat Akaun
                        </h6>

                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label">Nama Penuh</label>
                            <input
                              className="form-control"
                              value={form.full_name}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  full_name: e.target.value,
                                })
                              }
                              placeholder="Nama penuh pengguna"
                              disabled={saving}
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">E-mel Login</label>
                            <input
                              type="email"
                              className="form-control"
                              value={form.email}
                              onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
                              }
                              placeholder="email@example.com"
                              disabled={saving}
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">No Telefon</label>
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
                              disabled={saving}
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Role</label>
                            <select
                              className="form-select"
                              value={form.role}
                              onChange={(e) => handleRoleChange(e.target.value)}
                              disabled={saving}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role}>{role}</option>
                              ))}
                            </select>
                          </div>

                          {roleRequiresGroup(form.role) && (
                            <div className="col-md-6">
                              <label className="form-label">
                                Kumpulan / Sekolah
                              </label>
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
                                <option value="">Pilih Kumpulan</option>

                                {groups.map((group) => (
                                  <option key={group.id} value={group.id}>
                                    {group.group_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

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

                          <div className="col-md-6">
                            <label className="form-label">
                              {editingUser
                                ? "Password Baru (optional)"
                                : "Password Sementara"}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={form.password}
                              onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                              }
                              placeholder="123456"
                              disabled={saving}
                            />
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
                              placeholder="Catatan tambahan jika perlu"
                              disabled={saving}
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </div>

                    {roleRequiresTauliah(form.role) && (
                      <div className="card border-0 shadow-sm rounded-4">
                        <div className="card-body p-4">
                          <div className="d-flex justify-content-between align-items-start mb-4">
                            <div>
                              <h6 className="fw-bold mb-1">
                                <i className="bi bi-patch-check text-success me-2"></i>
                                Maklumat Tauliah & Pengiktirafan
                              </h6>
                              <small className="text-muted">
                                Rekod tauliah dan pingat untuk pemimpin /
                                pegawai.
                              </small>
                            </div>

                            <span
                              className={`badge rounded-pill px-3 py-2 ${
                                form.tauliah_type === "Tiada"
                                  ? "bg-light text-muted border"
                                  : "bg-success-subtle text-success border border-success-subtle"
                              }`}
                            >
                              {form.tauliah_type === "Tiada"
                                ? "Tiada Tauliah"
                                : "Ada Tauliah"}
                            </span>
                          </div>

                          <div className="row g-3">
                            <div className="col-md-4">
                              <label className="form-label">
                                Jenis Tauliah
                              </label>
                              <select
                                className="form-select"
                                value={form.tauliah_type}
                                onChange={(e) =>
                                  handleTauliahTypeChange(e.target.value)
                                }
                                disabled={saving}
                              >
                                {TAULIAH_TYPE_OPTIONS.map((type) => (
                                  <option key={type}>{type}</option>
                                ))}
                              </select>
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">No Tauliah</label>
                              <input
                                className="form-control"
                                value={form.tauliah_no}
                                disabled={
                                  form.tauliah_type === "Tiada" || saving
                                }
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    tauliah_no: e.target.value,
                                  })
                                }
                                placeholder="TLH-2026-001"
                              />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">
                                Tarikh Tauliah
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                value={form.tauliah_date}
                                disabled={
                                  form.tauliah_type === "Tiada" || saving
                                }
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    tauliah_date: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">
                                Status Tauliah
                              </label>
                              <input
                                className="form-control"
                                value={
                                  form.tauliah_type === "Tiada" ? "Tiada" : "Ada"
                                }
                                disabled
                              />
                              <small className="text-muted">
                                Status ditetapkan automatik.
                              </small>
                            </div>

                            <div className="col-12 mt-2">
                              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                                <div>
                                  <label className="form-label mb-0 fw-semibold">
                                    Senarai Pingat
                                  </label>
                                  <div className="small text-muted">
                                    Tambah satu atau lebih pingat. No Siri tidak
                                    wajib.
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-sm btn-success"
                                  onClick={() => {
                                    setConfirmRemoveMedalIndex(null);
                                    setForm({
                                      ...form,
                                      medals: [...form.medals, emptyMedal()],
                                    });
                                  }}
                                  disabled={saving}
                                >
                                  <i className="bi bi-plus-circle me-1"></i>
                                  Tambah Pingat
                                </button>
                              </div>

                              {form.medals.length === 0 ? (
                                <div className="border rounded-4 p-4 text-center bg-light">
                                  <i className="bi bi-award text-muted fs-2 d-block mb-2"></i>
                                  <div className="fw-semibold">
                                    Belum ada pingat direkodkan
                                  </div>
                                  <div className="small text-muted">
                                    Tekan butang Tambah Pingat untuk masukkan
                                    maklumat pingat.
                                  </div>
                                </div>
                              ) : (
                                <div className="d-flex flex-column gap-3">
                                  {form.medals.map((medal, index) => {
                                    const isConfirmingRemove =
                                      confirmRemoveMedalIndex === index;

                                    return (
                                      <div
                                        className={`border rounded-4 p-3 ${
                                          isConfirmingRemove
                                            ? "bg-danger-subtle border-danger"
                                            : "bg-white"
                                        }`}
                                        key={index}
                                      >
                                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                                          <div className="d-flex align-items-center gap-2">
                                            <div
                                              className={`rounded-circle d-flex align-items-center justify-content-center ${
                                                isConfirmingRemove
                                                  ? "bg-danger text-white"
                                                  : "bg-warning-subtle text-warning"
                                              }`}
                                              style={{ width: 38, height: 38 }}
                                            >
                                              <i
                                                className={`bi ${
                                                  isConfirmingRemove
                                                    ? "bi-exclamation-triangle"
                                                    : "bi-award"
                                                }`}
                                              ></i>
                                            </div>

                                            <div>
                                              <strong>Pingat #{index + 1}</strong>
                                              <div className="small text-muted">
                                                {medal.name ||
                                                  "Nama pingat belum diisi"}
                                              </div>
                                            </div>
                                          </div>

                                          {!isConfirmingRemove ? (
                                            <button
                                              type="button"
                                              className="btn btn-sm btn-outline-danger rounded-circle d-inline-flex align-items-center justify-content-center"
                                              style={{ width: 34, height: 34 }}
                                              onClick={() => setConfirmRemoveMedalIndex(index)}
                                              disabled={saving}
                                              title="Buang pingat"
                                              aria-label="Buang pingat"
                                            >
                                              <i className="bi bi-trash"></i>
                                            </button>
                                          ) : (
                                            <div className="d-flex flex-wrap gap-2 align-items-center">
                                              <span className="small fw-semibold text-danger">
                                                Buang pingat ini?
                                              </span>

                                              <button
                                                type="button"
                                                className="btn btn-sm btn-danger rounded-circle d-inline-flex align-items-center justify-content-center"
                                                style={{ width: 34, height: 34 }}
                                                onClick={() => {
                                                  setForm({
                                                    ...form,
                                                    medals: form.medals.filter(
                                                      (_, medalIndex) => medalIndex !== index
                                                    ),
                                                  });
                                                  setConfirmRemoveMedalIndex(null);
                                                }}
                                                disabled={saving}
                                                title="Ya, buang pingat"
                                                aria-label="Ya, buang pingat"
                                              >
                                                <i className="bi bi-check-lg"></i>
                                              </button>

                                              <button
                                                type="button"
                                                className="btn btn-sm btn-light border rounded-circle d-inline-flex align-items-center justify-content-center"
                                                style={{ width: 34, height: 34 }}
                                                onClick={() => setConfirmRemoveMedalIndex(null)}
                                                disabled={saving}
                                                title="Batal"
                                                aria-label="Batal"
                                              >
                                                <i className="bi bi-x-lg"></i>
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {!isConfirmingRemove && (
                                          <div className="row g-3">
                                            <div className="col-md-5">
                                              <label className="form-label">
                                                Nama Pingat
                                              </label>
                                              <input
                                                className="form-control"
                                                value={medal.name}
                                                onChange={(e) => {
                                                  const nextMedals = [
                                                    ...form.medals,
                                                  ];

                                                  nextMedals[index] = {
                                                    ...nextMedals[index],
                                                    name: e.target.value,
                                                  };

                                                  setForm({
                                                    ...form,
                                                    medals: nextMedals,
                                                  });
                                                }}
                                                placeholder="Contoh: Pingat Usaha"
                                                disabled={saving}
                                              />
                                            </div>

                                            <div className="col-md-4">
                                              <label className="form-label">
                                                Tarikh Pingat
                                              </label>
                                              <input
                                                type="date"
                                                className="form-control"
                                                value={medal.date}
                                                onChange={(e) => {
                                                  const nextMedals = [
                                                    ...form.medals,
                                                  ];

                                                  nextMedals[index] = {
                                                    ...nextMedals[index],
                                                    date: e.target.value,
                                                  };

                                                  setForm({
                                                    ...form,
                                                    medals: nextMedals,
                                                  });
                                                }}
                                                disabled={saving}
                                              />
                                            </div>

                                            <div className="col-md-3">
                                              <label className="form-label">
                                                No Siri
                                              </label>
                                              <input
                                                className="form-control"
                                                value={medal.serial_no}
                                                onChange={(e) => {
                                                  const nextMedals = [
                                                    ...form.medals,
                                                  ];

                                                  nextMedals[index] = {
                                                    ...nextMedals[index],
                                                    serial_no: e.target.value,
                                                  };

                                                  setForm({
                                                    ...form,
                                                    medals: nextMedals,
                                                  });
                                                }}
                                                placeholder="Optional"
                                                disabled={saving}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          {form.tauliah_type === "Tiada" ? (
                            <div className="alert alert-light border rounded-4 small mt-4 mb-0">
                              <i className="bi bi-info-circle me-2"></i>
                              No tauliah dan tarikh tauliah akan dikosongkan
                              kerana jenis tauliah ialah{" "}
                              <strong>Tiada</strong>.
                            </div>
                          ) : (
                            <div className="alert alert-success rounded-4 small mt-4 mb-0">
                              <i className="bi bi-check-circle me-2"></i>
                              Pemimpin ini mempunyai tauliah jenis{" "}
                              <strong>{form.tauliah_type}</strong>.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 sticky-top">
                      <div className="card-body text-center p-4">
                        <div
                          className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                          style={{ width: 82, height: 82, fontSize: 26 }}
                        >
                          {getInitials(form.full_name || "PK")}
                        </div>

                        <h6 className="fw-bold mb-1">
                          {form.full_name || "Nama Pengguna"}
                        </h6>

                        <small className="text-muted d-block">
                          {form.email || "email@example.com"}
                        </small>

                        <span
                          className={`badge rounded-pill mt-3 ${
                            form.status === "Aktif"
                              ? "bg-success"
                              : form.status === "Digantung"
                              ? "bg-warning text-dark"
                              : "bg-secondary"
                          }`}
                        >
                          {form.status}
                        </span>

                        <hr />

                        <div className="text-start">
                          <div className="mb-3">
                            <small className="text-muted d-block">Role</small>
                            <strong>{form.role}</strong>
                          </div>

                          <div className="mb-3">
                            <small className="text-muted d-block">
                              Kumpulan
                            </small>
                            <strong>{form.group_name || "-"}</strong>
                          </div>

                          <div className="mb-3">
                            <small className="text-muted d-block">
                              Telefon
                            </small>
                            <strong>{form.phone || "-"}</strong>
                          </div>

                          {roleRequiresTauliah(form.role) && (
                            <div className="border rounded-4 p-3 bg-light">
                              <small className="text-muted d-block mb-2">
                                Maklumat Tauliah
                              </small>

                              <div className="d-flex justify-content-between mb-2">
                                <span>Jenis</span>
                                <strong>{form.tauliah_type}</strong>
                              </div>

                              <div className="d-flex justify-content-between mb-2">
                                <span>No Tauliah</span>
                                <strong>{form.tauliah_no || "-"}</strong>
                              </div>

                              <div className="d-flex justify-content-between">
                                <span>Pingat</span>
                                <strong>{form.medals.length} pingat</strong>
                              </div>

                              {form.medals.length > 0 && (
                                <div className="small text-muted mt-2">
                                  {form.medals
                                    .filter((medal) => medal.name.trim())
                                    .slice(0, 3)
                                    .map((medal) => medal.name)
                                    .join(", ")}
                                  {form.medals.length > 3 ? "..." : ""}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowUserModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  onClick={saveUser}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Menyimpan...
                    </>
                  ) : editingUser ? (
                    "Kemaskini Pengguna"
                  ) : (
                    "Simpan Pengguna"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedUser && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Pengguna</h5>

                <button
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold mx-auto mb-2"
                    style={{ width: 72, height: 72, fontSize: 24 }}
                  >
                    {getInitials(selectedUser.full_name || "-")}
                  </div>

                  <h5 className="fw-bold mb-0">
                    {selectedUser.full_name || "-"}
                  </h5>

                  <small className="text-muted">
                    {selectedUser.email || "-"}
                  </small>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">Role</small>
                      <strong>{normalizeRole(selectedUser.role)}</strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">Status</small>
                      <strong>{normalizeStatus(selectedUser.status)}</strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">Telefon</small>
                      <strong>{displayPhone(selectedUser.phone)}</strong>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block">Kumpulan</small>
                      <strong>{getLiveGroupName(selectedUser)}</strong>
                    </div>
                  </div>

                  {roleRequiresTauliah(normalizeRole(selectedUser.role)) && (
                    <>
                      <div className="col-md-6">
                        <div className="border rounded-4 p-3 h-100">
                          <small className="text-muted d-block">
                            Jenis Tauliah
                          </small>
                          <strong>
                            {normalizeTauliahType(selectedUser.tauliah_type)}
                          </strong>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="border rounded-4 p-3 h-100">
                          <small className="text-muted d-block">
                            Status Tauliah
                          </small>
                          <strong>
                            {normalizeTauliahStatus(
                              selectedUser.tauliah_status
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="border rounded-4 p-3 h-100">
                          <small className="text-muted d-block">
                            No Tauliah
                          </small>
                          <strong>{selectedUser.tauliah_no || "-"}</strong>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="border rounded-4 p-3 h-100">
                          <small className="text-muted d-block">
                            Tarikh Tauliah
                          </small>
                          <strong>{formatDate(selectedUser.tauliah_date)}</strong>
                        </div>
                      </div>

                      <div className="col-12">
                        <div className="border rounded-4 p-3 h-100">
                          <small className="text-muted d-block mb-2">
                            Senarai Pingat
                          </small>

                          {normalizeMedals(selectedUser.medals).length === 0 ? (
                            <strong>-</strong>
                          ) : (
                            <div className="d-flex flex-column gap-2">
                              {normalizeMedals(selectedUser.medals).map(
                                (medal, index) => (
                                  <div
                                    key={index}
                                    className="d-flex justify-content-between align-items-start border rounded-3 p-2"
                                  >
                                    <div>
                                      <strong>{medal.name}</strong>
                                      <div className="small text-muted">
                                        Tarikh: {formatDate(medal.date)}
                                      </div>
                                    </div>

                                    <span className="badge bg-light text-dark border">
                                      {medal.serial_no || "Tiada No Siri"}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="col-12">
                    <div className="border rounded-4 p-3">
                      <small className="text-muted d-block">Catatan</small>
                      <strong>{selectedUser.notes || "-"}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedUser);
                  }}
                >
                  Edit Pengguna
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeactivateModal && deactivateTarget && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  Nyahaktif Pengguna
                </h5>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowDeactivateModal(false);
                    setDeactivateTarget(null);
                  }}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu nyahaktif pengguna ini?
                </p>

                <strong>{deactivateTarget.full_name || "-"}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Akaun tidak dipadam kekal. Status akan ditukar kepada Tidak
                  Aktif.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowDeactivateModal(false);
                    setDeactivateTarget(null);
                  }}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  className="btn btn-danger"
                  onClick={deactivateUser}
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Nyahaktif"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}