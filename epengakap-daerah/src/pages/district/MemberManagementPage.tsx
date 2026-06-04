import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import FileUploadCard from "../../components/common/FileUploadCard";

type Member = {
  id: string;
  ic_number: string | null;
  full_name: string;
  email: string | null;
  group_id: string | null;
  group_name: string | null;
  category: string | null;
  scout_category: string | null;
  age: number | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  created_at?: string;
};

type ScoutGroup = {
  id: string;
  group_name: string;
  school_name: string;
  status?: string;
};

type MemberForm = {
  ic_number: string;
  full_name: string;
  email: string;
  group_id: string;
  group_name: string;
  category: string;
  age: string;
  gender: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  address: string;
  notes: string;
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

function normalizeMalaysianIC(value: string) {
  return value.replace(/\D/g, "").slice(0, 12);
}

function formatMalaysianIC(value: string) {
  const digits = normalizeMalaysianIC(value);

  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function isValidMalaysianIC(value: string) {
  const digits = normalizeMalaysianIC(value);

  if (digits.length !== 12) return false;

  const yy = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));

  if (Number.isNaN(yy) || Number.isNaN(mm) || Number.isNaN(dd)) return false;
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;

  return true;
}

async function addAuditLog(action: string, description: string) {
  const currentUser = JSON.parse(
    localStorage.getItem("user") ||
      localStorage.getItem("auth_user") ||
      "{}"
  );

  await supabase.from("audit_logs").insert({
    actor_name: currentUser.full_name || currentUser.name || "Unknown User",
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("Semua Kumpulan");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [genderFilter, setGenderFilter] = useState("Semua Jantina");

  const [form, setForm] = useState<MemberForm>({
    ic_number: "",
    full_name: "",
    email: "",
    group_id: "",
    group_name: "",
    category: "Pengakap Kanak-Kanak",
    age: "",
    gender: "Lelaki",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    address: "",
    notes: "",
    status: "Aktif",
  });

  useEffect(() => {
    fetchMembers();
    fetchGroups();
  }, []);

  async function fetchMembers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("members")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setMembers(data || []);
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

  const filteredMembers = useMemo(() => {
    const keyword = search.toLowerCase();

    return members.filter((member) => {
      const matchSearch =
        (member.full_name || "").toLowerCase().includes(keyword) ||
        (member.email || "").toLowerCase().includes(keyword) ||
        (member.ic_number || "").toLowerCase().includes(keyword) ||
        (member.group_name || "").toLowerCase().includes(keyword);

      const matchGroup =
        groupFilter === "Semua Kumpulan" || member.group_name === groupFilter;

      const matchCategory =
        categoryFilter === "Semua Kategori" ||
        member.category === categoryFilter ||
        member.scout_category === categoryFilter;

      const matchStatus =
        statusFilter === "Semua Status" || member.status === statusFilter;

      const matchGender =
        genderFilter === "Semua Jantina" || member.gender === genderFilter;

      return (
        matchSearch && matchGroup && matchCategory && matchStatus && matchGender
      );
    });
  }, [members, search, groupFilter, categoryFilter, statusFilter, genderFilter]);

  function resetForm() {
    setEditingMember(null);
    setForm({
      ic_number: "",
      full_name: "",
      email: "",
      group_id: "",
      group_name: "",
      category: "Pengakap Kanak-Kanak",
      age: "",
      gender: "Lelaki",
      guardian_name: "",
      guardian_phone: "",
      guardian_email: "",
      address: "",
      notes: "",
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
      ic_number: member.ic_number || "",
      full_name: member.full_name || "",
      email: member.email || "",
      group_id: member.group_id || "",
      group_name: member.group_name || "",
      category: member.category || member.scout_category || "Pengakap Kanak-Kanak",
      age: String(member.age || ""),
      gender: member.gender || "Lelaki",
      guardian_name: member.guardian_name || "",
      guardian_phone: member.guardian_phone || "",
      guardian_email: member.guardian_email || "",
      address: member.address || "",
      notes: member.notes || "",
      status: member.status || "Aktif",
    });

    setShowMemberModal(true);
  }

  function openDeleteModal(member: Member) {
    setDeleteTarget(member);
    setShowDeleteModal(true);
  }

  async function checkDuplicateIC(icNumber: string, ignoreMemberId?: string) {
    const cleanIC = normalizeMalaysianIC(icNumber);

    if (!cleanIC) return false;

    let query = supabase
      .from("members")
      .select("id")
      .eq("ic_number", cleanIC)
      .is("deleted_at", null)
      .limit(1);

    if (ignoreMemberId) {
      query = query.neq("id", ignoreMemberId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
  }

  function displayMalaysianIC(value?: string | null) {
    if (!value) return "-";
    return formatMalaysianIC(value);
  }

  async function saveMember() {
    if (!form.ic_number.trim()) {
      alert("Sila isi No IC / MyKid.");
      return;
    }

    if (!isValidMalaysianIC(form.ic_number)) {
      alert("No IC / MyKid tidak sah. Sila guna format 12 digit seperti 030101-03-1234.");
      return;
    }

    if (!form.full_name.trim()) {
      alert("Sila isi nama penuh ahli.");
      return;
    }

    if (!form.group_id) {
      alert("Sila pilih kumpulan / sekolah.");
      return;
    }

    if (!form.age || Number(form.age) <= 0) {
      alert("Umur tidak sah.");
      return;
    }

    setSaving(true);

    const isDuplicateIC = await checkDuplicateIC(
      form.ic_number,
      editingMember?.id
    );

    if (isDuplicateIC) {
      alert("No IC / MyKid ini sudah wujud dalam sistem.");
      setSaving(false);
      return;
    }

    const payload = {
      ic_number: normalizeMalaysianIC(form.ic_number),
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      group_id: form.group_id,
      group_name: form.group_name,
      category: form.category,
      scout_category: form.category,
      age: Number(form.age),
      gender: form.gender,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: form.guardian_phone.trim() || null,
      guardian_email: form.guardian_email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    if (editingMember) {
      const { error } = await supabase
        .from("members")
        .update(payload)
        .eq("id", editingMember.id);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog("UPDATE", `Kemaskini ahli ${form.full_name}`);
    } else {
      const { error } = await supabase.from("members").insert(payload);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog("CREATE", `Tambah ahli ${form.full_name}`);
    }

    await fetchMembers();
    resetForm();
    setShowMemberModal(false);
    setSaving(false);
  }

  async function deactivateMember() {
    if (!deleteTarget) return;

    setSaving(true);

    const { error } = await supabase
      .from("members")
      .update({
        status: "Tidak Aktif",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deleteTarget.id);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog("DEACTIVATE", `Nyahaktif ahli ${deleteTarget.full_name}`);

    await fetchMembers();
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setSaving(false);
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

          <button
            type="button"
            className="btn btn-success"
            onClick={openAddModal}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Tambah Ahli
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4 rounded-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Cari nama, IC, email..."
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
                  <option key={group.id} value={group.group_name}>
                    {group.group_name} — {group.school_name}
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

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Nama</th>
                <th>No IC / MyKid</th>
                <th>Kumpulan</th>
                <th>Kategori</th>
                <th>Umur</th>
                <th>Jantina</th>
                <th>Status</th>
                <th className="text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">Memuatkan data...</p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada ahli dijumpai.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                          style={{ width: 36, height: 36 }}
                        >
                          {getInitials(member.full_name || "-")}
                        </div>
                        <div>
                          <div className="fw-semibold">{member.full_name}</div>
                          <small className="text-muted">
                            {member.email || "-"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>{displayMalaysianIC(member.ic_number)}</td>
                    <td>{member.group_name || "-"}</td>
                    <td>{member.category || member.scout_category || "-"}</td>
                    <td>{member.age || "-"}</td>
                    <td>{member.gender || "-"}</td>

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

                    <td className="text-end">
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
                        Nyahaktif
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
            <div className="modal-content border-0 rounded-4">
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
                    {getInitials(selectedMember.full_name || "-")}
                  </div>

                  <h5 className="fw-bold mb-0">{selectedMember.full_name}</h5>
                  <small className="text-muted">
                    {selectedMember.email || "-"}
                  </small>
                </div>

                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">No IC / MyKid</span>
                    <strong>{displayMalaysianIC(selectedMember.ic_number)}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kumpulan</span>
                    <strong>{selectedMember.group_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Kategori</span>
                    <strong>
                      {selectedMember.category ||
                        selectedMember.scout_category ||
                        "-"}
                    </strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Umur</span>
                    <strong>{selectedMember.age || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Jantina</span>
                    <strong>{selectedMember.gender || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Penjaga</span>
                    <strong>{selectedMember.guardian_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Telefon Penjaga</span>
                    <strong>{selectedMember.guardian_phone || "-"}</strong>
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
            <div className="modal-content border-0 rounded-4">
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
                    <label className="form-label">No IC / MyKid</label>
                    <input
                      className="form-control"
                      value={form.ic_number}
                      maxLength={14}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          ic_number: formatMalaysianIC(e.target.value),
                        })
                      }
                      placeholder="Contoh: 030101-03-1234"
                    />

                    <small className="text-muted">
                      Format IC/MyKid: 12 digit, contoh 030101-03-1234
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Nama Penuh</label>
                    <input
                      className="form-control"
                      value={form.full_name}
                      onChange={(e) =>
                        setForm({ ...form, full_name: e.target.value })
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
                    <label className="form-label">Kumpulan / Sekolah</label>
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
                          {group.group_name} — {group.school_name}
                        </option>
                      ))}
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

                  <div className="col-md-3">
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

                  <div className="col-md-3">
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
                    <label className="form-label">Nama Penjaga</label>
                    <input
                      className="form-control"
                      value={form.guardian_name}
                      onChange={(e) =>
                        setForm({ ...form, guardian_name: e.target.value })
                      }
                      placeholder="Nama ibu/bapa/penjaga"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Telefon Penjaga</label>
                    <input
                      className="form-control"
                      value={form.guardian_phone}
                      onChange={(e) =>
                        setForm({ ...form, guardian_phone: e.target.value })
                      }
                      placeholder="0123456789"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email Penjaga</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.guardian_email}
                      onChange={(e) =>
                        setForm({ ...form, guardian_email: e.target.value })
                      }
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

                  <div className="col-md-12">
                    <label className="form-label">Alamat</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                    ></textarea>
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
                    ></textarea>
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
                  disabled={saving}
                >
                  Tutup
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={saveMember}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingMember
                    ? "Kemaskini Ahli"
                    : "Simpan Ahli"}
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
                  Nyahaktif Ahli
                </h5>

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
                <p className="mb-1">
                  Adakah anda pasti mahu nyahaktif ahli ini?
                </p>
                <strong>{deleteTarget.full_name}</strong>
                <p className="text-muted small mt-2 mb-0">
                  Ahli tidak dipadam kekal. Status akan ditukar kepada Tidak
                  Aktif.
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
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deactivateMember}
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Nyahaktif"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
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