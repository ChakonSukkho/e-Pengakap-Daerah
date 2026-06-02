import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { supabase } from "../../services/supabaseClient";

type Application = {
  id: string;
  applicant_name: string;
  email: string;
  phone: string;
  state: string;
  district: string;
  organization: string;
  status: string;
  admin_note: string | null;
  document_url: string | null;
  created_at: string;
};

export default function DistrictApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);

    const { data, error } = await supabase
      .from("district_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setApplications(data || []);
    setLoading(false);
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }

  async function addAuditLog(action: string, module: string, description: string) {
    const user = getCurrentUser();

    await supabase.from("audit_logs").insert({
      actor_name: user.full_name || "Super Admin",
      actor_role: user.role || "Super Admin",
      action,
      module,
      description,
    });
  }

  async function approveApplication(application: Application) {
    if (!application.document_url) {
      alert("Pemohon belum memuat naik dokumen sokongan.");
      return;
    }

    const confirmed = window.confirm(
      `Luluskan permohonan daerah ${application.district}?`
    );

    if (!confirmed) return;

    setUpdatingId(application.id);

    const { error: appError } = await supabase
      .from("district_applications")
      .update({
        status: "Approved",
        admin_note: "Permohonan telah diluluskan oleh Super Admin.",
      })
      .eq("id", application.id);

    if (appError) {
      alert(appError.message);
      setUpdatingId(null);
      return;
    }

    const { error: districtError } = await supabase
      .from("district_settings")
      .upsert(
        {
          state: application.state,
          district: application.district,
          official_name: application.organization,
          email: application.email,
          phone: application.phone,
          commissioner: application.applicant_name,
          address: "",
          status: "Active",
        },
        { onConflict: "district" }
      );

    if (districtError) {
      alert(districtError.message);
      setUpdatingId(null);
      return;
    }

    const { data: existingUser } = await supabase
      .from("system_users")
      .select("id")
      .eq("email", application.email)
      .maybeSingle();

    if (!existingUser) {
      const { error: userError } = await supabase.from("system_users").insert({
        full_name: application.applicant_name,
        email: application.email,
        role: "Pesuruhjaya Daerah",
        district: application.district,
        status: "Aktif",
        password: "123456",
      });

      if (userError) {
        alert(userError.message);
        setUpdatingId(null);
        return;
      }
    }

    await addAuditLog(
      "APPROVE",
      "Permohonan Daerah",
      `Lulus permohonan daerah ${application.district}`
    );

    await fetchApplications();
    setUpdatingId(null);
    setShowViewModal(false);
  }

  async function rejectApplication(application: Application) {
    const reason = window.prompt(
      "Masukkan sebab penolakan:",
      application.admin_note || ""
    );

    if (reason === null) return;

    setUpdatingId(application.id);

    const { error } = await supabase
      .from("district_applications")
      .update({
        status: "Rejected",
        admin_note: reason || "Permohonan ditolak oleh Super Admin.",
      })
      .eq("id", application.id);

    if (error) {
      alert(error.message);
      setUpdatingId(null);
      return;
    }

    await addAuditLog(
      "REJECT",
      "Permohonan Daerah",
      `Tolak permohonan daerah ${application.district}`
    );

    await fetchApplications();
    setUpdatingId(null);
    setShowViewModal(false);
  }

  async function requestMoreInfo(application: Application) {
    const note = window.prompt(
      "Masukkan maklumat tambahan yang diperlukan:",
      application.admin_note || ""
    );

    if (note === null) return;

    setUpdatingId(application.id);

    const { error } = await supabase
      .from("district_applications")
      .update({
        status: "More Info",
        admin_note: note || "Maklumat tambahan diperlukan.",
      })
      .eq("id", application.id);

    if (error) {
      alert(error.message);
      setUpdatingId(null);
      return;
    }

    await addAuditLog(
      "MORE_INFO",
      "Permohonan Daerah",
      `Minta maklumat tambahan untuk daerah ${application.district}`
    );

    await fetchApplications();
    setUpdatingId(null);
    setShowViewModal(false);
  }

  function openViewModal(application: Application) {
    setSelectedApplication(application);
    setShowViewModal(true);
  }

  function getStatusBadge(statusValue: string) {
    const status = statusValue || "Pending";

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

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        (app.applicant_name || "").toLowerCase().includes(keyword) ||
        (app.email || "").toLowerCase().includes(keyword) ||
        (app.phone || "").toLowerCase().includes(keyword) ||
        (app.state || "").toLowerCase().includes(keyword) ||
        (app.district || "").toLowerCase().includes(keyword) ||
        (app.organization || "").toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "Semua Status" || app.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [applications, search, statusFilter]);

  const pendingCount = applications.filter((a) => a.status === "Pending").length;
  const approvedCount = applications.filter((a) => a.status === "Approved").length;
  const rejectedCount = applications.filter((a) => a.status === "Rejected").length;

  return (
    <DashboardLayout role="superadmin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Permohonan Daerah</h2>
          <p className="text-muted mb-0">
            Semak permohonan pendaftaran daerah baharu.
          </p>
        </div>

        <button className="btn btn-outline-success" onClick={fetchApplications}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Jumlah Permohonan</p>
              <h3 className="fw-bold mb-0">{applications.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Pending</p>
              <h3 className="fw-bold text-warning mb-0">{pendingCount}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Approved</p>
              <h3 className="fw-bold text-success mb-0">{approvedCount}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <p className="text-muted small mb-1">Rejected</p>
              <h3 className="fw-bold text-danger mb-0">{rejectedCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body border-bottom p-4">
          <div className="row g-3 align-items-center">
            <div className="col-lg-8">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  className="form-control ps-5 rounded-3"
                  placeholder="Cari pemohon, negeri, daerah, email atau organisasi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-4">
              <select
                className="form-select rounded-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
                <option>More Info</option>
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
                <th className="px-4 py-3">Dokumen</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-end">Tindakan</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="spinner-border text-success"></div>
                    <p className="text-muted mt-3 mb-0">
                      Memuatkan permohonan daerah...
                    </p>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    Tiada permohonan dijumpai.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-4 py-3">
                      <div className="fw-semibold">{app.applicant_name}</div>
                      <small className="text-muted">
                        {new Date(app.created_at).toLocaleString()}
                      </small>
                    </td>

                    <td className="px-4 py-3">
                      <div className="fw-semibold">{app.district}</div>
                      <small className="text-muted">{app.state}</small>
                    </td>

                    <td className="px-4 py-3">{app.organization}</td>

                    <td className="px-4 py-3">
                      <div>{app.email}</div>
                      <small className="text-muted">{app.phone}</small>
                    </td>

                    <td className="px-4 py-3">
                      {app.document_url ? (
                        <a
                          href={app.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-success"
                        >
                          <i className="bi bi-file-earmark-text me-1"></i>
                          Lihat
                        </a>
                      ) : (
                        <span className="text-danger small">Tiada</span>
                      )}
                    </td>

                    <td className="px-4 py-3">{getStatusBadge(app.status)}</td>

                    <td className="px-4 py-3">
                      <div className="d-flex gap-2 justify-content-end">
                        <button
                          className="btn btn-sm btn-light border rounded-3"
                          title="Lihat"
                          onClick={() => openViewModal(app)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>

                        {app.status === "Pending" && (
                          <>
                            <button
                              className="btn btn-sm btn-light border text-success rounded-3"
                              title="Lulus"
                              disabled={updatingId === app.id || !app.document_url}
                              onClick={() => approveApplication(app)}
                            >
                              <i className="bi bi-check-circle"></i>
                            </button>

                            <button
                              className="btn btn-sm btn-light border text-info rounded-3"
                              title="Minta Maklumat"
                              disabled={updatingId === app.id}
                              onClick={() => requestMoreInfo(app)}
                            >
                              <i className="bi bi-info-circle"></i>
                            </button>

                            <button
                              className="btn btn-sm btn-light border text-danger rounded-3"
                              title="Tolak"
                              disabled={updatingId === app.id}
                              onClick={() => rejectApplication(app)}
                            >
                              <i className="bi bi-x-circle"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Maklumat Permohonan</h5>
                <button className="btn-close" onClick={() => setShowViewModal(false)}></button>
              </div>

              <div className="modal-body">
                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Pemohon</span>
                    <strong>{selectedApplication.applicant_name}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Email</span>
                    <strong>{selectedApplication.email}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Telefon</span>
                    <strong>{selectedApplication.phone}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Negeri</span>
                    <strong>{selectedApplication.state}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Daerah</span>
                    <strong>{selectedApplication.district}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Organisasi</span>
                    <strong>{selectedApplication.organization}</strong>
                  </div>

                  <div className="list-group-item d-flex justify-content-between align-items-center">
                    <span className="text-muted">Dokumen Sokongan</span>
                    {selectedApplication.document_url ? (
                      <a
                        href={selectedApplication.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline-success"
                      >
                        <i className="bi bi-file-earmark-text me-1"></i>
                        Buka Dokumen
                      </a>
                    ) : (
                      <span className="text-danger">Tiada dokumen</span>
                    )}
                  </div>

                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    {getStatusBadge(selectedApplication.status)}
                  </div>

                  <div className="list-group-item">
                    <div className="text-muted mb-1">Nota Admin</div>
                    <div>{selectedApplication.admin_note || "-"}</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer justify-content-between">
                <div>
                  {selectedApplication.status === "Pending" && (
                    <>
                      <button
                        className="btn btn-success me-2"
                        disabled={!selectedApplication.document_url}
                        onClick={() => approveApplication(selectedApplication)}
                      >
                        Luluskan
                      </button>

                      <button
                        className="btn btn-danger me-2"
                        onClick={() => rejectApplication(selectedApplication)}
                      >
                        Tolak
                      </button>

                      <button
                        className="btn btn-info text-white"
                        onClick={() => requestMoreInfo(selectedApplication)}
                      >
                        Minta Maklumat
                      </button>
                    </>
                  )}
                </div>

                <button className="btn btn-outline-secondary" onClick={() => setShowViewModal(false)}>
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