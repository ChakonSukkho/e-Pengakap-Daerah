import { Navigate } from "react-router-dom";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles: string[];
};

type CurrentUser = {
  id?: string;
  email?: string;
  role?: string;
  status?: string;
  district_environment_id?: string;
};

function getCurrentUser(): CurrentUser | null {
  try {
    const savedUser =
      localStorage.getItem("user") || localStorage.getItem("auth_user");

    if (!savedUser) return null;

    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("auth_user");
    return null;
  }
}

function normalizeRole(role?: string | null) {
  const value = String(role || "").trim();

  if (value === "District") return "Pesuruhjaya Daerah";
  if (value === "Assistant Commissioner") return "Penolong Pesuruhjaya Daerah";
  if (value === "Penolong Pesuruhjaya") return "Penolong Pesuruhjaya Daerah";
  if (value === "Group Leader") return "Pemimpin Kumpulan";
  if (value === "Assistant Leader") return "Penolong Pemimpin";

  return value;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const user = getCurrentUser();

  if (!user || (!user.id && !user.email)) {
    return <Navigate to="/login" replace />;
  }

  const userRole = normalizeRole(user.role);
  const allowedRoleList = allowedRoles.map(normalizeRole);

  if (!allowedRoleList.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (user.status && user.status !== "Aktif") {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}