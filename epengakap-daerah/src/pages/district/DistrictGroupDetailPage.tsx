import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";
import { addAuditLog } from "../../utils/auditLog";

type GroupRow = {
  id: string;
  group_name: string;
  school_name: string | null;
  leader_user_id: string | null;
  leader_name: string | null;
  total_members?: number | null;
  status: string | null;
  district: string | null;
  district_environment_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: string | null;
  group_id: string | null;
  group_name: string | null;
};

type MemberRow = {
  id: string;
  full_name: string | null;
  ic_number: string | null;
  scout_category: string | null;
  gender: string | null;
  age: number | null;
  status: string | null;
  group_id: string | null;
  group_name: string | null;
};

type ActivityRow = {
  id: string;
  activity_name: string | null;
  activity_date: string | null;
  location: string | null;
  status: string | null;
  group_id: string | null;
  group_name: string | null;
};

type LeaderUser = {
  id: string;
  full_name: string;
  email: string | null;
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
  if (value === "dibatalkan" || value === "cancelled") return "Dibatalkan";

  return status || "-";
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

export default function DistrictGroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const currentUser = useMemo(() => getCurrentUser(), []);
  const districtEnvironmentId = currentUser.district_environment_id || null;
  const district =
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    null;

  const [group, setGroup] = useState<GroupRow | null>(null);
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [assistants, setAssistants] = useState<UserRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "overview" | "members" | "activities" | "assistants"
  >("overview");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const [form, setForm] = useState({
    group_name: "",
    school_name: "",
    leader_user_id: "",
    leader_name: "",
    status: "Aktif",
  });

  useEffect(() => {
    if (!groupId) {
      navigate("/district/groups");
      return;
    }

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  function applyDistrictScope(query: any) {
    if (districtEnvironmentId) {
      return query.eq("district_environment_id", districtEnvironmentId);
    }

    if (district) {
      return query.eq("district", district);
    }

    return query;
  }

  async function fetchAll() {
    setLoading(true);

    try {
      let groupQuery = supabase
        .from("groups")
        .select(
          "id, group_name, school_name, leader_user_id, leader_name, total_members, status, district, district_environment_id, created_at, updated_at, deleted_at"
        )
        .eq("id", groupId)
        .is("deleted_at", null)
        .maybeSingle();

      groupQuery = applyDistrictScope(groupQuery);

      const { data: groupData, error: groupError } = await groupQuery;

      if (groupError) throw groupError;

      if (!groupData) {
        alert("Kumpulan tidak dijumpai atau tiada akses.");
        navigate("/district/groups");
        return;
      }

      const selectedGroup = groupData as GroupRow;
      setGroup(selectedGroup);

      setForm({
        group_name: selectedGroup.group_name || "",
        school_name: selectedGroup.school_name || "",
        leader_user_id: selectedGroup.leader_user_id || "",
        leader_name: selectedGroup.leader_name || "",
        status: normalizeStatus(selectedGroup.status),
      });

      await Promise.all([
        fetchLeaders(),
        fetchMembers(selectedGroup),
        fetchActivities(selectedGroup),
        fetchAssistants(selectedGroup),
      ]);
    } catch (error: any) {
      console.error("fetchAll error:", error);
      alert(error?.message || "Gagal memuatkan maklumat kumpulan.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchLeaders() {
    let query = supabase
      .from("system_users")
      .select("id, full_name, email")
      .in("role", ["Pemimpin Kumpulan", "group_leader"])
      .in("status", ["Aktif", "active"])
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      console.warn("fetchLeaders error:", error.message);
      setLeaders([]);
      return;
    }

    setLeaders(data || []);
  }

  async function fetchMembers(selectedGroup: GroupRow) {
    let queryByGroupId = supabase
      .from("members")
      .select(
        "id, full_name, ic_number, scout_category, gender, age, status, group_id, group_name"
      )
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    queryByGroupId = applyDistrictScope(queryByGroupId);
    queryByGroupId = queryByGroupId.eq("group_id", selectedGroup.id);

    const { data: byGroupId, error: groupIdError } = await queryByGroupId;

    if (groupIdError) {
      console.warn("Members by group_id error:", groupIdError.message);
    }

    if (byGroupId && byGroupId.length > 0) {
      setMembers(byGroupId as MemberRow[]);
      return;
    }

    let queryByGroupName = supabase
      .from("members")
      .select(
        "id, full_name, ic_number, scout_category, gender, age, status, group_id, group_name"
      )
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    queryByGroupName = applyDistrictScope(queryByGroupName);
    queryByGroupName = queryByGroupName.eq(
      "group_name",
      selectedGroup.group_name
    );

    const { data: byGroupName, error: groupNameError } = await queryByGroupName;

    if (groupNameError) {
      console.warn("Members by group_name error:", groupNameError.message);
      setMembers([]);
      return;
    }

    setMembers((byGroupName || []) as MemberRow[]);
  }

  async function fetchActivities(selectedGroup: GroupRow) {
    let queryByGroupId = supabase
      .from("activities")
      .select("id, activity_name, activity_date, location, status, group_id, group_name")
      .is("deleted_at", null)
      .order("activity_date", { ascending: false });

    queryByGroupId = applyDistrictScope(queryByGroupId);
    queryByGroupId = queryByGroupId.eq("group_id", selectedGroup.id);

    const { data: byGroupId, error: groupIdError } = await queryByGroupId;

    if (groupIdError) {
      console.warn("Activities by group_id error:", groupIdError.message);
    }

    if (byGroupId && byGroupId.length > 0) {
      setActivities(byGroupId as ActivityRow[]);
      return;
    }

    let queryByGroupName = supabase
      .from("activities")
      .select("id, activity_name, activity_date, location, status, group_id, group_name")
      .is("deleted_at", null)
      .order("activity_date", { ascending: false });

    queryByGroupName = applyDistrictScope(queryByGroupName);
    queryByGroupName = queryByGroupName.eq(
      "group_name",
      selectedGroup.group_name
    );

    const { data: byGroupName, error: groupNameError } =
      await queryByGroupName;

    if (groupNameError) {
      console.warn("Activities by group_name error:", groupNameError.message);
      setActivities([]);
      return;
    }

    setActivities((byGroupName || []) as ActivityRow[]);
  }

  async function fetchAssistants(selectedGroup: GroupRow) {
    let queryByGroupId = supabase
      .from("system_users")
      .select("id, full_name, email, phone, role, status, group_id, group_name")
      .eq("role", "Penolong Pemimpin")
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    queryByGroupId = applyDistrictScope(queryByGroupId);
    queryByGroupId = queryByGroupId.eq("group_id", selectedGroup.id);

    const { data: byGroupId, error: groupIdError } = await queryByGroupId;

    if (groupIdError) {
      console.warn("Assistants by group_id error:", groupIdError.message);
    }

    if (byGroupId && byGroupId.length > 0) {
      setAssistants(byGroupId as UserRow[]);
      return;
    }

    let queryByGroupName = supabase
      .from("system_users")
      .select("id, full_name, email, phone, role, status, group_id, group_name")
      .eq("role", "Penolong Pemimpin")
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    queryByGroupName = applyDistrictScope(queryByGroupName);
    queryByGroupName = queryByGroupName.eq(
      "group_name",
      selectedGroup.group_name
    );

    const { data: byGroupName, error: groupNameError } =
      await queryByGroupName;

    if (groupNameError) {
      console.warn("Assistants by group_name error:", groupNameError.message);
      setAssistants([]);
      return;
    }

    setAssistants((byGroupName || []) as UserRow[]);
  }

  async function saveGroup() {
    if (!group) return;

    if (!form.group_name.trim()) {
      alert("Sila isi nama kumpulan.");
      return;
    }

    if (!form.school_name.trim()) {
      alert("Sila isi nama sekolah.");
      return;
    }

    setSaving(true);

    try {
      const selectedLeader = leaders.find(
        (leader) => leader.id === form.leader_user_id
      );

      const payload = {
        group_name: form.group_name.trim(),
        school_name: form.school_name.trim(),
        leader_user_id: form.leader_user_id || null,
        leader_name: selectedLeader?.full_name || form.leader_name || null,
        status: form.status,
        updated_at: new Date().toISOString(),
      };

      let query = supabase
        .from("groups")
        .update(payload)
        .eq("id", group.id)
        .is("deleted_at", null);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) throw error;

      await addAuditLog(
        "UPDATE",
        "Kumpulan / Sekolah",
        `Kemaskini kumpulan ${payload.group_name}`
      );

      setShowEditModal(false);
      await fetchAll();
      alert("Maklumat kumpulan berjaya dikemaskini.");
    } catch (error: any) {
      alert(error?.message || "Gagal kemaskini kumpulan.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateGroup() {
    if (!group) return;

    setSaving(true);

    try {
      let query = supabase
        .from("groups")
        .update({
          status: "Tidak Aktif",
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", group.id)
        .is("deleted_at", null);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) throw error;

      await addAuditLog(
        "DEACTIVATE",
        "Kumpulan / Sekolah",
        `Nyahaktif kumpulan ${group.group_name}`
      );

      alert("Kumpulan berjaya dinyahaktifkan.");
      navigate("/district/groups");
    } catch (error: any) {
      alert(error?.message || "Gagal nyahaktif kumpulan.");
    } finally {
      setSaving(false);
    }
  }

  const activeMembers = members.filter((member) => isActive(member.status));
  const inactiveMembers = members.filter((member) => !isActive(member.status));

  if (loading) {
    return (
      <DashboardLayout role="district">
        <div className="text-center py-5">
          <div className="spinner-border text-success"></div>
          <p className="text-muted mt-3">Memuatkan maklumat kumpulan...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!group) {
    return (
      <DashboardLayout role="district">
        <div className="alert alert-warning">Kumpulan tidak dijumpai.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="district">
      <style>
        {`
          .stat-card {
            border: 0;
            border-radius: 1rem;
            box-shadow: 0 0.25rem 1rem rgba(15, 23, 42, 0.06);
          }

          .tab-btn {
            border: 0;
            background: transparent;
            padding: .85rem 1rem;
            font-weight: 600;
            color: #6b7280;
            border-bottom: 3px solid transparent;
          }

          .tab-btn.active {
            color: #047857;
            border-bottom-color: #047857;
          }

          .info-box {
            border: 1px solid #e5e7eb;
            border-radius: 1rem;
            padding: 1rem;
            height: 100%;
            background: #fff;
          }
        `}
      </style>

      <div className="mb-4">
        <button
          className="btn btn-link text-muted text-decoration-none p-0 mb-2"
          onClick={() => navigate("/district/groups")}
        >
          <i className="bi bi-arrow-left me-1"></i>
          Kembali ke Senarai Kumpulan
        </button>

        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <h2 className="fw-bold mb-1">{group.group_name}</h2>
            <p className="text-muted mb-0">
              {group.school_name || "-"} • {group.district || district || "-"}
            </p>
          </div>

          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-success"
              onClick={() => setShowEditModal(true)}
            >
              <i className="bi bi-pencil-square me-1"></i>
              Edit Group
            </button>

            <button
              className="btn btn-outline-danger"
              onClick={() => setShowDeactivateModal(true)}
            >
              <i className="bi bi-x-circle me-1"></i>
              Nyahaktif
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card stat-card">
            <div className="card-body">
              <div className="text-muted small">Jumlah Ahli</div>
              <div className="h3 fw-bold mb-0">{members.length}</div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card stat-card">
            <div className="card-body">
              <div className="text-muted small">Ahli Aktif</div>
              <div className="h3 fw-bold text-success mb-0">
                {activeMembers.length}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card stat-card">
            <div className="card-body">
              <div className="text-muted small">Tidak Aktif</div>
              <div className="h3 fw-bold text-warning mb-0">
                {inactiveMembers.length}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card stat-card">
            <div className="card-body">
              <div className="text-muted small">Aktiviti</div>
              <div className="h3 fw-bold mb-0">{activities.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          <div className="d-flex flex-wrap px-3 border-bottom">
            <button
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Ringkasan
            </button>

            <button
              className={`tab-btn ${activeTab === "members" ? "active" : ""}`}
              onClick={() => setActiveTab("members")}
            >
              Ahli ({members.length})
            </button>

            <button
              className={`tab-btn ${
                activeTab === "activities" ? "active" : ""
              }`}
              onClick={() => setActiveTab("activities")}
            >
              Aktiviti ({activities.length})
            </button>

            <button
              className={`tab-btn ${
                activeTab === "assistants" ? "active" : ""
              }`}
              onClick={() => setActiveTab("assistants")}
            >
              Penolong Pemimpin ({assistants.length})
            </button>
          </div>

          <div className="p-4">
            {activeTab === "overview" && (
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="info-box">
                    <div className="text-muted small mb-1">Nama Kumpulan</div>
                    <div className="fw-semibold">{group.group_name}</div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="info-box">
                    <div className="text-muted small mb-1">
                      Sekolah / Institusi
                    </div>
                    <div className="fw-semibold">
                      {group.school_name || "-"}
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="info-box">
                    <div className="text-muted small mb-1">
                      Pemimpin Kumpulan
                    </div>
                    <div className="fw-semibold">
                      {group.leader_name || "Belum ditetapkan"}
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="info-box">
                    <div className="text-muted small mb-1">Status</div>
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
                </div>

                <div className="col-md-6">
                  <div className="info-box">
                    <div className="text-muted small mb-1">Tarikh Dicipta</div>
                    <div className="fw-semibold">
                      {formatDate(group.created_at)}
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="info-box">
                    <div className="text-muted small mb-1">
                      District Environment ID
                    </div>
                    <div className="fw-semibold small text-break">
                      {group.district_environment_id ||
                        districtEnvironmentId ||
                        "-"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "members" && (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Kategori</th>
                      <th>Jantina</th>
                      <th>Umur</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-4">
                          Tiada ahli dalam kumpulan ini.
                        </td>
                      </tr>
                    ) : (
                      members.map((member) => (
                        <tr key={member.id}>
                          <td className="fw-semibold">
                            {member.full_name || "-"}
                          </td>
                          <td>{member.scout_category || "-"}</td>
                          <td>{member.gender || "-"}</td>
                          <td>{member.age ?? "-"}</td>
                          <td>
                            <span
                              className={`badge ${
                                isActive(member.status)
                                  ? "bg-success-subtle text-success"
                                  : "bg-secondary-subtle text-secondary"
                              }`}
                            >
                              {normalizeStatus(member.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "activities" && (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Aktiviti</th>
                      <th>Tarikh</th>
                      <th>Lokasi</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {activities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          Tiada aktiviti untuk kumpulan ini.
                        </td>
                      </tr>
                    ) : (
                      activities.map((activity) => (
                        <tr key={activity.id}>
                          <td className="fw-semibold">
                            {activity.activity_name || "-"}
                          </td>
                          <td>{formatDate(activity.activity_date)}</td>
                          <td>{activity.location || "-"}</td>
                          <td>
                            <span className="badge bg-primary">
                              {normalizeStatus(activity.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "assistants" && (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Email</th>
                      <th>Telefon</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {assistants.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          Belum ada Penolong Pemimpin dalam kumpulan ini.
                        </td>
                      </tr>
                    ) : (
                      assistants.map((assistant) => (
                        <tr key={assistant.id}>
                          <td className="fw-semibold">
                            {assistant.full_name || "-"}
                          </td>
                          <td>{assistant.email || "-"}</td>
                          <td>{assistant.phone || "-"}</td>
                          <td>
                            <span
                              className={`badge ${
                                isActive(assistant.status)
                                  ? "bg-success-subtle text-success"
                                  : "bg-secondary-subtle text-secondary"
                              }`}
                            >
                              {normalizeStatus(assistant.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Edit Kumpulan</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
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
                      <option value="">Pilih Pemimpin</option>

                      {leaders.map((leader) => (
                        <option key={leader.id} value={leader.id}>
                          {leader.full_name}
                          {leader.email ? ` (${leader.email})` : ""}
                        </option>
                      ))}
                    </select>
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
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={saveGroup}
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeactivateModal && (
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
                  onClick={() => setShowDeactivateModal(false)}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">
                  Adakah anda pasti mahu nyahaktif kumpulan ini?
                </p>

                <strong>{group.group_name}</strong>

                <p className="text-muted small mt-2 mb-0">
                  Data tidak dipadam kekal. Sistem akan set status Tidak Aktif
                  dan isi deleted_at.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowDeactivateModal(false)}
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
                  {saving ? "Memproses..." : "Ya, Nyahaktif"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}