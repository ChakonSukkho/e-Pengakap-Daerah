import { Link } from "react-router-dom";

export default function RegisterDistrictPage() {
  return (
    <div className="bg-light min-vh-100 py-5">
      <div className="container">
        <Link to="/" className="text-success text-decoration-none">
          ← Kembali ke Home
        </Link>

        <div className="card border-0 shadow-sm mt-3 mx-auto" style={{ maxWidth: "900px" }}>
          <div className="card-body p-4">
            <h3 className="fw-bold">Daftar Pesuruhjaya Daerah</h3>
            <p className="text-muted">Lengkapkan maklumat untuk memohon akses daerah.</p>

            <h5 className="mt-4">Maklumat Peribadi</h5>
            <div className="row g-3">
              <div className="col-md-6"><input className="form-control" placeholder="Nama Penuh" /></div>
              <div className="col-md-6"><input className="form-control" placeholder="E-mel" /></div>
              <div className="col-md-6"><input className="form-control" placeholder="Nombor Telefon" /></div>
              <div className="col-md-6"><input className="form-control" type="password" placeholder="Kata Laluan" /></div>
            </div>

            <h5 className="mt-4">Maklumat Daerah</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <select className="form-select">
                  <option>Pilih Negeri</option>
                  <option>Selangor</option>
                  <option>Terengganu</option>
                </select>
              </div>
              <div className="col-md-6">
                <select className="form-select">
                  <option>Pilih Daerah</option>
                  <option>Gombak</option>
                  <option>Kuala Terengganu</option>
                </select>
              </div>
              <div className="col-md-6"><input className="form-control" placeholder="Jawatan" /></div>
              <div className="col-md-6"><input className="form-control" placeholder="Nama Majlis / Organisasi Daerah" /></div>
            </div>

            <h5 className="mt-4">Dokumen Sokongan</h5>
            <input className="form-control" type="file" />

            <div className="form-check mt-4">
              <input className="form-check-input" type="checkbox" id="agree" />
              <label className="form-check-label" htmlFor="agree">
                Saya mengesahkan bahawa maklumat yang diberikan adalah benar.
              </label>
            </div>

            <div className="alert alert-info mt-4">
              Permohonan akan dihantar kepada Super Admin untuk semakan.
            </div>

            <Link to="/pending-approval" className="btn btn-success">
              Hantar Permohonan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}