import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card border-0 shadow-sm text-center p-4">
        <h1 className="fw-bold text-danger">403</h1>
        <h4>Akses Tidak Dibenarkan</h4>
        <p className="text-muted">
          Anda tidak mempunyai kebenaran untuk membuka halaman ini.
        </p>
        <Link to="/login" className="btn btn-success">
          Kembali ke Login
        </Link>
      </div>
    </div>
  );
}