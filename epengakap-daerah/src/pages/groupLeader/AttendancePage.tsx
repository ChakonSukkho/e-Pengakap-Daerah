import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string;
  group_name: string;
};

type Activity = {
  id: string;
  activity_name: string;
  activity_date: string;
  location: string;
  group_name: string;
  status: string;
};

export default function AttendancePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentUser = useMemo(() => {
    return JSON.parse(localStorage.getItem("user") || "{}");
  }, []);

  const groupName = currentUser.group_name || currentUser.district || "";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("id, full_name, group_name")
      .eq("group_name", groupName)
      .order("full_name");

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    const { data: activityData, error: activityError } = await supabase
      .from("activities")
      .select("*")
      .eq("group_name", groupName)
      .order("activity_date", { ascending: false });

    if (activityError) {
      alert(activityError.message);
      setLoading(false);
      return;
    }

    setMembers(memberData || []);
    setActivities(activityData || []);

    if (activityData && activityData.length > 0) {
      setSelectedActivityId(activityData[0].id);
      await loadExistingAttendance(activityData[0].id, memberData || []);
    } else {
      const initial: Record<string, string> = {};
      (memberData || []).forEach((member) => {
        initial[member.id] = "Hadir";
      });
      setAttendance(initial);
    }

    setLoading(false);
  }

  async function loadExistingAttendance(activityId: string, memberList = members) {
    const initial: Record<string, string> = {};
    const initialNotes: Record<string, string> = {};

    memberList.forEach((member) => {
      initial[member.id] = "Hadir";
      initialNotes[member.id] = "";
    });

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("activity_id", activityId);

    if (error) {
      alert(error.message);
      return;
    }

    (data || []).forEach((record: any) => {
      initial[record.member_id] = record.status;
      initialNotes[record.member_id] = record.notes || "";
    });

    setAttendance(initial);
    setNotes(initialNotes);
  }

  function updateAttendance(memberId: string, status: string) {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: status,
    }));
  }

  function updateNotes(memberId: string, value: string) {
    setNotes((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  }

  async function saveAttendance() {
    if (!selectedActivityId) {
      alert("Sila pilih aktiviti dahulu.");
      return;
    }

    setSaving(true);

    const selectedActivity = activities.find((a) => a.id === selectedActivityId);

    await supabase
      .from("attendance")
      .delete()
      .eq("activity_id", selectedActivityId);

    const records = members.map((member) => ({
      activity_id: selectedActivityId,
      member_id: member.id,
      attendance_date: selectedActivity?.activity_date || new Date().toISOString(),
      status: attendance[member.id] || "Hadir",
      notes: notes[member.id] || null,
    }));

    const { error } = await supabase.from("attendance").insert(records);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    await supabase.from("audit_logs").insert({
      actor_name: currentUser.full_name || "Pemimpin Kumpulan",
      actor_role: currentUser.role || "Pemimpin Kumpulan",
      action: "ATTENDANCE",
      module: "Kehadiran",
      description: `Simpan kehadiran untuk aktiviti ${selectedActivity?.activity_name || ""}`,
    });

    alert("Kehadiran berjaya disimpan.");
    setSaving(false);
  }

  const hadirCount = Object.values(attendance).filter((v) => v === "Hadir").length;
  const lewatCount = Object.values(attendance).filter((v) => v === "Lewat").length;
  const tidakHadirCount = Object.values(attendance).filter((v) => v === "Tidak Hadir").length;
  const mcCount = Object.values(attendance).filter((v) => v === "MC").length;

  const selectedActivity = activities.find((a) => a.id === selectedActivityId);

  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Kehadiran Aktiviti</h2>
          <p className="text-muted mb-0">
            Rekod kehadiran ahli berdasarkan aktiviti kumpulan.
          </p>
        </div>

        <button className="btn btn-success" onClick={saveAttendance} disabled={saving || members.length === 0}>
          <i className="bi bi-check-circle me-2"></i>
          {saving ? "Menyimpan..." : "Simpan Kehadiran"}
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Pilih Aktiviti</label>
              <select
                className="form-select"
                value={selectedActivityId}
                onChange={(e) => {
                  setSelectedActivityId(e.target.value);
                  loadExistingAttendance(e.target.value);
                }}
              >
                {activities.length === 0 ? (
                  <option value="">Tiada aktiviti dijumpai</option>
                ) : (
                  activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.activity_name} — {activity.activity_date}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">Tarikh</label>
              <input
                className="form-control"
                value={selectedActivity?.activity_date || "-"}
                disabled
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">Lokasi</label>
              <input
                className="form-control"
                value={selectedActivity?.location || "-"}
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {[
          ["Jumlah Ahli", members.length, "text-dark", "bi-people"],
          ["Hadir", hadirCount, "text-success", "bi-check-circle"],
          ["Lewat", lewatCount, "text-warning", "bi-clock"],
          ["MC", mcCount, "text-primary", "bi-file-medical"],
          ["Tidak Hadir", tidakHadirCount, "text-danger", "bi-x-circle"],
        ].map(([label, value, color, icon]) => (
          <div className="col" key={label as string}>
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted">{label}</small>
                  <h3 className={`fw-bold mb-0 ${color}`}>{value}</h3>
                </div>
                <i className={`bi ${icon} fs-3 ${color}`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0 fw-bold">Senarai Kehadiran</h5>
            <small className="text-muted">
              {selectedActivity?.activity_name || "Pilih aktiviti untuk rekod kehadiran"}
            </small>
          </div>

          <span className="badge bg-success-subtle text-success px-3 py-2">
            {groupName}
          </span>
        </div>

        <div className="card-body table-responsive">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success"></div>
              <p className="text-muted mt-3 mb-0">Memuatkan data...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              Tiada ahli dijumpai untuk kumpulan ini.
            </div>
          ) : (
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Nama Ahli</th>
                  <th className="text-center">Hadir</th>
                  <th className="text-center">Lewat</th>
                  <th className="text-center">MC</th>
                  <th className="text-center">Tidak Hadir</th>
                  <th>Catatan</th>
                </tr>
              </thead>

              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="fw-semibold">{member.full_name}</td>

                    {["Hadir", "Lewat", "MC", "Tidak Hadir"].map((status) => (
                      <td key={status} className="text-center">
                        <input
                          type="radio"
                          name={`member-${member.id}`}
                          checked={attendance[member.id] === status}
                          onChange={() => updateAttendance(member.id, status)}
                        />
                      </td>
                    ))}

                    <td>
                      <input
                        className="form-control form-control-sm"
                        placeholder="Contoh: MC / lewat 10 minit"
                        value={notes[member.id] || ""}
                        onChange={(e) => updateNotes(member.id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}