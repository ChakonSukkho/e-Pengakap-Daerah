import { Link } from "react-router-dom";

export default function PendingApprovalPage() {
  return (
    <div className="bg-light min-vh-100 d-flex align-items-center">
      <div className="container">
        <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: 650 }}>
          <div className="card-body p-5 text-center">
            <div
              className="bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4"
              style={{ width: 80, height: 80 }}
            >
              <i className="bi bi-hourglass-split fs-1"></i>
            </div>

            <h2 className="fw-bold">Permohonan Sedang Disemak</h2>
            <p className="text-muted">
              Terima kasih kerana mendaftar. Permohonan anda sedang menunggu
              semakan dan kelulusan daripada Super Admin.
            </p>

            <div className="border rounded-3 p-4 text-start my-4 bg-white">
              <div className="row mb-2">
                <div className="col-5 text-muted">Negeri</div>
                <div className="col-7 fw-semibold">Selangor</div>
              </div>

              <div className="row mb-2">
                <div className="col-5 text-muted">Daerah</div>
                <div className="col-7 fw-semibold">Petaling</div>
              </div>

              <div className="row">
                <div className="col-5 text-muted">Status</div>
                <div className="col-7">
                  <span className="badge bg-warning text-dark">
                    Pending Approval
                  </span>
                </div>
              </div>
            </div>

            <div className="alert alert-info text-start">
              Anda tidak boleh mengakses dashboard sehingga permohonan diluluskan.
              Sila semak status permohonan dari semasa ke semasa.
            </div>

            <div className="d-flex justify-content-center gap-2">
              <Link to="/login" className="btn btn-outline-secondary">
                Log Keluar
              </Link>

              <Link to="/" className="btn btn-success">
                Kembali ke Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}