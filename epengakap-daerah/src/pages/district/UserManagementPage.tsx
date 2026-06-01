import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { addAuditLog } from "../../utils/auditLog";

type SystemUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  district: string;
  status: string;
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

export default function UserManagementPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Semua Role");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [showUserModal, setShowUserModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "Pemimpin Kumpulan",
    district: "Petaling",
    status: "Aktif",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    const query = supabase
      .from("system_users")
      .select("*")
      .neq("role", "Super Admin")
      .order("created_at", { ascending: false });

    if (currentUser?.district) {
      query.eq("district", currentUser.district);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return;
    }

    setUsers(data || []);
  }

  const filteredUsers = users.filter((user) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      (user.full_name || "").toLowerCase().includes(keyword) ||
      (user.email || "").toLowerCase().includes(keyword) ||
      (user.role || "").toLowerCase().includes(keyword);

    const matchRole =
      roleFilter === "Semua Role" || user.role === roleFilter;

    const matchStatus =
      statusFilter === "Semua Status" || user.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  function resetForm() {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    setEditingUser(null);
    setForm({
      full_name: "",
      email: "",
      role: "Pemimpin Kumpulan",
      district: currentUser?.district || "Petaling",
      status: "Aktif",
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
    if (user.role === "Super Admin") {
      alert("Super Admin tidak boleh diurus oleh District.");
      return;
    }

    setEditingUser(user);

    setForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      district: user.district || "Petaling",
      status: user.status,
    });

    setShowUserModal(true);
  }

  function openDeleteModal(user: SystemUser) {
    if (user.role === "Super Admin") {
      alert("Super Admin tidak boleh dipadam oleh District.");
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

    if (form.role === "Super Admin") {
      alert("District tidak dibenarkan mengurus Super Admin.");
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    const payload = {
      ...form,
      district: currentUser?.district || form.district || "Petaling",
    };

    if (editingUser) {
      if (editingUser.role === "Super Admin") {
        alert("Super Admin tidak boleh diurus oleh District.");
        return;
      }

      const { error } = await supabase
        .from("system_users")
        .update(payload)
        .eq("id", editingUser.id)
        .neq("role", "Super Admin");

      if (error) {
        alert(error.message);
        return;
      }

      await addAuditLog(
        "UPDATE",
        "Pengurusan Pengguna",
        `Kemaskini pengguna: ${form.full_name}`
      );
    } else {
      const { error } = await supabase.from("system_users").insert(payload);

      if (error) {
        alert(error.message);
        return;
      }

      await addAuditLog(
        "CREATE",
        "Pengurusan Pengguna",
        `Tambah pengguna baharu: ${form.full_name}`
      );
    }

    await fetchUsers();
    resetForm();
    setShowUserModal(false);
  }

  async function deleteUser() {
    if (!deleteTarget) return;

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    if (deleteTarget.email === currentUser.email) {
      alert("Anda tidak boleh padam akaun yang sedang digunakan.");
      return;
    }

    if (deleteTarget.role === "Super Admin") {
      alert("Akaun Super Admin tidak boleh dipadam.");
      return;
    }

    const { error } = await supabase
      .from("system_users")
      .delete()
      .eq("id", deleteTarget.id)
      .neq("role", "Super Admin");

    if (error) {
      alert(error.message);
      return;
    }

    await addAuditLog(
      "DELETE",
      "Pengurusan Pengguna",
      `Padam pengguna: ${deleteTarget.full_name}`
    );

    await fetchUsers();
    setShowDeleteModal(false);
    setDeleteTarget(null);
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Pengurusan Pengguna</h2>
          <p className="text-muted mb-0">Urus akaun pengguna dalam daerah anda.</p>
        </div>

        <button className="btn btn-success" type="button" onClick={openAddModal}>
          <i className="bi bi-plus-circle me-1"></i>
          Tambah Pengguna
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body border-bottom">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
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
                <option>Pesuruhjaya Daerah</option>
                <option>Penolong Pesuruhjaya</option>
                <option>Pemimpin Kumpulan</option>
                <option>Penolong Pemimpin</option>
              </select>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
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

        <div className="card-body table-responsive p-0">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">E-mel</th>
                <th className="px-4 py-3">Peranan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
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
                          {getInitials(user.full_name)}
                        </div>
                        <span className="fw-semibold">{user.full_name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-muted">{user.email}</td>

                    <td className="px-4 py-3">
                      <span className="badge bg-primary-subtle text-primary">
                        {user.role}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          user.status === "Aktif"
                            ? "bg-success-subtle text-success"
                            : "bg-secondary-subtle text-secondary"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => openViewModal(user)}
                      >
                        <i className="bi bi-eye"></i>
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary me-1"
                        onClick={() => openEditModal(user)}
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => openDeleteModal(user)}
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

      {showViewModal && selectedUser && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
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
                    <span
                      className={`badge ${
                        selectedUser.status === "Aktif"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {selectedUser.status}
                    </span>
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
            <div className="modal-content border-0">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingUser ? "Edit Pengguna" : "Tambah Pengguna"}
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
                      placeholder="Ahmad bin Salleh"
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
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value })
                      }
                    >
                      <option>Pesuruhjaya Daerah</option>
                      <option>Penolong Pesuruhjaya</option>
                      <option>Pemimpin Kumpulan</option>
                      <option>Penolong Pemimpin</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Daerah</label>
                    <input
                      className="form-control"
                      value={form.district}
                      readOnly
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
                    >
                      <option>Aktif</option>
                      <option>Tidak Aktif</option>
                    </select>
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

                <button className="btn btn-success" onClick={saveUser}>
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
            <div className="modal-content border-0">
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