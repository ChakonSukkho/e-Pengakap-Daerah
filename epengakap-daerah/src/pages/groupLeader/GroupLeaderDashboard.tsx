import DashboardLayout from "../../components/layout/DashboardLayout";

export default function GroupLeaderDashboard() {
  return (
    <DashboardLayout role="groupLeader">
      <h2 className="fw-bold">Dashboard Pemimpin Kumpulan</h2>
      <p className="text-muted">Ringkasan data kumpulan anda.</p>

      <div className="row g-3 mt-2">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Ahli Kumpulan</div>
              <h3 className="fw-bold">45</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Penolong Pemimpin</div>
              <h3 className="fw-bold">3</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Aktiviti Bulan Ini</div>
              <h3 className="fw-bold">5</h3>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}