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
  password?: string;
  created_at?: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function SystemUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Semua Role");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "Pesuruhjaya Daerah",
    district: "",
    status: "Aktif",
    password: "123456",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }

  async function addAuditLog(
    action: string,
    module: string,
    description: string
  ) {
    const user = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name: user.full_name || "Super Admin",
      actor_role: user.role || "Super Admin",
      action,
      module,
      description,
    });
  }

  async function fetchUsers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("system_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  }

  const roles = useMemo(() => {
    const unique = Array.from(
      new Set(users.map((user) => user.role).filter(Boolean))
    );

    return ["Semua Role", ...unique];
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        (user.full_name || "").toLowerCase().includes(keyword) ||
        (user.email || "").toLowerCase().includes(keyword) ||
        (user.role || "").toLowerCase().includes(keyword) ||
        (user.district || "").toLowerCase().includes(keyword);

      const matchRole =
        roleFilter === "Semua Role" || user.role === roleFilter;

      const matchStatus =
        statusFilter === "Semua Status" || user.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  function resetForm() {
    setEditingUser(null);
    setForm({
      full_name: "",
      email: "",
      role: "Pesuruhjaya Daerah",
      district: "",
      status: "Aktif",
      password: "123456",
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
      role: user.role || "Pesuruhjaya Daerah",
      district: user.district || "",
      status: user.status || "Aktif",
      password: user.password || "123456",
    });
    setShowUserModal(true);
  }

  function openDeleteModal(user: SystemUser) {
    const currentUser = getCurrentUser();

    if (user.email === currentUser.email) {
      alert("Anda tidak boleh padam akaun yang sedang digunakan.");
      return;
    }

    setDeleteTarget(user);
    setShowDeleteModal(true);
  }

  async function saveUser() {
    if (!form.full_name.trim() || !form.email.trim()) {
      alert("Sila isi nama dan email pengguna.");
      return;
    }

    setUpdatingId(editingUser?.id || "new");

    const payload = {
      full_name: form.full_name,
      email: form.email,
      role: form.role,
      district: form.role === "Super Admin" ? null : form.district,
      status: form.status,
      password: form.password || "123456",
    };

    if (editingUser) {
      const { error } = await supabase
        .from("system_users")
        .update(payload)
        .eq("id", editingUser.id);

      if (error) {
        alert(error.message);
        setUpdatingId(null);
        return;
      }

      await addAuditLog(
        "UPDATE",
        "Pengguna Sistem",
        `Kemaskini pengguna sistem: ${form.full_name}`
      );
    } else {
      const { error } = await supabase.from("system_users").insert(payload);

      if (error) {
        alert(error.message);
        setUpdatingId(null);
        return;
      }

      await addAuditLog(
        "CREATE",
        "Pengguna Sistem",
        `Tambah pengguna sistem baharu: ${form.full_name}`
      );
    }

    await fetchUsers();
    resetForm();
    setShowUserModal(false);
    setUpdatingId(null);
  }

  async function toggleUserStatus(user: SystemUser) {
    const nextStatus = user.status === "Aktif" ? "Tidak Aktif" : "Aktif";

    if (!confirm(`Tukar status ${user.full_name} kepada ${nextStatus}?`)) return;

    setUpdatingId(user.id);

    const { error } = await supabase
      .from("system_users")
      .update({ status: nextStatus })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      setUpdatingId(null);
      return;
    }

    await addAuditLog(
      nextStatus === "Aktif" ? "ACTIVATE" : "DEACTIVATE",
      "Pengguna Sistem",
      `${nextStatus === "Aktif" ? "Aktifkan" : "Nyahaktifkan"} pengguna: ${
        user.full_name
      }`
    );

    await fetchUsers();
    setUpdatingId(null);
  }

async function deleteUser() {
  if (!deleteTarget) return;

  const currentUser = getCurrentUser();

  if (deleteTarget.email === currentUser.email) {
    alert("Anda tidak boleh padam akaun yang sedang digunakan.");
    return;
  }

  if (deleteTarget.role === "Super Admin") {
    const superAdminCount = users.filter(
      (user) => user.role === "Super Admin"
    ).length;

    if (superAdminCount <= 1) {
      alert("Tidak boleh padam Super Admin terakhir.");
      return;
    }
  }

  setUpdatingId(deleteTarget.id);

  const { error } = await supabase
    .from("system_users")
    .delete()
    .eq("id", deleteTarget.id);

  if (error) {
    alert(error.message);
    setUpdatingId(null);
    return;
  }

  await addAuditLog(
    "DELETE",
    "Pengguna Sistem",
    `Padam pengguna sistem: ${deleteTarget.full_name}`
  );

  await fetchUsers();
  setShowDeleteModal(false);
  setDeleteTarget(null);
  setUpdatingId(null);
}

  const activeCount = users.filter((user) => user.status === "Aktif").length;
  const inactiveCount = users.filter(
    (user) => user.status === "Tidak Aktif"
  ).length;

  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Pengguna Sistem</h2>
          <p className="text-muted mb-0">
            Urus semua pengguna sistem mengikut role.
          </p>
        </div>

        <button className="btn btn-success" onClick={openAddModal}>
          <i className="bi bi-person-plus me-1"></i>
          Tambah Pengguna
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Jumlah Pengguna</p>
              <h3 className="fw-bold mb-0">{users.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Pengguna Aktif</p>
              <h3 className="fw-bold text-success mb-0">{activeCount}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Tidak Aktif</p>
              <h3 className="fw-bold text-danger mb-0">{inactiveCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3 align-items-center">
            <div className="col-lg-6">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  className="form-control ps-5 rounded-3"
                  placeholder="Cari nama, email, role atau daerah..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-3">
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
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Daerah</th>
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
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                          style={{ width: 38, height: 38 }}
                        >
                          {getInitials(user.full_name || "-")}
                        </div>
                        <div>
                          <div className="fw-semibold">{user.full_name}</div>
                          <small className="text-muted">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString()
                              : "-"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">{user.email}</td>

                    <td className="px-4 py-3">
                      <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                        {user.role}
                      </span>
                    </td>

                    <td className="px-4 py-3">{user.district || "-"}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`badge rounded-pill px-3 py-2 ${
                          user.status === "Aktif"
                            ? "bg-success-subtle text-success border border-success-subtle"
                            : "bg-danger-subtle text-danger border border-danger-subtle"
                        }`}
                      >
                        {user.status}
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
                        onClick={() => openDeleteModal(user)}
                        disabled={updatingId === user.id}
                        title="Padam"
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
                    {getInitials(selectedUser.full_name || "-")}
                  </div>
                  <h5 className="fw-bold mb-0">{selectedUser.full_name}</h5>
                  <small className="text-muted">{selectedUser.email}</small>
                </div>

                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Role</span>
                    <strong>{selectedUser.role}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Daerah</span>
                    <strong>{selectedUser.district || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    <strong>{selectedUser.status}</strong>
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
                  {editingUser ? "Edit Pengguna Sistem" : "Tambah Pengguna Sistem"}
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
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value })
                      }
                    >
                      <option>Super Admin</option>
                      <option>Pesuruhjaya Daerah</option>
                      <option>Penolong Pesuruhjaya</option>
                      <option>Pemimpin Kumpulan</option>
                      <option>Penolong Pemimpin</option>
                    </select>
                  </div>

                  {form.role !== "Super Admin" && (
                    <div className="col-md-6">
                      <label className="form-label">Daerah</label>
                      <input
                        className="form-control"
                        value={form.district}
                        onChange={(e) =>
                          setForm({ ...form, district: e.target.value })
                        }
                      />
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
                      <option>Aktif</option>
                      <option>Tidak Aktif</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Password</label>
                    <input
                      className="form-control"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                    />
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
                  {editingUser ? "Kemaskini Pengguna" : "Simpan Pengguna"}
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
                <h5 className="modal-title fw-bold text-danger">Padam Pengguna</h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">Adakah anda pasti mahu padam pengguna ini?</p>
                <strong>{deleteTarget.full_name}</strong>
                <p className="text-muted small mt-2 mb-0">
                  Tindakan ini tidak boleh dibatalkan.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                >
                  Batal
                </button>

                <button className="btn btn-danger" onClick={deleteUser}>
                  Padam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}