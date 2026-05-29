export default function UnauthorizedPage() {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100">
      <h1 className="display-3 fw-bold text-danger">403</h1>
      <h3>Unauthorized</h3>
      <p className="text-muted">Anda tidak mempunyai akses ke halaman ini.</p>
    </div>
  );
}