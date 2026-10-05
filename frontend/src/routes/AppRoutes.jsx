import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { ThemeProvider } from "../theme/ThemeProvider";
import ProtectedRoute from "../auth/ProtectedRoute";
import AdminRoute from "../auth/AdminRoute";
import RoleRoute from "../auth/RoleRoute";
import Layout from "../components/Layout";
import { ToastProvider } from "../components/ToastProvider";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import StudentPortal from "../pages/StudentPortal";
import ExpensesPage from "../pages/ExpensesPage";
import ReportsPage from "../pages/ReportsPage";
import UsersPage from "../pages/UsersPage";
import ClassesPage from "../pages/ClassesPage";
import StudentsPage from "../pages/StudentsPage";
import FeeTypesPage from "../pages/FeeTypesPage";
import FeePlansPage from "../pages/FeePlansPage";
import ReceiptsPage from "../pages/ReceiptsPage";
import RefundsPage from "../pages/RefundsPage";
import StaffPage from "../pages/StaffPage";
import InstituteReportsPage from "../pages/InstituteReportsPage";
import SettingsPage from "../pages/SettingsPage";

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100">
    <div className="text-center">
      <p className="text-5xl font-black text-slate-300">404</p>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Page not found</h1>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
      >
        Back to dashboard
      </Link>
    </div>
  </div>
);

const AppRoutes = () => {
  const financeRoles = ["ADMIN", "FINANCE"];
  const staffRoles = ["ADMIN", "FINANCE", "TEACHER"];

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route
                path="/portal"
                element={
                  <RoleRoute roles={["STUDENT"]}>
                    <StudentPortal />
                  </RoleRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <RoleRoute roles={financeRoles}>
                    <ReportsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/reports/institute"
                element={
                  <RoleRoute roles={financeRoles}>
                    <InstituteReportsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/classes"
                element={
                  <RoleRoute roles={staffRoles}>
                    <ClassesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/students"
                element={
                  <RoleRoute roles={staffRoles}>
                    <StudentsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/fee-types"
                element={
                  <RoleRoute roles={financeRoles}>
                    <FeeTypesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/fee-plans"
                element={
                  <RoleRoute roles={financeRoles}>
                    <FeePlansPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/receipts"
                element={
                  <RoleRoute roles={financeRoles}>
                    <ReceiptsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/refunds"
                element={
                  <RoleRoute roles={financeRoles}>
                    <RefundsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/staff"
                element={
                  <RoleRoute roles={financeRoles}>
                    <StaffPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <RoleRoute roles={financeRoles}>
                    <ExpensesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <AdminRoute>
                    <UsersPage />
                  </AdminRoute>
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;