import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";

export default function ApplicationDetailPage() {
  return (
    <DashboardLayout>
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
            <div className="card-header bg-white fw-semibold">Maklumat Pemohon</div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-4 text-muted">Nama</div>
                <div className="col-md-8 fw-semibold">Ali bin Abu</div>
              </div>
              <div className="row mb-3">
                <div className="col-md-4 text-muted">E-mel</div>
                <div className="col-md-8">ali@example.com</div>
              </div>
              <div className="row mb-3">
                <div className="col-md-4 text-muted">Telefon</div>
                <div className="col-md-8">012-3456789</div>
              </div>
              <div className="row">
                <div className="col-md-4 text-muted">Jawatan</div>
                <div className="col-md-8">Pesuruhjaya Daerah</div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">Maklumat Daerah</div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-4 text-muted">Negeri</div>
                <div className="col-md-8 fw-semibold">Selangor</div>
              </div>
              <div className="row mb-3">
                <div className="col-md-4 text-muted">Daerah</div>
                <div className="col-md-8 fw-semibold">Petaling</div>
              </div>
              <div className="row">
                <div className="col-md-4 text-muted">Organisasi</div>
                <div className="col-md-8">Majlis Pengakap Daerah Petaling</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white fw-semibold">Status Semasa</div>
            <div className="card-body">
              <span className="badge bg-warning text-dark mb-3">Pending Approval</span>

              <p className="text-muted small">
                Permohonan ini masih menunggu semakan daripada Super Admin.
              </p>

              <button className="btn btn-outline-success w-100 mb-2">
                View / Download Dokumen
              </button>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">Tindakan Admin</div>
            <div className="card-body">
              <label className="form-label">Catatan Admin</label>
              <textarea
                className="form-control mb-3"
                rows={4}
                placeholder="Masukkan catatan admin..."
              ></textarea>

              <button className="btn btn-success w-100 mb-2">Approve</button>
              <button className="btn btn-danger w-100 mb-2">Reject</button>
              <button className="btn btn-warning w-100">
                Request More Information
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}