import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/ui/StatCard";

export default function DistrictDashboard() {
  return (
    <DashboardLayout role="district">
      <h2 className="fw-bold">Dashboard Daerah</h2>
      <p className="text-muted">Ringkasan data Pengakap daerah.</p>

      <div className="row g-3 mt-2">
        <div className="col-md-3">
          <StatCard title="Ahli Aktif" value="1,245" icon="bi-people" />
        </div>
        <div className="col-md-3">
          <StatCard title="Kumpulan" value="42" icon="bi-mortarboard" color="primary" />
        </div>
        <div className="col-md-3">
          <StatCard title="Pemimpin" value="86" icon="bi-person-badge" color="info" />
        </div>
        <div className="col-md-3">
          <StatCard title="Aktiviti" value="12" icon="bi-calendar-event" color="warning" />
        </div>
      </div>

      <div className="row g-4 mt-2">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">
              Pecahan Ahli Mengikut Kategori
            </div>
            <div className="card-body">
              {[
                ["Pengakap Kanak-Kanak", "55%", "success"],
                ["Pengakap Muda", "30%", "primary"],
                ["Pengakap Remaja", "15%", "warning"],
              ].map(([label, value, color]) => (
                <div className="mb-3" key={label}>
                  <div className="d-flex justify-content-between small mb-1">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="progress" style={{ height: 8 }}>
                    <div
                      className={`progress-bar bg-${color}`}
                      style={{ width: value }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">
              Aktiviti Terkini
            </div>
            <div className="card-body">
              {["Mesyuarat Daerah", "Kursus Pemimpin", "Perkhemahan Daerah"].map(
                (item) => (
                  <div className="d-flex align-items-center gap-3 border-bottom py-2" key={item}>
                    <div className="bg-success-subtle text-success rounded-circle px-2 py-1">
                      <i className="bi bi-check"></i>
                    </div>
                    <div>
                      <div className="fw-semibold">{item}</div>
                      <small className="text-muted">Dikemaskini hari ini</small>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}