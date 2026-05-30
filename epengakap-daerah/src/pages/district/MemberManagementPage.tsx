import { useEffect, useState } from "react";
import { Modal } from "bootstrap";
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



export default function MemberManagementPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("Semua Kumpulan");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [genderFilter, setGenderFilter] = useState("Semua Jantina");

  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    group: "SK Kementah",
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
  
    const formatted = data.map((item) => ({
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
      group: "SK Kementah",
      category: "Pengakap Kanak-Kanak",
      age: "",
      gender: "Lelaki",
      status: "Aktif",
    });
  }

async function saveMember() {
  if (!form.name.trim() || !form.email.trim() || !form.age) {
    alert("Sila isi nama, email dan umur ahli.");
    return;
  }

  const action = editingMember ? "Update" : "Create";

  if (editingMember) {
    const { error } = await supabase
      .from("members")
      .update({
        full_name: form.name,
        email: form.email,
        group_name: form.group,
        category: form.category,
        age: Number(form.age),
        gender: form.gender,
        status: form.status,
      })
      .eq("id", editingMember.id);

    if (error) {
      alert(error.message);
      return;
    }
  } else {
    const { error } = await supabase.from("members").insert({
      full_name: form.name,
      email: form.email,
      group_name: form.group,
      category: form.category,
      age: Number(form.age),
      gender: form.gender,
      status: form.status,
    });

    if (error) {
      alert(error.message);
      return;
    }
  }

  await supabase.from("audit_logs").insert({
    actor_name: "Encik Kamarul",
    actor_role: "Pesuruhjaya Daerah",
    action,
    module: "Ahli Pengakap",
    description:
      action === "Update"
        ? `Kemaskini ahli ${form.name}`
        : `Tambah ahli ${form.name}`,
  });

  await fetchMembers();
  resetForm();

    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur();
    
    const modalElement = document.getElementById("addMemberModal");
    
    if (modalElement) {
      const modal = Modal.getOrCreateInstance(modalElement);
      modal.hide();
    }
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

      const modalElement = document.getElementById("addMemberModal");   
      if (modalElement) {
        const modal = Modal.getOrCreateInstance(modalElement);
        modal.show();
      }
    } 

async function deleteMember(id: string) {
  const confirmDelete = confirm("Adakah anda pasti mahu padam ahli ini?");
  if (!confirmDelete) return;

  const member = members.find((m) => m.id === id);

  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await supabase.from("audit_logs").insert({
    actor_name: "Encik Kamarul",
    actor_role: "Pesuruhjaya Daerah",
    action: "Delete",
    module: "Ahli Pengakap",
    description: `Padam ahli ${member?.name || ""}`,
  });

  await fetchMembers();
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
            className="btn btn-outline-success"
            data-bs-toggle="modal"
            data-bs-target="#uploadMemberModal"
          >
            <i className="bi bi-upload me-1"></i>
            Import Fail
          </button>

          <button
            className="btn btn-success"
            data-bs-toggle="modal"
            data-bs-target="#addMemberModal"
            onClick={resetForm}
          >
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
                        className="btn btn-sm btn-outline-success me-1"
                        onClick={() => alert(JSON.stringify(member, null, 2))}
                      >
                        View
                      </button>

                      <button
                        className="btn btn-sm btn-outline-secondary me-1"
                        onClick={() => openEditModal(member)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteMember(member.id)}
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

      <div className="modal fade" id="addMemberModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content border-0">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                {editingMember ? "Edit Ahli Pengakap" : "Tambah Ahli Pengakap"}
              </h5>

              <button className="btn-close" data-bs-dismiss="modal"></button>
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
                className="btn btn-outline-secondary"
                data-bs-dismiss="modal"
              >
                Tutup
              </button>

              <button className="btn btn-success" onClick={saveMember}>
                {editingMember ? "Kemaskini Ahli" : "Simpan Ahli"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="uploadMemberModal" tabIndex={-1}>
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content border-0">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">Import Ahli Pengakap</h5>

              <button className="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div className="modal-body">
              <FileUploadCard />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}