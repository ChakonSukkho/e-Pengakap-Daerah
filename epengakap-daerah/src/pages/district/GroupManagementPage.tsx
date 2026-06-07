import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { addAuditLog } from "../../utils/auditLog";

type ScoutGroup = {
  id: string;
  group_name: string;
  school_name: string;
  leader_user_id: string | null;
  leader_name: string | null;
  total_members: number;
  status: string;
  district?: string | null;
  district_environment_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

type LeaderUser = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  status: string;
  district?: string | null;
  district_environment_id?: string | null;
};

type GroupForm = {
  group_name: string;
  school_name: string;
  leader_user_id: string;
  leader_name: string;
  total_members: string;
  status: string;
};

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

  if (
    value === "tidak aktif" ||
    value === "inactive" ||
    value === "suspended" ||
    value === "digantung"
  ) {
    return "Tidak Aktif";
  }

  return status || "Aktif";
}

function isActive(status?: string | null) {
  return normalizeStatus(status) === "Aktif";
}

function formatDate(date?: string | null) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function GroupManagementPage() {
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);

  const [editingGroup, setEditingGroup] = useState<ScoutGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ScoutGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScoutGroup | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);

  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupActivities, setGroupActivities] = useState<any[]>([]);

  const [form, setForm] = useState<GroupForm>({
    group_name: "",
    school_name: "",
    leader_user_id: "",
    leader_name: "",
    total_members: "",
    status: "Aktif",
  });

  const currentUser = useMemo(() => getCurrentUser(), []);

  const districtEnvironmentId = currentUser.district_environment_id || null;

  const district =
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    null;

  useEffect(() => {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      setLoading(false);
      return;
    }

    fetchGroups();
    fetchActiveGroupLeaders();
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

  async function fetchGroups() {
    setLoading(true);

    let query = supabase
      .from("groups")
      .select(
        "id, group_name, school_name, leader_user_id, leader_name, total_members, status, district, district_environment_id, created_at, updated_at, deleted_at"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setGroups([]);
      setLoading(false);
      return;
    }

    setGroups(data || []);
    setLoading(false);
  }

  async function fetchActiveGroupLeaders() {
    let query = supabase
      .from("system_users")
      .select("id, full_name, email, role, status, district, district_environment_id")
      .in("role", ["Pemimpin Kumpulan", "group_leader"])
      .in("status", ["Aktif", "active"])
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setLeaders([]);
      return;
    }

    setLeaders(data || []);
  }

  const filteredGroups = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return groups.filter((group) => {
      return (
        (group.group_name || "").toLowerCase().includes(keyword) ||
        (group.school_name || "").toLowerCase().includes(keyword) ||
        (group.leader_name || "").toLowerCase().includes(keyword)
      );
    });
  }, [groups, search]);

  function resetForm() {
    setEditingGroup(null);

    setForm({
      group_name: "",
      school_name: "",
      leader_user_id: "",
      leader_name: "",
      total_members: "",
      status: "Aktif",
    });
  }

  function openAddModal() {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      return;
    }

    resetForm();
    setShowGroupModal(true);
  }

  function openManageModal(group: ScoutGroup) {
    setSelectedGroup(group);
    setShowManageModal(true);
  }

  function openEditModal(group: ScoutGroup) {
    setEditingGroup(group);

    setForm({
      group_name: group.group_name || "",
      school_name: group.school_name || "",
      leader_user_id: group.leader_user_id || "",
      leader_name: group.leader_name || "",
      total_members: String(group.total_members || 0),
      status: normalizeStatus(group.status),
    });

    setShowManageModal(false);
    setShowGroupModal(true);
  }

  function openDeleteModal(group: ScoutGroup) {
    setDeleteTarget(group);
    setShowManageModal(false);
    setShowDeleteModal(true);
  }

  async function checkDuplicateGroupName(ignoreGroupId?: string) {
    let query = supabase
      .from("groups")
      .select("id")
      .ilike("group_name", form.group_name.trim())
      .is("deleted_at", null)
      .limit(1);

    query = applyDistrictScope(query);

    if (ignoreGroupId) {
      query = query.neq("id", ignoreGroupId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
  }

  function validateForm() {
    if (!form.group_name.trim()) {
      alert("Sila isi nama kumpulan.");
      return false;
    }

    if (!form.school_name.trim()) {
      alert("Sila isi nama sekolah.");
      return false;
    }

    const totalMembers = Number(form.total_members || 0);

    if (Number.isNaN(totalMembers) || totalMembers < 0) {
      alert("Jumlah ahli tidak sah.");
      return false;
    }

    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      return false;
    }

    return true;
  }

  async function saveGroup() {
    if (!validateForm()) return;

    setSaving(true);

    const isDuplicate = await checkDuplicateGroupName(editingGroup?.id);

    if (isDuplicate) {
      alert("Nama kumpulan ini sudah wujud dalam daerah ini.");
      setSaving(false);
      return;
    }

    const selectedLeader = leaders.find(
      (leader) => leader.id === form.leader_user_id
    );

    const payload = {
      group_name: form.group_name.trim(),
      school_name: form.school_name.trim(),
      leader_user_id: form.leader_user_id || null,
      leader_name: selectedLeader?.full_name || form.leader_name || null,
      total_members: Number(form.total_members || 0),
      status: form.status,
      district: district || null,
      district_environment_id: districtEnvironmentId || null,
      updated_at: new Date().toISOString(),
    };

    if (editingGroup) {
      let query = supabase
        .from("groups")
        .update(payload)
        .eq("id", editingGroup.id);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "UPDATE",
        "Kumpulan / Sekolah",
        `Kemaskini kumpulan ${form.group_name}`
      );
    } else {
      const { error } = await supabase.from("groups").insert({
        ...payload,
        created_at: new Date().toISOString(),
      });

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      await addAuditLog(
        "CREATE",
        "Kumpulan / Sekolah",
        `Tambah kumpulan ${form.group_name}`
      );
    }

    await fetchGroups();
    resetForm();
    setShowGroupModal(false);
    setSaving(false);
  }

  async function deactivateGroup() {
    if (!deleteTarget) return;

    setSaving(true);

    let query = supabase
      .from("groups")
      .update({
        status: "Tidak Aktif",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deleteTarget.id);

    query = applyDistrictScope(query);

    const { error } = await query;

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "DEACTIVATE",
      "Kumpulan / Sekolah",
      `Nyahaktif kumpulan ${deleteTarget.group_name}`
    );

    await fetchGroups();
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setSaving(false);
  }

  async function viewMembers(group: ScoutGroup) {
    let query = supabase
      .from("members")
      .select("*")
      .is("deleted_at", null)
      .eq("group_id", group.id)
      .order("full_name", { ascending: true });

    query = applyDistrictScope(query);

    let { data, error } = await query;

    if (error) {
      const possibleGroupNames = [group.group_name, group.school_name].filter(
        Boolean
      );

      let fallbackQuery = supabase
        .from("members")
        .select("*")
        .is("deleted_at", null)
        .in("group_name", possibleGroupNames)
        .order("full_name", { ascending: true });

      fallbackQuery = applyDistrictScope(fallbackQuery);

      const fallbackResult = await fallbackQuery;
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      alert(error.message);
      return;
    }

    setGroupMembers(data || []);
    setShowMembersModal(true);
  }

  async function viewActivities(group: ScoutGroup) {
    const possibleGroupNames = [group.group_name, group.school_name].filter(
      Boolean
    );

    let query = supabase
      .from("activities")
      .select("*")
      .in("group_name", possibleGroupNames)
      .order("activity_date", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return;
    }

    setGroupActivities(data || []);
    setShowActivitiesModal(true);
  }

  return (
    <DashboardLayout role="district">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Pengurusan Kumpulan / Sekolah</h2>
        <p className="text-muted mb-0">
          Urus kumpulan pengakap dan sekolah dalam daerah.
        </p>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body border-bottom">
          <div className="row g-3 align-items-center">
            <div className="col-md-9">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  className="form-control"
                  placeholder="Cari kumpulan, sekolah atau pemimpin..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3 text-md-end">
              <button
                type="button"
                className="btn btn-success w-100"
                onClick={openAddModal}
              >
                <i className="bi bi-plus-lg me-1"></i>
                Tambah Kumpulan
              </button>
            </div>
          </div>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success"></div>
              <p className="text-muted mt-3 mb-0">
                Memuatkan senarai kumpulan...
              </p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              Tiada kumpulan dijumpai.
            </div>
          ) : (
            <div className="row g-4">
              {filteredGroups.map((group) => (
                <div className="col-md-6 col-xl-4" key={group.id}>
                  <div className="card h-100 border shadow-sm rounded-4">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h5 className="fw-bold mb-1">{group.group_name}</h5>
                          <div className="text-muted small">
                            {group.school_name}
                          </div>
                        </div>

                        <span
                          className={`badge ${
                            isActive(group.status)
                              ? "bg-success-subtle text-success"
                              : "bg-warning-subtle text-warning"
                          }`}
                        >
                          {normalizeStatus(group.status)}
                        </span>
                      </div>

                      <div className="mb-4">
                        <div className="text-muted small">
                          Pemimpin Kumpulan
                        </div>
                        <div className="fw-semibold">
                          {group.leader_name || "Belum ditetapkan"}
                        </div>
                      </div>

                      <hr />

                      <div className="d-flex justify-content-between align-items-center">
                        <div className="text-success">
                          <i className="bi bi-people me-1"></i>
                          <strong>{group.total_members || 0}</strong>{" "}
                          <span className="text-muted">ahli</span>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => openManageModal(group)}
                        >
                          <i className="bi bi-pencil-square me-1"></i>
                          Urus
                        </button>
                      </div>

                      <div className="small text-muted mt-3">
                        <i className="bi bi-clock me-1"></i>
                        Dicipta: {formatDate(group.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showManageModal && selectedGroup && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Urus Kumpulan</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowManageModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <h5 className="fw-bold mb-1">{selectedGroup.group_name}</h5>
                <p className="text-muted">{selectedGroup.school_name}</p>

                <div className="list-group list-group-flush mb-3">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Pemimpin</span>
                    <strong>{selectedGroup.leader_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Jumlah Ahli</span>
                    <strong>{selectedGroup.total_members || 0}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    <span
                      className={`badge ${
                        isActive(selectedGroup.status)
                          ? "bg-success"
                          : "bg-warning text-dark"
                      }`}
                    >
                      {normalizeStatus(selectedGroup.status)}
                    </span>
                  </div>
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-success"
                    onClick={() => openEditModal(selectedGroup)}
                  >
                    <i className="bi bi-pencil-square me-1"></i>
                    Edit Maklumat Kumpulan
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => viewMembers(selectedGroup)}
                  >
                    <i className="bi bi-people me-1"></i>
                    Lihat Senarai Ahli
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => viewActivities(selectedGroup)}
                  >
                    <i className="bi bi-calendar-event me-1"></i>
                    Lihat Aktiviti Kumpulan
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => openDeleteModal(selectedGroup)}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    Nyahaktif Kumpulan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingGroup ? "Edit Kumpulan" : "Tambah Kumpulan"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowGroupModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                ></button>
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
                      placeholder="KP 01 Kulim"
                      disabled={saving}
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
                      placeholder="SMK Kulim"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Pemimpin Kumpulan</label>

                    <select
                      className="form-select"
                      value={form.leader_user_id}
                      onChange={(e) => {
                        const selectedLeader = leaders.find(
                          (leader) => leader.id === e.target.value
                        );

                        setForm({
                          ...form,
                          leader_user_id: e.target.value,
                          leader_name: selectedLeader?.full_name || "",
                        });
                      }}
                      disabled={saving}
                    >
                      <option value="">Pilih Pemimpin Kumpulan</option>

                      {leaders.map((leader) => (
                        <option key={leader.id} value={leader.id}>
                          {leader.full_name}
                          {leader.email ? ` (${leader.email})` : ""}
                        </option>
                      ))}
                    </select>

                    {leaders.length === 0 && (
                      <small className="text-muted">
                        Tiada Pemimpin Kumpulan aktif dalam daerah ini.
                      </small>
                    )}
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
                      placeholder="0"
                      min={0}
                      disabled={saving}
                    />
                    <small className="text-muted">
                      Boleh diisi manual atau dikemaskini kemudian.
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                      disabled={saving}
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
                    setShowGroupModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Tutup
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={saveGroup}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editingGroup
                    ? "Kemaskini Kumpulan"
                    : "Simpan Kumpulan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  Nyahaktif Kumpulan
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu nyahaktif kumpulan ini?
                </p>
                <strong>{deleteTarget.group_name}</strong>
                <p className="text-muted small mt-2 mb-0">
                  Kumpulan tidak dipadam kekal. Status akan ditukar kepada Tidak
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
                  onClick={deactivateGroup}
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Nyahaktif"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMembersModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="fw-bold mb-0">Senarai Ahli Kumpulan</h5>

                <button
                  className="btn-close"
                  onClick={() => setShowMembersModal(false)}
                />
              </div>

              <div className="modal-body">
                {groupMembers.length === 0 ? (
                  <p className="text-muted mb-0">
                    Tiada ahli dalam kumpulan ini.
                  </p>
                ) : (
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Umur</th>
                        <th>Jantina</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {groupMembers.map((member) => (
                        <tr key={member.id}>
                          <td>{member.full_name}</td>
                          <td>{member.age || "-"}</td>
                          <td>{member.gender || "-"}</td>
                          <td>
                            <span
                              className={`badge ${
                                isActive(member.status)
                                  ? "bg-success"
                                  : "bg-secondary"
                              }`}
                            >
                              {normalizeStatus(member.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showActivitiesModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Aktiviti Kumpulan</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowActivitiesModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                {groupActivities.length === 0 ? (
                  <p className="text-muted mb-0">
                    Tiada aktiviti untuk kumpulan ini.
                  </p>
                ) : (
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Aktiviti</th>
                        <th>Tarikh</th>
                        <th>Lokasi</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {groupActivities.map((activity) => (
                        <tr key={activity.id}>
                          <td>
                            {activity.activity_name ||
                              activity.title ||
                              "Aktiviti Tanpa Nama"}
                          </td>
                          <td>
                            {formatDate(
                              activity.activity_date ||
                                activity.date ||
                                activity.created_at
                            )}
                          </td>
                          <td>{activity.location || "-"}</td>
                          <td>
                            <span className="badge bg-primary">
                              {activity.status || "-"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}