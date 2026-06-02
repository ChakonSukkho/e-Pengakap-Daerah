import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Member = {
  id: string;
  full_name: string;
  group_name: string;
};

export default function AttendancePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    const groupName =
      currentUser.group_name ||
      currentUser.district ||
      "";

    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("group_name", groupName)
      .order("full_name");

    if (error) {
      alert(error.message);
      return;
    }

    setMembers(data || []);

    const initialAttendance: Record<string, string> = {};

    (data || []).forEach((member) => {
      initialAttendance[member.id] = "Hadir";
    });

    setAttendance(initialAttendance);
  }

  function updateAttendance(
    memberId: string,
    status: string
  ) {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: status,
    }));
  }

  async function saveAttendance() {
    try {
      setSaving(true);

      const today = new Date().toISOString();

      const records = Object.entries(attendance).map(
        ([memberId, status]) => ({
          member_id: memberId,
          attendance_date: today,
          status,
        })
      );

      const { error } = await supabase
        .from("attendance")
        .insert(records);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Kehadiran berjaya disimpan.");
    } finally {
      setSaving(false);
    }
  }

  const hadirCount = Object.values(attendance).filter(
    (v) => v === "Hadir"
  ).length;

  const lewatCount = Object.values(attendance).filter(
    (v) => v === "Lewat"
  ).length;

  const tidakHadirCount = Object.values(attendance).filter(
    (v) => v === "Tidak Hadir"
  ).length;

  return (
    <DashboardLayout role="groupLeader">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Kehadiran Aktiviti
          </h2>
          <p className="text-muted mb-0">
            Rekod kehadiran ahli kumpulan.
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={saveAttendance}
          disabled={saving}
        >
          <i className="bi bi-check-circle me-2"></i>
          {saving
            ? "Menyimpan..."
            : "Simpan Kehadiran"}
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">
                Jumlah Ahli
              </small>
              <h3 className="fw-bold">
                {members.length}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">
                Hadir
              </small>
              <h3 className="fw-bold text-success">
                {hadirCount}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">
                Lewat
              </small>
              <h3 className="fw-bold text-warning">
                {lewatCount}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <small className="text-muted">
                Tidak Hadir
              </small>
              <h3 className="fw-bold text-danger">
                {tidakHadirCount}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-white">
          <h5 className="mb-0 fw-bold">
            Senarai Kehadiran
          </h5>
        </div>

        <div className="card-body table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Nama Ahli</th>
                <th className="text-center">
                  Hadir
                </th>
                <th className="text-center">
                  Lewat
                </th>
                <th className="text-center">
                  Tidak Hadir
                </th>
              </tr>
            </thead>

            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="fw-semibold">
                    {member.full_name}
                  </td>

                  {[
                    "Hadir",
                    "Lewat",
                    "Tidak Hadir",
                  ].map((status) => (
                    <td
                      key={status}
                      className="text-center"
                    >
                      <input
                        type="radio"
                        name={`member-${member.id}`}
                        checked={
                          attendance[member.id] ===
                          status
                        }
                        onChange={() =>
                          updateAttendance(
                            member.id,
                            status
                          )
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}