import { Link, useLocation } from "react-router-dom";
import pengakapLogo from "../../assets/pengakap-logo.png";

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
    { to: "/assistant-commissioner/activities", label: "Activiti", icon: "bi-calendar-event" },
    { to: "/assistant-commissioner/profile", label: "Profil Saya", icon: "bi-person-circle" },
    { to: "/assistant-commissioner/reports", label: "Laporan", icon: "bi-file-earmark-text" },
  ],
  groupLeader: [
    { to: "/group-leader/dashboard", label: "Papan Pemuka", icon: "bi-speedometer2" },
    { to: "/group-leader/members", label: "Ahli Kumpulan", icon: "bi-people" },
    { to: "/group-leader/activities", label: "Aktiviti", icon: "bi-calendar-event" },
    { to: "/group-leader/attendance", label: "Kehadiran", icon: "bi bi-clipboard-check" },
    { to: "/group-leader/badges", label: "Lencana & Pencapaian", icon: "bi-award" },
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
  superadmin: { title: "ePengakap", subtitle: "Super Admin Portal", badge: "Super Admin" },
  district: { title: "ePengakap", subtitle: "Daerah Portal", badge: "Pesuruhjaya Daerah" },
  assistantCommissioner: { title: "ePengakap", subtitle: "Penolong Pesuruhjaya", badge: "Penolong Pesuruhjaya" },
  groupLeader: { title: "ePengakap", subtitle: "Pemimpin Kumpulan", badge: "Pemimpin Kumpulan" },
  assistantLeader: { title: "ePengakap", subtitle: "Penolong Pemimpin", badge: "Penolong Pemimpin" },
};

export default function Sidebar({
  role = "district",
  collapsed = false,
  onToggle,
}: {
  role?: RoleType;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const location = useLocation();
  const menu = menus[role];
  const info = roleInfo[role];

  return (
    <aside className="sidebar-panel text-white h-100 p-3 w-100 position-relative overflow-auto">
      <div className={`d-flex align-items-center mb-4 ${collapsed ? "justify-content-center" : "justify-content-between"}`}>
        <div className="d-flex align-items-center gap-2">
        <div
          className="bg-white rounded-circle d-flex align-items-center justify-content-center"
          style={{
            width: 54,
            height: 54,
            overflow: "hidden",
          }}
        >
          <img
            src={pengakapLogo}
            alt="Pengakap Malaysia"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>

          {!collapsed && (
            <div>
              <div className="fw-bold">{info.title}</div>
              <small className="text-white-50">{info.subtitle}</small>
            </div>
          )}
        </div>

        {!collapsed && (
          <button className="btn btn-sm btn-outline-light border-0" onClick={onToggle} title="Collapse sidebar">
            <i className="bi bi-layout-sidebar-inset"></i>
          </button>
        )}
      </div>

      {collapsed && (
        <button
          className="btn btn-sm btn-outline-light border-0 w-100 mb-3"
          onClick={onToggle}
          title="Open sidebar"
        >
          <i className="bi bi-layout-sidebar-inset-reverse"></i>
        </button>
      )}

      {!collapsed && (
        <div className="role-badge rounded px-3 py-2 mb-3 small fw-semibold">
          {info.badge}
        </div>
      )}

      {!collapsed && (
        <div className="small text-white-50 text-uppercase mb-2">Menu Utama</div>
      )}

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
            title={collapsed ? item.label : undefined}
            className={`sidebar-link d-flex align-items-center text-decoration-none rounded px-3 py-2 mb-1 ${
              collapsed ? "justify-content-center" : "gap-2"
            } ${active ? "bg-success text-white fw-semibold" : "text-white-50"}`}
          >
            <i className={`bi ${item.icon}`}></i>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}

      <hr className="border-secondary" />

      <Link
        to="/login"
        onClick={() => {
          localStorage.removeItem("user");
        }}
        className="text-white-50 text-decoration-none d-flex align-items-center gap-2"
      >
        <i className="bi bi-box-arrow-right"></i>
        {!collapsed && "Log Keluar"}
      </Link>
    </aside>
  );
}