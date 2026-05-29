import { Link, useLocation } from "react-router-dom";

const menu = [
  { to: "/district/dashboard", label: "Papan Pemuka", icon: "bi-speedometer2" },
  { to: "/district/users", label: "Pengguna", icon: "bi-person-gear" },
  { to: "/district/groups", label: "Kumpulan / Sekolah", icon: "bi-mortarboard" },
  { to: "/district/members", label: "Ahli Pengakap", icon: "bi-people" },
  { to: "/district/settings", label: "Tetapan Daerah", icon: "bi-gear" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="bg-dark text-white min-vh-100 p-3" style={{ width: "260px" }}>
      <div className="d-flex align-items-center gap-2 mb-4">
        <div className="bg-success rounded-3 d-flex align-items-center justify-content-center" style={{ width: 38, height: 38 }}>
          <i className="bi bi-shield-check"></i>
        </div>
        <div>
          <div className="fw-bold">ePengakap</div>
          <small className="text-white-50">Daerah Portal</small>
        </div>
      </div>

      <div className="small text-white-50 text-uppercase mb-2">Menu Utama</div>

      {menu.map((item) => {
        const active = location.pathname === item.to;

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`d-flex align-items-center gap-2 text-decoration-none rounded px-3 py-2 mb-1 ${
              active ? "bg-success text-white fw-semibold" : "text-white-50"
            }`}
          >
            <i className={`bi ${item.icon}`}></i>
            {item.label}
          </Link>
        );
      })}

      <hr className="border-secondary" />

      <Link to="/login" className="text-white-50 text-decoration-none d-flex align-items-center gap-2">
        <i className="bi bi-box-arrow-right"></i>
        Log Keluar
      </Link>
    </aside>
  );
}