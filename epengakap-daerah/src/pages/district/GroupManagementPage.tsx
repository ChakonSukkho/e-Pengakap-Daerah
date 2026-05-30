import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import DashboardLayout from "../../components/layout/DashboardLayout";

type ScoutGroup = {
  id: string;
  group_name: string;
  school_name: string;
  leader_name: string;
  total_members: number;
  status: string;
};

export default function GroupManagementPage() {
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<ScoutGroup | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [form, setForm] = useState({
    group_name: "",
    school_name: "",
    leader_name: "",
    total_members: "",
    status: "Aktif",
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setGroups(data || []);
  }

  const filteredGroups = groups.filter((group) => {
    const matchSearch =
      group.group_name.toLowerCase().includes(search.toLowerCase()) ||
      group.school_name.toLowerCase().includes(search.toLowerCase()) ||
      group.leader_name?.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "Semua Status" || group.status === statusFilter;

    return matchSearch && matchStatus;
  });

  function resetForm() {
    setEditingGroup(null);
    setForm({
      group_name: "",
      school_name: "",
      leader_name: "",
      total_members: "",
      status: "Aktif",
    });
  }

  async function saveGroup() {
    if (!form.group_name.trim() || !form.school_name.trim()) {
      alert("Sila isi nama kumpulan dan sekolah.");
      return;
    }

    const payload = {
      group_name: form.group_name,
      school_name: form.school_name,
      leader_name: form.leader_name,
      total_members: Number(form.total_members || 0),
      status: form.status,
    };

    if (editingGroup) {
      const { error } = await supabase
        .from("groups")
        .update(payload)
        .eq("id", editingGroup.id);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("groups").insert(payload);

      if (error) {
        alert(error.message);
        return;
      }
    }

    await fetchGroups();
    resetForm();

    const modalElement = document.getElementById("addGroupModal");
    const bootstrap = (window as any).bootstrap;

    if (modalElement && bootstrap) {
      bootstrap.Modal.getInstance(modalElement)?.hide();
    }
  }

  function openEditModal(group: ScoutGroup) {
    setEditingGroup(group);
    setForm({
      group_name: group.group_name,
      school_name: group.school_name,
      leader_name: group.leader_name || "",
      total_members: String(group.total_members || 0),
      status: group.status,
    });

    const modalElement = document.getElementById("addGroupModal");
    const bootstrap = (window as any).bootstrap;

    if (modalElement && bootstrap) {
      new bootstrap.Modal(modalElement).show();
    }
  }

  async function deleteGroup(id: string) {
    const confirmDelete = confirm("Adakah anda pasti mahu padam kumpulan ini?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("groups").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchGroups();
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Kumpulan / Sekolah</h2>
          <p className="text-muted mb-0">
            Urus kumpulan pengakap dan sekolah dalam daerah.
          </p>
        </div>

        <button
          className="btn btn-success"
          data-bs-toggle="modal"
          data-bs-target="#addGroupModal"
          onClick={resetForm}
        >
          <i className="bi bi-plus-circle me-1"></i>
          Tambah Kumpulan
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <input
                className="form-control"
                placeholder="Cari kumpulan / sekolah / pemimpin..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                <th>Nama Kumpulan</th>
                <th>Sekolah</th>
                <th>Ketua Pemimpin</th>
                <th>Jumlah Ahli</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada kumpulan dijumpai.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <tr key={group.id}>
                    <td>{group.group_name}</td>
                    <td>{group.school_name}</td>
                    <td>{group.leader_name || "-"}</td>
                    <td>{group.total_members}</td>
                    <td>
                      <span
                        className={`badge ${
                          group.status === "Aktif"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {group.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-secondary me-1"
                        onClick={() => openEditModal(group)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteGroup(group.id)}
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

      <div className="modal fade" id="addGroupModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content border-0">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                {editingGroup ? "Edit Kumpulan" : "Tambah Kumpulan"}
              </h5>

              <button className="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Nama Kumpulan</label>
                  <input
                    className="form-control"
                    value={form.group_name}
                    onChange={(e) =>
                      setForm({ ...form, group_name: e.target.value })
                    }
                    placeholder="01 Petaling"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Nama Sekolah</label>
                  <input
                    className="form-control"
                    value={form.school_name}
                    onChange={(e) =>
                      setForm({ ...form, school_name: e.target.value })
                    }
                    placeholder="SK Kementah"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Ketua Pemimpin</label>
                  <input
                    className="form-control"
                    value={form.leader_name}
                    onChange={(e) =>
                      setForm({ ...form, leader_name: e.target.value })
                    }
                    placeholder="Ahmad bin Salleh"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Jumlah Ahli</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.total_members}
                    onChange={(e) =>
                      setForm({ ...form, total_members: e.target.value })
                    }
                    placeholder="45"
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

              <button className="btn btn-success" onClick={saveGroup}>
                {editingGroup ? "Kemaskini Kumpulan" : "Simpan Kumpulan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}