import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type DistrictApplication = {
  id: string;
  applicant_name: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  district: string | null;
  organization: string | null;
  status: string | null;
  admin_note: string | null;
  document_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SystemUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  district: string | null;
  district_environment_id?: string | null;
  status: string | null;
};

type StateRow = {
  id: string;
  state_name?: string | null;
  name?: string | null;
  state?: string | null;
};

type DistrictRow = {
  id: string;
  state_id: string;
  district_name: string | null;
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

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStatus(value?: string | null) {
  return String(value || "Pending").trim();
}

function statusLower(value?: string | null) {
  return normalizeStatus(value).toLowerCase();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status?: string | null) {
  const normalized = statusLower(status);

  if (normalized === "approved") {
    return "bg-success-subtle text-success border border-success-subtle";
  }

  if (normalized === "rejected") {
    return "bg-danger-subtle text-danger border border-danger-subtle";
  }

  if (normalized === "more info" || normalized === "more_info") {
    return "bg-info-subtle text-info border border-info-subtle";
  }

  return "bg-warning-subtle text-warning border border-warning-subtle";
}

function getStatusLabel(status?: string | null) {
  const normalized = statusLower(status);

  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "more info" || normalized === "more_info") return "More Info";

  return "Pending";
}

function getStateName(row: StateRow) {
  return row.state_name || row.name || row.state || "";
}

export default function ApplicationDetailPage() {
  const { id } = useParams();

  const [application, setApplication] = useState<DistrictApplication | null>(
    null
  );
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  async function fetchApplication() {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("district_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      alert("Permohonan tidak dijumpai.");
      setLoading(false);
      return;
    }

    setApplication(data);
    setAdminNote(data.admin_note || "");
    setLoading(false);
  }

  async function addAuditLog(
    action: string,
    description: string,
    recordId?: string | null,
    oldValue?: unknown,
    newValue?: unknown,
    districtEnvironmentId?: string | null
  ) {
    try {
      const currentUser = getCurrentUser();

      await supabase.from("audit_logs").insert({
        actor_name: currentUser.full_name || currentUser.name || "Super Admin",
        actor_role: currentUser.role || "Super Admin",
        action,
        module: "Permohonan Daerah",
        description,
        user_id: currentUser.id || null,
        district_environment_id: districtEnvironmentId || null,
        record_id: recordId || null,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch {
      // Jangan block proses utama kalau audit log gagal.
    }
  }

  function validateApplication(app: DistrictApplication) {
    if (!app.id) {
      alert("ID permohonan tidak dijumpai.");
      return false;
    }

    if (!normalizeText(app.applicant_name)) {
      alert("Nama pemohon tidak lengkap.");
      return false;
    }

    if (!normalizeEmail(app.email)) {
      alert("Email pemohon tidak lengkap.");
      return false;
    }

    if (!normalizeText(app.state)) {
      alert("Negeri tidak lengkap.");
      return false;
    }

    if (!normalizeText(app.district)) {
      alert("Daerah tidak lengkap.");
      return false;
    }

    return true;
  }

  async function findStateId(stateName: string) {
    const cleanState = stateName.toLowerCase().trim();

    const { data, error } = await supabase.from("states").select("*");

    if (error) throw error;

    const matchedState = (data || []).find((state: StateRow) => {
      return getStateName(state).toLowerCase().trim() === cleanState;
    });

    if (!matchedState?.id) {
      throw new Error(
        `Negeri "${stateName}" tidak dijumpai dalam table states.`
      );
    }

    return matchedState.id as string;
  }

  async function findDistrictId(stateId: string, districtName: string) {
    const cleanDistrict = districtName.toLowerCase().trim();

    const { data, error } = await supabase
      .from("districts")
      .select("id, state_id, district_name")
      .eq("state_id", stateId);

    if (error) throw error;

    const matchedDistrict = (data || []).find((district: DistrictRow) => {
      return (
        normalizeText(district.district_name).toLowerCase() === cleanDistrict
      );
    });

    if (!matchedDistrict?.id) {
      throw new Error(
        `Daerah "${districtName}" tidak dijumpai dalam table districts untuk negeri tersebut.`
      );
    }

    return matchedDistrict.id as string;
  }

  async function ensureCommissionerUser(app: DistrictApplication) {
    const email = normalizeEmail(app.email);

    const { data: existingUser, error: findUserError } = await supabase
      .from("system_users")
      .select("*")
      .eq("email", email)
      .maybeSingle<SystemUser>();

    if (findUserError) throw findUserError;

    if (existingUser) {
      const { data: updatedUser, error: updateUserError } = await supabase
        .from("system_users")
        .update({
          full_name: normalizeText(app.applicant_name),
          email,
          phone: normalizeText(app.phone),
          role: "Pesuruhjaya Daerah",
          district: normalizeText(app.district),
          status: "Aktif",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUser.id)
        .select("*")
        .single<SystemUser>();

      if (updateUserError) throw updateUserError;

      return updatedUser;
    }

    const { data: newUser, error: insertUserError } = await supabase
      .from("system_users")
      .insert({
        full_name: normalizeText(app.applicant_name),
        email,
        phone: normalizeText(app.phone),
        role: "Pesuruhjaya Daerah",
        district: normalizeText(app.district),
        status: "Aktif",
        password: "123456",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single<SystemUser>();

    if (insertUserError) throw insertUserError;

    return newUser;
  }

  async function ensureDistrictEnvironment(
    app: DistrictApplication,
    commissionerUserId: string
  ) {
    const currentUser = getCurrentUser();

    const stateId = await findStateId(normalizeText(app.state));
    const districtId = await findDistrictId(stateId, normalizeText(app.district));

    const { data: existingEnvironment, error: findEnvironmentError } =
      await supabase
        .from("district_environments")
        .select("*")
        .eq("state_id", stateId)
        .eq("district_id", districtId)
        .is("deleted_at", null)
        .maybeSingle();

    if (findEnvironmentError) throw findEnvironmentError;

    if (existingEnvironment) {
      const { data: updatedEnvironment, error: updateEnvironmentError } =
        await supabase
          .from("district_environments")
          .update({
            district_commissioner_user_id: commissionerUserId,
            official_name:
              normalizeText(app.organization) || normalizeText(app.district),
            official_email: normalizeEmail(app.email),
            official_phone: normalizeText(app.phone),
            status: "active",
            approved_by: currentUser.id || null,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingEnvironment.id)
          .select("*")
          .single();

      if (updateEnvironmentError) throw updateEnvironmentError;

      return updatedEnvironment;
    }

    const { data: newEnvironment, error: insertEnvironmentError } =
      await supabase
        .from("district_environments")
        .insert({
          state_id: stateId,
          district_id: districtId,
          district_commissioner_user_id: commissionerUserId,
          official_name:
            normalizeText(app.organization) || normalizeText(app.district),
          official_email: normalizeEmail(app.email),
          official_phone: normalizeText(app.phone),
          office_address: "",
          status: "active",
          approved_by: currentUser.id || null,
          approved_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

    if (insertEnvironmentError) throw insertEnvironmentError;

    return newEnvironment;
  }

  async function assignEnvironmentToUser(
    userId: string,
    environmentId: string,
    districtName: string
  ) {
    const { error } = await supabase
      .from("system_users")
      .update({
        district_environment_id: environmentId,
        district: districtName,
        status: "Aktif",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
  }

  async function syncDistrictSettings(
    app: DistrictApplication,
    districtEnvironmentId: string
  ) {
    try {
      const { error } = await supabase.from("district_settings").upsert(
        {
          district_environment_id: districtEnvironmentId,
          state: normalizeText(app.state),
          district: normalizeText(app.district),
          official_name:
            normalizeText(app.organization) || normalizeText(app.district),
          email: normalizeEmail(app.email),
          phone: normalizeText(app.phone),
          commissioner: normalizeText(app.applicant_name),
          address: "",
          status: "Active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "district_environment_id" }
      );

      if (error) {
        console.warn("District settings sync failed:", error.message);
      }
    } catch {
      // optional sync only
    }
  }

  async function approveApplication() {
    if (!application) return;
    if (!validateApplication(application)) return;

    if (getStatusLabel(application.status) === "Approved") {
      alert("Permohonan ini sudah diluluskan.");
      return;
    }

    const confirmed = confirm(
      `Luluskan permohonan daerah ${application.district}? Sistem akan cipta district environment dan aktifkan Pesuruhjaya Daerah.`
    );

    if (!confirmed) return;

    setProcessing(true);

    try {
      const commissionerUser = await ensureCommissionerUser(application);

      const environment = await ensureDistrictEnvironment(
        application,
        commissionerUser.id
      );

      await assignEnvironmentToUser(
        commissionerUser.id,
        environment.id,
        normalizeText(application.district)
      );

      await syncDistrictSettings(application, environment.id);

      const { error: updateApplicationError } = await supabase
        .from("district_applications")
        .update({
          status: "Approved",
          admin_note:
            adminNote.trim() ||
            "Permohonan telah diluluskan oleh Super Admin.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (updateApplicationError) throw updateApplicationError;

      await addAuditLog(
        "APPROVE",
        `Lulus permohonan daerah ${application.district} dan cipta/aktifkan district environment.`,
        application.id,
        application,
        {
          status: "Approved",
          district_environment_id: environment.id,
          commissioner_user_id: commissionerUser.id,
        },
        environment.id
      );

      await fetchApplication();

      alert("Permohonan berjaya diluluskan.");
    } catch (error: any) {
      console.error("Approve failed:", error);
      alert(error?.message || "Gagal meluluskan permohonan.");
    } finally {
      setProcessing(false);
    }
  }

  async function rejectApplication() {
    if (!application) return;

    const reason =
      adminNote.trim() ||
      prompt("Masukkan sebab penolakan:", application.admin_note || "") ||
      "";

    if (!reason.trim()) {
      alert("Sila masukkan sebab penolakan.");
      return;
    }

    const confirmed = confirm(`Tolak permohonan daerah ${application.district}?`);

    if (!confirmed) return;

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("district_applications")
        .update({
          status: "Rejected",
          admin_note: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) throw error;

      await addAuditLog(
        "REJECT",
        `Tolak permohonan daerah ${application.district}. Sebab: ${reason}`,
        application.id,
        application,
        { status: "Rejected", admin_note: reason }
      );

      await fetchApplication();

      alert("Permohonan berjaya ditolak.");
    } catch (error: any) {
      alert(error?.message || "Gagal menolak permohonan.");
    } finally {
      setProcessing(false);
    }
  }

  async function requestMoreInfo() {
    if (!application) return;

    const note =
      adminNote.trim() ||
      prompt(
        "Masukkan maklumat tambahan yang diperlukan:",
        application.admin_note || ""
      ) ||
      "";

    if (!note.trim()) {
      alert("Sila masukkan catatan maklumat tambahan.");
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("district_applications")
        .update({
          status: "More Info",
          admin_note: note,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) throw error;

      await addAuditLog(
        "MORE_INFO",
        `Minta maklumat tambahan untuk permohonan daerah ${application.district}.`,
        application.id,
        application,
        { status: "More Info", admin_note: note }
      );

      await fetchApplication();

      alert("Status permohonan telah ditukar kepada More Info.");
    } catch (error: any) {
      alert(error?.message || "Gagal meminta maklumat tambahan.");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="superadmin">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success"></div>
            <p className="text-muted mt-3 mb-0">Memuatkan permohonan...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!application) {
    return (
      <DashboardLayout role="superadmin">
        <div className="alert alert-warning rounded-4">
          Permohonan tidak dijumpai.
        </div>

        <Link to="/superadmin/applications" className="btn btn-outline-success">
          ← Kembali ke Permohonan
        </Link>
      </DashboardLayout>
    );
  }

  const statusLabel = getStatusLabel(application.status);

  return (
    <DashboardLayout role="superadmin">
      <div className="mb-4">
        <Link
          to="/superadmin/applications"
          className="text-success text-decoration-none"
        >
          ← Kembali ke Permohonan
        </Link>
      </div>

      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Semakan Permohonan Daerah</h2>
          <p className="text-muted mb-0">
            Semak maklumat pemohon sebelum membuat keputusan.
          </p>
        </div>

        <span
          className={`badge rounded-pill px-3 py-2 ${getStatusBadge(
            application.status
          )}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Maklumat Pemohon</h5>
              <p className="text-muted small mb-0">
                Maklumat Pesuruhjaya Daerah yang memohon akses sistem.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="row g-3">
                <DetailItem label="Nama Pemohon" value={application.applicant_name} />
                <DetailItem label="E-mel" value={application.email} />
                <DetailItem label="Telefon" value={application.phone} />
                <DetailItem label="Organisasi" value={application.organization} />
                <DetailItem label="Tarikh Mohon" value={formatDateTime(application.created_at)} />
                <DetailItem label="ID Permohonan" value={application.id} mono />
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Maklumat Daerah</h5>
              <p className="text-muted small mb-0">
                Daerah ini akan menjadi district environment selepas diluluskan.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <div className="row g-3">
                <DetailItem label="Negeri" value={application.state} />
                <DetailItem label="Daerah" value={application.district} />
                <DetailItem
                  label="Nama Rasmi Environment"
                  value={application.organization || application.district}
                />

                <div className="col-12">
                  <div className="alert alert-light border rounded-4 mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Apabila diluluskan, sistem akan cipta rekod dalam{" "}
                    <strong>district_environments</strong> dan assign{" "}
                    <strong>district_environment_id</strong> kepada Pesuruhjaya
                    Daerah.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Dokumen Sokongan</h5>
              <p className="text-muted small mb-0">
                Semak dokumen jika pemohon memuat naik fail sokongan.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              {application.document_url ? (
                <a
                  href={application.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-success"
                >
                  <i className="bi bi-file-earmark-text me-1"></i>
                  Buka Dokumen Sokongan
                </a>
              ) : (
                <div className="alert alert-warning rounded-4 mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Tiada dokumen sokongan dimuat naik.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Status Semasa</h5>
            </div>

            <div className="card-body p-4 pt-0">
              <span
                className={`badge rounded-pill px-3 py-2 mb-3 ${getStatusBadge(
                  application.status
                )}`}
              >
                {statusLabel}
              </span>

              <p className="text-muted small mb-0">
                Status permohonan terkini berdasarkan semakan Super Admin.
              </p>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white border-0 p-4">
              <h5 className="fw-bold mb-1">Tindakan Admin</h5>
              <p className="text-muted small mb-0">
                Approve akan create district environment.
              </p>
            </div>

            <div className="card-body p-4 pt-0">
              <label className="form-label">Catatan Admin</label>
              <textarea
                className="form-control mb-3"
                rows={5}
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="Masukkan catatan admin..."
                disabled={processing}
              />

              <button
                className="btn btn-success w-100 mb-2"
                onClick={approveApplication}
                disabled={processing || statusLabel === "Approved"}
              >
                {processing ? "Memproses..." : "Approve"}
              </button>

              <button
                className="btn btn-danger w-100 mb-2"
                onClick={rejectApplication}
                disabled={processing || statusLabel === "Rejected"}
              >
                Reject
              </button>

              <button
                className="btn btn-warning w-100"
                onClick={requestMoreInfo}
                disabled={processing || statusLabel === "Approved"}
              >
                Request More Information
              </button>

              {statusLabel === "Approved" && (
                <div className="alert alert-success rounded-4 small mt-3 mb-0">
                  <i className="bi bi-check-circle me-2"></i>
                  Permohonan ini telah diluluskan.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="col-md-6">
      <div className="border rounded-4 p-3 h-100">
        <small className="text-muted d-block mb-1">{label}</small>
        <strong className={mono ? "font-monospace small" : ""}>
          {value || "-"}
        </strong>
      </div>
    </div>
  );
}