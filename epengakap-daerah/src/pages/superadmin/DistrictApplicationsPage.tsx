import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type ApplicationStatus = "Pending" | "Approved" | "Rejected" | "More Info";

type Application = {
  id: string;
  applicant_name: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  district: string | null;
  organization: string | null;
  status: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at?: string | null;
};

type SystemUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  role: string | null;
  district: string | null;
  district_environment_id: string | null;
  status: string | null;
};

type DistrictEnvironment = {
  id: string;
  state_id: string;
  district_id: string;
  district_commissioner_user_id: string;
  official_name: string | null;
  official_email: string | null;
  official_phone: string | null;
  office_address: string | null;
  status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const APPLICATION_TABLE = "district_applications";

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

function normalizeStatus(value?: string | null) {
  return String(value || "Pending").trim().toLowerCase();
}

function displayStatus(value?: string | null): ApplicationStatus {
  const status = normalizeStatus(value);

  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "more info" || status === "more_info") return "More Info";

  return "Pending";
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

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function getStatusBadge(statusValue?: string | null) {
  const status = displayStatus(statusValue);

  if (status === "Approved") {
    return (
      <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
        Approved
      </span>
    );
  }

  if (status === "Rejected") {
    return (
      <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2">
        Rejected
      </span>
    );
  }

  if (status === "More Info") {
    return (
      <span className="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-3 py-2">
        More Info
      </span>
    );
  }

  return (
    <span className="badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle px-3 py-2">
      Pending
    </span>
  );
}

export default function DistrictApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [stateFilter, setStateFilter] = useState("Semua Negeri");
  const [districtFilter, setDistrictFilter] = useState("Semua Daerah");

  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);

    const { data, error } = await supabase
      .from(APPLICATION_TABLE)
      .select(
        "id, applicant_name, email, phone, state, district, organization, status, admin_note, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setApplications(data || []);
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
      const user = getCurrentUser();

      await supabase.from("audit_logs").insert({
        actor_name: user.full_name || user.name || "Super Admin",
        actor_role: user.role || "Super Admin",
        action,
        module: "Permohonan Daerah",
        description,
        user_id: user.id || null,
        district_environment_id: districtEnvironmentId || null,
        record_id: recordId || null,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch {
      // Jangan block proses approve/reject kalau audit log gagal.
    }
  }

  function validateApplication(application: Application) {
    if (!application.id) {
      alert("ID permohonan tidak dijumpai.");
      return false;
    }

    if (!normalizeText(application.applicant_name)) {
      alert("Nama pemohon tidak lengkap.");
      return false;
    }

    if (!normalizeEmail(application.email)) {
      alert("Email pemohon tidak lengkap.");
      return false;
    }

    if (!normalizeText(application.state)) {
      alert("Negeri permohonan tidak lengkap.");
      return false;
    }

    if (!normalizeText(application.district)) {
      alert("Daerah permohonan tidak lengkap.");
      return false;
    }

    return true;
  }

  async function findStateId(stateName: string) {
    const cleanState = stateName.toLowerCase().trim();

    const { data, error } = await supabase.from("states").select("*");

    if (error) throw error;

    const matchedState = (data || []).find((state: any) => {
      const name = state.state_name || state.name || state.state || "";
      return String(name).toLowerCase().trim() === cleanState;
    });

    if (!matchedState?.id) {
      throw new Error(`Negeri "${stateName}" tidak dijumpai dalam table states.`);
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

    const matchedDistrict = (data || []).find((district: any) => {
      return (
        String(district.district_name || "").toLowerCase().trim() ===
        cleanDistrict
      );
    });

    if (!matchedDistrict?.id) {
      throw new Error(
        `Daerah "${districtName}" tidak dijumpai dalam table districts untuk negeri tersebut.`
      );
    }

    return matchedDistrict.id as string;
  }

  async function ensureCommissionerUser(application: Application) {
    const email = normalizeEmail(application.email);

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
          full_name: normalizeText(application.applicant_name),
          email,
          phone: normalizeText(application.phone),
          role: "Pesuruhjaya Daerah",
          district: normalizeText(application.district),
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
        full_name: normalizeText(application.applicant_name),
        email,
        phone: normalizeText(application.phone),
        role: "Pesuruhjaya Daerah",
        district: normalizeText(application.district),
        district_environment_id: null,
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
    application: Application,
    commissionerUserId: string
  ) {
    const currentUser = getCurrentUser();

    const stateId = await findStateId(normalizeText(application.state));
    const districtId = await findDistrictId(
      stateId,
      normalizeText(application.district)
    );

    const { data: existingEnvironment, error: findEnvironmentError } =
      await supabase
        .from("district_environments")
        .select("*")
        .eq("state_id", stateId)
        .eq("district_id", districtId)
        .is("deleted_at", null)
        .maybeSingle<DistrictEnvironment>();

    if (findEnvironmentError) throw findEnvironmentError;

    if (existingEnvironment) {
      const { data: updatedEnvironment, error: updateEnvironmentError } =
        await supabase
          .from("district_environments")
          .update({
            district_commissioner_user_id: commissionerUserId,
            official_name:
              normalizeText(application.organization) ||
              normalizeText(application.district),
            official_email: normalizeEmail(application.email),
            official_phone: normalizeText(application.phone),
            status: "active",
            approved_by: currentUser.id || null,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingEnvironment.id)
          .select("*")
          .single<DistrictEnvironment>();

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
            normalizeText(application.organization) ||
            normalizeText(application.district),
          official_email: normalizeEmail(application.email),
          official_phone: normalizeText(application.phone),
          office_address: "",
          status: "active",
          approved_by: currentUser.id || null,
          approved_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single<DistrictEnvironment>();

    if (insertEnvironmentError) throw insertEnvironmentError;

    return newEnvironment;
  }

async function syncDistrictSettings(
  application: Application,
  districtEnvironmentId: string
) {
  try {
    const payload = {
      district_environment_id: districtEnvironmentId,
      state: normalizeText(application.state),
      district: normalizeText(application.district),
      official_name:
        normalizeText(application.organization) ||
        normalizeText(application.district),
      email: normalizeEmail(application.email),
      phone: normalizeText(application.phone),
      commissioner: normalizeText(application.applicant_name),
      address: "",
      status: "Active",
      updated_at: new Date().toISOString(),
    };

    const { data: existingSetting, error: findError } = await supabase
      .from("district_settings")
      .select("id")
      .eq("district_environment_id", districtEnvironmentId)
      .maybeSingle();

    if (findError) throw findError;

    if (existingSetting) {
      const { error: updateError } = await supabase
        .from("district_settings")
        .update(payload)
        .eq("id", existingSetting.id);

      if (updateError) throw updateError;

      return;
    }

    const { error: insertError } = await supabase
      .from("district_settings")
      .insert({
        ...payload,
        created_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;
  } catch (error: any) {
    console.warn("District settings sync failed:", error?.message || error);
  }
}

  async function approveApplication(application: Application) {
    if (!validateApplication(application)) return;

    if (displayStatus(application.status) === "Approved") {
      alert("Permohonan ini sudah diluluskan.");
      return;
    }

    const confirmed = window.confirm(
      `Luluskan permohonan daerah ${application.district}? Sistem akan cipta district environment.`
    );

    if (!confirmed) return;

    setUpdatingId(application.id);

    try {
      const commissionerUser = await ensureCommissionerUser(application);

      const environment = await ensureDistrictEnvironment(
        application,
        commissionerUser.id
      );

      const { error: assignUserError } = await supabase
        .from("system_users")
        .update({
          district_environment_id: environment.id,
          district: normalizeText(application.district),
          status: "Aktif",
          updated_at: new Date().toISOString(),
        })
        .eq("id", commissionerUser.id);

      if (assignUserError) throw assignUserError;

      const { error: appError } = await supabase
        .from(APPLICATION_TABLE)
        .update({
          status: "Approved",
          admin_note: "Permohonan telah diluluskan oleh Super Admin.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (appError) throw appError;

      await syncDistrictSettings(application, environment.id);

      await addAuditLog(
        "APPROVE",
        `Lulus permohonan daerah ${application.district} dan cipta district environment.`,
        application.id,
        application,
        {
          status: "Approved",
          district_environment_id: environment.id,
          commissioner_user_id: commissionerUser.id,
        },
        environment.id
      );

      await fetchApplications();
      setShowViewModal(false);

      alert(
        `Permohonan ${application.district} berjaya diluluskan. District environment telah dicipta/diaktifkan.`
      );
    } catch (error: any) {
      console.error("Approve application failed:", error);
      alert(error?.message || "Gagal meluluskan permohonan.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function rejectApplication(application: Application) {
    const reason = window.prompt(
      "Masukkan sebab penolakan:",
      application.admin_note || ""
    );

    if (reason === null) return;

    setUpdatingId(application.id);

    try {
      const { error } = await supabase
        .from(APPLICATION_TABLE)
        .update({
          status: "Rejected",
          admin_note: reason || "Permohonan ditolak oleh Super Admin.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) throw error;

      await addAuditLog(
        "REJECT",
        `Tolak permohonan daerah ${application.district}. Sebab: ${
          reason || "Tiada sebab dinyatakan"
        }`,
        application.id,
        application,
        { status: "Rejected", admin_note: reason }
      );

      await fetchApplications();
      setShowViewModal(false);
    } catch (error: any) {
      alert(error?.message || "Gagal menolak permohonan.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function requestMoreInfo(application: Application) {
    const note = window.prompt(
      "Masukkan maklumat tambahan yang diperlukan:",
      application.admin_note || ""
    );

    if (note === null) return;

    setUpdatingId(application.id);

    try {
      const { error } = await supabase
        .from(APPLICATION_TABLE)
        .update({
          status: "More Info",
          admin_note: note || "Maklumat tambahan diperlukan.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) throw error;

      await addAuditLog(
        "MORE_INFO",
        `Minta maklumat tambahan untuk daerah ${application.district}.`,
        application.id,
        application,
        { status: "More Info", admin_note: note }
      );

      await fetchApplications();
      setShowViewModal(false);
    } catch (error: any) {
      alert(error?.message || "Gagal meminta maklumat tambahan.");
    } finally {
      setUpdatingId(null);
    }
  }

  function openViewModal(application: Application) {
    setSelectedApplication(application);
    setShowViewModal(true);
  }

  const states = useMemo(() => {
    const items = applications
      .map((item) => normalizeText(item.state))
      .filter(Boolean);

    return Array.from(new Set(items)).sort();
  }, [applications]);

  const districts = useMemo(() => {
    const items = applications
      .filter((item) => {
        if (stateFilter === "Semua Negeri") return true;
        return normalizeText(item.state) === stateFilter;
      })
      .map((item) => normalizeText(item.district))
      .filter(Boolean);

    return Array.from(new Set(items)).sort();
  }, [applications, stateFilter]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const keyword = search.toLowerCase().trim();

      const matchSearch =
        !keyword ||
        normalizeText(app.applicant_name).toLowerCase().includes(keyword) ||
        normalizeEmail(app.email).includes(keyword) ||
        normalizeText(app.phone).toLowerCase().includes(keyword) ||
        normalizeText(app.state).toLowerCase().includes(keyword) ||
        normalizeText(app.district).toLowerCase().includes(keyword) ||
        normalizeText(app.organization).toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" ||
        displayStatus(app.status) === statusFilter;

      const matchState =
        stateFilter === "Semua Negeri" ||
        normalizeText(app.state) === stateFilter;

      const matchDistrict =
        districtFilter === "Semua Daerah" ||
        normalizeText(app.district) === districtFilter;

      return matchSearch && matchStatus && matchState && matchDistrict;
    });
  }, [applications, search, statusFilter, stateFilter, districtFilter]);

  const totalCount = applications.length;

  const pendingCount = applications.filter(
    (app) => displayStatus(app.status) === "Pending"
  ).length;

  const approvedCount = applications.filter(
    (app) => displayStatus(app.status) === "Approved"
  ).length;

  const rejectedCount = applications.filter(
    (app) => displayStatus(app.status) === "Rejected"
  ).length;

  const moreInfoCount = applications.filter(
    (app) => displayStatus(app.status) === "More Info"
  ).length;

  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Permohonan Daerah</h2>
          <p className="text-muted mb-0">
            Semak, luluskan, tolak atau minta maklumat tambahan untuk pendaftaran daerah.
          </p>
        </div>

        <button
          className="btn btn-outline-success"
          onClick={fetchApplications}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        <ApplicationCard
          title="Jumlah Permohonan"
          value={totalCount}
          icon="bi-file-earmark-text"
          color="dark"
        />

        <ApplicationCard
          title="Pending"
          value={pendingCount}
          icon="bi-hourglass-split"
          color="warning"
        />

        <ApplicationCard
          title="Approved"
          value={approvedCount}
          icon="bi-check-circle"
          color="success"
        />

        <ApplicationCard
          title="Rejected"
          value={rejectedCount}
          icon="bi-x-circle"
          color="danger"
        />

        <ApplicationCard
          title="More Info"
          value={moreInfoCount}
          icon="bi-info-circle"
          color="info"
        />
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3 align-items-center">
            <div className="col-lg-5">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  className="form-control ps-5 rounded-3"
                  placeholder="Cari nama, email, telefon, negeri, daerah..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-2">
              <select
                className="form-select rounded-3"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>Semua Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
                <option>More Info</option>
              </select>
            </div>

            <div className="col-lg-2">
              <select
                className="form-select rounded-3"
                value={stateFilter}
                onChange={(event) => {
                  setStateFilter(event.target.value);
                  setDistrictFilter("Semua Daerah");
                }}
              >
                <option>Semua Negeri</option>
                {states.map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="col-lg-3">
              <select
                className="form-select rounded-3"
                value={districtFilter}
                onChange={(event) => setDistrictFilter(event.target.value)}
              >
                <option>Semua Daerah</option>
                {districts.map((district) => (
                  <option key={district}>{district}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-uppercase small text-muted">
              <tr>
                <th className="px-4 py-3">Pemohon</th>
                <th className="px-4 py-3">Daerah</th>
                <th className="px-4 py-3">Organisasi</th>
                <th className="px-4 py-3">Kontak</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">
                      Memuatkan permohonan daerah...
                    </p>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada permohonan dijumpai.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const status = displayStatus(app.status);
                  const isUpdating = updatingId === app.id;

                  return (
                    <tr key={app.id}>
                      <td className="px-4 py-3">
                        <div className="fw-semibold">
                          {app.applicant_name || "-"}
                        </div>

                        <small className="text-muted">
                          {formatDateTime(app.created_at)}
                        </small>
                      </td>

                      <td className="px-4 py-3">
                        <div className="fw-semibold">{app.district || "-"}</div>
                        <small className="text-muted">{app.state || "-"}</small>
                      </td>

                      <td className="px-4 py-3">{app.organization || "-"}</td>

                      <td className="px-4 py-3">
                        <div>{app.email || "-"}</div>
                        <small className="text-muted">{app.phone || "-"}</small>
                      </td>

                      <td className="px-4 py-3">{getStatusBadge(app.status)}</td>

                      <td className="px-4 py-3">
                        <div className="d-flex gap-2 justify-content-end">
                          <button
                            className="btn btn-sm btn-light border rounded-3"
                            title="Lihat"
                            onClick={() => openViewModal(app)}
                            disabled={isUpdating}
                          >
                            <i className="bi bi-eye"></i>
                          </button>

                          {(status === "Pending" || status === "More Info") && (
                            <>
                              <button
                                className="btn btn-sm btn-light border text-success rounded-3"
                                title="Lulus"
                                disabled={isUpdating}
                                onClick={() => approveApplication(app)}
                              >
                                {isUpdating ? (
                                  <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                  <i className="bi bi-check-circle"></i>
                                )}
                              </button>

                              <button
                                className="btn btn-sm btn-light border text-info rounded-3"
                                title="Minta Maklumat"
                                disabled={isUpdating}
                                onClick={() => requestMoreInfo(app)}
                              >
                                <i className="bi bi-info-circle"></i>
                              </button>

                              <button
                                className="btn btn-sm btn-light border text-danger rounded-3"
                                title="Tolak"
                                disabled={isUpdating}
                                onClick={() => rejectApplication(app)}
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white border-top p-4 small text-muted">
          Memaparkan {filteredApplications.length} daripada {applications.length} rekod
        </div>
      </div>

      {showViewModal && selectedApplication && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Maklumat Permohonan</h5>
                  <small className="text-muted">ID: {selectedApplication.id}</small>
                </div>

                <button
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <DetailItem
                    label="Pemohon"
                    value={selectedApplication.applicant_name}
                  />
                  <DetailItem label="Email" value={selectedApplication.email} />
                  <DetailItem label="Telefon" value={selectedApplication.phone} />
                  <DetailItem label="Negeri" value={selectedApplication.state} />
                  <DetailItem label="Daerah" value={selectedApplication.district} />
                  <DetailItem
                    label="Organisasi"
                    value={selectedApplication.organization}
                  />
                  <DetailItem
                    label="Tarikh Mohon"
                    value={formatDateTime(selectedApplication.created_at)}
                  />

                  <div className="col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <small className="text-muted d-block mb-1">Status</small>
                      {getStatusBadge(selectedApplication.status)}
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="border rounded-4 p-3">
                      <small className="text-muted d-block mb-1">Nota Admin</small>
                      <div>{selectedApplication.admin_note || "-"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer justify-content-between">
                <div>
                  {(displayStatus(selectedApplication.status) === "Pending" ||
                    displayStatus(selectedApplication.status) === "More Info") && (
                    <>
                      <button
                        className="btn btn-success me-2"
                        disabled={updatingId === selectedApplication.id}
                        onClick={() => approveApplication(selectedApplication)}
                      >
                        Luluskan
                      </button>

                      <button
                        className="btn btn-danger me-2"
                        disabled={updatingId === selectedApplication.id}
                        onClick={() => rejectApplication(selectedApplication)}
                      >
                        Tolak
                      </button>

                      <button
                        className="btn btn-info text-white"
                        disabled={updatingId === selectedApplication.id}
                        onClick={() => requestMoreInfo(selectedApplication)}
                      >
                        Minta Maklumat
                      </button>
                    </>
                  )}
                </div>

                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function ApplicationCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="col-md-6 col-xl">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <p className="text-muted small mb-1">{title}</p>
              <h3 className={`fw-bold text-${color} mb-0`}>{value}</h3>
            </div>

            <div className={`rounded-3 bg-${color}-subtle text-${color} p-3`}>
              <i className={`bi ${icon} fs-4`}></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="col-md-6">
      <div className="border rounded-4 p-3 h-100">
        <small className="text-muted d-block mb-1">{label}</small>
        <strong>{value || "-"}</strong>
      </div>
    </div>
  );
}