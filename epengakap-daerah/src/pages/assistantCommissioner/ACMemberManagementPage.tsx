import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string;
  email?: string | null;
  ic_number?: string | null;
  phone?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  category?: string | null;
  scout_category?: string | null;
  age?: number | null;
  gender?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  address?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type Group = {
  id: string;
  group_name: string;
  school_name?: string | null;
  status?: string | null;
  district_environment_id?: string | null;
};

type MemberForm = {
  full_name: string;
  email: string;
  ic_number: string;
  phone: string;
  group_id: string;
  group_name: string;
  category: string;
  scout_category: string;
  age: string;
  gender: string;
  guardian_name: string;
  guardian_phone: string;
  address: string;
  status: string;
};

export default function ACMemberManagementPage() {
  const currentUser = JSON.parse(
    localStorage.getItem("user") ||
      localStorage.getItem("auth_user") ||
      "{}"
  );

  const districtEnvironmentId = currentUser.district_environment_id || "";
  const userDistrict = currentUser.district || "";

  const isPesuruhjayaDaerah =
    currentUser.role === "Pesuruhjaya Daerah";

  const isPenolongPesuruhjaya =
    currentUser.role === "Penolong Pesuruhjaya" ||
    currentUser.role === "Penolong Pesuruhjaya Daerah";

  const canViewMembers = isPesuruhjayaDaerah || isPenolongPesuruhjaya;
  const canAddMember = isPesuruhjayaDaerah || isPenolongPesuruhjaya;
  const canEditMember = isPesuruhjayaDaerah || isPenolongPesuruhjaya;
  const canDeactivateMember = isPesuruhjayaDaerah || isPenolongPesuruhjaya;

  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [groupFilter, setGroupFilter] = useState("Semua Kumpulan");

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);

  const [form, setForm] = useState<MemberForm>({
    full_name: "",
    email: "",
    ic_number: "",
    phone: "",
    group_id: "",
    group_name: "",
    category: "",
    scout_category: "",
    age: "",
    gender: "",
    guardian_name: "",
    guardian_phone: "",
    address: "",
    status: "Aktif",
  });

  useEffect(() => {
    fetchPageData();
  }, []);

  async function insertAuditLog(
    action: string,
    description: string,
    recordId?: string,
    oldValue?: any,
    newValue?: any
  ) {
    if (!districtEnvironmentId) return;

    await supabase.from("audit_logs").insert({
      actor_name: currentUser.full_name || currentUser.email || "Unknown User",
      actor_role: currentUser.role || "Penolong Pesuruhjaya Daerah",
      action,
      module: "Member Management",
      description,
      user_id: currentUser.id || null,
      district_environment_id: districtEnvironmentId,
      record_id: recordId || null,
      old_value: oldValue || null,
      new_value: newValue || null,
    });
  }

  async function fetchPageData() {
    setLoading(true);

    if (!canViewMembers) {
      alert("Anda tidak mempunyai akses ke halaman ini.");
      setMembers([]);
      setGroups([]);
      setLoading(false);
      return;
    }

    if (!districtEnvironmentId) {
      alert("Ralat: district_environment_id pengguna tidak dijumpai.");
      setMembers([]);
      setGroups([]);
      setLoading(false);
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("id, group_name, school_name, status, district_environment_id")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null)
      .order("group_name", { ascending: true });

    if (groupError) {
      alert(groupError.message);
      setLoading(false);
      return;
    }

    setMembers(memberData || []);
    setGroups(groupData || []);
    setLoading(false);
  }

  function openAddModal() {
    if (!canAddMember) {
      alert("Anda tidak mempunyai kebenaran untuk tambah ahli.");
      return;
    }

    setEditingMember(null);
    setForm({
      full_name: "",
      email: "",
      ic_number: "",
      phone: "",
      group_id: "",
      group_name: "",
      category: "",
      scout_category: "",
      age: "",
      gender: "",
      guardian_name: "",
      guardian_phone: "",
      address: "",
      status: "Aktif",
    });
    setShowFormModal(true);
  }

  function openEditModal(member: Member) {
    if (!canEditMember) {
      alert("Anda tidak mempunyai kebenaran untuk edit ahli.");
      return;
    }

    setEditingMember(member);
    setForm({
      full_name: member.full_name || "",
      email: member.email || "",
      ic_number: member.ic_number || "",
      phone: member.phone || "",
      group_id: member.group_id || "",
      group_name: member.group_name || "",
      category: member.category || "",
      scout_category: member.scout_category || "",
      age: member.age ? String(member.age) : "",
      gender: member.gender || "",
      guardian_name: member.guardian_name || "",
      guardian_phone: member.guardian_phone || "",
      address: member.address || "",
      status: member.status || "Aktif",
    });
    setShowFormModal(true);
  }

  function handleGroupChange(groupId: string) {
    const selectedGroup = groups.find((group) => group.id === groupId);

    setForm({
      ...form,
      group_id: groupId,
      group_name: selectedGroup?.group_name || "",
    });
  }

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();

    if (!editingMember && !canAddMember) {
      alert("Anda tidak mempunyai kebenaran untuk tambah ahli.");
      return;
    }

    if (editingMember && !canEditMember) {
      alert("Anda tidak mempunyai kebenaran untuk edit ahli.");
      return;
    }

    if (!districtEnvironmentId) {
      alert("Ralat: district_environment_id pengguna tidak dijumpai.");
      return;
    }

    if (!form.full_name.trim()) {
      alert("Nama ahli wajib diisi.");
      return;
    }

    setSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      ic_number: form.ic_number.trim() || null,
      phone: form.phone.trim() || null,
      group_id: form.group_id || null,
      group_name: form.group_name || null,
      category: form.category || null,
      scout_category: form.scout_category || form.category || null,
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: form.guardian_phone.trim() || null,
      address: form.address.trim() || null,
      status: form.status || "Aktif",
      district: userDistrict,
      district_environment_id: districtEnvironmentId,
      updated_at: new Date().toISOString(),
    };

    if (editingMember) {
      const { error } = await supabase
        .from("members")
        .update(payload)
        .eq("id", editingMember.id)
        .eq("district_environment_id", districtEnvironmentId)
        .is("deleted_at", null);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await insertAuditLog(
        "Kemaskini Ahli",
        `${currentUser.role} mengemaskini ahli ${payload.full_name}.`,
        editingMember.id,
        editingMember,
        payload
      );
    } else {
      const { data, error } = await supabase
        .from("members")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await insertAuditLog(
        "Tambah Ahli",
        `${currentUser.role} menambah ahli ${payload.full_name}.`,
        data?.id,
        null,
        data
      );
    }

    setSaving(false);
    setShowFormModal(false);
    setEditingMember(null);
    await fetchPageData();
  }

  async function handleDeactivateMember(member: Member) {
    if (!canDeactivateMember) {
      alert("Anda tidak mempunyai kebenaran untuk nyahaktif ahli.");
      return;
    }

    const confirmDeactivate = window.confirm(
      `Nyahaktif ahli ${member.full_name}? Data tidak akan dipadam kekal.`
    );

    if (!confirmDeactivate) return;

    const deactivatedAt = new Date().toISOString();

    const { error } = await supabase
      .from("members")
      .update({
        status: "Tidak Aktif",
        deleted_at: deactivatedAt,
        updated_at: deactivatedAt,
      })
      .eq("id", member.id)
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null);

    if (error) {
      alert(error.message);
      return;
    }

    await insertAuditLog(
      "Nyahaktif Ahli",
      `${currentUser.role} menyahaktif ahli ${member.full_name}.`,
      member.id,
      member,
      {
        status: "Tidak Aktif",
        deleted_at: deactivatedAt,
      }
    );

    await fetchPageData();
  }

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        (member.full_name || "").toLowerCase().includes(keyword) ||
        (member.email || "").toLowerCase().includes(keyword) ||
        (member.ic_number || "").toLowerCase().includes(keyword) ||
        (member.group_name || "").toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua" || member.status === statusFilter;

      const matchGroup =
        groupFilter === "Semua Kumpulan" ||
        member.group_id === groupFilter ||
        member.group_name === groupFilter;

      return matchSearch && matchStatus && matchGroup;
    });
  }, [members, search, statusFilter, groupFilter]);

  const activeMembers = members.filter(
    (member) => member.status === "Aktif"
  ).length;

  const inactiveMembers = members.filter(
    (member) => member.status === "Tidak Aktif"
  ).length;

  const maleMembers = members.filter(
    (member) => member.gender === "Lelaki"
  ).length;

  const femaleMembers = members.filter(
    (member) => member.gender === "Perempuan"
  ).length;

  if (!canViewMembers) {
    return (
      <DashboardLayout role="assistantCommissioner">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <i className="bi bi-shield-lock fs-1 text-danger d-block mb-3"></i>
            <h4 className="fw-bold">Akses Ditolak</h4>
            <p className="text-muted mb-0">
              Anda tidak mempunyai kebenaran untuk melihat halaman ini.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="assistantCommissioner">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Pengurusan Ahli Daerah</h2>
          <p className="text-muted mb-0">
            Paparan ahli pengakap dalam daerah sendiri sahaja.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-success"
            onClick={fetchPageData}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          {canAddMember && (
            <button className="btn btn-success" onClick={openAddModal}>
              <i className="bi bi-plus-circle me-1"></i>
              Tambah Ahli
            </button>
          )}
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Jumlah Ahli</div>
              <h3 className="fw-bold mb-0">{members.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Ahli Aktif</div>
              <h3 className="fw-bold text-success mb-0">{activeMembers}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Tidak Aktif</div>
              <h3 className="fw-bold text-warning mb-0">{inactiveMembers}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Jantina</div>
              <h6 className="fw-bold mb-0">
                L: {maleMembers} / P: {femaleMembers}
              </h6>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3">
            <div className="col-md-5">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  className="form-control ps-5 rounded-3"
                  placeholder="Cari nama, IC, email atau kumpulan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
              <select
                className="form-select rounded-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua</option>
                <option>Aktif</option>
                <option>Tidak Aktif</option>
              </select>
            </div>

            <div className="col-md-4">
              <select
                className="form-select rounded-3"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option>Semua Kumpulan</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.group_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small text-muted">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Kumpulan</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Umur</th>
                <th className="px-4 py-3">Jantina</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">
                      Memuatkan ahli...
                    </p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada ahli dijumpai.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3">
                      <div className="fw-semibold">{member.full_name}</div>
                      <small className="text-muted">
                        {member.ic_number || member.email || "-"}
                      </small>
                    </td>

                    <td className="px-4 py-3">
                      {member.group_name || "-"}
                    </td>

                    <td className="px-4 py-3">
                      {member.scout_category || member.category || "-"}
                    </td>

                    <td className="px-4 py-3">
                      {member.age || "-"}
                    </td>

                    <td className="px-4 py-3">
                      {member.gender || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`badge rounded-pill px-3 py-2 ${
                          member.status === "Aktif"
                            ? "bg-success-subtle text-success border border-success-subtle"
                            : "bg-warning-subtle text-warning border border-warning-subtle"
                        }`}
                      >
                        {member.status || "Aktif"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-end">
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-light border rounded-3"
                          onClick={() => setSelectedMember(member)}
                          title="Lihat"
                        >
                          <i className="bi bi-eye"></i>
                        </button>

                        {canEditMember && (
                          <button
                            className="btn btn-sm btn-light border rounded-3"
                            onClick={() => openEditModal(member)}
                            title="Edit"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        )}

                        {canDeactivateMember &&
                          member.status !== "Tidak Aktif" && (
                            <button
                              className="btn btn-sm btn-light border rounded-3 text-warning"
                              onClick={() => handleDeactivateMember(member)}
                              title="Nyahaktif"
                            >
                              <i className="bi bi-slash-circle"></i>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredMembers.length} daripada {members.length} rekod
        </div>
      </div>

      {selectedMember && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Ahli</h5>

                <button
                  className="btn-close"
                  onClick={() => setSelectedMember(null)}
                />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Nama</div>
                      <div className="fw-bold">{selectedMember.full_name}</div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">IC / MyKid</div>
                      <div className="fw-bold">
                        {selectedMember.ic_number || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Email</div>
                      <div className="fw-bold">
                        {selectedMember.email || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Telefon</div>
                      <div className="fw-bold">
                        {selectedMember.phone || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Kumpulan</div>
                      <div className="fw-bold">
                        {selectedMember.group_name || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Kategori</div>
                      <div className="fw-bold">
                        {selectedMember.scout_category ||
                          selectedMember.category ||
                          "-"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Umur</div>
                      <div className="fw-bold">
                        {selectedMember.age || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Jantina</div>
                      <div className="fw-bold">
                        {selectedMember.gender || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Status</div>
                      <div className="fw-bold">
                        {selectedMember.status || "Aktif"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Penjaga</div>
                      <div className="fw-bold">
                        {selectedMember.guardian_name || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Telefon Penjaga</div>
                      <div className="fw-bold">
                        {selectedMember.guardian_phone || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="border rounded-4 p-3">
                      <div className="text-muted small">Alamat</div>
                      <div className="fw-bold">
                        {selectedMember.address || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedMember(null)}
                >
                  Tutup
                </button>

                {canEditMember && (
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      setSelectedMember(null);
                      openEditModal(selectedMember);
                    }}
                  >
                    Edit Ahli
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <form
              className="modal-content border-0 rounded-4"
              onSubmit={handleSaveMember}
            >
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingMember ? "Edit Ahli" : "Tambah Ahli"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowFormModal(false)}
                />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Nama Ahli</label>
                    <input
                      className="form-control rounded-3"
                      value={form.full_name}
                      onChange={(e) =>
                        setForm({ ...form, full_name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      IC / MyKid
                    </label>
                    <input
                      className="form-control rounded-3"
                      value={form.ic_number}
                      onChange={(e) =>
                        setForm({ ...form, ic_number: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Email</label>
                    <input
                      type="email"
                      className="form-control rounded-3"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Telefon</label>
                    <input
                      className="form-control rounded-3"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Kumpulan</label>
                    <select
                      className="form-select rounded-3"
                      value={form.group_id}
                      onChange={(e) => handleGroupChange(e.target.value)}
                    >
                      <option value="">Pilih Kumpulan</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.group_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Kategori</label>
                    <select
                      className="form-select rounded-3"
                      value={form.category}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          category: e.target.value,
                          scout_category: e.target.value,
                        })
                      }
                    >
                      <option value="">Pilih Kategori</option>
                      <option>Pengakap Kanak-Kanak</option>
                      <option>Pengakap Muda</option>
                      <option>Pengakap Remaja</option>
                      <option>Pengakap Kelana</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Umur</label>
                    <input
                      type="number"
                      className="form-control rounded-3"
                      value={form.age}
                      onChange={(e) =>
                        setForm({ ...form, age: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Jantina</label>
                    <select
                      className="form-select rounded-3"
                      value={form.gender}
                      onChange={(e) =>
                        setForm({ ...form, gender: e.target.value })
                      }
                    >
                      <option value="">Pilih Jantina</option>
                      <option>Lelaki</option>
                      <option>Perempuan</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Status</label>
                    <select
                      className="form-select rounded-3"
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
                    <label className="form-label fw-semibold">
                      Nama Penjaga
                    </label>
                    <input
                      className="form-control rounded-3"
                      value={form.guardian_name}
                      onChange={(e) =>
                        setForm({ ...form, guardian_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Telefon Penjaga
                    </label>
                    <input
                      className="form-control rounded-3"
                      value={form.guardian_phone}
                      onChange={(e) =>
                        setForm({ ...form, guardian_phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">Alamat</label>
                    <textarea
                      className="form-control rounded-3"
                      rows={3}
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="alert alert-light border small mt-3 mb-0">
                  Data akan disimpan dalam daerah pengguna semasa sahaja.
                  <br />
                  <strong>district_environment_id:</strong>{" "}
                  {districtEnvironmentId || "-"}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowFormModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}