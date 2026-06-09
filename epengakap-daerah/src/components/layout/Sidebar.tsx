import { Link, useLocation, useNavigate } from "react-router-dom";
import pengakapLogo from "../../assets/newLogoIcon.png";

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
    {
      to: "/superadmin/dashboard",
      label: "Papan Pemuka",
      icon: "bi-speedometer2",
    },
    {
      to: "/superadmin/applications",
      label: "Permohonan Daerah",
      icon: "bi-file-earmark-check",
    },
    {
      to: "/superadmin/districts",
      label: "Senarai Daerah",
      icon: "bi-building",
    },
    {
      to: "/superadmin/users",
      label: "Pengguna Sistem",
      icon: "bi-person-gear",
    },
    {
      to: "/superadmin/master-data",
      label: "Data Induk",
      icon: "bi-database",
    },
    {
      to: "/superadmin/audit",
      label: "Log Audit",
      icon: "bi-journal-text",
    },
  ],

  district: [
    {
      to: "/district/dashboard",
      label: "Papan Pemuka",
      icon: "bi-speedometer2",
    },
    {
      to: "/district/users",
      label: "Pengguna",
      icon: "bi-person-gear",
    },
    {
      to: "/district/groups",
      label: "Kumpulan / Sekolah",
      icon: "bi-mortarboard",
    },
    {
      to: "/district/members",
      label: "Ahli Pengakap",
      icon: "bi-people",
    },
    {
      to: "/district/activities",
      label: "Aktiviti",
      icon: "bi-calendar-event",
    },
    {
      to: "/district/reports",
      label: "Laporan",
      icon: "bi-file-earmark-bar-graph",
    },
    {
      to: "/district/settings",
      label: "Tetapan Daerah",
      icon: "bi-gear",
    },
    {
      to: "/district/profile",
      label: "Profil Saya",
      icon: "bi-person-circle",
    },
    {
      to: "/district/audit",
      label: "Log Audit",
      icon: "bi-journal-text",
    },
  ],

  assistantCommissioner: [
    {
      to: "/assistant-commissioner/dashboard",
      label: "Papan Pemuka",
      icon: "bi-speedometer2",
    },
    {
      to: "/assistant-commissioner/users",
      label: "Pengguna",
      icon: "bi-people",
    },
    {
      to: "/assistant-commissioner/members",
      label: "Ahli Daerah",
      icon: "bi-people",
    },
    {
      to: "/assistant-commissioner/groups",
      label: "Kumpulan / Sekolah",
      icon: "bi-mortarboard",
    },
    {
      to: "/assistant-commissioner/activities",
      label: "Aktiviti Daerah",
      icon: "bi-calendar-event",
    },
    {
      to: "/assistant-commissioner/reports",
      label: "Laporan",
      icon: "bi-file-earmark-bar-graph",
    },
    {
      to: "/assistant-commissioner/profile",
      label: "Profil Saya",
      icon: "bi-person-circle",
    },
  ],

  groupLeader: [
    {
      to: "/group-leader/dashboard",
      label: "Papan Pemuka",
      icon: "bi-speedometer2",
    },
    {
      to: "/group-leader/assistants",
      label: "Penolong Pemimpin",
      icon: "bi-person-plus",
    },
    {
      to: "/group-leader/members",
      label: "Ahli Kumpulan",
      icon: "bi-people",
    },
    {
      to: "/group-leader/activities",
      label: "Aktiviti",
      icon: "bi-calendar-event",
    },
    {
      to: "/group-leader/attendance",
      label: "Kehadiran",
      icon: "bi-clipboard-check",
    },
    {
      to: "/group-leader/badges",
      label: "Lencana & Pencapaian",
      icon: "bi-award",
    },
    {
      to: "/group-leader/profile",
      label: "Profil Saya",
      icon: "bi-person-circle",
    },
  ],

  assistantLeader: [
    {
      to: "/assistant-leader/dashboard",
      label: "Papan Pemuka",
      icon: "bi-speedometer2",
    },
    {
      to: "/assistant-leader/members",
      label: "Ahli Kumpulan",
      icon: "bi-people",
    },
    {
      to: "/assistant-leader/activities",
      label: "Aktiviti",
      icon: "bi-calendar-event",
    },
    {
      to: "/assistant-leader/profile",
      label: "Profil Saya",
      icon: "bi-person-circle",
    },
  ],
};

const roleInfo: Record<
  RoleType,
  {
    title: string;
    subtitle: string;
    badge: string;
  }
> = {
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

function isActiveRoute(currentPath: string, itemPath: string) {
  if (currentPath === itemPath) return true;

  const dashboardPaths = [
    "/superadmin/dashboard",
    "/district/dashboard",
    "/assistant-commissioner/dashboard",
    "/group-leader/dashboard",
    "/assistant-leader/dashboard",
  ];

  if (dashboardPaths.includes(itemPath)) {
    return false;
  }

  return currentPath.startsWith(itemPath);
}

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
  const navigate = useNavigate();

  const menu = menus[role] || menus.district;
  const info = roleInfo[role] || roleInfo.district;

  function handleLogout() {
    localStorage.removeItem("user");
    localStorage.removeItem("auth_user");
    navigate("/login", { replace: true });
  }

  return (
    <aside className="sidebar-panel text-white h-100 p-3 w-100 position-relative overflow-auto">
      <div
        className={`d-flex align-items-center mb-4 ${
          collapsed ? "justify-content-center" : "justify-content-between"
        }`}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            className="bg-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
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
          <button
            type="button"
            className="btn btn-sm btn-outline-light border-0"
            onClick={onToggle}
            title="Collapse sidebar"
          >
            <i className="bi bi-layout-sidebar-inset"></i>
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
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
        <div className="small text-white-50 text-uppercase mb-2">
          Menu Utama
        </div>
      )}

      <nav>
        {menu.map((item) => {
          const active = isActiveRoute(location.pathname, item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={`sidebar-link d-flex align-items-center text-decoration-none rounded px-3 py-2 mb-1 ${
                collapsed ? "justify-content-center" : "gap-2"
              } ${
                active
                  ? "bg-success text-white fw-semibold"
                  : "text-white-50"
              }`}
            >
              <i className={`bi ${item.icon}`}></i>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <hr className="border-secondary" />

      <button
        type="button"
        onClick={handleLogout}
        className={`btn btn-link text-white-50 text-decoration-none d-flex align-items-center p-0 ${
          collapsed ? "justify-content-center w-100" : "gap-2"
        }`}
        title={collapsed ? "Log Keluar" : undefined}
      >
        <i className="bi bi-box-arrow-right"></i>
        {!collapsed && <span>Log Keluar</span>}
      </button>
    </aside>
  );
}