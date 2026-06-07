import { Routes, Route } from "react-router-dom";

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
        element={
          <ProtectedRoute allowedRoles={["Super Admin"]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["Super Admin"]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin/applications"
        element={
          <ProtectedRoute allowedRoles={["Super Admin"]}>
            <DistrictApplicationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin/applications/:id"
        element={
          <ProtectedRoute allowedRoles={["Super Admin"]}>
            <ApplicationDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin/districts"
        element={
          <ProtectedRoute allowedRoles={["Super Admin"]}>
            <DistrictManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin/districts/:id"
        element={
          <ProtectedRoute allowedRoles={["Super Admin"]}>
            <DistrictDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin/users"
        element={
          <ProtectedRoute allowedRoles={["Super Admin"]}>
            <SystemUsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin/master-data"
        element={
          <ProtectedRoute allowedRoles={["Super Admin"]}>
            <MasterDataPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin/audit"
        element={
          <ProtectedRoute allowedRoles={["Super Admin"]}>
            <SystemAuditLogPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin/audit-log"
        element={
          <ProtectedRoute allowedRoles={["Super Admin"]}>
            <SystemAuditLogPage />
          </ProtectedRoute>
        }
      />

      {/* District Commissioner */}
      <Route
        path="/district/dashboard"
        element={
          <ProtectedRoute allowedRoles={["Pesuruhjaya Daerah"]}>
            <DistrictDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/district/users"
        element={
          <ProtectedRoute allowedRoles={["Pesuruhjaya Daerah"]}>
            <UserManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/district/groups"
        element={
          <ProtectedRoute allowedRoles={["Pesuruhjaya Daerah"]}>
            <GroupManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/district/members"
        element={
          <ProtectedRoute allowedRoles={["Pesuruhjaya Daerah"]}>
            <MemberManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/district/settings"
        element={
          <ProtectedRoute allowedRoles={["Pesuruhjaya Daerah"]}>
            <DistrictSettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/district/activities"
        element={
          <ProtectedRoute allowedRoles={["Pesuruhjaya Daerah"]}>
            <DistrictActivitiesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/district/audit"
        element={
          <ProtectedRoute allowedRoles={["Pesuruhjaya Daerah"]}>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/district/audit-log"
        element={
          <ProtectedRoute allowedRoles={["Pesuruhjaya Daerah"]}>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />

      {/* Assistant Commissioner */}
      <Route
        path="/assistant-commissioner/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Penolong Pesuruhjaya",
              "Penolong Pesuruhjaya Daerah",
            ]}
          >
            <AssistantCommissionerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant-commissioner/members"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Penolong Pesuruhjaya",
              "Penolong Pesuruhjaya Daerah",
            ]}
          >
            <ACMemberManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant-commissioner/groups"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Penolong Pesuruhjaya",
              "Penolong Pesuruhjaya Daerah",
            ]}
          >
            <ACGroupManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant-commissioner/activities"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Penolong Pesuruhjaya",
              "Penolong Pesuruhjaya Daerah",
            ]}
          >
            <AssistantCommissionerActivitiesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant-commissioner/profile"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Penolong Pesuruhjaya",
              "Penolong Pesuruhjaya Daerah",
            ]}
          >
            <AssistantCommissionerProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant-commissioner/reports"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Penolong Pesuruhjaya",
              "Penolong Pesuruhjaya Daerah",
            ]}
          >
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* Group Leader */}
      <Route
        path="/group-leader/dashboard"
        element={
          <ProtectedRoute allowedRoles={["Pemimpin Kumpulan"]}>
            <GroupLeaderDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/group-leader/members"
        element={
          <ProtectedRoute allowedRoles={["Pemimpin Kumpulan"]}>
            <GroupMembersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/group-leader/activities"
        element={
          <ProtectedRoute allowedRoles={["Pemimpin Kumpulan"]}>
            <ActivitiesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/group-leader/profile"
        element={
          <ProtectedRoute allowedRoles={["Pemimpin Kumpulan"]}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/group-leader/badges"
        element={
          <ProtectedRoute allowedRoles={["Pemimpin Kumpulan"]}>
            <BadgesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/group-leader/attendance"
        element={
          <ProtectedRoute allowedRoles={["Pemimpin Kumpulan"]}>
            <AttendancePage />
          </ProtectedRoute>
        }
      />

      {/* Assistant Leader */}
      <Route
        path="/assistant-leader/dashboard"
        element={
          <ProtectedRoute allowedRoles={["Penolong Pemimpin"]}>
            <AssistantLeaderDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant-leader/members"
        element={
          <ProtectedRoute allowedRoles={["Penolong Pemimpin"]}>
            <AssistantMembersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant-leader/activities"
        element={
          <ProtectedRoute allowedRoles={["Penolong Pemimpin"]}>
            <AssistantActivitiesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant-leader/profile"
        element={
          <ProtectedRoute allowedRoles={["Penolong Pemimpin"]}>
            <AssistantProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Shared */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
    </Routes>
  );
}