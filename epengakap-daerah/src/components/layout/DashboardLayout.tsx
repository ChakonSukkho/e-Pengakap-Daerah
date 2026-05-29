import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar />

      <div className="flex-grow-1">
        <Topbar />

        <main className="p-4">
          {children}
        </main>
      </div>
    </div>
  );
}