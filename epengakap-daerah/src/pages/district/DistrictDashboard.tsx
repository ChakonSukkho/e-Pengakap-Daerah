import DashboardLayout from "../../components/layout/DashboardLayout";

export default function DistrictDashboard() {
  return (
    <DashboardLayout>
      <h2 className="fw-bold">Dashboard Daerah</h2>
      <p className="text-muted">Ringkasan data Pengakap daerah.</p>

      <div className="row g-3 mt-2">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Jumlah Ahli Aktif</div>
              <h3 className="fw-bold">1,245</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Jumlah Kumpulan</div>
              <h3 className="fw-bold">42</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Jumlah Pemimpin</div>
              <h3 className="fw-bold">86</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Penolong Pemimpin</div>
              <h3 className="fw-bold">103</h3>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}