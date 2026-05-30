import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type RoleType =
  | "superadmin"
  | "district"
  | "assistantCommissioner"
  | "groupLeader"
  | "assistantLeader";

export default function DashboardLayout({
  children,
  role = "district",
}: {
  children: React.ReactNode;
  role?: RoleType;
}) {
  return (
    <div className="d-flex bg-light min-vh-100 overflow-hidden">
      <div style={{ width: "260px", flex: "0 0 260px" }}>
        <Sidebar role={role} />
      </div>

      <div className="flex-grow-1 min-vw-0" style={{ minWidth: 0 }}>
        <Topbar role={role} />

        <main className="p-4" style={{ maxWidth: "100%", overflowX: "hidden" }}>
          {children}
        </main>
      </div>
    </div>
  );
}