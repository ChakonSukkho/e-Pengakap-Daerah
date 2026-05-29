export default function Topbar() {
  return (
    <header className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center sticky-top">
      <div>
        <input
          className="form-control"
          placeholder="Cari ahli, kumpulan, sekolah..."
          style={{ width: "320px" }}
        />
      </div>

      <div className="d-flex align-items-center gap-3">
        <i className="bi bi-bell fs-5"></i>

        <div className="d-flex align-items-center gap-2 border-start ps-3">
          <div
            className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
            style={{ width: 36, height: 36 }}
          >
            PD
          </div>
          <div>
            <div className="fw-semibold small">Encik Kamarul</div>
            <small className="text-muted">Pesuruhjaya Daerah</small>
          </div>
        </div>
      </div>
    </header>
  );
}