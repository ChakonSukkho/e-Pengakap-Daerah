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
  group_id: string | null;
  group_name: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type GroupRow = {
  id: string;
  group_name: string;
  school_name: string | null;
  status: string | null;
  district: string | null;
  district_environment_id: string | null;
  leader_user_id: string | null;
  leader_name: string | null;
  deleted_at: string | null;
};

type UserForm = {
  full_name: string;
  email: string;
  phone: string;
  role: "Pemimpin Kumpulan" | "Penolong Pemimpin";
  group_id: string;
  group_name: string;
  status: string;
};

const ALLOWED_ROLES = ["Pemimpin Kumpulan", "Penolong Pemimpin"];

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

function normalizeStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "aktif" || value === "active") return "Aktif";
  if (value === "tidak aktif" || value === "inactive") return "Tidak Aktif";
  if (value === "suspended" || value === "digantung") return "Tidak Aktif";

  return status || "Aktif";
}

function isActive(status?: string | null) {
  return normalizeStatus(status) === "Aktif";
}

function formatDate(date?: string | null) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

function formatPhoneInput(value: string) {
  const cleaned = value.replace(/[^\d]/g, "").slice(0, 11);

  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;

  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
}

export default function ACUserManagementPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);

  const districtEnvironmentId = currentUser.district_environment_id || null;

  const district =
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    null;

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SystemUser | null>(
    null
  );
  const [resetTarget, setResetTarget] = useState<SystemUser | null>(null);

  const [form, setForm] = useState<UserForm>({
    full_name: "",
    email: "",
    phone: "",
    role: "Pemimpin Kumpulan",
    group_id: "",
    group_name: "",
    status: "Aktif",
  });

  useEffect(() => {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Pesuruhjaya Daerah."
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

  async function insertAuditLog(params: {
    action: string;
    description: string;
    record_id?: string | null;
    old_value?: any;
    new_value?: any;
  }) {
    const { error } = await supabase.from("audit_logs").insert({
      user_id: currentUser.id || null,
      actor_name:
        currentUser.full_name ||
        currentUser.name ||
        currentUser.email ||
        "Unknown",
      actor_role: currentUser.role || "Penolong Pesuruhjaya Daerah",
      action: params.action,
      module: "Pengguna",
      description: params.description,
      district_environment_id: districtEnvironmentId,
      record_id: params.record_id || null,
      old_value: params.old_value || null,
      new_value: params.new_value || null,
      ip_address: null,
      user_agent: navigator.userAgent,
    });

    if (error) {
      console.warn("Audit log error:", error.message);
    }
  }

  async function fetchUsers() {
    setLoading(true);

    let query = supabase
      .from("system_users")
      .select(
        `
        id,
        full_name,
        email,
        phone,
        role,
        district,
        district_environment_id,
        group_id,
        group_name,
        status,
        created_at,
        updated_at,
        deleted_at
      `
      )
      .in("role", ALLOWED_ROLES)
      .is("deleted_at", null)
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
        `
        id,
        group_name,
        school_name,
        status,
        district,
        district_environment_id,
        leader_user_id,
        leader_name,
        deleted_at
      `
      )
      .is("deleted_at", null)
      .in("status", ["Aktif", "active"])
      .order("group_name", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setGroups([]);
      return;
    }

    setGroups((data || []) as GroupRow[]);
  }

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchSearch =
        !keyword ||
        (user.full_name || "").toLowerCase().includes(keyword) ||
        (user.email || "").toLowerCase().includes(keyword) ||
        (user.phone || "").toLowerCase().includes(keyword) ||
        (user.group_name || "").toLowerCase().includes(keyword);

      const matchRole = !roleFilter || user.role === roleFilter;

      const matchStatus =
        !statusFilter || normalizeStatus(user.status) === statusFilter;

      const matchGroup =
        !groupFilter ||
        user.group_id === groupFilter ||
        user.group_name === groups.find((group) => group.id === groupFilter)?.group_name;

      return matchSearch && matchRole && matchStatus && matchGroup;
    });
  }, [users, groups, search, roleFilter, statusFilter, groupFilter]);

  function resetForm() {
    setEditingUser(null);

    setForm({
      full_name: "",
      email: "",
      phone: "",
      role: "Pemimpin Kumpulan",
      group_id: "",
      group_name: "",
      status: "Aktif",
    });
  }

  function openAddModal() {
    resetForm();
    setShowUserModal(true);
  }

  function openEditModal(user: SystemUser) {
    setEditingUser(user);

    setForm({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      role:
        user.role === "Penolong Pemimpin"
          ? "Penolong Pemimpin"
          : "Pemimpin Kumpulan",
      group_id: user.group_id || "",
      group_name: user.group_name || "",
      status: normalizeStatus(user.status),
    });

    setShowUserModal(true);
  }

  function closeUserModal() {
    setShowUserModal(false);
    resetForm();
  }

  function handleGroupChange(groupId: string) {
    const selectedGroup = groups.find((group) => group.id === groupId);

    setForm((prev) => ({
      ...prev,
      group_id: groupId,
      group_name: selectedGroup?.group_name || "",
    }));
  }

  function validateForm() {
    if (!form.full_name.trim()) {
      alert("Sila isi nama penuh.");
      return false;
    }

    if (!form.email.trim()) {
      alert("Sila isi email.");
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      alert("Format email tidak sah.");
      return false;
    }

    if (!form.role || !ALLOWED_ROLES.includes(form.role)) {
      alert("Role tidak dibenarkan.");
      return false;
    }

    if (!form.group_id || !form.group_name) {
      alert("Sila pilih kumpulan untuk pengguna ini.");
      return false;
    }

    if (!districtEnvironmentId && !district) {
      alert("District environment tidak dijumpai.");
      return false;
    }

    return true;
  }

  async function checkDuplicateEmail(email: string, ignoreUserId?: string) {
    const clean = cleanEmail(email);

    let query = supabase
      .from("system_users")
      .select("id, full_name, status, deleted_at")
      .eq("email", clean)
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

  async function updateGroupLeaderIfNeeded(userId: string, fullName: string) {
    if (form.role !== "Pemimpin Kumpulan") return;

    const payload = {
      leader_user_id: userId,
      leader_name: fullName,
      updated_at: new Date().toISOString(),
    };

    let query = supabase
      .from("groups")
      .update(payload)
      .eq("id", form.group_id)
      .is("deleted_at", null);

    query = applyDistrictScope(query);

    const { error } = await query;

    if (error) {
      console.warn("Update group leader error:", error.message);
    }
  }

  async function clearGroupLeaderIfNeeded(user: SystemUser) {
    if (user.role !== "Pemimpin Kumpulan") return;
    if (!user.group_id) return;

    const payload = {
      leader_user_id: null,
      leader_name: null,
      updated_at: new Date().toISOString(),
    };

    let query = supabase
      .from("groups")
      .update(payload)
      .eq("id", user.group_id)
      .eq("leader_user_id", user.id)
      .is("deleted_at", null);

    query = applyDistrictScope(query);

    const { error } = await query;

    if (error) {
      console.warn("Clear group leader error:", error.message);
    }
  }

  async function saveUser() {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const duplicate = await checkDuplicateEmail(form.email, editingUser?.id);

      if (duplicate) {
        alert(
          "Email ini sudah digunakan oleh pengguna lain. Kalau pengguna sudah dinyahaktifkan, edit pengguna lama atau aktifkan semula."
        );
        setSaving(false);
        return;
      }

      const payload = {
        full_name: form.full_name.trim(),
        email: cleanEmail(form.email),
        phone: form.phone.trim() || null,
        role: form.role,
        district: district || null,
        district_environment_id: districtEnvironmentId,
        group_id: form.group_id,
        group_name: form.group_name,
        status: form.status,
        updated_at: new Date().toISOString(),
      };

      if (editingUser) {
        let query = supabase
          .from("system_users")
          .update(payload)
          .eq("id", editingUser.id)
          .is("deleted_at", null);

        query = applyDistrictScope(query);

        const { error } = await query;

        if (error) throw error;

        if (
          editingUser.role === "Pemimpin Kumpulan" &&
          (payload.role !== "Pemimpin Kumpulan" ||
            editingUser.group_id !== payload.group_id)
        ) {
          await clearGroupLeaderIfNeeded(editingUser);
        }

        await updateGroupLeaderIfNeeded(editingUser.id, payload.full_name);

        await insertAuditLog({
          action: "UPDATE",
          description: `Kemaskini pengguna ${payload.full_name}.`,
          record_id: editingUser.id,
          old_value: editingUser,
          new_value: payload,
        });

        alert("Pengguna berjaya dikemaskini.");
      } else {
        const insertPayload = {
          ...payload,
          password: "123456",
          created_at: new Date().toISOString(),
          deleted_at: null,
        };

        const { data, error } = await supabase
          .from("system_users")
          .insert(insertPayload)
          .select("id")
          .single();

        if (error) throw error;

        await updateGroupLeaderIfNeeded(data.id, payload.full_name);

        await insertAuditLog({
          action: "CREATE",
          description: `Tambah pengguna ${payload.full_name} sebagai ${payload.role}.`,
          record_id: data.id,
          old_value: null,
          new_value: {
            ...insertPayload,
            password: "DEFAULT_PASSWORD",
          },
        });

        alert(
          `Pengguna berjaya ditambah.\n\nDefault password: 123456\nSila minta pengguna tukar password selepas login.`
        );
      }

      closeUserModal();
      await fetchUsers();
      await fetchGroups();
    } catch (error: any) {
      console.error("Save user error:", error);
      alert(error?.message || "Gagal simpan pengguna.");
    } finally {
      setSaving(false);
    }
  }

  function openDeactivateModal(user: SystemUser) {
    setDeactivateTarget(user);
    setShowDeactivateModal(true);
  }

  function closeDeactivateModal() {
    setDeactivateTarget(null);
    setShowDeactivateModal(false);
  }

  async function deactivateUser() {
    if (!deactivateTarget) return;

    setSaving(true);

    try {
      const payload = {
        status: "Tidak Aktif",
        updated_at: new Date().toISOString(),
      };

      let query = supabase
        .from("system_users")
        .update(payload)
        .eq("id", deactivateTarget.id)
        .is("deleted_at", null);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) throw error;

      await clearGroupLeaderIfNeeded(deactivateTarget);

      await insertAuditLog({
        action: "DEACTIVATE",
        description: `Nyahaktif pengguna ${deactivateTarget.full_name}.`,
        record_id: deactivateTarget.id,
        old_value: deactivateTarget,
        new_value: payload,
      });

      alert("Pengguna berjaya dinyahaktifkan.");
      closeDeactivateModal();
      await fetchUsers();
      await fetchGroups();
    } catch (error: any) {
      alert(error?.message || "Gagal nyahaktif pengguna.");
    } finally {
      setSaving(false);
    }
  }

  async function activateUser(user: SystemUser) {
    setSaving(true);

    try {
      const payload = {
        status: "Aktif",
        deleted_at: null,
        updated_at: new Date().toISOString(),
      };

      let query = supabase
        .from("system_users")
        .update(payload)
        .eq("id", user.id);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) throw error;

      if (user.role === "Pemimpin Kumpulan") {
        await updateGroupLeaderIfNeededFromUser(user);
      }

      await insertAuditLog({
        action: "ACTIVATE",
        description: `Aktifkan semula pengguna ${user.full_name}.`,
        record_id: user.id,
        old_value: user,
        new_value: payload,
      });

      alert("Pengguna berjaya diaktifkan semula.");
      await fetchUsers();
      await fetchGroups();
    } catch (error: any) {
      alert(error?.message || "Gagal aktifkan pengguna.");
    } finally {
      setSaving(false);
    }
  }

  async function updateGroupLeaderIfNeededFromUser(user: SystemUser) {
    if (user.role !== "Pemimpin Kumpulan") return;
    if (!user.group_id) return;

    const payload = {
      leader_user_id: user.id,
      leader_name: user.full_name || null,
      updated_at: new Date().toISOString(),
    };

    let query = supabase
      .from("groups")
      .update(payload)
      .eq("id", user.group_id)
      .is("deleted_at", null);

    query = applyDistrictScope(query);

    const { error } = await query;

    if (error) {
      console.warn("Update group leader from user error:", error.message);
    }
  }

  function openResetModal(user: SystemUser) {
    setResetTarget(user);
    setShowResetModal(true);
  }

  function closeResetModal() {
    setResetTarget(null);
    setShowResetModal(false);
  }

  async function resetPassword() {
    if (!resetTarget) return;

    setSaving(true);

    try {
      const payload = {
        password: "123456",
        updated_at: new Date().toISOString(),
      };

      let query = supabase
        .from("system_users")
        .update(payload)
        .eq("id", resetTarget.id)
        .is("deleted_at", null);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) throw error;

      await insertAuditLog({
        action: "RESET_PASSWORD",
        description: `Reset password pengguna ${resetTarget.full_name}.`,
        record_id: resetTarget.id,
        old_value: null,
        new_value: {
          password: "DEFAULT_PASSWORD",
        },
      });

      alert("Password berjaya reset kepada 123456.");
      closeResetModal();
    } catch (error: any) {
      alert(error?.message || "Gagal reset password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="assistantCommissioner">
      <style>
        {`
          .user-stat-card {
            border: 0;
            border-radius: 1rem;
            box-shadow: 0 0.25rem 1rem rgba(15, 23, 42, 0.06);
          }

          .table td,
          .table th {
            vertical-align: middle;
          }
        `}
      </style>

      <div className="mb-4">
        <h2 className="fw-bold mb-1">Pengurusan Pengguna</h2>
        <p className="text-muted mb-0">
          Urus Pemimpin Kumpulan dan Penolong Pemimpin dalam daerah sendiri.
        </p>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card user-stat-card">
            <div className="card-body">
              <div className="text-muted small">Jumlah Pengguna</div>
              <div className="h3 fw-bold mb-0">{users.length}</div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card user-stat-card">
            <div className="card-body">
              <div className="text-muted small">Pemimpin Kumpulan</div>
              <div className="h3 fw-bold text-success mb-0">
                {
                  users.filter(
                    (user) =>
                      user.role === "Pemimpin Kumpulan" &&
                      isActive(user.status)
                  ).length
                }
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card user-stat-card">
            <div className="card-body">
              <div className="text-muted small">Penolong Pemimpin</div>
              <div className="h3 fw-bold mb-0">
                {
                  users.filter(
                    (user) =>
                      user.role === "Penolong Pemimpin" &&
                      isActive(user.status)
                  ).length
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body border-bottom">
          <div className="row g-3 align-items-center">
            <div className="col-lg-4">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  className="form-control"
                  placeholder="Cari nama, email, telefon atau kumpulan..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-2">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="">Semua Role</option>
                <option value="Pemimpin Kumpulan">Pemimpin Kumpulan</option>
                <option value="Penolong Pemimpin">Penolong Pemimpin</option>
              </select>
            </div>

            <div className="col-lg-2">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Tidak Aktif">Tidak Aktif</option>
              </select>
            </div>

            <div className="col-lg-2">
              <select
                className="form-select"
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
              >
                <option value="">Semua Kumpulan</option>

                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.group_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-lg-2">
              <button
                type="button"
                className="btn btn-success w-100"
                onClick={openAddModal}
              >
                <i className="bi bi-person-plus me-1"></i>
                Tambah
              </button>
            </div>
          </div>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success"></div>
              <p className="text-muted mt-3 mb-0">
                Memuatkan senarai pengguna...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-people fs-1 d-block mb-2"></i>
              Tiada pengguna dijumpai.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Telefon</th>
                    <th>Role</th>
                    <th>Kumpulan</th>
                    <th>Status</th>
                    <th>Dicipta</th>
                    <th className="text-end">Tindakan</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="fw-semibold">{user.full_name || "-"}</td>
                      <td>{user.email || "-"}</td>
                      <td>{user.phone || "-"}</td>
                      <td>{user.role || "-"}</td>
                      <td>{user.group_name || "-"}</td>
                      <td>
                        <span
                          className={`badge ${
                            isActive(user.status)
                              ? "bg-success-subtle text-success"
                              : "bg-secondary-subtle text-secondary"
                          }`}
                        >
                          {normalizeStatus(user.status)}
                        </span>
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <div className="d-flex justify-content-end gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => openEditModal(user)}
                            title="Edit"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => openResetModal(user)}
                            title="Reset Password"
                          >
                            <i className="bi bi-key"></i>
                          </button>

                          {isActive(user.status) ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => openDeactivateModal(user)}
                              title="Nyahaktif"
                            >
                              <i className="bi bi-x-circle"></i>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => activateUser(user)}
                              title="Aktifkan semula"
                              disabled={saving}
                            >
                              <i className="bi bi-check-circle"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showUserModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    {editingUser ? "Edit Pengguna" : "Tambah Pengguna"}
                  </h5>
                  <div className="text-muted small">
                    Hanya Pemimpin Kumpulan dan Penolong Pemimpin dibenarkan.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  onClick={closeUserModal}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nama Penuh</label>
                    <input
                      className="form-control"
                      value={form.full_name}
                      onChange={(event) =>
                        setForm({ ...form, full_name: event.target.value })
                      }
                      placeholder="Nama penuh pengguna"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                      }
                      placeholder="nama@email.com"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Telefon</label>
                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phone: formatPhoneInput(event.target.value),
                        })
                      }
                      placeholder="012-3456-789"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={form.role}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          role: event.target.value as UserForm["role"],
                        })
                      }
                      disabled={saving}
                    >
                      <option value="Pemimpin Kumpulan">
                        Pemimpin Kumpulan
                      </option>
                      <option value="Penolong Pemimpin">
                        Penolong Pemimpin
                      </option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kumpulan</label>
                    <select
                      className="form-select"
                      value={form.group_id}
                      onChange={(event) => handleGroupChange(event.target.value)}
                      disabled={saving}
                    >
                      <option value="">Pilih Kumpulan</option>

                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.group_name}
                          {group.school_name ? ` - ${group.school_name}` : ""}
                        </option>
                      ))}
                    </select>

                    {groups.length === 0 && (
                      <small className="text-muted">
                        Tiada kumpulan aktif dalam daerah ini.
                      </small>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value })
                      }
                      disabled={saving}
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Tidak Aktif">Tidak Aktif</option>
                    </select>
                  </div>

                  {!editingUser && (
                    <div className="col-12">
                      <div className="alert alert-info mb-0">
                        <div className="fw-semibold">
                          Default password pengguna baharu:
                        </div>
                        <code>123456</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeUserModal}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={saveUser}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingUser
                    ? "Simpan Perubahan"
                    : "Tambah Pengguna"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeactivateModal && deactivateTarget && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  Nyahaktif Pengguna
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={closeDeactivateModal}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu nyahaktifkan pengguna ini?
                </p>

                <strong>{deactivateTarget.full_name}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Pengguna masih kekal dalam senarai, tetapi status akan menjadi
                  Tidak Aktif.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeDeactivateModal}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deactivateUser}
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Ya, Nyahaktif"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetModal && resetTarget && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Reset Password</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={closeResetModal}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">Reset password untuk pengguna ini?</p>

                <strong>{resetTarget.full_name}</strong>

                <div className="alert alert-warning mt-3 mb-0">
                  Password akan ditetapkan kepada:
                  <br />
                  <code>123456</code>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeResetModal}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={resetPassword}
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Reset Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}