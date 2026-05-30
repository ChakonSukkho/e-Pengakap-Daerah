import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import DashboardLayout from "../../components/layout/DashboardLayout";

type SystemUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  district: string;
  status: string;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Semua Role");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

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
    const { data, error } = await supabase
      .from("system_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setUsers(data || []);
  }

  const filteredUsers = users.filter((user) => {
    const matchSearch =
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());

    const matchRole = roleFilter === "Semua Role" || user.role === roleFilter;
    const matchStatus =
      statusFilter === "Semua Status" || user.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  function resetForm() {
    setEditingUser(null);
    setForm({
      full_name: "",
      email: "",
      role: "Pemimpin Kumpulan",
      district: "Petaling",
      status: "Aktif",
    });
  }

  async function saveUser() {
    if (!form.full_name.trim() || !form.email.trim()) {
      alert("Sila isi nama dan email pengguna.");
      return;
    }

    if (editingUser) {
      const { error } = await supabase
        .from("system_users")
        .update(form)
        .eq("id", editingUser.id);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("system_users").insert(form);

      if (error) {
        alert(error.message);
        return;
      }
    }

    await fetchUsers();
    resetForm();

    const modalElement = document.getElementById("addUserModal");
    const bootstrap = (window as any).bootstrap;

    if (modalElement && bootstrap) {
      bootstrap.Modal.getInstance(modalElement)?.hide();
    }
  }

  function openEditModal(user: SystemUser) {
    setEditingUser(user);
    setForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      district: user.district || "Petaling",
      status: user.status,
    });

    const modalElement = document.getElementById("addUserModal");
    const bootstrap = (window as any).bootstrap;

    if (modalElement && bootstrap) {
      new bootstrap.Modal(modalElement).show();
    }
  }

  async function deleteUser(id: string) {
    const confirmDelete = confirm("Adakah anda pasti mahu padam pengguna ini?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("system_users")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchUsers();
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Pengurusan Pengguna</h2>
          <p className="text-muted mb-0">Urus pengguna dan role dalam daerah.</p>
        </div>

        <button
          className="btn btn-success"
          data-bs-toggle="modal"
          data-bs-target="#addUserModal"
          onClick={resetForm}
        >
          <i className="bi bi-plus-circle me-1"></i>
          Tambah Pengguna
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option>Semua Role</option>
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
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Nama</th>
                <th>E-mel</th>
                <th>Role</th>
                <th>Daerah</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada pengguna dijumpai.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.district || "-"}</td>
                    <td>
                      <span
                        className={`badge ${
                          user.status === "Aktif"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-secondary me-1"
                        onClick={() => openEditModal(user)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteUser(user.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal fade" id="addUserModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content border-0">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                {editingUser ? "Edit Pengguna" : "Tambah Pengguna"}
              </h5>

              <button className="btn-close" data-bs-dismiss="modal"></button>
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
                    onChange={(e) =>
                      setForm({ ...form, district: e.target.value })
                    }
                    placeholder="Petaling"
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
                data-bs-dismiss="modal"
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
    </DashboardLayout>
  );
}