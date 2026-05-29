import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div className="container py-5">
      <h1 className="fw-bold text-success">ePengakap Daerah</h1>
      <p className="lead">Sistem Pengurusan Pengakap Daerah</p>

      <Link to="/login" className="btn btn-success me-2">
        Login
      </Link>

      <Link to="/register-district" className="btn btn-outline-success">
        Daftar Pesuruhjaya Daerah
      </Link>
    </div>
  );
}

export default LandingPage;