import DashboardLayout from "../../components/layout/DashboardLayout";

export default function DistrictSettingsPage() {
  return (
    <DashboardLayout role="district">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Tetapan Daerah</h2>
        <p className="text-muted mb-0">Urus maklumat rasmi daerah.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white">
          <h5 className="fw-semibold mb-0">Maklumat Daerah</h5>
        </div>

        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Negeri</label>
              <input className="form-control" value="Selangor" readOnly />
            </div>

            <div className="col-md-6">
              <label className="form-label">Daerah</label>
              <input className="form-control" value="Petaling" readOnly />
            </div>

            <div className="col-md-6">
              <label className="form-label">Nama Rasmi Daerah</label>
              <input
                className="form-control"
                defaultValue="Majlis Pengakap Daerah Petaling"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">E-mel Rasmi</label>
              <input
                className="form-control"
                defaultValue="petaling@pengakap.org.my"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Telefon Rasmi</label>
              <input className="form-control" defaultValue="03-12345678" />
            </div>

            <div className="col-md-6">
              <label className="form-label">Pesuruhjaya Daerah</label>
              <input className="form-control" value="Encik Kamarul" readOnly />
            </div>

            <div className="col-12">
              <label className="form-label">Alamat Pejabat Daerah</label>
              <textarea
                className="form-control"
                rows={3}
                defaultValue="Pejabat Pengakap Daerah Petaling, Selangor"
              />
            </div>
          </div>

          <div className="alert alert-success mt-4 mb-4">
            Status Environment: <strong>Aktif</strong>
          </div>

          <button className="btn btn-success">
            <i className="bi bi-save me-1"></i>
            Simpan Tetapan
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}