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
    <div
      className="d-flex min-vh-100"
      style={{
        background: "#f8fafc",
      }}
    >
      <Sidebar role={role} />

      <div className="flex-grow-1">
        <Topbar role={role} />

        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}