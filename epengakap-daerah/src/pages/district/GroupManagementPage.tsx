import { useEffect, useState } from "react";
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
};

type LeaderUser = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  status: string;
};

export default function GroupManagementPage() {
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);

  const [editingGroup, setEditingGroup] = useState<ScoutGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ScoutGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScoutGroup | null>(null);

  const [search, setSearch] = useState("");

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [groupActivities, setGroupActivities] = useState<any[]>([]);

  const [form, setForm] = useState({
    group_name: "",
    school_name: "",
    leader_user_id: "",
    leader_name: "",
    total_members: "",
    status: "Aktif",
  });

  useEffect(() => {
    fetchGroups();
    fetchActiveGroupLeaders();
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
    return (
      group.group_name.toLowerCase().includes(search.toLowerCase()) ||
      group.school_name.toLowerCase().includes(search.toLowerCase()) ||
      (group.leader_name || "").toLowerCase().includes(search.toLowerCase())
    );
  });

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
      group_name: group.group_name,
      school_name: group.school_name,
      leader_user_id: group.leader_user_id || "",
      leader_name: group.leader_name || "",
      total_members: String(group.total_members || 0),
      status: group.status,
    });

    setShowManageModal(false);
    setShowGroupModal(true);
  }

  function openDeleteModal(group: ScoutGroup) {
    setDeleteTarget(group);
    setShowManageModal(false);
    setShowDeleteModal(true);
  }

  async function saveGroup() {
    if (!form.group_name.trim() || !form.school_name.trim()) {
      alert("Sila isi nama kumpulan dan sekolah.");
      return;
    }

    const payload = {
      group_name: form.group_name,
      school_name: form.school_name,
      leader_user_id: form.leader_user_id || null,
      leader_name: form.leader_name || null,
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

    await addAuditLog(
      editingGroup ? "UPDATE" : "CREATE",
      "Kumpulan / Sekolah",
      editingGroup
        ? `Kemaskini kumpulan ${form.group_name}`
        : `Tambah kumpulan ${form.group_name}`
    );
    await fetchGroups();
    resetForm();
    setShowGroupModal(false);
  }

  async function deleteGroup() {
    if (!deleteTarget) return;

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      alert(error.message);
      return;
    }

    await addAuditLog(
      "Delete",
      "Kumpulan / Sekolah",
      `Padam kumpulan ${deleteTarget.group_name}`
    );
    await fetchGroups();
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setSelectedGroup(null);
  }

async function viewMembers(group: ScoutGroup) {
  const possibleGroupNames = [
    group.group_name,
    group.school_name,
  ].filter(Boolean);

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .in("group_name", possibleGroupNames);

  if (error) {
    alert(error.message);
    return;
  }

  setGroupMembers(data || []);
  setShowMembersModal(true);
}

async function viewActivities(group: ScoutGroup) {
  const possibleGroupNames = [
    group.group_name,
    group.school_name,
  ].filter(Boolean);

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .in("group_name", possibleGroupNames)
    .order("activity_date", { ascending: true });

  if (error) {
    alert(error.message);
    return;
  }

  setGroupActivities(data || []);
  setShowActivitiesModal(true);
}

async function fetchActiveGroupLeaders() {
  const { data, error } = await supabase
    .from("system_users")
    .select("id, full_name, email, role, status")
    .in("role", ["Pemimpin Kumpulan", "group_leader"])
    .in("status", ["Aktif", "active"])
    .order("full_name", { ascending: true });

  if (error) {
    alert(error.message);
    return;
  }

  setLeaders(data || []);
}

  return (
    <DashboardLayout role="district">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Pengurusan Kumpulan / Sekolah</h2>
        <p className="text-muted mb-0">
          Urus kumpulan pengakap dan sekolah dalam daerah.
        </p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body border-bottom">
          <div className="row g-3 align-items-center">
            <div className="col-md-9">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  className="form-control"
                  placeholder="Cari kumpulan atau sekolah..."
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
          {filteredGroups.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              Tiada kumpulan dijumpai.
            </div>
          ) : (
            <div className="row g-4">
              {filteredGroups.map((group) => (
                <div className="col-md-6 col-xl-4" key={group.id}>
                  <div className="card h-100 border shadow-sm">
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
                            group.status === "Aktif"
                              ? "bg-success-subtle text-success"
                              : "bg-warning-subtle text-warning"
                          }`}
                        >
                          {group.status === "Aktif"
                            ? "Aktif"
                            : "Perlu Semakan"}
                        </span>
                      </div>

                      <div className="mb-4">
                        <div className="text-muted small">Pemimpin Kumpulan</div>
                        <div className="fw-semibold">
                          {group.leader_name || "—"}
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
            <div className="modal-content border-0">
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
                        selectedGroup.status === "Aktif"
                          ? "bg-success"
                          : "bg-warning text-dark"
                      }`}
                    >
                      {selectedGroup.status}
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
                    <i className="bi bi-trash me-1"></i>
                    Padam Kumpulan
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
            <div className="modal-content border-0">
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
                      placeholder="KP 01 Petaling"
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
                      placeholder="SMK Taman SEA"
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
                        Tiada Pemimpin Kumpulan aktif dijumpai. Sila tambah user role Pemimpin Kumpulan dahulu.
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
                      placeholder="86"
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
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowGroupModal(false);
                    resetForm();
                  }}
                >
                  Tutup
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={saveGroup}
                >
                  {editingGroup ? "Kemaskini Kumpulan" : "Simpan Kumpulan"}
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
            <div className="modal-content border-0">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  Padam Kumpulan
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
                <p className="mb-1">Adakah anda pasti mahu padam kumpulan ini?</p>
                <strong>{deleteTarget.group_name}</strong>
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

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deleteGroup}
                >
                  Padam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMembersModal && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
          
              <div className="modal-header">
                <h5 className="fw-bold">Senarai Ahli Kumpulan</h5>
          
                <button
                  className="btn-close"
                  onClick={() => setShowMembersModal(false)}
                />
              </div>
          
              <div className="modal-body">
          
                {groupMembers.length === 0 ? (
                  <p className="text-muted">
                    Tiada ahli dalam kumpulan ini.
                  </p>
                ) : (
                  <table className="table">
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
                          <td>{member.age}</td>
                          <td>{member.gender}</td>
                          <td>{member.status}</td>
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
            <div className="modal-content border-0">
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
                          <td>{activity.activity_name}</td>
                          <td>{activity.activity_date}</td>
                          <td>{activity.location || "-"}</td>
                          <td>
                            <span className="badge bg-primary">
                              {activity.status}
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