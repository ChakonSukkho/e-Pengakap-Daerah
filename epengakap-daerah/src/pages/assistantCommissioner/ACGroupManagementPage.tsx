import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Group = {
  id: string;
  group_name: string;
  school_name?: string | null;
  leader_name?: string | null;
  total_members?: number | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  actual_member_count?: number;
  active_member_count?: number;
};

type Member = {
  id: string;
  full_name: string;
  ic_number?: string | null;
  gender?: string | null;
  category?: string | null;
  scout_category?: string | null;
  status?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  district_environment_id?: string | null;
};

type GroupForm = {
  group_name: string;
  school_name: string;
  leader_name: string;
  status: string;
};

export default function ACGroupManagementPage() {
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

  const canViewGroups = isPesuruhjayaDaerah || isPenolongPesuruhjaya;
  const canAddGroup = isPesuruhjayaDaerah || isPenolongPesuruhjaya;
  const canEditGroup = isPesuruhjayaDaerah || isPenolongPesuruhjaya;
  const canDeactivateGroup = isPesuruhjayaDaerah || isPenolongPesuruhjaya;

  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<GroupForm>({
    group_name: "",
    school_name: "",
    leader_name: "",
    status: "Aktif",
  });

  useEffect(() => {
    fetchGroups();
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
      module: "Group Management",
      description,
      user_id: currentUser.id || null,
      district_environment_id: districtEnvironmentId,
      record_id: recordId || null,
      old_value: oldValue || null,
      new_value: newValue || null,
    });
  }

  async function fetchGroups() {
    setLoading(true);

    if (!canViewGroups) {
      alert("Anda tidak mempunyai akses ke halaman ini.");
      setGroups([]);
      setMembers([]);
      setLoading(false);
      return;
    }

    if (!districtEnvironmentId) {
      alert("Ralat: district_environment_id pengguna tidak dijumpai.");
      setGroups([]);
      setMembers([]);
      setLoading(false);
      return;
    }

    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("*")
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null)
      .order("group_name", { ascending: true });

    if (groupError) {
      alert(groupError.message);
      setLoading(false);
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select(
        "id, full_name, ic_number, gender, category, scout_category, status, group_id, group_name, district_environment_id"
      )
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null);

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    const safeMembers = memberData || [];

    const groupsWithCounts = (groupData || []).map((group: Group) => {
      const groupMembers = safeMembers.filter((member) => {
        return (
          member.group_id === group.id ||
          member.group_name === group.group_name
        );
      });

      const activeMembers = groupMembers.filter(
        (member) => member.status === "Aktif"
      );

      return {
        ...group,
        actual_member_count: groupMembers.length,
        active_member_count: activeMembers.length,
      };
    });

    setGroups(groupsWithCounts);
    setMembers(safeMembers);
    setLoading(false);
  }

  function openAddModal() {
    if (!canAddGroup) {
      alert("Anda tidak mempunyai kebenaran untuk tambah kumpulan.");
      return;
    }

    setEditingGroup(null);
    setForm({
      group_name: "",
      school_name: "",
      leader_name: "",
      status: "Aktif",
    });
    setShowFormModal(true);
  }

  function openEditModal(group: Group) {
    if (!canEditGroup) {
      alert("Anda tidak mempunyai kebenaran untuk edit kumpulan.");
      return;
    }

    setEditingGroup(group);
    setForm({
      group_name: group.group_name || "",
      school_name: group.school_name || "",
      leader_name: group.leader_name || "",
      status: group.status || "Aktif",
    });
    setShowFormModal(true);
  }

  async function handleSaveGroup(e: React.FormEvent) {
    e.preventDefault();

    if (!canAddGroup && !editingGroup) {
      alert("Anda tidak mempunyai kebenaran untuk tambah kumpulan.");
      return;
    }

    if (!canEditGroup && editingGroup) {
      alert("Anda tidak mempunyai kebenaran untuk edit kumpulan.");
      return;
    }

    if (!districtEnvironmentId) {
      alert("Ralat: district_environment_id pengguna tidak dijumpai.");
      return;
    }

    if (!form.group_name.trim()) {
      alert("Nama kumpulan wajib diisi.");
      return;
    }

    setSaving(true);

    const payload = {
      group_name: form.group_name.trim(),
      school_name: form.school_name.trim() || null,
      leader_name: form.leader_name.trim() || null,
      status: form.status,
      district: userDistrict,
      district_environment_id: districtEnvironmentId,
      updated_at: new Date().toISOString(),
    };

    if (editingGroup) {
      const { error } = await supabase
        .from("groups")
        .update(payload)
        .eq("id", editingGroup.id)
        .eq("district_environment_id", districtEnvironmentId)
        .is("deleted_at", null);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await insertAuditLog(
        "Kemaskini Kumpulan",
        `${currentUser.role} mengemaskini kumpulan ${payload.group_name}.`,
        editingGroup.id,
        editingGroup,
        payload
      );
    } else {
      const { data, error } = await supabase
        .from("groups")
        .insert({
          ...payload,
          total_members: 0,
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
        "Tambah Kumpulan",
        `${currentUser.role} menambah kumpulan ${payload.group_name}.`,
        data?.id,
        null,
        data
      );
    }

    setSaving(false);
    setShowFormModal(false);
    setEditingGroup(null);
    await fetchGroups();
  }

  async function handleDeactivateGroup(group: Group) {
    if (!canDeactivateGroup) {
      alert("Anda tidak mempunyai kebenaran untuk nyahaktif kumpulan.");
      return;
    }

    const confirmDeactivate = window.confirm(
      `Nyahaktif kumpulan ${group.group_name}? Data tidak akan dipadam kekal.`
    );

    if (!confirmDeactivate) return;

    const deactivatedAt = new Date().toISOString();

    const { error } = await supabase
      .from("groups")
      .update({
        status: "Tidak Aktif",
        deleted_at: deactivatedAt,
        updated_at: deactivatedAt,
      })
      .eq("id", group.id)
      .eq("district_environment_id", districtEnvironmentId)
      .is("deleted_at", null);

    if (error) {
      alert(error.message);
      return;
    }

    await insertAuditLog(
      "Nyahaktif Kumpulan",
      `${currentUser.role} menyahaktif kumpulan ${group.group_name}.`,
      group.id,
      group,
      {
        status: "Tidak Aktif",
        deleted_at: deactivatedAt,
      }
    );

    await fetchGroups();
  }

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        (group.group_name || "").toLowerCase().includes(keyword) ||
        (group.school_name || "").toLowerCase().includes(keyword) ||
        (group.leader_name || "").toLowerCase().includes(keyword);

      const groupDisplayStatus =
        !group.leader_name || group.leader_name === "—"
          ? "Perlu Pemimpin"
          : group.status || "Aktif";

      const matchStatus =
        statusFilter === "Semua Status" ||
        group.status === statusFilter ||
        groupDisplayStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [groups, search, statusFilter]);

  const activeGroups = groups.filter((group) => {
    return group.status === "Aktif";
  }).length;

  const inactiveGroups = groups.filter((group) => {
    return group.status === "Tidak Aktif";
  }).length;

  const needLeaderGroups = groups.filter((group) => {
    return !group.leader_name || group.leader_name === "—";
  }).length;

  const totalMembers = groups.reduce((sum, group) => {
    return sum + (group.actual_member_count || 0);
  }, 0);

  function getGroupMembers(group: Group) {
    return members.filter((member) => {
      return (
        member.group_id === group.id ||
        member.group_name === group.group_name
      );
    });
  }

  if (!canViewGroups) {
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
          <h2 className="fw-bold mb-1">Kumpulan / Sekolah</h2>
          <p className="text-muted mb-0">
            Pemantauan kumpulan dalam daerah sendiri sahaja.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-success" onClick={fetchGroups}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>

          {canAddGroup && (
            <button className="btn btn-success" onClick={openAddModal}>
              <i className="bi bi-plus-circle me-1"></i>
              Tambah Kumpulan
            </button>
          )}
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Jumlah Kumpulan</div>
              <h3 className="fw-bold mb-0">{groups.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Kumpulan Aktif</div>
              <h3 className="fw-bold text-success mb-0">{activeGroups}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Perlu Pemimpin</div>
              <h3 className="fw-bold text-warning mb-0">
                {needLeaderGroups}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <div className="text-muted small">Jumlah Ahli</div>
              <h3 className="fw-bold text-primary mb-0">{totalMembers}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3">
            <div className="col-md-8">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  className="form-control ps-5 rounded-3"
                  placeholder="Cari kumpulan, sekolah atau pemimpin..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-4">
              <select
                className="form-select rounded-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                <option>Aktif</option>
                <option>Tidak Aktif</option>
                <option>Perlu Pemimpin</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small text-muted">
              <tr>
                <th className="px-4 py-3">Kumpulan</th>
                <th className="px-4 py-3">Sekolah</th>
                <th className="px-4 py-3">Pemimpin</th>
                <th className="px-4 py-3">Ahli Sebenar</th>
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
                      Memuatkan kumpulan...
                    </p>
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada kumpulan dijumpai.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => {
                  const displayStatus =
                    !group.leader_name || group.leader_name === "—"
                      ? "Perlu Pemimpin"
                      : group.status || "Aktif";

                  return (
                    <tr key={group.id}>
                      <td className="px-4 py-3">
                        <div className="fw-semibold">{group.group_name}</div>
                        <small className="text-muted">
                          Kod: {group.id.slice(0, 8)}
                        </small>
                      </td>

                      <td className="px-4 py-3">
                        {group.school_name || "-"}
                      </td>

                      <td className="px-4 py-3">
                        {group.leader_name && group.leader_name !== "—" ? (
                          group.leader_name
                        ) : (
                          <span className="text-warning">
                            Belum ditetapkan
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="fw-semibold">
                          {group.actual_member_count || 0}
                        </div>
                        <small className="text-muted">
                          Aktif: {group.active_member_count || 0}
                        </small>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`badge rounded-pill px-3 py-2 ${
                            displayStatus === "Aktif"
                              ? "bg-success-subtle text-success border border-success-subtle"
                              : displayStatus === "Perlu Pemimpin"
                              ? "bg-warning-subtle text-warning border border-warning-subtle"
                              : "bg-secondary-subtle text-secondary border border-secondary-subtle"
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-end">
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-light border rounded-3"
                            onClick={() => setSelectedGroup(group)}
                            title="Lihat"
                          >
                            <i className="bi bi-eye"></i>
                          </button>

                          {canEditGroup && (
                            <button
                              className="btn btn-sm btn-light border rounded-3"
                              onClick={() => openEditModal(group)}
                              title="Edit"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          )}

                          {canDeactivateGroup && (
                            <button
                              className="btn btn-sm btn-light border rounded-3 text-warning"
                              onClick={() => handleDeactivateGroup(group)}
                              title="Nyahaktif"
                            >
                              <i className="bi bi-slash-circle"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredGroups.length} daripada {groups.length} rekod
        </div>
      </div>

      {selectedGroup && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Kumpulan</h5>

                <button
                  className="btn-close"
                  onClick={() => setSelectedGroup(null)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <div className="text-muted small">Kumpulan</div>
                      <div className="fw-bold">{selectedGroup.group_name}</div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <div className="text-muted small">Sekolah</div>
                      <div className="fw-bold">
                        {selectedGroup.school_name || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <div className="text-muted small">Pemimpin</div>
                      <div className="fw-bold">
                        {selectedGroup.leader_name || "Belum ditetapkan"}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <div className="text-muted small">Jumlah Ahli</div>
                      <div className="fw-bold">
                        {selectedGroup.actual_member_count || 0}
                      </div>
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold mb-3">Senarai Ahli Kumpulan</h6>

                <div className="table-responsive border rounded-4">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Nama</th>
                        <th>No. IC/MyKid</th>
                        <th>Kategori</th>
                        <th>Jantina</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {getGroupMembers(selectedGroup).length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center text-muted py-4"
                          >
                            Tiada ahli dalam kumpulan ini.
                          </td>
                        </tr>
                      ) : (
                        getGroupMembers(selectedGroup).map((member) => (
                          <tr key={member.id}>
                            <td>{member.full_name}</td>
                            <td>{member.ic_number || "-"}</td>
                            <td>
                              {member.scout_category ||
                                member.category ||
                                "-"}
                            </td>
                            <td>{member.gender || "-"}</td>
                            <td>
                              <span
                                className={`badge rounded-pill ${
                                  member.status === "Aktif"
                                    ? "bg-success-subtle text-success"
                                    : "bg-secondary-subtle text-secondary"
                                }`}
                              >
                                {member.status || "Aktif"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="small text-muted mt-3">
                  Tarikh daftar:{" "}
                  {selectedGroup.created_at
                    ? new Date(selectedGroup.created_at).toLocaleDateString(
                        "ms-MY"
                      )
                    : "-"}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedGroup(null)}
                >
                  Tutup
                </button>

                {canEditGroup && (
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      setSelectedGroup(null);
                      openEditModal(selectedGroup);
                    }}
                  >
                    Edit Kumpulan
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
          <div className="modal-dialog modal-dialog-centered">
            <form
              className="modal-content border-0 rounded-4"
              onSubmit={handleSaveGroup}
            >
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingGroup ? "Edit Kumpulan" : "Tambah Kumpulan"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowFormModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Nama Kumpulan
                  </label>
                  <input
                    className="form-control rounded-3"
                    value={form.group_name}
                    onChange={(e) =>
                      setForm({ ...form, group_name: e.target.value })
                    }
                    placeholder="Contoh: KP 01"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Nama Sekolah
                  </label>
                  <input
                    className="form-control rounded-3"
                    value={form.school_name}
                    onChange={(e) =>
                      setForm({ ...form, school_name: e.target.value })
                    }
                    placeholder="Contoh: SMK Seksyen 7"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Nama Pemimpin
                  </label>
                  <input
                    className="form-control rounded-3"
                    value={form.leader_name}
                    onChange={(e) =>
                      setForm({ ...form, leader_name: e.target.value })
                    }
                    placeholder="Nama pemimpin kumpulan"
                  />
                </div>

                <div className="mb-3">
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
                    <option>Perlu Pemimpin</option>
                  </select>
                </div>

                <div className="alert alert-light border small mb-0">
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