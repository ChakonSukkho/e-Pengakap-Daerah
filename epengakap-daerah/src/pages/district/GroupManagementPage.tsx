import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";
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
  created_at?: string | null;
  updated_at?: string | null;
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
  const navigate = useNavigate();

  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);

  const [editingGroup, setEditingGroup] = useState<ScoutGroup | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showGroupModal, setShowGroupModal] = useState(false);

  const [form, setForm] = useState<GroupForm>({
    group_name: "",
    school_name: "",
    leader_user_id: "",
    leader_name: "",
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

    if (error) {
      alert(error.message);
      setGroups([]);
      setLoading(false);
      return;
    }

    const baseGroups = (data || []) as ScoutGroup[];

    let memberQuery = supabase
      .from("members")
      .select("id, group_id, group_name, status")
      .is("deleted_at", null)
      .in("status", ["Aktif", "active"]);

    memberQuery = applyDistrictScope(memberQuery);

    const { data: membersData, error: membersError } = await memberQuery;

    const memberCountMap: Record<string, number> = {};

    if (!membersError && membersData) {
      membersData.forEach((member: any) => {
        if (member.group_id) {
          memberCountMap[member.group_id] =
            (memberCountMap[member.group_id] || 0) + 1;
          return;
        }

        if (member.group_name) {
          const matchedGroup = baseGroups.find(
            (group) =>
              group.group_name === member.group_name ||
              group.school_name === member.group_name
          );

          if (matchedGroup?.id) {
            memberCountMap[matchedGroup.id] =
              (memberCountMap[matchedGroup.id] || 0) + 1;
          }
        }
      });
    }

    const groupsWithCount = baseGroups.map((group) => ({
      ...group,
      status: normalizeStatus(group.status),
      total_members: memberCountMap[group.id] ?? group.total_members ?? 0,
    }));

    setGroups(groupsWithCount);
    setLoading(false);
  }

  async function fetchActiveGroupLeaders() {
    let query = supabase
      .from("system_users")
      .select(
        "id, full_name, email, role, status, district, district_environment_id"
      )
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

  function openEditModal(group: ScoutGroup) {
    setEditingGroup(group);

    setForm({
      group_name: group.group_name || "",
      school_name: group.school_name || "",
      leader_user_id: group.leader_user_id || "",
      leader_name: group.leader_name || "",
      status: normalizeStatus(group.status),
    });

    setShowGroupModal(true);
  }

  function goToGroupDetail(group: ScoutGroup) {
    navigate(`/district/groups/${group.id}`);
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
      const insertPayload = {
        ...payload,
        total_members: 0,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("groups").insert(insertPayload);

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

  return (
    <DashboardLayout role="district">
      <style>
        {`
          .group-card {
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .group-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 0.75rem 1.5rem rgba(0,0,0,.12) !important;
          }
        `}
      </style>

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
                  onChange={(event) => setSearch(event.target.value)}
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
                  <div
                    className="card h-100 border shadow-sm rounded-4 group-card"
                    onClick={() => goToGroupDetail(group)}
                  >
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h5 className="fw-bold mb-1">{group.group_name}</h5>
                          <div className="text-muted small">
                            {group.school_name || "-"}
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
                          onClick={(event) => {
                            event.stopPropagation();
                            goToGroupDetail(group);
                          }}
                        >
                          <i className="bi bi-box-arrow-up-right me-1"></i>
                          Buka
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
                      onChange={(event) =>
                        setForm({ ...form, group_name: event.target.value })
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
                      onChange={(event) =>
                        setForm({ ...form, school_name: event.target.value })
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
    </DashboardLayout>
  );
}