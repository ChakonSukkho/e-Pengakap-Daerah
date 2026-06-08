import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";
import { addAuditLog } from "../../utils/auditLog";

type ScoutGroup = {
  id: string;
  group_name: string;
  school_name: string | null;
  leader_user_id: string | null;
  leader_name: string | null;
  total_members: number | null;
  status: string | null;
  district: string | null;
  district_environment_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type LeaderUser = {
  id: string;
  full_name: string;
  email: string | null;
};

type GroupForm = {
  group_name: string;
  leader_user_id: string;
  leader_name: string;
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
  if (value === "tidak aktif" || value === "inactive") return "Tidak Aktif";

  return status || "Aktif";
}

function isActive(status?: string | null) {
  return normalizeStatus(status) === "Aktif";
}

function formatDate(date?: string | null) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function GroupManagementPage() {
  const navigate = useNavigate();

  const currentUser = useMemo(() => getCurrentUser(), []);

  const districtEnvironmentId = currentUser.district_environment_id || null;

  const district =
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    null;

  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ScoutGroup | null>(null);

  const [form, setForm] = useState<GroupForm>({
    group_name: "",
    leader_user_id: "",
    leader_name: "",
    status: "Aktif",
  });

  useEffect(() => {
    if (!districtEnvironmentId && !district) {
      alert(
        "Akaun ini belum mempunyai district environment. Sila hubungi Super Admin."
      );
      setLoading(false);
      return;
    }

    fetchGroups();
    fetchLeaders();
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

    try {
      let query = supabase
        .from("groups")
        .select(
          `
          id,
          group_name,
          school_name,
          leader_user_id,
          leader_name,
          total_members,
          status,
          district,
          district_environment_id,
          created_at,
          updated_at,
          deleted_at
        `
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      query = applyDistrictScope(query);

      const { data, error } = await query;

      if (error) throw error;

      const groupList = (data || []) as ScoutGroup[];

      const groupsWithCounts = await attachMemberCounts(groupList);

      setGroups(groupsWithCounts);
    } catch (error: any) {
      console.error("Fetch groups error:", error);
      alert(error?.message || "Gagal memuatkan senarai kumpulan.");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  async function attachMemberCounts(groupList: ScoutGroup[]) {
    if (groupList.length === 0) return [];

    let memberQuery = supabase
      .from("members")
      .select("id, group_id, group_name, status")
      .is("deleted_at", null)
      .in("status", ["Aktif", "active"]);

    memberQuery = applyDistrictScope(memberQuery);

    const { data, error } = await memberQuery;

    if (error) {
      console.warn("Member count error:", error.message);
      return groupList;
    }

    const members = data || [];

    return groupList.map((group) => {
      const count = members.filter((member: any) => {
        if (member.group_id && member.group_id === group.id) return true;

        return (
          !member.group_id &&
          member.group_name &&
          member.group_name === group.group_name
        );
      }).length;

      return {
        ...group,
        total_members: count,
      };
    });
  }

  async function fetchLeaders() {
    try {
      let query = supabase
        .from("system_users")
        .select("id, full_name, email")
        .in("role", ["Pemimpin Kumpulan", "group_leader"])
        .in("status", ["Aktif", "active"])
        .is("deleted_at", null)
        .order("full_name", { ascending: true });

      query = applyDistrictScope(query);

      const { data, error } = await query;

      if (error) throw error;

      setLeaders((data || []) as LeaderUser[]);
    } catch (error: any) {
      console.warn("Fetch leaders error:", error?.message);
      setLeaders([]);
    }
  }

  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return groups.filter((group) => {
      const matchSearch =
        !keyword ||
        (group.group_name || "").toLowerCase().includes(keyword) ||
        (group.leader_name || "").toLowerCase().includes(keyword);

      const matchStatus =
        !statusFilter || normalizeStatus(group.status) === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [groups, search, statusFilter]);

  function resetForm() {
    setEditingGroup(null);

    setForm({
      group_name: "",
      leader_user_id: "",
      leader_name: "",
      status: "Aktif",
    });
  }

  function openAddModal() {
    resetForm();
    setShowGroupModal(true);
  }

  function openEditModal(group: ScoutGroup) {
    setEditingGroup(group);

    setForm({
      group_name: group.group_name || "",
      leader_user_id: group.leader_user_id || "",
      leader_name: group.leader_name || "",
      status: normalizeStatus(group.status),
    });

    setShowGroupModal(true);
  }

  function closeModal() {
    setShowGroupModal(false);
    resetForm();
  }

  function validateForm() {
    if (!form.group_name.trim()) {
      alert("Sila isi nama kumpulan.");
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

  async function checkDuplicateGroupName() {
    let query = supabase
      .from("groups")
      .select("id")
      .ilike("group_name", form.group_name.trim())
      .is("deleted_at", null)
      .limit(1);

    query = applyDistrictScope(query);

    if (editingGroup) {
      query = query.neq("id", editingGroup.id);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
  }

  async function saveGroup() {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const duplicate = await checkDuplicateGroupName();

      if (duplicate) {
        alert("Nama kumpulan ini sudah wujud dalam daerah ini.");
        setSaving(false);
        return;
      }

      const selectedLeader = leaders.find(
        (leader) => leader.id === form.leader_user_id
      );

      const payload = {
        group_name: form.group_name.trim(),
        school_name: null,
        leader_user_id: form.leader_user_id || null,
        leader_name: selectedLeader?.full_name || form.leader_name || null,
        status: form.status,
        district: district || null,
        district_environment_id: districtEnvironmentId || null,
        updated_at: new Date().toISOString(),
      };

      if (editingGroup) {
        let query = supabase
          .from("groups")
          .update(payload)
          .eq("id", editingGroup.id)
          .is("deleted_at", null);

        query = applyDistrictScope(query);

        const { error } = await query;

        if (error) throw error;

        await addAuditLog(
          "UPDATE",
          "Kumpulan / Sekolah",
          `Kemaskini kumpulan ${payload.group_name}`
        );

        alert("Kumpulan berjaya dikemaskini.");
      } else {
        const insertPayload = {
          ...payload,
          total_members: 0,
          created_at: new Date().toISOString(),
          deleted_at: null,
        };

        const { error } = await supabase.from("groups").insert(insertPayload);

        if (error) throw error;

        await addAuditLog(
          "CREATE",
          "Kumpulan / Sekolah",
          `Tambah kumpulan ${payload.group_name}`
        );

        alert("Kumpulan berjaya ditambah.");
      }

      closeModal();
      await fetchGroups();
    } catch (error: any) {
      console.error("Save group error:", error);
      alert(error?.message || "Gagal simpan kumpulan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="district">
      <style>
        {`
          .group-card {
            border: 0;
            border-radius: 1rem;
            box-shadow: 0 0.25rem 1rem rgba(15, 23, 42, 0.06);
            transition: transform .15s ease, box-shadow .15s ease;
            cursor: pointer;
          }

          .group-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 0.5rem 1.25rem rgba(15, 23, 42, 0.1);
          }

          .group-icon {
            width: 46px;
            height: 46px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #ecfdf5;
            color: #047857;
            font-size: 1.25rem;
          }
        `}
      </style>

      <div className="mb-4">
        <h2 className="fw-bold mb-1">Pengurusan Kumpulan / Sekolah</h2>
        <p className="text-muted mb-0">
          Urus kumpulan pengakap dalam daerah.
        </p>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-lg-7">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  className="form-control"
                  placeholder="Cari kumpulan atau pemimpin..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-2">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Tidak Aktif">Tidak Aktif</option>
              </select>
            </div>

            <div className="col-lg-3">
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
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success"></div>
          <p className="text-muted mt-3 mb-0">
            Memuatkan senarai kumpulan...
          </p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center text-muted py-5">
            <i className="bi bi-diagram-3 fs-1 d-block mb-2"></i>
            Tiada kumpulan dijumpai.
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredGroups.map((group) => (
            <div className="col-md-6 col-xl-4" key={group.id}>
              <div
                className="card group-card h-100"
                onClick={() => navigate(`/district/groups/${group.id}`)}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="group-icon">
                      <i className="bi bi-diagram-3"></i>
                    </div>

                    <span
                      className={`badge ${
                        isActive(group.status)
                          ? "bg-success-subtle text-success"
                          : "bg-secondary-subtle text-secondary"
                      }`}
                    >
                      {normalizeStatus(group.status)}
                    </span>
                  </div>

                  <h5 className="fw-bold mb-1">{group.group_name}</h5>

                  <p className="text-muted small mb-3">
                    {group.leader_name
                      ? `Pemimpin: ${group.leader_name}`
                      : "Pemimpin belum ditetapkan"}
                  </p>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <div className="border rounded-3 p-2">
                        <div className="text-muted small">Ahli Aktif</div>
                        <div className="fw-bold">
                          {group.total_members || 0}
                        </div>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="border rounded-3 p-2">
                        <div className="text-muted small">Dicipta</div>
                        <div className="fw-bold small">
                          {formatDate(group.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(group);
                      }}
                    >
                      <i className="bi bi-pencil-square me-1"></i>
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/district/groups/${group.id}`);
                      }}
                    >
                      Buka
                      <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
                  onClick={closeModal}
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
                      onChange={(event) =>
                        setForm({
                          ...form,
                          group_name: event.target.value,
                        })
                      }
                      placeholder="Contoh: KP 01 Kulim"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Pemimpin Kumpulan</label>
                    <select
                      className="form-select"
                      value={form.leader_user_id}
                      onChange={(event) => {
                        const selectedLeader = leaders.find(
                          (leader) => leader.id === event.target.value
                        );

                        setForm({
                          ...form,
                          leader_user_id: event.target.value,
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
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value })
                      }
                      disabled={saving}
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Tidak Aktif">Tidak Aktif</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeModal}
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
                    ? "Simpan Perubahan"
                    : "Simpan Kumpulan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}