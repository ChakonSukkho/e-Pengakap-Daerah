import { Navigate, Routes, Route } from "react-router-dom";

import LandingPage from "../pages/public/LandingPage";
import LoginPage from "../pages/public/LoginPage";
import RegisterDistrictPage from "../pages/public/RegisterDistrictPage";
import PendingApprovalPage from "../pages/public/PendingApprovalPage";

import SuperAdminDashboard from "../pages/superadmin/SuperAdminDashboard";
import DistrictApplicationsPage from "../pages/superadmin/DistrictApplicationsPage";
import ApplicationDetailPage from "../pages/superadmin/ApplicationDetailPage";
import DistrictManagementPage from "../pages/superadmin/DistrictManagementPage";
import DistrictDetailPage from "../pages/superadmin/DistrictDetailPage";
import SystemUsersPage from "../pages/superadmin/SystemUsersPage";
import MasterDataPage from "../pages/superadmin/MasterDataPage";
import SystemAuditLogPage from "../pages/superadmin/SystemAuditLogPage";

import DistrictDashboard from "../pages/district/DistrictDashboard";
import UserManagementPage from "../pages/district/UserManagementPage";
import GroupManagementPage from "../pages/district/GroupManagementPage";
import MemberManagementPage from "../pages/district/MemberManagementPage";
import DistrictSettingsPage from "../pages/district/DistrictSettingsPage";
import DistrictActivitiesPage from "../pages/district/DistrictActivitiesPage";
import DistrictProfilePage from "../pages/district/DistrictProfilePage";
import AuditLogPage from "../pages/district/AuditLogPage";

import AssistantCommissionerDashboard from "../pages/assistantCommissioner/AssistantCommissionerDashboard";
import ACMemberManagementPage from "../pages/assistantCommissioner/ACMemberManagementPage";
import ACGroupManagementPage from "../pages/assistantCommissioner/ACGroupManagementPage";
import AssistantCommissionerActivitiesPage from "../pages/assistantCommissioner/AssistantCommissionerActivitiesPage";
import AssistantCommissionerProfilePage from "../pages/assistantCommissioner/AssistantCommissionerProfilePage";
import ReportsPage from "../pages/assistantCommissioner/ReportsPage";

import GroupLeaderDashboard from "../pages/groupLeader/GroupLeaderDashboard";
import GroupMembersPage from "../pages/groupLeader/GroupMembersPage";
import ActivitiesPage from "../pages/groupLeader/ActivitiesPage";
import ProfilePage from "../pages/groupLeader/ProfilePage";
import AttendancePage from "../pages/groupLeader/AttendancePage";
import BadgesPage from "../pages/groupLeader/BadgesPage";

import AssistantLeaderDashboard from "../pages/assistantLeader/AssistantLeaderDashboard";
import AssistantMembersPage from "../pages/assistantLeader/AssistantMembersPage";
import AssistantActivitiesPage from "../pages/assistantLeader/AssistantActivitiesPage";
import AssistantProfilePage from "../pages/assistantLeader/AssistantProfilePage";

import ProtectedRoute from "./ProtectedRoute";
import UnauthorizedPage from "../pages/shared/UnauthorizedPage";

const SUPER_ADMIN = ["Super Admin"];

const DISTRICT_COMMISSIONER = ["Pesuruhjaya Daerah"];

const ASSISTANT_COMMISSIONER = [
  "Penolong Pesuruhjaya",
  "Penolong Pesuruhjaya Daerah",
];

const GROUP_LEADER = ["Pemimpin Kumpulan"];

const ASSISTANT_LEADER = ["Penolong Pemimpin"];

function protect(allowedRoles: string[], element: React.ReactNode) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {element}
    </ProtectedRoute>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register-district" element={<RegisterDistrictPage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />

      {/* Super Admin */}
      <Route
        path="/superadmin"
        element={<Navigate to="/superadmin/dashboard" replace />}
      />

      <Route
        path="/superadmin/dashboard"
        element={protect(SUPER_ADMIN, <SuperAdminDashboard />)}
      />

      <Route
        path="/superadmin/applications"
        element={protect(SUPER_ADMIN, <DistrictApplicationsPage />)}
      />

      <Route
        path="/superadmin/applications/:id"
        element={protect(SUPER_ADMIN, <ApplicationDetailPage />)}
      />

      <Route
        path="/superadmin/districts"
        element={protect(SUPER_ADMIN, <DistrictManagementPage />)}
      />

      <Route
        path="/superadmin/districts/:id"
        element={protect(SUPER_ADMIN, <DistrictDetailPage />)}
      />

      <Route
        path="/superadmin/users"
        element={protect(SUPER_ADMIN, <SystemUsersPage />)}
      />

      <Route
        path="/superadmin/master-data"
        element={protect(SUPER_ADMIN, <MasterDataPage />)}
      />

      <Route
        path="/superadmin/audit"
        element={protect(SUPER_ADMIN, <SystemAuditLogPage />)}
      />

      <Route
        path="/superadmin/audit-log"
        element={protect(SUPER_ADMIN, <SystemAuditLogPage />)}
      />

      {/* District Commissioner */}
      <Route
        path="/district"
        element={<Navigate to="/district/dashboard" replace />}
      />

      <Route
        path="/district/dashboard"
        element={protect(DISTRICT_COMMISSIONER, <DistrictDashboard />)}
      />

      <Route
        path="/district/users"
        element={protect(DISTRICT_COMMISSIONER, <UserManagementPage />)}
      />

      <Route
        path="/district/groups"
        element={protect(DISTRICT_COMMISSIONER, <GroupManagementPage />)}
      />

      <Route
        path="/district/members"
        element={protect(DISTRICT_COMMISSIONER, <MemberManagementPage />)}
      />

      <Route
        path="/district/activities"
        element={protect(DISTRICT_COMMISSIONER, <DistrictActivitiesPage />)}
      />

      <Route
        path="/district/settings"
        element={protect(DISTRICT_COMMISSIONER, <DistrictSettingsPage />)}
      />

      <Route
        path="/district/profile"
        element={protect(DISTRICT_COMMISSIONER, <DistrictProfilePage />)}
      />

      <Route
        path="/district/audit"
        element={protect(DISTRICT_COMMISSIONER, <AuditLogPage />)}
      />

      <Route
        path="/district/audit-log"
        element={protect(DISTRICT_COMMISSIONER, <AuditLogPage />)}
      />

      {/* Assistant Commissioner */}
      <Route
        path="/assistant-commissioner"
        element={<Navigate to="/assistant-commissioner/dashboard" replace />}
      />

      <Route
        path="/assistant-commissioner/dashboard"
        element={protect(
          ASSISTANT_COMMISSIONER,
          <AssistantCommissionerDashboard />
        )}
      />

      <Route
        path="/assistant-commissioner/members"
        element={protect(ASSISTANT_COMMISSIONER, <ACMemberManagementPage />)}
      />

      <Route
        path="/assistant-commissioner/groups"
        element={protect(ASSISTANT_COMMISSIONER, <ACGroupManagementPage />)}
      />

      <Route
        path="/assistant-commissioner/activities"
        element={protect(
          ASSISTANT_COMMISSIONER,
          <AssistantCommissionerActivitiesPage />
        )}
      />

      <Route
        path="/assistant-commissioner/reports"
        element={protect(ASSISTANT_COMMISSIONER, <ReportsPage />)}
      />

      <Route
        path="/assistant-commissioner/profile"
        element={protect(
          ASSISTANT_COMMISSIONER,
          <AssistantCommissionerProfilePage />
        )}
      />

      {/* Group Leader */}
      <Route
        path="/group-leader"
        element={<Navigate to="/group-leader/dashboard" replace />}
      />

      <Route
        path="/group-leader/dashboard"
        element={protect(GROUP_LEADER, <GroupLeaderDashboard />)}
      />

      <Route
        path="/group-leader/members"
        element={protect(GROUP_LEADER, <GroupMembersPage />)}
      />

      <Route
        path="/group-leader/activities"
        element={protect(GROUP_LEADER, <ActivitiesPage />)}
      />

      <Route
        path="/group-leader/attendance"
        element={protect(GROUP_LEADER, <AttendancePage />)}
      />

      <Route
        path="/group-leader/badges"
        element={protect(GROUP_LEADER, <BadgesPage />)}
      />

      <Route
        path="/group-leader/profile"
        element={protect(GROUP_LEADER, <ProfilePage />)}
      />

      {/* Assistant Leader */}
      <Route
        path="/assistant-leader"
        element={<Navigate to="/assistant-leader/dashboard" replace />}
      />

      <Route
        path="/assistant-leader/dashboard"
        element={protect(ASSISTANT_LEADER, <AssistantLeaderDashboard />)}
      />

      <Route
        path="/assistant-leader/members"
        element={protect(ASSISTANT_LEADER, <AssistantMembersPage />)}
      />

      <Route
        path="/assistant-leader/activities"
        element={protect(ASSISTANT_LEADER, <AssistantActivitiesPage />)}
      />

      <Route
        path="/assistant-leader/profile"
        element={protect(ASSISTANT_LEADER, <AssistantProfilePage />)}
      />

      {/* Shared */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Fallback */}
      <Route path="*" element={<UnauthorizedPage />} />
    </Routes>
  );
}