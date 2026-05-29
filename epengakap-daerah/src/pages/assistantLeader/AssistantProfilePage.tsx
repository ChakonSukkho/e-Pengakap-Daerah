import DashboardLayout from "../../components/layout/DashboardLayout";

export default function AssistantProfilePage() {
  return (
    <DashboardLayout role="assistantLeader">
      <h2 className="fw-bold">Profil Saya</h2>
      <p className="text-muted">Maklumat akaun penolong pemimpin.</p>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-3 text-muted">Nama</div>
            <div className="col-md-9 fw-semibold">Cik Nur Aisyah</div>
          </div>
          <div className="row mb-3">
            <div className="col-md-3 text-muted">Role</div>
            <div className="col-md-9">Penolong Pemimpin</div>
          </div>
          <div className="row">
            <div className="col-md-3 text-muted">Kumpulan</div>
            <div className="col-md-9">SK Kementah</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}