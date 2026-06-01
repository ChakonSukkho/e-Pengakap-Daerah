import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import FileUploadCard from "../../components/common/FileUploadCard";

type Member = {
  id: string;
  name: string;
  email: string;
  group: string;
  category: string;
  age: number;
  gender: string;
  status: string;
};

type ScoutGroup = {
  id: string;
  group_name: string;
  school_name: string;
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

async function addAuditLog(action: string, description: string) {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  await supabase.from("audit_logs").insert({
    actor_name: currentUser.full_name || "Unknown User",
    actor_role: currentUser.role || "Unknown Role",
    action,
    module: "Ahli Pengakap",
    description,
  });
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

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("Semua Kumpulan");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [genderFilter, setGenderFilter] = useState("Semua Jantina");

  const [form, setForm] = useState({
    name: "",
    email: "",
    group: "",
    category: "Pengakap Kanak-Kanak",
    age: "",
    gender: "Lelaki",
    status: "Aktif",
  });

  useEffect(() => {
    fetchMembers();
    fetchGroups();
  }, []);

  async function fetchMembers() {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    const formatted = (data || []).map((item) => ({
      id: item.id,
      name: item.full_name,
      email: item.email,
      group: item.group_name,
      category: item.category,
      age: item.age,
      gender: item.gender,
      status: item.status,
    }));

    setMembers(formatted);
  }

  async function fetchGroups() {
    const { data, error } = await supabase
      .from("groups")
      .select("id, group_name, school_name")
      .order("school_name", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setGroups(data || []);
  }

  const filteredMembers = members.filter((member) => {
    const matchSearch =
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase()) ||
      member.group.toLowerCase().includes(search.toLowerCase());

    const matchGroup =
      groupFilter === "Semua Kumpulan" || member.group === groupFilter;

    const matchCategory =
      categoryFilter === "Semua Kategori" || member.category === categoryFilter;

    const matchStatus =
      statusFilter === "Semua Status" || member.status === statusFilter;

    const matchGender =
      genderFilter === "Semua Jantina" || member.gender === genderFilter;

    return matchSearch && matchGroup && matchCategory && matchStatus && matchGender;
  });

  function resetForm() {
    setEditingMember(null);
    setForm({
      name: "",
      email: "",
      group: groups[0]?.school_name || "",
      category: "Pengakap Kanak-Kanak",
      age: "",
      gender: "Lelaki",
      status: "Aktif",
    });
  }

  function openAddModal() {
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
      name: member.name,
      email: member.email,
      group: member.group,
      category: member.category,
      age: String(member.age),
      gender: member.gender,
      status: member.status,
    });
    setShowMemberModal(true);
  }

  function openDeleteModal(member: Member) {
    setDeleteTarget(member);
    setShowDeleteModal(true);
  }

  async function saveMember() {
    if (!form.name.trim() || !form.email.trim() || !form.age || !form.group) {
      alert("Sila isi nama, email, umur dan kumpulan ahli.");
      return;
    }

    const payload = {
      full_name: form.name,
      email: form.email,
      group_name: form.group,
      category: form.category,
      age: Number(form.age),
      gender: form.gender,
      status: form.status,
    };

    if (editingMember) {
      const { error } = await supabase
        .from("members")
        .update(payload)
        .eq("id", editingMember.id);

      if (error) {
        alert(error.message);
        return;
      }

      await addAuditLog("UPDATE", `Kemaskini ahli ${form.name}`);
    } else {
      const { error } = await supabase.from("members").insert(payload);

      if (error) {
        alert(error.message);
        return;
      }

      await addAuditLog("CREATE", `Tambah ahli ${form.name}`);
    }

    await fetchMembers();
    resetForm();
    setShowMemberModal(false);
  }

  async function deleteMember() {
    if (!deleteTarget) return;

    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      alert(error.message);
      return;
    }

    await addAuditLog("DELETE", `Padam ahli ${deleteTarget.name}`);

    await fetchMembers();
    setShowDeleteModal(false);
    setDeleteTarget(null);
  }

  return (
    <DashboardLayout role="district">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Ahli Pengakap</h2>
          <p className="text-muted mb-0">
            Urus maklumat ahli pengakap mengikut kumpulan.
          </p>
        </div>

        <div className="d-flex gap-2">
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

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Cari nama ahli..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option>Semua Kumpulan</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.school_name}>
                    {group.school_name}
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
                <option>Pengakap Kanak-Kanak</option>
                <option>Pengakap Muda</option>
                <option>Pengakap Remaja</option>
                <option>Pengakap Kelana</option>
              </select>
            </div>

            <div className="col-md-2">
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

            <div className="col-md-2">
              <select
                className="form-select"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option>Semua Jantina</option>
                <option>Lelaki</option>
                <option>Perempuan</option>
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
                <th>Email</th>
                <th>Kumpulan</th>
                <th>Kategori</th>
                <th>Umur</th>
                <th>Jantina</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada ahli dijumpai.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td>{member.group}</td>
                    <td>{member.category}</td>
                    <td>{member.age}</td>
                    <td>{member.gender}</td>
                    <td>
                      <span
                        className={`badge ${
                          member.status === "Aktif"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td>
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

      {showViewModal && selectedMember && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
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
                    {getInitials(selectedMember.name)}
                  </div>

                  <h5 className="fw-bold mb-0">{selectedMember.name}</h5>
                  <small className="text-muted">{selectedMember.email}</small>
                </div>

                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kumpulan</span>
                    <strong>{selectedMember.group}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kategori</span>
                    <strong>{selectedMember.category}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Umur</span>
                    <strong>{selectedMember.age}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Jantina</span>
                    <strong>{selectedMember.gender}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    <span
                      className={`badge ${
                        selectedMember.status === "Aktif"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {selectedMember.status}
                    </span>
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
              </div>
            </div>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0">
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
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nama Penuh</label>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Ahmad bin Ali"
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
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Umur</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.age}
                      onChange={(e) =>
                        setForm({ ...form, age: e.target.value })
                      }
                      placeholder="11"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Jantina</label>
                    <select
                      className="form-select"
                      value={form.gender}
                      onChange={(e) =>
                        setForm({ ...form, gender: e.target.value })
                      }
                    >
                      <option>Lelaki</option>
                      <option>Perempuan</option>
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
                    >
                      <option>Pengakap Kanak-Kanak</option>
                      <option>Pengakap Muda</option>
                      <option>Pengakap Remaja</option>
                      <option>Pengakap Kelana</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kumpulan / Sekolah</label>
                    <select
                      className="form-select"
                      value={form.group}
                      onChange={(e) =>
                        setForm({ ...form, group: e.target.value })
                      }
                    >
                      <option value="">Pilih Kumpulan / Sekolah</option>

                      {groups.map((group) => (
                        <option key={group.id} value={group.school_name}>
                          {group.school_name} — {group.group_name}
                        </option>
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
                      <option>Aktif</option>
                      <option>Tidak Aktif</option>
                    </select>
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
                >
                  Tutup
                </button>

                <button type="button" className="btn btn-success" onClick={saveMember}>
                  {editingMember ? "Kemaskini Ahli" : "Simpan Ahli"}
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
                <h5 className="modal-title fw-bold text-danger">Padam Ahli</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">Adakah anda pasti mahu padam ahli ini?</p>
                <strong>{deleteTarget.name}</strong>
                <p className="text-muted small mt-2 mb-0">
                  Tindakan ini tidak boleh dibatalkan.
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
                >
                  Batal
                </button>

                <button type="button" className="btn btn-danger" onClick={deleteMember}>
                  Padam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0">
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