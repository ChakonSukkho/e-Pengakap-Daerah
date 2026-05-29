import { Routes, Route } from "react-router-dom";

import LandingPage from "../pages/public/LandingPage";
import LoginPage from "../pages/public/LoginPage";
import RegisterDistrictPage from "../pages/public/RegisterDistrictPage";
import PendingApprovalPage from "../pages/public/PendingApprovalPage";

import SuperAdminDashboard from "../pages/superadmin/SuperAdminDashboard";
import DistrictApplicationsPage from "../pages/superadmin/DistrictApplicationsPage";
import ApplicationDetailPage from "../pages/superadmin/ApplicationDetailPage";

import DistrictDashboard from "../pages/district/DistrictDashboard";
import UserManagementPage from "../pages/district/UserManagementPage";
import GroupManagementPage from "../pages/district/GroupManagementPage";
import MemberManagementPage from "../pages/district/MemberManagementPage";
import DistrictSettingsPage from "../pages/superadmin/DistrictApplicationsPage";
import AuditLogPage from "../pages/district/AuditLogPage";


export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register-district" element={<RegisterDistrictPage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />

      <Route path="/superadmin" element={<SuperAdminDashboard />} />
      <Route path="/superadmin/applications" element={<DistrictApplicationsPage />} />
      <Route path="/superadmin/applications/:id" element={<ApplicationDetailPage />} />

      <Route path="/district/dashboard" element={<DistrictDashboard />} />
      <Route path="/district/users" element={<UserManagementPage />} />
      <Route path="/district/groups" element={<GroupManagementPage />} />
      <Route path="/district/members" element={<MemberManagementPage />} />
      <Route path="/district/settings" element={<DistrictSettingsPage />} />
      <Route path="/district/audit" element={<AuditLogPage />} />
    </Routes>
  );
}