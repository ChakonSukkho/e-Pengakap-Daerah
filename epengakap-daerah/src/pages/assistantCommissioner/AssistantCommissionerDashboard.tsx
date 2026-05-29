import DashboardLayout from "../../components/layout/DashboardLayout";

export default function AssistantCommissionerDashboard() {
  return (
    <DashboardLayout role="assistantCommissioner">
      <h2 className="fw-bold">Dashboard Penolong Pesuruhjaya</h2>
      <p className="text-muted">Paparan ringkasan pengurusan daerah.</p>

      <div className="row g-3 mt-2">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Jumlah Kumpulan</div>
              <h3 className="fw-bold">42</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Jumlah Ahli</div>
              <h3 className="fw-bold">1,245</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Laporan Bulanan</div>
              <h3 className="fw-bold">12</h3>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}