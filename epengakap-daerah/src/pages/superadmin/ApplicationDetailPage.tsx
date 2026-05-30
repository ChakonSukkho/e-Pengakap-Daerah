import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type DistrictApplication = {
  id: string;
  applicant_name: string;
  email: string;
  phone: string;
  state: string;
  district: string;
  organization: string;
  status: string;
  admin_note: string;
};

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const [application, setApplication] = useState<DistrictApplication | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    fetchApplication();
  }, [id]);

  async function fetchApplication() {
    const { data, error } = await supabase
      .from("district_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setApplication(data);
    setAdminNote(data.admin_note || "");
  }

  async function updateStatus(status: string) {
    if (!application) return;

    const { error } = await supabase
      .from("district_applications")
      .update({
        status,
        admin_note: adminNote,
      })
      .eq("id", application.id);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchApplication();
    alert(`Permohonan berjaya dikemaskini kepada ${status}.`);
  }

  if (!application) {
    return (
      <DashboardLayout role="superadmin">
        <p className="text-muted">Loading application...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="superadmin">
      <div className="mb-4">
        <Link to="/superadmin/applications" className="text-success text-decoration-none">
          ← Kembali ke Permohonan
        </Link>
      </div>

      <h2 className="fw-bold">Semakan Permohonan Daerah</h2>
      <p className="text-muted">Semak maklumat pemohon sebelum membuat keputusan.</p>

      <div className="row g-4 mt-2">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white fw-semibold">
              Maklumat Pemohon
            </div>

            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-4 text-muted">Nama</div>
                <div className="col-md-8 fw-semibold">{application.applicant_name}</div>
              </div>

              <div className="row mb-3">
                <div className="col-md-4 text-muted">E-mel</div>
                <div className="col-md-8">{application.email}</div>
              </div>

              <div className="row mb-3">
                <div className="col-md-4 text-muted">Telefon</div>
                <div className="col-md-8">{application.phone || "-"}</div>
              </div>

              <div className="row">
                <div className="col-md-4 text-muted">Organisasi</div>
                <div className="col-md-8">{application.organization || "-"}</div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">
              Maklumat Daerah
            </div>

            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-4 text-muted">Negeri</div>
                <div className="col-md-8 fw-semibold">{application.state}</div>
              </div>

              <div className="row">
                <div className="col-md-4 text-muted">Daerah</div>
                <div className="col-md-8 fw-semibold">{application.district}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white fw-semibold">
              Status Semasa
            </div>

            <div className="card-body">
              <span
                className={`badge mb-3 ${
                  application.status === "Approved"
                    ? "bg-success"
                    : application.status === "Rejected"
                    ? "bg-danger"
                    : application.status === "More Info"
                    ? "bg-info text-dark"
                    : "bg-warning text-dark"
                }`}
              >
                {application.status}
              </span>

              <p className="text-muted small mb-0">
                Status permohonan terkini berdasarkan semakan Super Admin.
              </p>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">
              Tindakan Admin
            </div>

            <div className="card-body">
              <label className="form-label">Catatan Admin</label>
              <textarea
                className="form-control mb-3"
                rows={4}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Masukkan catatan admin..."
              />

              <button
                className="btn btn-success w-100 mb-2"
                onClick={() => updateStatus("Approved")}
              >
                Approve
              </button>

              <button
                className="btn btn-danger w-100 mb-2"
                onClick={() => updateStatus("Rejected")}
              >
                Reject
              </button>

              <button
                className="btn btn-warning w-100"
                onClick={() => updateStatus("More Info")}
              >
                Request More Information
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}