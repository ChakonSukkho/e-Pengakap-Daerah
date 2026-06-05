import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string | null;
  ic_number?: string | null;
  email?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  category?: string | null;
  scout_category?: string | null;
  unit_pengakap?: string | null;
  status?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
};

type BadgeType = {
  id: string;
  badge_name: string;
  badge_level: string;
  description: string | null;
  status?: string | null;
};

type MemberBadge = {
  id: string;
  member_id: string;
  badge_id: string;
  awarded_by: string | null;
  awarded_date: string;
  notes: string | null;
  status?: string | null;
  deleted_at?: string | null;
  district?: string | null;
  district_environment_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  members?: Member | null;
  badge_types?: BadgeType | null;
};

type CurrentUser = {
  id?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  district?: string;
  district_environment_id?: string;
  group_id?: string;
  group_name?: string;
};

const LEVEL_OPTIONS = ["Semua Tahap", "Asas", "Pertengahan", "Lanjutan"];

function getCurrentUser(): CurrentUser {
  try {
    return JSON.parse(
      localStorage.getItem("user") || localStorage.getItem("auth_user") || "{}"
    );
  } catch {
    return {};
  }
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

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMemberUnit(member?: Member | null) {
  return (
    member?.unit_pengakap ||
    member?.scout_category ||
    member?.category ||
    "Tidak Ditetapkan"
  );
}

function badgeTone(level?: string | null) {
  if (level === "Lanjutan") {
    return "bg-danger-subtle text-danger border border-danger-subtle";
  }

  if (level === "Pertengahan") {
    return "bg-warning-subtle text-warning border border-warning-subtle";
  }

  return "bg-info-subtle text-info border border-info-subtle";
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

async function addAuditLog(action: string, description: string, recordId?: string | null) {
  try {
    const currentUser = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name: currentUser.full_name || currentUser.name || "Pemimpin Kumpulan",
      actor_role: currentUser.role || "Pemimpin Kumpulan",
      action,
      module: "Lencana & Pencapaian",
      description,
      user_id: currentUser.id || null,
      district_environment_id: currentUser.district_environment_id || null,
      record_id: recordId || null,
      ip_address: null,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Jangan block proses utama kalau audit log gagal.
  }
}

export default function BadgesPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);

  const groupId = currentUser.group_id || "";
  const groupName = currentUser.group_name || "";
  const district = currentUser.district || "";
  const districtEnvironmentId = currentUser.district_environment_id || "";

  const [members, setMembers] = useState<Member[]>([]);
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [memberBadges, setMemberBadges] = useState<MemberBadge[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("Semua Tahap");
  const [memberFilter, setMemberFilter] = useState("Semua Ahli");

  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [selectedAward, setSelectedAward] = useState<MemberBadge | null>(null);
  const [selectedHistoryMember, setSelectedHistoryMember] = useState<Member | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MemberBadge | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [form, setForm] = useState({
    member_id: "",
    badge_id: "",
    awarded_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    await Promise.all([fetchMembers(), fetchBadgeTypes(), fetchMemberBadges()]);
    setLoading(false);
  }

  async function fetchMembers() {
    if (!groupId && !groupName) {
      setMembers([]);
      return;
    }

    let query = supabase
      .from("members")
      .select("*")
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else if (groupName) {
      query = query.eq("group_name", groupName);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setMembers([]);
      return;
    }

    setMembers(data || []);
  }

  async function fetchBadgeTypes() {
    const { data, error } = await supabase
      .from("badge_types")
      .select("*")
      .order("badge_level", { ascending: true })
      .order("badge_name", { ascending: true });

    if (error) {
      alert(error.message);
      setBadgeTypes([]);
      return;
    }

    const activeBadges = (data || []).filter((badge) => {
      const status = String(badge.status || "Aktif").toLowerCase();
      return status === "aktif" || status === "active";
    });

    setBadgeTypes(activeBadges);
  }

  async function fetchMemberBadges() {
    if (!groupId && !groupName) {
      setMemberBadges([]);
      return;
    }

    let query = supabase
      .from("member_badges")
      .select("*")
      .is("deleted_at", null)
      .order("awarded_date", { ascending: false });

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else if (groupName) {
      query = query.eq("group_name", groupName);
    }

    if (districtEnvironmentId) {
      query = query.eq("district_environment_id", districtEnvironmentId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setMemberBadges([]);
      return;
    }

    const awards = data || [];

    if (awards.length === 0) {
      setMemberBadges([]);
      return;
    }

    const memberIds = [...new Set(awards.map((item) => item.member_id).filter(Boolean))];
    const badgeIds = [...new Set(awards.map((item) => item.badge_id).filter(Boolean))];

    const [{ data: membersData, error: membersError }, { data: badgesData, error: badgesError }] =
      await Promise.all([
        memberIds.length > 0
          ? supabase.from("members").select("*").in("id", memberIds)
          : Promise.resolve({ data: [], error: null } as any),
        badgeIds.length > 0
          ? supabase.from("badge_types").select("*").in("id", badgeIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

    if (membersError) {
      alert(membersError.message);
      setMemberBadges([]);
      return;
    }

    if (badgesError) {
      alert(badgesError.message);
      setMemberBadges([]);
      return;
    }

    const memberMap = new Map((membersData || []).map((member: Member) => [member.id, member]));
    const badgeMap = new Map((badgesData || []).map((badge: BadgeType) => [badge.id, badge]));

    const mergedAwards = awards.map((award) => ({
      ...award,
      members: memberMap.get(award.member_id) || null,
      badge_types: badgeMap.get(award.badge_id) || null,
    }));

    setMemberBadges(mergedAwards);
  }

  const filteredAwards = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return memberBadges.filter((award) => {
      const memberName = award.members?.full_name || "";
      const badgeName = award.badge_types?.badge_name || "";
      const badgeLevel = award.badge_types?.badge_level || "";
      const notes = award.notes || "";

      const matchSearch =
        !keyword ||
        memberName.toLowerCase().includes(keyword) ||
        badgeName.toLowerCase().includes(keyword) ||
        badgeLevel.toLowerCase().includes(keyword) ||
        notes.toLowerCase().includes(keyword);

      const matchLevel = levelFilter === "Semua Tahap" || badgeLevel === levelFilter;
      const matchMember = memberFilter === "Semua Ahli" || award.member_id === memberFilter;

      return matchSearch && matchLevel && matchMember;
    });
  }, [memberBadges, search, levelFilter, memberFilter]);

  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const thisMonth = memberBadges.filter(
      (item) => item.awarded_date?.slice(0, 7) === currentMonth
    ).length;

    const memberBadgeCount: Record<string, number> = {};

    memberBadges.forEach((item) => {
      memberBadgeCount[item.member_id] = (memberBadgeCount[item.member_id] || 0) + 1;
    });

    const excellentMembers = Object.values(memberBadgeCount).filter((count) => count >= 3).length;
    const uniqueAwardedMembers = Object.keys(memberBadgeCount).length;

    return {
      totalAwarded: memberBadges.length,
      thisMonth,
      excellentMembers,
      badgeTypes: badgeTypes.length,
      uniqueAwardedMembers,
    };
  }, [memberBadges, badgeTypes]);

  const progressByBadge = useMemo(() => {
    return badgeTypes.map((badge) => {
      const earned = memberBadges.filter((item) => item.badge_id === badge.id).length;

      return {
        ...badge,
        earned,
        totalMembers: members.length,
        progress: percent(earned, members.length),
      };
    });
  }, [badgeTypes, memberBadges, members]);

  const topMembers = useMemo(() => {
    const counts: Record<string, { member: Member | null; count: number }> = {};

    memberBadges.forEach((award) => {
      if (!counts[award.member_id]) {
        counts[award.member_id] = {
          member: award.members || null,
          count: 0,
        };
      }

      counts[award.member_id].count += 1;
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [memberBadges]);

  const memberProgress = useMemo(() => {
    return members
      .map((member) => {
        const earnedBadges = memberBadges.filter((award) => award.member_id === member.id);

        return {
          member,
          count: earnedBadges.length,
          total: badgeTypes.length,
          progress: percent(earnedBadges.length, badgeTypes.length),
          awards: earnedBadges,
        };
      })
      .sort((a, b) => b.count - a.count || String(a.member.full_name).localeCompare(String(b.member.full_name)));
  }, [members, memberBadges, badgeTypes]);

  const selectedMemberAwards = useMemo(() => {
    if (!selectedHistoryMember) return [];
    return memberBadges.filter((award) => award.member_id === selectedHistoryMember.id);
  }, [memberBadges, selectedHistoryMember]);

  function resetForm() {
    setForm({
      member_id: "",
      badge_id: "",
      awarded_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
  }

  async function checkDuplicateAward(memberId: string, badgeId: string) {
    let query = supabase
      .from("member_badges")
      .select("id")
      .eq("member_id", memberId)
      .eq("badge_id", badgeId)
      .is("deleted_at", null)
      .limit(1);

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else if (groupName) {
      query = query.eq("group_name", groupName);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return true;
    }

    return (data || []).length > 0;
  }

  async function awardBadge() {
    if (!form.member_id) {
      alert("Sila pilih ahli.");
      return;
    }

    if (!form.badge_id) {
      alert("Sila pilih lencana.");
      return;
    }

    if (!form.awarded_date) {
      alert("Sila pilih tarikh anugerah.");
      return;
    }

    const selectedMember = members.find((member) => member.id === form.member_id);
    const selectedBadge = badgeTypes.find((badge) => badge.id === form.badge_id);

    if (!selectedMember) {
      alert("Ahli tidak dijumpai.");
      return;
    }

    if (!selectedBadge) {
      alert("Lencana tidak dijumpai.");
      return;
    }

    const duplicate = await checkDuplicateAward(form.member_id, form.badge_id);

    if (duplicate) {
      alert("Ahli ini sudah mempunyai lencana tersebut.");
      return;
    }

    setSaving(true);

    const payload = {
      member_id: form.member_id,
      badge_id: form.badge_id,
      awarded_by: currentUser.full_name || currentUser.name || "Pemimpin Kumpulan",
      awarded_date: form.awarded_date,
      notes: form.notes.trim() || null,
      status: "Aktif",
      deleted_at: null,
      district: district || null,
      district_environment_id: districtEnvironmentId || null,
      group_id: groupId || null,
      group_name: groupName || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("member_badges")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "CREATE",
      `Anugerah lencana ${selectedBadge.badge_name} kepada ${selectedMember.full_name}`,
      data?.id || null
    );

    await fetchData();

    setSaving(false);
    setShowAwardModal(false);
    resetForm();

    alert("Lencana berjaya dianugerahkan.");
  }

  async function cancelAward() {
    if (!cancelTarget) return;

    setSaving(true);

    const reason = cancelReason.trim();
    const oldNotes = cancelTarget.notes || "";
    const updatedNotes = reason
      ? `${oldNotes}${oldNotes ? "\n" : ""}Dibatalkan: ${reason}`
      : oldNotes;

    const { error } = await supabase
      .from("member_badges")
      .update({
        status: "Dibatalkan",
        deleted_at: new Date().toISOString(),
        notes: updatedNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cancelTarget.id);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await addAuditLog(
      "UPDATE",
      `Batal lencana ${cancelTarget.badge_types?.badge_name || "-"} untuk ${cancelTarget.members?.full_name || "-"}`,
      cancelTarget.id
    );

    await fetchData();

    setSaving(false);
    setShowCancelModal(false);
    setCancelTarget(null);
    setCancelReason("");

    alert("Lencana berjaya dibatalkan.");
  }

  function openViewAward(award: MemberBadge) {
    setSelectedAward(award);
    setShowViewModal(true);
  }

  function openCancelAward(award: MemberBadge) {
    setCancelTarget(award);
    setCancelReason("");
    setShowCancelModal(true);
  }

  function openMemberHistory(member: Member) {
    setSelectedHistoryMember(member);
    setShowHistoryModal(true);
  }

  function exportAwardsCSV() {
    const headers = [
      "BIL",
      "NAMA AHLI",
      "KUMPULAN",
      "UNIT",
      "NAMA LENCANA",
      "TAHAP",
      "TARIKH ANUGERAH",
      "DIANUGERAHKAN OLEH",
      "CATATAN",
    ];

    const rows = filteredAwards.map((award, index) => [
      index + 1,
      award.members?.full_name || "",
      award.members?.group_name || award.group_name || "",
      getMemberUnit(award.members),
      award.badge_types?.badge_name || "",
      award.badge_types?.badge_level || "",
      award.awarded_date || "",
      award.awarded_by || "",
      award.notes || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `lencana-${groupName || "kumpulan"}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function exportAwardsPDF() {
    const rows = filteredAwards
      .map(
        (award, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${award.members?.full_name || "-"}</td>
            <td>${getMemberUnit(award.members)}</td>
            <td>${award.badge_types?.badge_name || "-"}</td>
            <td>${award.badge_types?.badge_level || "-"}</td>
            <td>${formatDate(award.awarded_date)}</td>
            <td>${award.awarded_by || "-"}</td>
            <td>${award.notes || "-"}</td>
          </tr>
        `
      )
      .join("");

    const win = window.open("", "_blank");

    if (!win) {
      alert("Popup blocked. Sila allow popup untuk export PDF.");
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>Laporan Lencana ${groupName || "Kumpulan"}</title>
          <style>
            @page { size: A4 landscape; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #111827; }
            h1 { margin: 0; font-size: 24px; }
            p { margin: 4px 0 16px; color: #4b5563; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #15803d; color: white; text-align: left; padding: 8px; border: 1px solid #166534; }
            td { padding: 8px; border: 1px solid #d1d5db; vertical-align: top; }
            tr:nth-child(even) { background: #f9fafb; }
            .empty { text-align: center; padding: 40px; color: #6b7280; }
          </style>
        </head>
        <body>
          <h1>Laporan Lencana & Pencapaian</h1>
          <p>Kumpulan: <strong>${groupName || "-"}</strong></p>
          <div class="meta">
            <span>Jumlah rekod: ${filteredAwards.length}</span>
            <span>Dicetak pada: ${formatDate(new Date().toISOString())}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Bil</th>
                <th>Nama Ahli</th>
                <th>Unit</th>
                <th>Lencana</th>
                <th>Tahap</th>
                <th>Tarikh</th>
                <th>Dianugerahkan Oleh</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="8" class="empty">Tiada rekod lencana.</td></tr>`}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    win.document.close();
  }

  if (!groupId && !groupName) {
    return (
      <DashboardLayout role="groupLeader">
        <div className="alert alert-warning rounded-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Akaun anda belum dipautkan dengan kumpulan. Sila hubungi Pesuruhjaya Daerah untuk kemaskini kumpulan anda.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Lencana & Pencapaian</h2>
          <p className="text-muted mb-0">
            Jejaki pencapaian ahli untuk kumpulan <strong>{groupName || "-"}</strong>.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-success" onClick={exportAwardsCSV}>
            <i className="bi bi-file-earmark-spreadsheet me-1"></i>
            Export CSV
          </button>

          <button className="btn btn-outline-danger" onClick={exportAwardsPDF}>
            <i className="bi bi-file-earmark-pdf me-1"></i>
            Export PDF
          </button>

          <button className="btn btn-success" onClick={() => setShowAwardModal(true)}>
            <i className="bi bi-award me-1"></i>
            Anugerah Lencana
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Lencana Dianugerah</small>
              <h3 className="fw-bold mb-0">{stats.totalAwarded}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Bulan Ini</small>
              <h3 className="fw-bold text-warning mb-0">{stats.thisMonth}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Ahli Cemerlang</small>
              <h3 className="fw-bold text-success mb-0">{stats.excellentMembers}</h3>
              <small className="text-muted">3 lencana ke atas</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">Jenis Lencana</small>
              <h3 className="fw-bold text-info mb-0">{stats.badgeTypes}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Cari ahli, lencana, tahap atau catatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
              <select className="form-select" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
                <option>Semua Ahli</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || "-"}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <select className="form-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch("");
                  setMemberFilter("Semua Ahli");
                  setLevelFilter("Semua Tahap");
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Kemajuan Lencana</h5>
              <p className="text-muted small mb-0">Peratus ahli yang sudah menerima setiap lencana.</p>
            </div>

            <div className="card-body p-4 pt-0">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-success"></div>
                </div>
              ) : progressByBadge.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-award fs-1 d-block mb-2"></i>
                  Tiada jenis lencana direkodkan.
                </div>
              ) : (
                <div className="d-grid gap-4">
                  {progressByBadge.map((badge) => (
                    <div key={badge.id}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <span className="fw-semibold">{badge.badge_name}</span>
                          <span className={`badge rounded-pill ms-2 ${badgeTone(badge.badge_level)}`}>
                            {badge.badge_level}
                          </span>
                        </div>

                        <small className="text-muted">
                          {badge.earned}/{badge.totalMembers} ({badge.progress}%)
                        </small>
                      </div>

                      <div className="progress rounded-pill" style={{ height: 9 }}>
                        <div className="progress-bar bg-success" style={{ width: `${badge.progress}%` }}></div>
                      </div>

                      {badge.description && <small className="text-muted d-block mt-1">{badge.description}</small>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Ahli Paling Banyak Lencana</h5>
              <p className="text-muted small mb-0">Top 5 ahli berdasarkan jumlah lencana.</p>
            </div>

            <div className="card-body p-4 pt-0">
              {topMembers.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-trophy fs-1 d-block mb-2"></i>
                  Tiada pencapaian lagi.
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {topMembers.map((item, index) => (
                    <div key={item.member?.id || index} className="border rounded-4 p-3 d-flex align-items-center gap-3">
                      <div
                        className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                        style={{ width: 42, height: 42 }}
                      >
                        {index + 1}
                      </div>

                      <div className="flex-grow-1">
                        <div className="fw-semibold">{item.member?.full_name || "-"}</div>
                        <small className="text-muted">{getMemberUnit(item.member)}</small>
                      </div>

                      <span className="badge rounded-pill bg-warning text-dark">{item.count} lencana</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-header bg-white border-0 p-4">
          <h5 className="fw-bold mb-1">Kemajuan Mengikut Ahli</h5>
          <p className="text-muted small mb-0">Klik Sejarah untuk lihat semua lencana ahli.</p>
        </div>

        <div className="card-body p-4 pt-0">
          {memberProgress.length === 0 ? (
            <div className="text-muted text-center py-4">Tiada ahli dalam kumpulan ini.</div>
          ) : (
            <div className="row g-3">
              {memberProgress.slice(0, 6).map((item) => (
                <div className="col-md-6" key={item.member.id}>
                  <div className="border rounded-4 p-3">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div
                        className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                        style={{ width: 42, height: 42 }}
                      >
                        {getInitials(item.member.full_name || "-")}
                      </div>

                      <div className="flex-grow-1">
                        <div className="fw-semibold">{item.member.full_name || "-"}</div>
                        <small className="text-muted">{getMemberUnit(item.member)}</small>
                      </div>

                      <button className="btn btn-sm btn-outline-success" onClick={() => openMemberHistory(item.member)}>
                        Sejarah
                      </button>
                    </div>

                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>{item.count}/{item.total} lencana</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="progress rounded-pill" style={{ height: 8 }}>
                      <div className="progress-bar bg-success" style={{ width: `${item.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-white border-0 p-4">
          <h5 className="fw-bold mb-1">Senarai Anugerah Lencana</h5>
          <p className="text-muted small mb-0">Rekod lencana yang dianugerahkan kepada ahli kumpulan.</p>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Ahli</th>
                <th className="px-4 py-3">Lencana</th>
                <th className="px-4 py-3">Tahap</th>
                <th className="px-4 py-3">Tarikh</th>
                <th className="px-4 py-3">Dianugerahkan Oleh</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">Memuatkan rekod lencana...</p>
                  </td>
                </tr>
              ) : filteredAwards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-award fs-1 d-block mb-2"></i>
                    Tiada anugerah lencana dijumpai.
                  </td>
                </tr>
              ) : (
                filteredAwards.map((award) => (
                  <tr key={award.id}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"
                          style={{ width: 40, height: 40 }}
                        >
                          {getInitials(award.members?.full_name || "-")}
                        </div>

                        <div>
                          <div className="fw-semibold">{award.members?.full_name || "-"}</div>
                          <small className="text-muted">{getMemberUnit(award.members)}</small>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">{award.badge_types?.badge_name || "-"}</td>

                    <td className="px-4 py-3">
                      <span className={`badge rounded-pill ${badgeTone(award.badge_types?.badge_level)}`}>
                        {award.badge_types?.badge_level || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">{formatDate(award.awarded_date)}</td>
                    <td className="px-4 py-3">{award.awarded_by || "-"}</td>

                    <td className="px-4 py-3 text-end">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-light border" onClick={() => openViewAward(award)} title="Lihat">
                          <i className="bi bi-eye text-primary"></i>
                        </button>
                        <button className="btn btn-light border" onClick={() => openCancelAward(award)} title="Batal Lencana">
                          <i className="bi bi-x-circle text-danger"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAwardModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Anugerah Lencana</h5>
                  <small className="text-muted">Pilih ahli dan lencana yang ingin dianugerahkan.</small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => {
                    setShowAwardModal(false);
                    resetForm();
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Ahli</label>
                    <select className="form-select" value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })}>
                      <option value="">Pilih Ahli</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || "-"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Lencana</label>
                    <select className="form-select" value={form.badge_id} onChange={(e) => setForm({ ...form, badge_id: e.target.value })}>
                      <option value="">Pilih Lencana</option>
                      {badgeTypes.map((badge) => (
                        <option key={badge.id} value={badge.id}>
                          {badge.badge_name} ({badge.badge_level})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Tarikh Anugerah</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.awarded_date}
                      onChange={(e) => setForm({ ...form, awarded_date: e.target.value })}
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Catatan</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Contoh: Lulus ujian praktikal dengan baik"
                    ></textarea>
                  </div>
                </div>

                <div className="alert alert-info rounded-4 small mt-4 mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Lencana akan direkodkan untuk ahli dalam kumpulan <strong>{groupName}</strong> sahaja.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowAwardModal(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Batal
                </button>

                <button className="btn btn-success" onClick={awardBadge} disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan Anugerah"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedAward && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Lencana</h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedAward(null);
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{ width: 72, height: 72 }}
                  >
                    <i className="bi bi-medal fs-2"></i>
                  </div>

                  <h5 className="fw-bold mb-1">{selectedAward.badge_types?.badge_name || "-"}</h5>
                  <span className={`badge rounded-pill ${badgeTone(selectedAward.badge_types?.badge_level)}`}>
                    {selectedAward.badge_types?.badge_level || "-"}
                  </span>
                </div>

                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Ahli</span>
                    <strong>{selectedAward.members?.full_name || "-"}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Unit</span>
                    <strong>{getMemberUnit(selectedAward.members)}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Tarikh</span>
                    <strong>{formatDate(selectedAward.awarded_date)}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Dianugerahkan Oleh</span>
                    <strong>{selectedAward.awarded_by || "-"}</strong>
                  </div>

                  <div className="list-group-item">
                    <span className="text-muted d-block mb-2">Catatan</span>
                    <p className="mb-0">{selectedAward.notes || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedAward(null);
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedHistoryMember && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Sejarah Lencana Ahli</h5>
                  <small className="text-muted">{selectedHistoryMember.full_name || "-"}</small>
                </div>
                <button
                  className="btn-close"
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedHistoryMember(null);
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="mb-4">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>{selectedMemberAwards.length}/{badgeTypes.length} lencana</span>
                    <span>{percent(selectedMemberAwards.length, badgeTypes.length)}%</span>
                  </div>
                  <div className="progress rounded-pill" style={{ height: 9 }}>
                    <div className="progress-bar bg-success" style={{ width: `${percent(selectedMemberAwards.length, badgeTypes.length)}%` }}></div>
                  </div>
                </div>

                {selectedMemberAwards.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-award fs-1 d-block mb-2"></i>
                    Ahli ini belum menerima lencana.
                  </div>
                ) : (
                  <div className="list-group">
                    {selectedMemberAwards.map((award) => (
                      <div key={award.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold">{award.badge_types?.badge_name || "-"}</div>
                          <small className="text-muted">{formatDate(award.awarded_date)} • {award.awarded_by || "-"}</small>
                        </div>
                        <span className={`badge rounded-pill ${badgeTone(award.badge_types?.badge_level)}`}>
                          {award.badge_types?.badge_level || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedHistoryMember(null);
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && cancelTarget && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">Batal Lencana</h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelTarget(null);
                    setCancelReason("");
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="alert alert-warning rounded-4">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Tindakan ini akan menyembunyikan rekod lencana daripada senarai aktif, tetapi rekod tidak dipadam secara kekal.
                </div>

                <div className="mb-3">
                  <label className="form-label">Ahli</label>
                  <input className="form-control" value={cancelTarget.members?.full_name || "-"} disabled />
                </div>

                <div className="mb-3">
                  <label className="form-label">Lencana</label>
                  <input className="form-control" value={cancelTarget.badge_types?.badge_name || "-"} disabled />
                </div>

                <div>
                  <label className="form-label">Sebab Batal</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Contoh: Tersalah pilih ahli / lencana"
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelTarget(null);
                    setCancelReason("");
                  }}
                  disabled={saving}
                >
                  Tutup
                </button>
                <button className="btn btn-danger" onClick={cancelAward} disabled={saving}>
                  {saving ? "Membatalkan..." : "Ya, Batal Lencana"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
