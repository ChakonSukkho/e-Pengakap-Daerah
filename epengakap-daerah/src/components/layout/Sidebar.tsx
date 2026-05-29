import { Link, useLocation } from "react-router-dom";

type RoleType =
  | "superadmin"
  | "district"
  | "assistantCommissioner"
  | "groupLeader"
  | "assistantLeader";

type MenuItem = {
  to: string;
  label: string;
  icon: string;
};

const menus: Record<RoleType, MenuItem[]> = {
  superadmin: [
    { to: "/superadmin", label: "Papan Pemuka", icon: "bi-speedometer2" },
    { to: "/superadmin/applications", label: "Permohonan Daerah", icon: "bi-file-earmark-check" },
    { to: "/superadmin/districts", label: "Senarai Daerah", icon: "bi-building" },
    { to: "/superadmin/users", label: "Pengguna Sistem", icon: "bi-person-gear" },
    { to: "/superadmin/audit", label: "Log Audit", icon: "bi-journal-text" },
  ],

  district: [
    { to: "/district/dashboard", label: "Papan Pemuka", icon: "bi-speedometer2" },
    { to: "/district/users", label: "Pengguna", icon: "bi-person-gear" },
    { to: "/district/groups", label: "Kumpulan / Sekolah", icon: "bi-mortarboard" },
    { to: "/district/members", label: "Ahli Pengakap", icon: "bi-people" },
    { to: "/district/settings", label: "Tetapan Daerah", icon: "bi-gear" },
    { to: "/district/audit", label: "Log Audit", icon: "bi-journal-text" },
  ],

  assistantCommissioner: [
    { to: "/assistant-commissioner/dashboard", label: "Papan Pemuka", icon: "bi-speedometer2" },
    { to: "/assistant-commissioner/groups", label: "Kumpulan / Sekolah", icon: "bi-mortarboard" },
    { to: "/assistant-commissioner/members", label: "Ahli Pengakap", icon: "bi-people" },
    { to: "/assistant-commissioner/reports", label: "Laporan", icon: "bi-file-earmark-text" },
  ],

  groupLeader: [
    { to: "/group-leader/dashboard", label: "Papan Pemuka", icon: "bi-speedometer2" },
    { to: "/group-leader/members", label: "Ahli Kumpulan", icon: "bi-people" },
    { to: "/group-leader/activities", label: "Aktiviti", icon: "bi-calendar-event" },
    { to: "/group-leader/profile", label: "Profil Saya", icon: "bi-person-circle" },
  ],

  assistantLeader: [
    { to: "/assistant-leader/dashboard", label: "Papan Pemuka", icon: "bi-speedometer2" },
    { to: "/assistant-leader/members", label: "Ahli Kumpulan", icon: "bi-people" },
    { to: "/assistant-leader/activities", label: "Aktiviti", icon: "bi-calendar-event" },
    { to: "/assistant-leader/profile", label: "Profil Saya", icon: "bi-person-circle" },
  ],
};

const roleInfo: Record<RoleType, { title: string; subtitle: string; badge: string }> = {
  superadmin: {
    title: "ePengakap",
    subtitle: "Super Admin Portal",
    badge: "Super Admin",
  },
  district: {
    title: "ePengakap",
    subtitle: "Daerah Portal",
    badge: "Pesuruhjaya Daerah",
  },
  assistantCommissioner: {
    title: "ePengakap",
    subtitle: "Penolong Pesuruhjaya",
    badge: "Penolong Pesuruhjaya",
  },
  groupLeader: {
    title: "ePengakap",
    subtitle: "Pemimpin Kumpulan",
    badge: "Pemimpin Kumpulan",
  },
  assistantLeader: {
    title: "ePengakap",
    subtitle: "Penolong Pemimpin",
    badge: "Penolong Pemimpin",
  },
};

export default function Sidebar({ role = "district" }: { role?: RoleType }) {
  const location = useLocation();
  const menu = menus[role];
  const info = roleInfo[role];

  return (
    <aside className="bg-dark text-white min-vh-100 p-3" style={{ width: "260px" }}>
      <div className="d-flex align-items-center gap-2 mb-4">
        <div
          className="bg-success rounded-3 d-flex align-items-center justify-content-center"
          style={{ width: 38, height: 38 }}
        >
          <i className="bi bi-shield-check"></i>
        </div>

        <div>
          <div className="fw-bold">{info.title}</div>
          <small className="text-white-50">{info.subtitle}</small>
        </div>
      </div>

      <div className="bg-success bg-opacity-25 text-success-emphasis rounded px-3 py-2 mb-3 small fw-semibold">
        {info.badge}
      </div>

      <div className="small text-white-50 text-uppercase mb-2">Menu Utama</div>

      {menu.map((item) => {
        const active =
          location.pathname === item.to ||
          (item.to !== "/superadmin" &&
            item.to !== "/district/dashboard" &&
            item.to !== "/assistant-commissioner/dashboard" &&
            item.to !== "/group-leader/dashboard" &&
            item.to !== "/assistant-leader/dashboard" &&
            location.pathname.startsWith(item.to));

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