import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";
import { addAuditLog } from "../../utils/auditLog";

const scoutDistrictsByState: Record<string, string[]> = {
  Selangor: [
    "Gombak",
    "Hulu Langat",
    "Hulu Selangor",
    "Kajang",
    "Klang",
    "Kuala Langat",
    "Kuala Selangor",
    "Petaling Perdana",
    "Petaling Utama",
    "Putrajaya",
    "Sabak Bernam",
    "Sepang",
    "Sungai Besar",
    "Tanjong Karang",
  ],

  "Wilayah Persekutuan Kuala Lumpur": [
    "Batu",
    "Kepong",
    "Segambut",
    "Wangsa Maju",
    "Setiawangsa",
    "Titiwangsa",
    "Bukit Bintang",
    "Seputeh",
    "Lembah Pantai",
    "Bandar Tun Razak",
    "Cheras",
  ],

  Pahang: [
    "Bera",
    "Bentong",
    "Cameron Highlands",
    "Jerantut",
    "Kuantan",
    "Lipis",
    "Maran",
    "Pekan",
    "Raub",
    "Rompin",
    "Temerloh",
  ],
};

type ScoutGroup = {
  id: string;
  group_name: string;
  group_code: string | null;
  registration_no: string | null;
  registration_date: string | null;
  scout_state: string | null;
  scout_district: string | null;
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

type Member = {
  id: string;
  full_name: string;
  email: string | null;
  group_id: string | null;
  group_name: string | null;
  status: string | null;
  category: string | null;
  scout_category: string | null;
  gender: string | null;
  ic_number: string | null;
  created_at: string | null;
  deleted_at: string | null;
};

type LeaderUser = {
  id: string;
  full_name: string;
  email: string | null;
};

type GroupForm = {
  group_name: string;
  group_code: string;
  registration_no: string;
  registration_date: string;
  scout_state: string;
  scout_district: string;
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getDefaultState(currentUser: any) {
  const raw =
    currentUser.scout_state ||
    currentUser.state ||
    currentUser.state_name ||
    currentUser.negeri ||
    "";

  if (raw && scoutDistrictsByState[raw]) return raw;

  return "Wilayah Persekutuan Kuala Lumpur";
}

function getDefaultScoutDistrict(currentUser: any, state: string) {
  const raw =
    currentUser.scout_district ||
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    "";

  if (raw && scoutDistrictsByState[state]?.includes(raw)) return raw;

  return scoutDistrictsByState[state]?.[0] || "";
}

export default function GroupDetailPage() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const id = groupId || "";

  const currentUser = useMemo(() => getCurrentUser(), []);

  const districtEnvironmentId = currentUser.district_environment_id || null;

  const userDistrict =
    currentUser.district ||
    currentUser.district_name ||
    currentUser.daerah ||
    null;

  const defaultState = useMemo(() => getDefaultState(currentUser), [currentUser]);

  const defaultScoutDistrict = useMemo(
    () => getDefaultScoutDistrict(currentUser, defaultState),
    [currentUser, defaultState]
  );

  const [group, setGroup] = useState<ScoutGroup | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);

  const [activityCount, setActivityCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const [form, setForm] = useState<GroupForm>({
    group_name: "",
    group_code: "",
    registration_no: "",
    registration_date: "",
    scout_state: defaultState,
    scout_district: defaultScoutDistrict,
    leader_user_id: "",
    leader_name: "",
    status: "Aktif",
  });

  const districtOptions = useMemo(() => {
    return scoutDistrictsByState[form.scout_state] || [];
  }, [form.scout_state]);

  const activeMembers = useMemo(() => {
    return members.filter((member) => isActive(member.status));
  }, [members]);

  const inactiveMembers = useMemo(() => {
    return members.filter((member) => !isActive(member.status));
  }, [members]);

    useEffect(() => {
      if (!id) {
        console.error("Route params tidak jumpa ID kumpulan:", groupId);
        alert("ID kumpulan tidak sah. Sila semak route param untuk GroupDetailPage.");
        navigate("/district/groups");
        return;
      }
    
      fetchAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

  function applyDistrictScope(query: any) {
    if (districtEnvironmentId) {
      return query.eq("district_environment_id", districtEnvironmentId);
    }

    if (userDistrict) {
      return query.eq("district", userDistrict);
    }

    return query;
  }

  async function fetchAll() {
    setLoading(true);

    try {
      await Promise.all([fetchGroup(), fetchMembers(), fetchLeaders(), fetchActivities()]);
    } catch (error: any) {
      console.error("Fetch group detail error:", error);
      alert(error?.message || "Gagal memuatkan maklumat kumpulan.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchGroup() {
    let query = supabase
      .from("groups")
      .select(
        `
        id,
        group_name,
        group_code,
        registration_no,
        registration_date,
        scout_state,
        scout_district,
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
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) throw error;

    const selectedGroup = data as ScoutGroup;

    setGroup(selectedGroup);

    const selectedScoutState =
      selectedGroup.scout_state && scoutDistrictsByState[selectedGroup.scout_state]
        ? selectedGroup.scout_state
        : defaultState;

    const selectedScoutDistrict =
      selectedGroup.scout_district &&
      scoutDistrictsByState[selectedScoutState]?.includes(selectedGroup.scout_district)
        ? selectedGroup.scout_district
        : scoutDistrictsByState[selectedScoutState]?.[0] || "";

    setForm({
      group_name: selectedGroup.group_name || "",
      group_code: selectedGroup.group_code || "",
      registration_no: selectedGroup.registration_no || "",
      registration_date: selectedGroup.registration_date || "",
      scout_state: selectedScoutState,
      scout_district: selectedScoutDistrict,
      leader_user_id: selectedGroup.leader_user_id || "",
      leader_name: selectedGroup.leader_name || "",
      status: normalizeStatus(selectedGroup.status),
    });
  }

  async function fetchMembers() {
    let query = supabase
      .from("members")
      .select(
        `
        id,
        full_name,
        email,
        group_id,
        group_name,
        status,
        category,
        scout_category,
        gender,
        ic_number,
        created_at,
        deleted_at
      `
      )
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) throw error;

    const memberList = ((data || []) as Member[]).filter((member) => {
      if (member.group_id && member.group_id === id) return true;
      if (!member.group_id && group?.group_name && member.group_name === group.group_name) {
        return true;
      }

      return false;
    });

    setMembers(memberList);
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
      console.warn("Fetch leaders warning:", error.message);
      setLeaders([]);
      return;
    }

    setLeaders((data || []) as LeaderUser[]);
  }

  async function fetchActivities() {
    try {
      let query = supabase
        .from("activities")
        .select("id")
        .eq("group_id", id)
        .is("deleted_at", null);

      query = applyDistrictScope(query);

      const { data, error } = await query;

      if (error) {
        console.warn("Fetch activities warning:", error.message);
        setActivityCount(0);
        return;
      }

      setActivityCount((data || []).length);
    } catch {
      setActivityCount(0);
    }
  }

  function validateForm() {
    if (!form.group_name.trim()) {
      alert("Sila isi nama kumpulan.");
      return false;
    }

    if (!form.group_code.trim()) {
      alert("Sila isi No Kumpulan.");
      return false;
    }

    if (!form.registration_no.trim()) {
      alert("Sila isi No Pendaftaran.");
      return false;
    }

    if (!form.registration_date) {
      alert("Sila pilih Tarikh Pendaftaran.");
      return false;
    }

    if (!form.scout_state) {
      alert("Sila pilih negeri.");
      return false;
    }

    if (!form.scout_district) {
      alert("Sila pilih daerah pengakap.");
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
      .neq("id", id)
      .limit(1);

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
  }

  async function checkDuplicateGroupCode() {
    let query = supabase
      .from("groups")
      .select("id")
      .ilike("group_code", form.group_code.trim())
      .is("deleted_at", null)
      .neq("id", id)
      .limit(1);

    query = applyDistrictScope(query);

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
  }

  async function syncGroupReferences(params: {
    groupId: string;
    oldGroupName: string | null;
    newGroupName: string;
    leaderUserId: string | null;
  }) {
    const { groupId, oldGroupName, newGroupName, leaderUserId } = params;
    const now = new Date().toISOString();

    try {
      let memberByGroupIdQuery = supabase
        .from("members")
        .update({
          group_name: newGroupName,
          updated_at: now,
        })
        .eq("group_id", groupId)
        .is("deleted_at", null);

      memberByGroupIdQuery = applyDistrictScope(memberByGroupIdQuery);

      const { error } = await memberByGroupIdQuery;

      if (error) {
        console.warn("Sync members by group_id warning:", error.message);
      }
    } catch (error: any) {
      console.warn("Sync members by group_id failed:", error?.message);
    }

    if (oldGroupName && oldGroupName !== newGroupName) {
      try {
        let memberByOldNameQuery = supabase
          .from("members")
          .update({
            group_name: newGroupName,
            updated_at: now,
          })
          .eq("group_name", oldGroupName)
          .is("deleted_at", null);

        memberByOldNameQuery = applyDistrictScope(memberByOldNameQuery);

        const { error } = await memberByOldNameQuery;

        if (error) {
          console.warn("Sync members by old group name warning:", error.message);
        }
      } catch (error: any) {
        console.warn("Sync members by old group name failed:", error?.message);
      }

      try {
        let usersByOldNameQuery = supabase
          .from("system_users")
          .update({
            group_name: newGroupName,
            updated_at: now,
          })
          .eq("group_name", oldGroupName)
          .is("deleted_at", null);

        usersByOldNameQuery = applyDistrictScope(usersByOldNameQuery);

        const { error } = await usersByOldNameQuery;

        if (error) {
          console.warn("Sync system_users by old group name warning:", error.message);
        }
      } catch (error: any) {
        console.warn("Sync system_users by old group name failed:", error?.message);
      }
    }

    if (leaderUserId) {
      try {
        let selectedLeaderQuery = supabase
          .from("system_users")
          .update({
            group_name: newGroupName,
            updated_at: now,
          })
          .eq("id", leaderUserId)
          .is("deleted_at", null);

        selectedLeaderQuery = applyDistrictScope(selectedLeaderQuery);

        const { error } = await selectedLeaderQuery;

        if (error) {
          console.warn("Sync selected leader warning:", error.message);
        }
      } catch (error: any) {
        console.warn("Sync selected leader failed:", error?.message);
      }
    }
  }

  async function saveGroup() {
    if (!group || !id) return;
    if (!validateForm()) return;

    setSaving(true);

    try {
      const duplicateName = await checkDuplicateGroupName();

      if (duplicateName) {
        alert("Nama kumpulan ini sudah wujud dalam daerah ini.");
        setSaving(false);
        return;
      }

      const duplicateCode = await checkDuplicateGroupCode();

      if (duplicateCode) {
        alert("No Kumpulan ini sudah wujud dalam daerah ini.");
        setSaving(false);
        return;
      }

      const selectedLeader = leaders.find(
        (leader) => leader.id === form.leader_user_id
      );

      const oldGroupName = group.group_name || null;

      const payload = {
        group_name: form.group_name.trim(),
        group_code: form.group_code.trim(),
        registration_no: form.registration_no.trim(),
        registration_date: form.registration_date || null,
        scout_state: form.scout_state,
        scout_district: form.scout_district,

        // database kau school_name NOT NULL, jadi kita simpan sama dengan nama kumpulan
        school_name: form.group_name.trim(),

        leader_user_id: form.leader_user_id || null,
        leader_name: selectedLeader?.full_name || form.leader_name || null,
        status: form.status,

        // ini scope sebenar sistem, jangan guna dropdown daerah pengakap
        district: group.district || userDistrict || null,
        district_environment_id: group.district_environment_id || districtEnvironmentId || null,

        updated_at: new Date().toISOString(),
      };

      let query = supabase
        .from("groups")
        .update(payload)
        .eq("id", id)
        .is("deleted_at", null);

      query = applyDistrictScope(query);

      const { error } = await query;

      if (error) throw error;

      await syncGroupReferences({
        groupId: id,
        oldGroupName,
        newGroupName: payload.group_name,
        leaderUserId: payload.leader_user_id,
      });

      await addAuditLog(
        "UPDATE",
        "Kumpulan / Sekolah",
        `Kemaskini kumpulan ${oldGroupName || "-"} kepada ${payload.group_name}`
      );

      alert("Kumpulan berjaya dikemaskini.");

      setShowEditModal(false);
      await fetchAll();
    } catch (error: any) {
      console.error("Save group error:", error);
      alert(error?.message || "Gagal simpan kumpulan.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateGroup() {
    if (!group || !id) return;

    setSaving(true);

    try {
      let query = supabase
        .from("groups")
        .update({
          status: "Tidak Aktif",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
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

      setShowDeactivateModal(false);
      await fetchAll();
    } catch (error: any) {
      console.error("Deactivate group error:", error);
      alert(error?.message || "Gagal nyahaktif kumpulan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="district">
        <div className="text-center py-5">
          <div className="spinner-border text-success"></div>
          <p className="text-muted mt-3 mb-0">Memuatkan maklumat kumpulan...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!group) {
    return (
      <DashboardLayout role="district">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <i className="bi bi-exclamation-circle fs-1 text-warning"></i>
            <h5 className="fw-bold mt-3">Kumpulan tidak dijumpai</h5>
            <p className="text-muted">Data kumpulan mungkin telah dipadam atau tiada akses.</p>
            <Link to="/district/groups" className="btn btn-success">
              Kembali ke Senarai Kumpulan
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="district">
      <div className="mb-4">
        <Link
          to="/district/groups"
          className="text-muted text-decoration-none d-inline-flex align-items-center mb-3"
        >
          <i className="bi bi-arrow-left me-1"></i>
          Kembali ke Senarai Kumpulan
        </Link>

        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
          <div>
            <h2 className="fw-bold mb-1">{group.group_name}</h2>
            <p className="text-muted mb-0">
              {group.scout_state || "-"} {group.scout_district ? `• ${group.scout_district}` : ""}
            </p>
          </div>

          <div className="d-flex gap-2 flex-wrap align-items-start">
            <button
              type="button"
              className="btn btn-success"
              onClick={() => setShowEditModal(true)}
            >
              <i className="bi bi-pencil-square me-1"></i>
              Edit Group
            </button>

            {isActive(group.status) && (
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => setShowDeactivateModal(true)}
              >
                <i className="bi bi-x-circle me-1"></i>
                Nyahaktif
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Jumlah Ahli</small>
              <h4 className="fw-bold mb-0">{members.length}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Ahli Aktif</small>
              <h4 className="fw-bold text-success mb-0">{activeMembers.length}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Tidak Aktif</small>
              <h4 className="fw-bold text-warning mb-0">{inactiveMembers.length}</h4>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Aktiviti</small>
              <h4 className="fw-bold mb-0">{activityCount}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-header bg-white border-0 pt-4 px-4">
          <h5 className="fw-bold mb-0">Ringkasan Kumpulan</h5>
        </div>

        <div className="card-body px-4">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">Nama Kumpulan</small>
                <strong>{group.group_name}</strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">Status</small>
                <span
                  className={`badge ${
                    isActive(group.status) ? "bg-success" : "bg-secondary"
                  }`}
                >
                  {normalizeStatus(group.status)}
                </span>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">No Kumpulan</small>
                <strong>{group.group_code || "-"}</strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">No Pendaftaran</small>
                <strong>{group.registration_no || "-"}</strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">Tarikh Pendaftaran</small>
                <strong>{formatDate(group.registration_date)}</strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">Negeri / Daerah Pengakap</small>
                <strong>
                  {group.scout_state || "-"} {group.scout_district ? `• ${group.scout_district}` : ""}
                </strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">Pemimpin Kumpulan</small>
                <strong>{group.leader_name || "-"}</strong>
              </div>
            </div>

            <div className="col-md-6">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">Tarikh Dicipta</small>
                <strong>{formatDate(group.created_at)}</strong>
              </div>
            </div>

            <div className="col-12">
              <div className="border rounded-4 p-3 h-100">
                <small className="text-muted d-block mb-1">District Environment ID</small>
                <strong>{group.district_environment_id || "-"}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-white border-0 pt-4 px-4">
          <h5 className="fw-bold mb-0">Senarai Ahli Kumpulan</h5>
        </div>

        <div className="card-body table-responsive px-4">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Nama</th>
                <th>No IC / MyKid</th>
                <th>Kategori</th>
                <th>Jantina</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-5">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada ahli dalam kumpulan ini.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
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
                          <small className="text-muted">{member.email || "-"}</small>
                        </div>
                      </div>
                    </td>

                    <td>{member.ic_number || "-"}</td>
                    <td>{member.category || member.scout_category || "-"}</td>
                    <td>{member.gender || "-"}</td>

                    <td>
                      <span
                        className={`badge ${
                          isActive(member.status) ? "bg-success" : "bg-secondary"
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
                    <label className="form-label">No Kumpulan</label>
                    <input
                      className="form-control"
                      value={form.group_code}
                      onChange={(event) =>
                        setForm({ ...form, group_code: event.target.value })
                      }
                      placeholder="Contoh: KP-001"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">No Pendaftaran</label>
                    <input
                      className="form-control"
                      value={form.registration_no}
                      onChange={(event) =>
                        setForm({ ...form, registration_no: event.target.value })
                      }
                      placeholder="Contoh: MY-SCT-2026-001"
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Tarikh Pendaftaran</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.registration_date}
                      onChange={(event) =>
                        setForm({ ...form, registration_date: event.target.value })
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Negeri</label>
                    <select
                      className="form-select"
                      value={form.scout_state}
                      onChange={(event) => {
                        const newState = event.target.value;
                        const firstDistrict = scoutDistrictsByState[newState]?.[0] || "";

                        setForm({
                          ...form,
                          scout_state: newState,
                          scout_district: firstDistrict,
                        });
                      }}
                      disabled={saving}
                    >
                      {Object.keys(scoutDistrictsByState).map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Daerah Pengakap</label>
                    <select
                      className="form-select"
                      value={form.scout_district}
                      onChange={(event) =>
                        setForm({ ...form, scout_district: event.target.value })
                      }
                      disabled={saving}
                    >
                      {districtOptions.map((districtName) => (
                        <option key={districtName} value={districtName}>
                          {districtName}
                        </option>
                      ))}
                    </select>
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
                <h5 className="modal-title fw-bold text-danger">Nyahaktif Kumpulan</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeactivateModal(false)}
                  disabled={saving}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-1">Adakah anda pasti mahu nyahaktifkan kumpulan ini?</p>
                <strong>{group.group_name}</strong>
                <p className="text-muted small mt-2 mb-0">
                  Rekod tidak dipadam. Status kumpulan akan ditukar kepada Tidak Aktif.
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