import DashboardLayout from "../../components/layout/DashboardLayout";

export default function ReportsPage() {
  return (
    <DashboardLayout role="assistantCommissioner">
      <h2 className="fw-bold">Laporan</h2>
      <p className="text-muted">Ringkasan laporan daerah.</p>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body">
          <p className="mb-0">Laporan keahlian, kumpulan dan aktiviti akan dipaparkan di sini.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}