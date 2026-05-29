import DashboardLayout from "../../components/layout/DashboardLayout";

export default function ACGroupManagementPage() {
  return (
    <DashboardLayout role="assistantCommissioner">
      <h2 className="fw-bold">Kumpulan / Sekolah</h2>
      <p className="text-muted">Senarai kumpulan dan sekolah dalam daerah.</p>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Kumpulan</th>
                <th>Sekolah</th>
                <th>Jumlah Ahli</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>01</td>
                <td>01 Petaling</td>
                <td>SK Kementah</td>
                <td>45</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}