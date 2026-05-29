import DashboardLayout from "../../components/layout/DashboardLayout";

export default function AssistantActivitiesPage() {
  return (
    <DashboardLayout role="assistantLeader">
      <h2 className="fw-bold">Aktiviti Kumpulan</h2>
      <p className="text-muted">Senarai aktiviti yang melibatkan kumpulan anda.</p>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Tarikh</th>
                <th>Aktiviti</th>
                <th>Lokasi</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>12/06/2026</td>
                <td>Latihan Ikatan dan Simpulan</td>
                <td>SK Kementah</td>
                <td><span className="badge bg-success">Selesai</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}