import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type SystemUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  district: string | null;
  status: string;
  created_at: string;
  password?: string | null;
  phone?: string | null;
  email_verified_at?: string | null;
  last_login_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  group_id?: string | null;
  group_name?: string | null;
};

type ScoutGroup = {
  id: string;
  group_name: string;
  school_name?: string | null;
  status?: string | null;
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
};

const ROLE_OPTIONS = [
  "Penolong Pesuruhjaya Daerah",
  "Pemimpin Kumpulan",
  "Penolong Pemimpin",
];

const STATUS_OPTIONS = ["Aktif", "Tidak Aktif"];

function getCurrentUser() {
  return JSON.parse(
    localStorage.getItem("user") ||
      localStorage.getItem("auth_user") ||
      "{}"
  );
}

function getUserDistrict() {
  const currentUser = getCurrentUser();

  return (
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    "Petaling"
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

  if (!digits) return true;
  if (!digits.startsWith("0")) return false;

  return digits.length >= 9 && digits.length <= 11;
}

function roleRequiresGroup(role: string) {
  return role === "Pemimpin Kumpulan" || role === "Penolong Pemimpin";
}

function normalizeRole(role: string) {
  if (role === "Penolong Pesuruhjaya") return "Penolong Pesuruhjaya Daerah";
  if (role === "District") return "Pesuruhjaya Daerah";
  return role;
}

function normalizeStatus(status: string) {
  if (status === "Active") return "Aktif";
  if (status === "Inactive") return "Tidak Aktif";
  return status || "Aktif";
}

async function addAuditLog(action: string, description: string, recordId?: string) {
  const currentUser = getCurrentUser();

  await supabase.from("audit_logs").insert({
    actor_name: currentUser.full_name || currentUser.name || "Unknown User",
    actor_role: currentUser.role || "Unknown Role",
    action,
    module: "Pengurusan Pengguna",
    description,
    user_id: currentUser.id || null,
    district_environment_id: currentUser.district_environment_id || null,
    record_id: recordId || null,
  });
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Semua Role");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [groupFilter, setGroupFilter] = useState("Semua Kumpulan");

  const [showUserModal, setShowUserModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);

  const [form, setForm] = useState<UserForm>({
    full_name: "",
    email: "",
    phone: "",
    role: "Pemimpin Kumpulan",
    district: getUserDistrict(),
    group_id: "",
    group_name: "",
    status: "Aktif",
    password: "123456",
    notes: "",
  });

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, []);

  async function fetchUsers() {
    setLoading(true);

    const district = getUserDistrict();

    let query = supabase
      .from("system_users")
      .select("*")
      .is("deleted_at", null)
      .not("role", "in", '("Super Admin","Pesuruhjaya Daerah","District")')
      .order("created_at", { ascending: false });

    if (district) {
      query = query.eq("district", district);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const normalizedUsers = (data || []).map((user) => ({
      ...user,
      role: normalizeRole(user.role),
      status: normalizeStatus(user.status),
    }));

    setUsers(normalizedUsers);
    setLoading(false);
  }

  async function fetchGroups() {
    const { data, error } = await supabase
      .from("groups")
      .select("id, group_name, school_name, status")
      .in("status", ["Aktif", "active"])
      .order("group_name", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setGroups(data || []);
  }

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase();

    return users.filter((user) => {
      const matchSearch =
        (user.full_name || "").toLowerCase().includes(keyword) ||
        (user.email || "").toLowerCase().includes(keyword) ||
        (user.phone || "").toLowerCase().includes(keyword) ||
        (user.role || "").toLowerCase().includes(keyword) ||
        (user.group_name || "").toLowerCase().includes(keyword) ||
        (user.district || "").toLowerCase().includes(keyword);

      const matchRole =
        roleFilter === "Semua Role" || normalizeRole(user.role) === roleFilter;

      const matchStatus =
        statusFilter === "Semua Status" ||
        normalizeStatus(user.status) === statusFilter;

      const matchGroup =
        groupFilter === "Semua Kumpulan" || user.group_name === groupFilter;

      return matchSearch && matchRole && matchStatus && matchGroup;
    });
  }, [users, search, roleFilter, statusFilter, groupFilter]);

  function resetForm() {
    setEditingUser(null);

    setForm({
      full_name: "",
      email: "",
      phone: "",
      role: "Pemimpin Kumpulan",
      district: getUserDistrict(),
      group_id: "",
      group_name: "",
      status: "Aktif",
      password: "123456",
      notes: "",
    });
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
    setEditingUser(user);

    setForm({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: formatMalaysiaPhone(user.phone || ""),
      role: normalizeRole(user.role || "Pemimpin Kumpulan"),
      district: user.district || getUserDistrict(),
      group_id: user.group_id || "",
      group_name: user.group_name || "",
      status: normalizeStatus(user.status || "Aktif"),
      password: "",
      notes: "",
    });

    setShowUserModal(true);
  }

  function openDeleteModal(user: SystemUser) {
    setDeleteTarget(user);
    setShowDeleteModal(true);
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
      alert("Nombor telefon tidak sah. Contoh: 012-345 6789.");
      return false;
    }

    if (!form.role.trim()) {
      alert("Sila pilih role pengguna.");
      return false;
    }

    if (!form.district.trim()) {
      alert("Daerah tidak dapat dikesan.");
      return false;
    }

    if (roleRequiresGroup(form.role) && !form.group_id) {
      alert("Role Pemimpin Kumpulan / Penolong Pemimpin wajib pilih kumpulan.");
      return false;
    }

    if (!editingUser && !form.password.trim()) {
      alert("Sila isi password sementara.");
      return false;
    }

    if (form.role === "Super Admin" || form.role === "Pesuruhjaya Daerah") {
      alert("District tidak dibenarkan mengurus role ini.");
      return false;
    }

    return true;
  }

  async function saveUser() {
    if (!validateForm()) return;

    setSaving(true);

    const emailExists = await checkDuplicateEmail(form.email, editingUser?.id);

    if (emailExists) {
      alert("E-mel ini sudah digunakan.");
      setSaving(false);
      return;
    }

    const selectedGroup = groups.find((group) => group.id === form.group_id);

    const payload: any = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: normalizeMalaysiaPhone(form.phone) || null,
      role: form.role,
      district: form.district,
      group_id: roleRequiresGroup(form.role) ? form.group_id : null,
      group_name: roleRequiresGroup(form.role)
        ? selectedGroup?.group_name || form.group_name
        : null,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    if (!editingUser) {
      payload.password = form.password;
      payload.created_at = new Date().toISOString();
    }

    if (editingUser) {
      const { error } = await supabase
        .from("system_users")
        .update(payload)
        .eq("id", editingUser.id)
        .neq("role", "Super Admin")
        .neq("role", "Pesuruhjaya Daerah");

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
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "CREATE",
        `Tambah pengguna baharu: ${form.full_name}`,
        data?.id
      );
    }

    await fetchUsers();
    resetForm();
    setShowUserModal(false);
    setSaving(false);
  }

  async function deactivateUser() {
    if (!deleteTarget) return;

    const currentUser = getCurrentUser();

    if (deleteTarget.email === currentUser.email) {
      alert("Anda tidak boleh nyahaktif akaun yang sedang digunakan.");
      return;
    }

    if (
      deleteTarget.role === "Super Admin" ||
      deleteTarget.role === "Pesuruhjaya Daerah"
    ) {
      alert("Akaun ini tidak boleh dinyahaktif oleh District.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("system_users")
      .update({
        status: "Tidak Aktif",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deleteTarget.id)
      .neq("role", "Super Admin")
      .neq("role", "Pesuruhjaya Daerah");

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "DEACTIVATE",
      `Nyahaktif pengguna: ${deleteTarget.full_name}`,
      deleteTarget.id
    );

    await fetchUsers();
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setSaving(false);
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Pengurusan Pengguna</h2>
          <p className="text-muted mb-0">
            Urus akaun pengguna dalam daerah anda.
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
              <h4 className="fw-bold mb-0">{users.length}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Aktif</small>
              <h4 className="fw-bold text-success mb-0">
                {users.filter((user) => normalizeStatus(user.status) === "Aktif").length}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Pemimpin Kumpulan</small>
              <h4 className="fw-bold mb-0">
                {users.filter((user) => normalizeRole(user.role) === "Pemimpin Kumpulan").length}
              </h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Penolong Pemimpin</small>
              <h4 className="fw-bold mb-0">
                {users.filter((user) => normalizeRole(user.role) === "Penolong Pemimpin").length}
              </h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Cari pengguna..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
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

            <div className="col-md-3">
              <select
                className="form-select"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option>Semua Kumpulan</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.group_name}>
                    {group.group_name}
                  </option>
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
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Kumpulan</th>
                <th className="px-4 py-3">Daerah</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">Memuatkan pengguna...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <i className="bi bi-people fs-1 d-block mb-2"></i>
                    Tiada pengguna dijumpai.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                          style={{ width: 38, height: 38 }}
                        >
                          {getInitials(user.full_name || "-")}
                        </div>

                        <div>
                          <div className="fw-semibold">{user.full_name}</div>
                          <small className="text-muted">{user.email}</small>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {formatMalaysiaPhone(user.phone || "") || "-"}
                    </td>

                    <td className="px-4 py-3">{normalizeRole(user.role)}</td>

                    <td className="px-4 py-3">
                      {user.group_name || (
                        <span className="text-muted">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3">{user.district || "-"}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          normalizeStatus(user.status) === "Aktif"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {normalizeStatus(user.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => openViewModal(user)}
                        title="Lihat"
                      >
                        <i className="bi bi-eye"></i>
                      </button>

                      <button
                        className="btn btn-sm btn-outline-secondary me-1"
                        onClick={() => openEditModal(user)}
                        title="Edit"
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => openDeleteModal(user)}
                        title="Nyahaktif"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUserModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    {editingUser ? "Edit Pengguna" : "Tambah Pengguna"}
                  </h5>
                  <small className="text-muted">
                    Lengkapkan maklumat pengguna daerah.
                  </small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowUserModal(false);
                    resetForm();
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-4">
                  <div className="col-lg-8">
                    <div className="card border rounded-4">
                      <div className="card-body">
                        <h6 className="fw-bold mb-3">Maklumat Akaun</h6>

                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label">Nama Penuh</label>
                            <input
                              className="form-control"
                              value={form.full_name}
                              onChange={(e) =>
                                setForm({ ...form, full_name: e.target.value })
                              }
                              placeholder="Contoh: Ahmad bin Salleh"
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">E-mel</label>
                            <input
                              type="email"
                              className="form-control"
                              value={form.email}
                              onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
                              }
                              placeholder="user@example.com"
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
                            <label className="form-label">Daerah</label>
                            <input
                              className="form-control"
                              value={form.district}
                              disabled
                            />
                            <small className="text-muted">
                              Daerah auto ikut akaun Pesuruhjaya yang login.
                            </small>
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Role</label>
                            <select
                              className="form-select"
                              value={form.role}
                              onChange={(e) => {
                                const newRole = e.target.value;

                                setForm({
                                  ...form,
                                  role: newRole,
                                  group_id: roleRequiresGroup(newRole)
                                    ? form.group_id
                                    : "",
                                  group_name: roleRequiresGroup(newRole)
                                    ? form.group_name
                                    : "",
                                });
                              }}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role}>{role}</option>
                              ))}
                            </select>
                          </div>

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

                          {roleRequiresGroup(form.role) && (
                            <div className="col-md-12">
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
                              >
                                <option value="">Pilih Kumpulan / Sekolah</option>

                                {groups.map((group) => (
                                  <option key={group.id} value={group.id}>
                                    {group.group_name}
                                    {group.school_name
                                      ? ` — ${group.school_name}`
                                      : ""}
                                  </option>
                                ))}
                              </select>

                              <small className="text-muted">
                                Wajib untuk Pemimpin Kumpulan dan Penolong
                                Pemimpin.
                              </small>
                            </div>
                          )}

                          {!editingUser && (
                            <div className="col-md-6">
                              <label className="form-label">
                                Password Sementara
                              </label>
                              <input
                                className="form-control"
                                value={form.password}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    password: e.target.value,
                                  })
                                }
                              />
                              <small className="text-muted">
                                Prototype sahaja. Production nanti guna invitation
                                email / hashing.
                              </small>
                            </div>
                          )}

                          <div className="col-md-12">
                            <label className="form-label">Catatan</label>
                            <textarea
                              className="form-control"
                              rows={3}
                              value={form.notes}
                              onChange={(e) =>
                                setForm({ ...form, notes: e.target.value })
                              }
                              placeholder="Catatan dalaman jika perlu..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-4">
                    <div className="card border rounded-4 mb-3">
                      <div className="card-body text-center">
                        <div
                          className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                          style={{ width: 80, height: 80, fontSize: 24 }}
                        >
                          {getInitials(form.full_name || "User")}
                        </div>

                        <h6 className="fw-bold mb-1">
                          {form.full_name || "Nama Pengguna"}
                        </h6>

                        <small className="text-muted d-block">
                          {form.email || "email@example.com"}
                        </small>

                        <span className="badge bg-success mt-3">
                          {form.status}
                        </span>
                      </div>
                    </div>

                    <div className="card border rounded-4">
                      <div className="card-body">
                        <h6 className="fw-bold mb-3">Ringkasan Role</h6>

                        <div className="mb-3">
                          <small className="text-muted d-block">Role</small>
                          <strong>{form.role}</strong>
                        </div>

                        <div className="mb-3">
                          <small className="text-muted d-block">Daerah</small>
                          <strong>{form.district || "-"}</strong>
                        </div>

                        <div className="mb-3">
                          <small className="text-muted d-block">
                            Kumpulan / Sekolah
                          </small>
                          <strong>{form.group_name || "-"}</strong>
                        </div>

                        <div className="alert alert-info small mb-0">
                          {roleRequiresGroup(form.role)
                            ? "Role ini akan dikaitkan dengan kumpulan/sekolah yang dipilih."
                            : "Role ini berada di peringkat daerah dan tidak wajib pilih kumpulan."}
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
                    style={{ width: 72, height: 72, fontSize: 24 }}
                  >
                    {getInitials(selectedUser.full_name || "-")}
                  </div>

                  <h5 className="fw-bold mb-0">{selectedUser.full_name}</h5>
                  <small className="text-muted">{selectedUser.email}</small>
                </div>

                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Telefon</span>
                    <strong>
                      {formatMalaysiaPhone(selectedUser.phone || "") || "-"}
                    </strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Role</span>
                    <strong>{normalizeRole(selectedUser.role)}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Daerah</span>
                    <strong>{selectedUser.district || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kumpulan</span>
                    <strong>{selectedUser.group_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    <strong>{normalizeStatus(selectedUser.status)}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Dicipta</span>
                    <strong>
                      {selectedUser.created_at
                        ? new Date(selectedUser.created_at).toLocaleDateString(
                            "ms-MY"
                          )
                        : "-"}
                    </strong>
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

      {showDeleteModal && deleteTarget && (
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
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu nyahaktif pengguna ini?
                </p>

                <strong>{deleteTarget.full_name}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Akaun tidak dipadam kekal. Status hanya ditukar kepada Tidak
                  Aktif.
                </p>
              </div>

              <div className="modal-footer">
                <button
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