import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string;
  group_name: string;
};

type BadgeType = {
  id: string;
  badge_name: string;
  badge_level: string;
  description: string | null;
};

type MemberBadge = {
  id: string;
  member_id: string;
  badge_id: string;
  awarded_by: string | null;
  awarded_date: string;
  notes: string | null;
  members?: Member;
  badge_types?: BadgeType;
};

export default function BadgesPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [memberBadges, setMemberBadges] = useState<MemberBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAwardModal, setShowAwardModal] = useState(false);

  const [form, setForm] = useState({
    member_id: "",
    badge_id: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }

  async function fetchData() {
    setLoading(true);

    const user = getCurrentUser();
    const groupName = user.group_name || user.district || "";

    const { data: memberData } = await supabase
      .from("members")
      .select("*")
      .eq("group_name", groupName)
      .order("full_name", { ascending: true });

    const { data: badgeData } = await supabase
      .from("badge_types")
      .select("*")
      .order("badge_name", { ascending: true });

    const { data: awardData } = await supabase
      .from("member_badges")
      .select(`
        *,
        members(*),
        badge_types(*)
      `)
      .order("awarded_date", { ascending: false });

    setMembers(memberData || []);
    setBadgeTypes(badgeData || []);
    setMemberBadges(awardData || []);
    setLoading(false);
  }

  async function addAuditLog(action: string, description: string) {
    const user = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name: user.full_name || "Pemimpin Kumpulan",
      actor_role: user.role || "Pemimpin Kumpulan",
      action,
      module: "Lencana & Pencapaian",
      description,
    });
  }

  async function awardBadge() {
    if (!form.member_id || !form.badge_id) {
      alert("Sila pilih ahli dan lencana.");
      return;
    }

    const user = getCurrentUser();

    const { error } = await supabase.from("member_badges").insert({
      member_id: form.member_id,
      badge_id: form.badge_id,
      awarded_by: user.full_name || "Pemimpin Kumpulan",
      awarded_date: new Date().toISOString().slice(0, 10),
      notes: form.notes || null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    await addAuditLog("CREATE", "Anugerah lencana kepada ahli kumpulan");

    setShowAwardModal(false);
    setForm({
      member_id: "",
      badge_id: "",
      notes: "",
    });

    fetchData();
  }

  const totalAwarded = memberBadges.length;

  const thisMonth = memberBadges.filter((item) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return item.awarded_date?.slice(0, 7) === currentMonth;
  }).length;

  const excellentMembers = useMemo(() => {
    const counts: Record<string, number> = {};

    memberBadges.forEach((item) => {
      counts[item.member_id] = (counts[item.member_id] || 0) + 1;
    });

    return Object.values(counts).filter((count) => count >= 3).length;
  }, [memberBadges]);

  function badgeTone(level: string) {
    if (level === "Lanjutan") return "bg-danger-subtle text-danger";
    if (level === "Pertengahan") return "bg-warning-subtle text-warning";
    return "bg-info-subtle text-info";
  }

  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Lencana & Pencapaian</h2>
          <p className="text-muted mb-0">
            Jejaki pencapaian setiap ahli kumpulan.
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={() => setShowAwardModal(true)}
        >
          <i className="bi bi-award me-1"></i>
          Anugerah Lencana
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Lencana Dianugerah</p>
              <h3 className="fw-bold mb-0">{totalAwarded}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Bulan Ini</p>
              <h3 className="fw-bold text-warning mb-0">{thisMonth}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Ahli Cemerlang</p>
              <h3 className="fw-bold text-success mb-0">{excellentMembers}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Jenis Lencana</p>
              <h3 className="fw-bold text-info mb-0">{badgeTypes.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white fw-bold">
              Kemajuan Lencana
            </div>

            <div className="card-body">
              {badgeTypes.length === 0 ? (
                <p className="text-muted mb-0">Tiada jenis lencana.</p>
              ) : (
                badgeTypes.map((badge) => {
                  const earned = memberBadges.filter(
                    (item) => item.badge_id === badge.id
                  ).length;

                  const total = members.length || 1;
                  const percent = Math.round((earned / total) * 100);

                  return (
                    <div className="mb-4" key={badge.id}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <span className="fw-semibold">{badge.badge_name}</span>
                          <span
                            className={`badge rounded-pill ms-2 ${badgeTone(
                              badge.badge_level
                            )}`}
                          >
                            {badge.badge_level}
                          </span>
                        </div>

                        <small className="text-muted">
                          {earned}/{members.length} ({percent}%)
                        </small>
                      </div>

                      <div className="progress rounded-pill" style={{ height: 9 }}>
                        <div
                          className="progress-bar bg-success"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white fw-bold">
              Anugerah Terkini
            </div>

            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-success"></div>
                </div>
              ) : memberBadges.length === 0 ? (
                <p className="text-muted mb-0">Tiada anugerah lencana.</p>
              ) : (
                memberBadges.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="d-flex align-items-start gap-3 border-bottom pb-3 mb-3"
                  >
                    <div
                      className="bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 42, height: 42 }}
                    >
                      <i className="bi bi-medal"></i>
                    </div>

                    <div className="flex-grow-1">
                      <div className="fw-semibold">
                        {item.members?.full_name || "-"}
                      </div>

                      <small className="text-muted">
                        {item.badge_types?.badge_name || "-"} ·{" "}
                        {item.badge_types?.badge_level || "-"}
                      </small>

                      {item.notes && (
                        <div className="small text-muted mt-1">{item.notes}</div>
                      )}
                    </div>

                    <small className="text-muted text-nowrap">
                      {new Date(item.awarded_date).toLocaleDateString()}
                    </small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showAwardModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Anugerah Lencana</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowAwardModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Ahli</label>
                  <select
                    className="form-select"
                    value={form.member_id}
                    onChange={(e) =>
                      setForm({ ...form, member_id: e.target.value })
                    }
                  >
                    <option value="">Pilih Ahli</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Lencana</label>
                  <select
                    className="form-select"
                    value={form.badge_id}
                    onChange={(e) =>
                      setForm({ ...form, badge_id: e.target.value })
                    }
                  >
                    <option value="">Pilih Lencana</option>
                    {badgeTypes.map((badge) => (
                      <option key={badge.id} value={badge.id}>
                        {badge.badge_name} ({badge.badge_level})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Catatan</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Contoh: Lulus ujian praktikal dengan baik"
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowAwardModal(false)}
                >
                  Batal
                </button>

                <button className="btn btn-success" onClick={awardBadge}>
                  Simpan Anugerah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}