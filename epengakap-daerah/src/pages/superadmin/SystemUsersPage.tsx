import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type SystemUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  role: string | null;
  district: string | null;
  district_environment_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  status: string | null;
  password?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DistrictEnvironmentRaw = {
  id: string;
  state_id: string;
  district_id: string;
  district_commissioner_user_id: string;
  official_name: string | null;
  official_email: string | null;
  official_phone: string | null;
  office_address: string | null;
  status: string;
  deleted_at: string | null;
};

type DistrictEnvironmentOption = {
  id: string;
  state_name: string;
  district_name: string;
  label: string;
};

type GroupOption = {
  id: string;
  group_name: string | null;
  school_name?: string | null;
  district_environment_id?: string | null;
  district?: string | null;
};

type UserForm = {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  district_environment_id: string;
  district: string;
  group_id: string;
  group_name: string;
  status: string;
  password: string;
};

const ROLE_OPTIONS = [
  "Super Admin",
  "Pesuruhjaya Daerah",
  "Penolong Pesuruhjaya Daerah",
  "Pemimpin Kumpulan",
  "Penolong Pemimpin",
];

const STATUS_OPTIONS = ["Aktif", "Tidak Aktif"];

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

function getInitials(name?: string | null) {
  return String(name || "-")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(role?: string | null) {
  if (role === "Penolong Pesuruhjaya") return "Penolong Pesuruhjaya Daerah";
  if (role === "District") return "Pesuruhjaya Daerah";
  return role || "-";
}

function normalizeStatus(status?: string | null) {
  if (status === "Active") return "Aktif";
  if (status === "Inactive") return "Tidak Aktif";
  if (status === "Suspended") return "Tidak Aktif";
  return status || "Aktif";
}

function isActive(status?: string | null) {
  const value = normalizeStatus(status).toLowerCase();
  return value === "aktif" || value === "active";
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

function getRoleBadge(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "Super Admin") {
    return "bg-dark text-white";
  }

  if (normalizedRole === "Pesuruhjaya Daerah") {
    return "bg-success-subtle text-success border border-success-subtle";
  }

  if (normalizedRole === "Penolong Pesuruhjaya Daerah") {
    return "bg-primary-subtle text-primary border border-primary-subtle";
  }

  if (normalizedRole === "Pemimpin Kumpulan") {
    return "bg-warning-subtle text-warning border border-warning-subtle";
  }

  if (normalizedRole === "Penolong Pemimpin") {
    return "bg-info-subtle text-info border border-info-subtle";
  }

  return "bg-secondary-subtle text-secondary border border-secondary-subtle";
}

function getStatusBadge(status?: string | null) {
  return isActive(status)
    ? "bg-success-subtle text-success border border-success-subtle"
    : "bg-danger-subtle text-danger border border-danger-subtle";
}

function emptyForm(): UserForm {
  return {
    full_name: "",
    email: "",
    phone: "",
    role: "Pesuruhjaya Daerah",
    district_environment_id: "",
    district: "",
    group_id: "",
    group_name: "",
    status: "Aktif",
    password: "123456",
  };
}

export default function SystemUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [districtEnvironments, setDistrictEnvironments] = useState<
    DistrictEnvironmentOption[]
  >([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Semua Role");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [districtFilter, setDistrictFilter] = useState("Semua Daerah");

  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SystemUser | null>(
    null
  );

  const [showViewModal, setShowViewModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const [form, setForm] = useState<UserForm>(emptyForm());

  useEffect(() => {
    loadPageData();
  }, []);

  async function addAuditLog(
    action: string,
    description: string,
    recordId?: string | null,
    oldValue?: unknown,
    newValue?: unknown,
    districtEnvironmentId?: string | null
  ) {
    try {
      const user = getCurrentUser();

      await supabase.from("audit_logs").insert({
        actor_name: user.full_name || user.name || "Super Admin",
        actor_role: user.role || "Super Admin",
        action,
        module: "Pengguna Sistem",
        description,
        user_id: user.id || null,
        district_environment_id: districtEnvironmentId || null,
        record_id: recordId || null,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch {
      // Jangan block proses utama kalau audit log gagal.
    }
  }

  async function loadDistrictEnvironments() {
    const [envResult, statesResult, districtsResult] = await Promise.all([
      supabase
        .from("district_environments")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),

      supabase.from("states").select("*"),

      supabase
        .from("districts")
        .select("id, state_id, district_name, district_code, status"),
    ]);

    if (envResult.error) throw envResult.error;
    if (statesResult.error) throw statesResult.error;
    if (districtsResult.error) throw districtsResult.error;

    const stateMap = new Map<string, string>();
    const districtMap = new Map<string, string>();

    (statesResult.data || []).forEach((state: any) => {
      stateMap.set(
        state.id,
        state.state_name || state.name || state.state || "-"
      );
    });

    (districtsResult.data || []).forEach((district: any) => {
      districtMap.set(district.id, district.district_name || "-");
    });

    const options: DistrictEnvironmentOption[] = (
      envResult.data || []
    ).map((environment: DistrictEnvironmentRaw) => {
      const stateName = stateMap.get(environment.state_id) || "-";
      const districtName = districtMap.get(environment.district_id) || "-";

      return {
        id: environment.id,
        state_name: stateName,
        district_name: districtName,
        label: `${stateName} - ${districtName}`,
      };
    });

    setDistrictEnvironments(options);

    return options;
  }

  async function loadGroups() {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("group_name", { ascending: true });

    if (error) {
      console.warn("Groups load failed:", error.message);
      setGroups([]);
      return [];
    }

    setGroups(data || []);
    return data || [];
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("system_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    setUsers(data || []);
  }

  async function loadPageData() {
    setLoading(true);

    try {
      await Promise.all([loadDistrictEnvironments(), loadGroups(), fetchUsers()]);
    } catch (error: any) {
      console.error("Failed to load users page:", error);
      alert(error?.message || "Gagal memuatkan data pengguna sistem.");
    } finally {
      setLoading(false);
    }
  }

  const roles = useMemo(() => {
    return ["Semua Role", ...ROLE_OPTIONS];
  }, []);

  const districtFilterOptions = useMemo(() => {
    return [
      "Semua Daerah",
      ...districtEnvironments.map((environment) => environment.label).sort(),
    ];
  }, [districtEnvironments]);

  const filteredGroups = useMemo(() => {
    if (!form.district_environment_id) return groups;

    return groups.filter((group) => {
      return (
        group.district_environment_id === form.district_environment_id ||
        group.district === form.district
      );
    });
  }, [groups, form.district_environment_id, form.district]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const role = normalizeRole(user.role);
      const status = normalizeStatus(user.status);

      const userEnvironment = districtEnvironments.find(
        (environment) => environment.id === user.district_environment_id
      );

      const districtLabel =
        userEnvironment?.label || user.district || "Tiada Daerah";

      const keyword = search.toLowerCase().trim();

      const matchSearch =
        !keyword ||
        normalizeText(user.full_name).toLowerCase().includes(keyword) ||
        normalizeEmail(user.email).includes(keyword) ||
        role.toLowerCase().includes(keyword) ||
        normalizeText(user.district).toLowerCase().includes(keyword) ||
        districtLabel.toLowerCase().includes(keyword) ||
        normalizeText(user.group_name).toLowerCase().includes(keyword);

      const matchRole = roleFilter === "Semua Role" || role === roleFilter;

      const matchStatus =
        statusFilter === "Semua Status" || status === statusFilter;

      const matchDistrict =
        districtFilter === "Semua Daerah" || districtLabel === districtFilter;

      return matchSearch && matchRole && matchStatus && matchDistrict;
    });
  }, [
    users,
    search,
    roleFilter,
    statusFilter,
    districtFilter,
    districtEnvironments,
  ]);

  function resetForm() {
    setEditingUser(null);
    setForm(emptyForm());
  }

  function openAddModal() {
    resetForm();
    setShowUserModal(true);
  }

  function openViewModal(user: SystemUser) {
    setSelectedUser(user);
    setShowViewModal(true);
  }

  function openEditModal(user: SystemUser) {
    const environment = districtEnvironments.find(
      (item) => item.id === user.district_environment_id
    );

    setEditingUser(user);
    setForm({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: formatMalaysiaPhone(user.phone || ""),
      role: normalizeRole(user.role),
      district_environment_id: user.district_environment_id || "",
      district: user.district || environment?.district_name || "",
      group_id: user.group_id || "",
      group_name: user.group_name || "",
      status: normalizeStatus(user.status),
      password: user.password || "",
    });

    setShowUserModal(true);
  }

  function openDeactivateModal(user: SystemUser) {
    const currentUser = getCurrentUser();

    if (user.email === currentUser.email) {
      alert("Anda tidak boleh nyahaktif akaun yang sedang digunakan.");
      return;
    }

    setDeactivateTarget(user);
    setShowDeactivateModal(true);
  }

  function handleEnvironmentChange(environmentId: string) {
    const environment = districtEnvironments.find(
      (item) => item.id === environmentId
    );

    setForm({
      ...form,
      district_environment_id: environmentId,
      district: environment?.district_name || "",
      group_id: "",
      group_name: "",
    });
  }

  function handleGroupChange(groupId: string) {
    const selectedGroup = groups.find((group) => group.id === groupId);

    setForm({
      ...form,
      group_id: groupId,
      group_name:
        selectedGroup?.group_name || selectedGroup?.school_name || "",
    });
  }

  function validateForm() {
    const fullName = form.full_name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!fullName) {
      alert("Sila isi nama penuh.");
      return false;
    }

    if (!email) {
      alert("Sila isi email.");
      return false;
    }

    if (!isValidEmail(email)) {
      alert("Format email tidak sah.");
      return false;
    }

    if (phone && !isValidMalaysiaPhone(phone)) {
      alert("Nombor telefon tidak sah. Contoh: 012-345 6789.");
      return false;
    }

    if (!ROLE_OPTIONS.includes(form.role)) {
      alert("Role tidak sah.");
      return false;
    }

    if (form.role !== "Super Admin" && !form.district_environment_id) {
      alert("Sila pilih daerah/environment untuk pengguna ini.");
      return false;
    }

    if (
      (form.role === "Pemimpin Kumpulan" ||
        form.role === "Penolong Pemimpin") &&
      !form.group_id
    ) {
      alert("Sila pilih kumpulan untuk role Pemimpin/Penolong Pemimpin.");
      return false;
    }

    if (!editingUser && !form.password.trim()) {
      alert("Sila isi password sementara.");
      return false;
    }

    if (form.password.trim() && form.password.trim().length < 6) {
      alert("Password mestilah sekurang-kurangnya 6 aksara.");
      return false;
    }

    return true;
  }

  async function saveUser() {
    if (!validateForm()) return;

    setUpdatingId(editingUser?.id || "new");

    const selectedEnvironment = districtEnvironments.find(
      (environment) => environment.id === form.district_environment_id
    );

    const payload: any = {
      full_name: form.full_name.trim(),
      email: normalizeEmail(form.email),
      phone: normalizeMalaysiaPhone(form.phone),
      role: form.role,
      district:
        form.role === "Super Admin"
          ? null
          : selectedEnvironment?.district_name || form.district || null,
      district_environment_id:
        form.role === "Super Admin" ? null : form.district_environment_id,
      group_id:
        form.role === "Pemimpin Kumpulan" ||
        form.role === "Penolong Pemimpin"
          ? form.group_id
          : null,
      group_name:
        form.role === "Pemimpin Kumpulan" ||
        form.role === "Penolong Pemimpin"
          ? form.group_name
          : null,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    try {
      if (editingUser) {
        const { error } = await supabase
          .from("system_users")
          .update(payload)
          .eq("id", editingUser.id);

        if (error) throw error;

        await addAuditLog(
          "UPDATE",
          `Kemaskini pengguna sistem: ${payload.full_name}`,
          editingUser.id,
          editingUser,
          payload,
          payload.district_environment_id
        );
      } else {
        const { data: existingEmail, error: emailError } = await supabase
          .from("system_users")
          .select("id")
          .eq("email", payload.email)
          .maybeSingle();

        if (emailError) throw emailError;

        if (existingEmail) {
          alert("Email ini sudah digunakan oleh pengguna lain.");
          setUpdatingId(null);
          return;
        }

        const { data: insertedUser, error } = await supabase
          .from("system_users")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (error) throw error;

        await addAuditLog(
          "CREATE",
          `Tambah pengguna sistem baharu: ${payload.full_name}`,
          insertedUser.id,
          null,
          insertedUser,
          insertedUser.district_environment_id
        );
      }

      await fetchUsers();
      resetForm();
      setShowUserModal(false);
    } catch (error: any) {
      console.error("Save user failed:", error);
      alert(error?.message || "Gagal menyimpan pengguna.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function toggleUserStatus(user: SystemUser) {
    const currentUser = getCurrentUser();

    if (user.email === currentUser.email) {
      alert("Anda tidak boleh menukar status akaun yang sedang digunakan.");
      return;
    }

    if (normalizeRole(user.role) === "Super Admin" && isActive(user.status)) {
      const activeSuperAdmins = users.filter(
        (item) =>
          normalizeRole(item.role) === "Super Admin" && isActive(item.status)
      ).length;

      if (activeSuperAdmins <= 1) {
        alert("Tidak boleh nyahaktif Super Admin aktif terakhir.");
        return;
      }
    }

    const nextStatus = isActive(user.status) ? "Tidak Aktif" : "Aktif";

    if (!confirm(`Tukar status ${user.full_name} kepada ${nextStatus}?`)) {
      return;
    }

    setUpdatingId(user.id);

    try {
      const { error } = await supabase
        .from("system_users")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      await addAuditLog(
        nextStatus === "Aktif" ? "ACTIVATE" : "DEACTIVATE",
        `${nextStatus === "Aktif" ? "Aktifkan" : "Nyahaktifkan"} pengguna: ${
          user.full_name || "-"
        }`,
        user.id,
        user,
        { status: nextStatus },
        user.district_environment_id || null
      );

      await fetchUsers();
    } catch (error: any) {
      alert(error?.message || "Gagal menukar status pengguna.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deactivateUser() {
    if (!deactivateTarget) return;

    const currentUser = getCurrentUser();

    if (deactivateTarget.email === currentUser.email) {
      alert("Anda tidak boleh nyahaktif akaun yang sedang digunakan.");
      return;
    }

    if (
      normalizeRole(deactivateTarget.role) === "Super Admin" &&
      isActive(deactivateTarget.status)
    ) {
      const activeSuperAdmins = users.filter(
        (item) =>
          normalizeRole(item.role) === "Super Admin" && isActive(item.status)
      ).length;

      if (activeSuperAdmins <= 1) {
        alert("Tidak boleh nyahaktif Super Admin aktif terakhir.");
        return;
      }
    }

    setUpdatingId(deactivateTarget.id);

    try {
      const { error } = await supabase
        .from("system_users")
        .update({
          status: "Tidak Aktif",
          updated_at: new Date().toISOString(),
        })
        .eq("id", deactivateTarget.id);

      if (error) throw error;

      await addAuditLog(
        "DEACTIVATE",
        `Nyahaktif pengguna sistem: ${deactivateTarget.full_name || "-"}`,
        deactivateTarget.id,
        deactivateTarget,
        { status: "Tidak Aktif" },
        deactivateTarget.district_environment_id || null
      );

      await fetchUsers();
      setShowDeactivateModal(false);
      setDeactivateTarget(null);
    } catch (error: any) {
      alert(error?.message || "Gagal nyahaktifkan pengguna.");
    } finally {
      setUpdatingId(null);
    }
  }

  const activeCount = users.filter((user) => isActive(user.status)).length;

  const inactiveCount = users.filter((user) => !isActive(user.status)).length;

  const superAdminCount = users.filter(
    (user) => normalizeRole(user.role) === "Super Admin"
  ).length;

  const districtUserCount = users.filter(
    (user) => normalizeRole(user.role) !== "Super Admin"
  ).length;

  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Pengguna Sistem</h2>
          <p className="text-muted mb-0">
            Urus semua pengguna sistem, role, daerah dan status akaun.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-success"
            onClick={loadPageData}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          <button className="btn btn-success" onClick={openAddModal}>
            <i className="bi bi-person-plus me-1"></i>
            Tambah Pengguna
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <SummaryCard
          title="Jumlah Pengguna"
          value={users.length}
          icon="bi-people"
          color="dark"
        />

        <SummaryCard
          title="Pengguna Aktif"
          value={activeCount}
          icon="bi-check-circle"
          color="success"
        />

        <SummaryCard
          title="Tidak Aktif"
          value={inactiveCount}
          icon="bi-x-circle"
          color="danger"
        />

        <SummaryCard
          title="Super Admin"
          value={superAdminCount}
          icon="bi-shield-lock"
          color="primary"
        />

        <SummaryCard
          title="Pengguna Daerah"
          value={districtUserCount}
          icon="bi-building"
          color="info"
        />
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3 align-items-center">
            <div className="col-lg-4">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  className="form-control ps-5 rounded-3"
                  placeholder="Cari nama, email, role, daerah atau kumpulan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-2">
              <select
                className="form-select rounded-3"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                {roles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="col-lg-3">
              <select
                className="form-select rounded-3"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
              >
                {districtFilterOptions.map((district) => (
                  <option key={district}>{district}</option>
                ))}
              </select>
            </div>

            <div className="col-lg-3">
              <select
                className="form-select rounded-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                <option>Aktif</option>
                <option>Tidak Aktif</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small text-muted">
              <tr>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Daerah</th>
                <th className="px-4 py-3">Kumpulan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">
                      Memuatkan pengguna sistem...
                    </p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada pengguna dijumpai.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const environment = districtEnvironments.find(
                    (item) => item.id === user.district_environment_id
                  );

                  return (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: 38, height: 38 }}
                          >
                            {getInitials(user.full_name)}
                          </div>

                          <div>
                            <div className="fw-semibold">
                              {user.full_name || "-"}
                            </div>
                            <small className="text-muted">
                              {user.email || "-"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`badge rounded-pill px-3 py-2 ${getRoleBadge(
                            user.role
                          )}`}
                        >
                          {normalizeRole(user.role)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {environment?.label || user.district || "-"}
                      </td>

                      <td className="px-4 py-3">
                        {user.group_name || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`badge rounded-pill px-3 py-2 ${getStatusBadge(
                            user.status
                          )}`}
                        >
                          {normalizeStatus(user.status)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-end">
                        <button
                          className="btn btn-sm btn-light border rounded-3 me-1"
                          onClick={() => openViewModal(user)}
                          title="View"
                        >
                          <i className="bi bi-eye"></i>
                        </button>

                        <button
                          className="btn btn-sm btn-light border rounded-3 me-1"
                          onClick={() => openEditModal(user)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil-square"></i>
                        </button>

                        <button
                          className="btn btn-sm btn-light border rounded-3 me-1"
                          onClick={() => toggleUserStatus(user)}
                          disabled={updatingId === user.id}
                          title="Tukar Status"
                        >
                          <i className="bi bi-power"></i>
                        </button>

                        <button
                          className="btn btn-sm btn-light border text-danger rounded-3"
                          onClick={() => openDeactivateModal(user)}
                          disabled={updatingId === user.id}
                          title="Nyahaktif"
                        >
                          <i className="bi bi-slash-circle"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredUsers.length} daripada {users.length} rekod
        </div>
      </div>

      {showViewModal && selectedUser && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Pengguna</h5>

                <button
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
                    {getInitials(selectedUser.full_name)}
                  </div>

                  <h5 className="fw-bold mb-0">
                    {selectedUser.full_name || "-"}
                  </h5>
                  <small className="text-muted">
                    {selectedUser.email || "-"}
                  </small>
                </div>

                <div className="list-group list-group-flush">
                  <InfoRow label="Role" value={normalizeRole(selectedUser.role)} />
                  <InfoRow label="Telefon" value={formatMalaysiaPhone(selectedUser.phone || "") || "-"} />
                  <InfoRow label="Daerah" value={selectedUser.district || "-"} />
                  <InfoRow label="Kumpulan" value={selectedUser.group_name || "-"} />
                  <InfoRow label="Status" value={normalizeStatus(selectedUser.status)} />
                  <InfoRow label="Tarikh Daftar" value={formatDate(selectedUser.created_at)} />
                  <InfoRow label="Kemaskini Terakhir" value={formatDate(selectedUser.updated_at)} />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingUser
                    ? "Edit Pengguna Sistem"
                    : "Tambah Pengguna Sistem"}
                </h5>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowUserModal(false);
                    resetForm();
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nama Penuh</label>
                    <input
                      className="form-control"
                      value={form.full_name}
                      onChange={(e) =>
                        setForm({ ...form, full_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      className="form-control"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Telefon</label>
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
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={form.role}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          role: e.target.value,
                          district_environment_id:
                            e.target.value === "Super Admin"
                              ? ""
                              : form.district_environment_id,
                          district:
                            e.target.value === "Super Admin" ? "" : form.district,
                          group_id:
                            e.target.value === "Pemimpin Kumpulan" ||
                            e.target.value === "Penolong Pemimpin"
                              ? form.group_id
                              : "",
                          group_name:
                            e.target.value === "Pemimpin Kumpulan" ||
                            e.target.value === "Penolong Pemimpin"
                              ? form.group_name
                              : "",
                        })
                      }
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  {form.role !== "Super Admin" && (
                    <div className="col-md-6">
                      <label className="form-label">Daerah / Environment</label>
                      <select
                        className="form-select"
                        value={form.district_environment_id}
                        onChange={(e) =>
                          handleEnvironmentChange(e.target.value)
                        }
                      >
                        <option value="">Pilih daerah</option>
                        {districtEnvironments.map((environment) => (
                          <option key={environment.id} value={environment.id}>
                            {environment.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(form.role === "Pemimpin Kumpulan" ||
                    form.role === "Penolong Pemimpin") && (
                    <div className="col-md-6">
                      <label className="form-label">Kumpulan</label>
                      <select
                        className="form-select"
                        value={form.group_id}
                        onChange={(e) => handleGroupChange(e.target.value)}
                      >
                        <option value="">Pilih kumpulan</option>
                        {filteredGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.group_name || group.school_name || "-"}
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
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Password {editingUser ? "(optional)" : ""}
                    </label>
                    <input
                      className="form-control"
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      placeholder={
                        editingUser
                          ? "Kosongkan jika tidak mahu tukar password"
                          : "Password sementara"
                      }
                    />
                    <small className="text-muted">
                      Untuk development sahaja. Production nanti guna reset
                      password.
                    </small>
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
                >
                  Tutup
                </button>

                <button
                  className="btn btn-success"
                  onClick={saveUser}
                  disabled={!!updatingId}
                >
                  {updatingId
                    ? "Menyimpan..."
                    : editingUser
                    ? "Kemaskini Pengguna"
                    : "Simpan Pengguna"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeactivateModal && deactivateTarget && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
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
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu nyahaktif pengguna ini?
                </p>

                <strong>{deactivateTarget.full_name}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Data pengguna tidak akan dipadam secara permanent. Status
                  sahaja akan ditukar kepada Tidak Aktif.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowDeactivateModal(false);
                    setDeactivateTarget(null);
                  }}
                >
                  Batal
                </button>

                <button
                  className="btn btn-danger"
                  onClick={deactivateUser}
                  disabled={updatingId === deactivateTarget.id}
                >
                  Nyahaktifkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="col-md-6 col-xl">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <p className="text-muted small mb-1">{title}</p>
              <h3 className={`fw-bold text-${color} mb-0`}>{value}</h3>
            </div>

            <div className={`rounded-3 bg-${color}-subtle text-${color} p-3`}>
              <i className={`bi ${icon} fs-4`}></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="list-group-item d-flex justify-content-between gap-3">
      <span className="text-muted">{label}</span>
      <strong className="text-end">{value || "-"}</strong>
    </div>
  );
}