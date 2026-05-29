import DashboardLayout from "../../components/layout/DashboardLayout";

export default function DistrictSettingsPage() {
  return (
    <DashboardLayout>
      <h2 className="fw-bold mb-1">Tetapan Daerah</h2>
      <p className="text-muted">Urus maklumat rasmi daerah.</p>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body">
          <h5 className="fw-semibold mb-3">Maklumat Daerah</h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Negeri</label>
              <input className="form-control" value="Selangor" disabled />
            </div>

            <div className="col-md-6">
              <label className="form-label">Daerah</label>
              <input className="form-control" value="Petaling" disabled />
            </div>

            <div className="col-md-6">
              <label className="form-label">Nama Rasmi Daerah</label>
              <input className="form-control" defaultValue="Majlis Pengakap Daerah Petaling" />
            </div>

            <div className="col-md-6">
              <label className="form-label">E-mel Rasmi</label>
              <input className="form-control" defaultValue="petaling@pengakap.org.my" />
            </div>

            <div className="col-md-6">
              <label className="form-label">Telefon Rasmi</label>
              <input className="form-control" defaultValue="03-12345678" />
            </div>

            <div className="col-md-6">
              <label className="form-label">Pesuruhjaya Daerah</label>
              <input className="form-control" value="Encik Kamarul" disabled />
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

          <div className="alert alert-success mt-4">
            Status Environment: <strong>Aktif</strong>
          </div>

          <button className="btn btn-success">Simpan Tetapan</button>
        </div>
      </div>
    </DashboardLayout>
  );
}