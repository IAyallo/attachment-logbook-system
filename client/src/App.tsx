import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import FacultyReports from "./pages/FacultyReports";
import FacultyAssessmentForm from "./pages/FacultyAssessmentForm";
import AdminDashboard from "./pages/AdminDashboard";
import AdminInstitutions from "./pages/AdminInstitutions";
import AdminUsers from "./pages/AdminUsers";
import AdminAssignments from "./pages/AdminAssignments";
import AdminAuditTrails from "./pages/AdminAuditTrails";
import StudentLogs from "./pages/StudentLogs";
import StudentSyncQueue from "./pages/StudentSyncQueue";
import HostStudentList from "./pages/HostStudentList";
import HostAssessmentForm from "./pages/HostAssessmentForm";
import StudentReport from "./pages/StudentReport";
import StudentGrade from "./pages/StudentGrade";
import RoleReports from "./pages/RoleReports";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: string;
}

const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole)
    return <Navigate to="/login" replace />;

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/logs"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/sync-queue"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentSyncQueue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor"
        element={
          <ProtectedRoute allowedRole="host_supervisor">
            <SupervisorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor/students"
        element={
          <ProtectedRoute allowedRole="host_supervisor">
            <HostStudentList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor/reports"
        element={
          <ProtectedRoute allowedRole="host_supervisor">
            <RoleReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor/assess/:studentId"
        element={
          <ProtectedRoute allowedRole="host_supervisor">
            <HostAssessmentForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty"
        element={
          <ProtectedRoute allowedRole="faculty_supervisor">
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/reports"
        element={
          <ProtectedRoute allowedRole="faculty_supervisor">
            <FacultyReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/analytics"
        element={
          <ProtectedRoute allowedRole="faculty_supervisor">
            <RoleReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/assess/:studentId"
        element={
          <ProtectedRoute allowedRole="faculty_supervisor">
            <FacultyAssessmentForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/institutions"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminInstitutions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminAssignments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/grade"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentGrade />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/report"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-trails"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminAuditTrails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRole="admin">
            <RoleReports />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
