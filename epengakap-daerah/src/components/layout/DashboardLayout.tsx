import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type RoleType =
  | "superadmin"
  | "district"
  | "assistantCommissioner"
  | "groupLeader"
  | "assistantLeader";

type DashboardLayoutProps = {
  children: React.ReactNode;
  role?: RoleType;
};

export default function DashboardLayout({
  children,
  role = "district",
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="d-flex bg-light min-vh-100">
      <div
        className="sidebar-shell position-fixed top-0 start-0 vh-100"
        style={{
          width: collapsed ? "82px" : "260px",
          transition: "width 0.25s ease",
          zIndex: 1040,
        }}
      >
        <Sidebar
          role={role}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      <div
        className="flex-grow-1"
        style={{
          marginLeft: collapsed ? "82px" : "260px",
          minWidth: 0,
          transition: "margin-left 0.25s ease",
        }}
      >
        <Topbar
          role={role}
          onToggleSidebar={() => setCollapsed(!collapsed)}
        />

        <main className="p-4" style={{ maxWidth: "100%", overflowX: "hidden" }}>
          {children}
        </main>
      </div>
    </div>
  );
}