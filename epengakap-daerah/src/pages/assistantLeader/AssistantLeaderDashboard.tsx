import DashboardLayout from "../../components/layout/DashboardLayout";

export default function AssistantLeaderDashboard() {
  return (
    <DashboardLayout role="assistantLeader">
      <h2 className="fw-bold">Dashboard Penolong Pemimpin</h2>
      <p className="text-muted">Paparan ringkas untuk kumpulan sendiri.</p>

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
              <div className="text-muted small">Aktiviti Aktif</div>
              <h3 className="fw-bold">3</h3>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}