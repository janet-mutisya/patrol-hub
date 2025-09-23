import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import CheckpointPage from "@/pages/checkpoint";
import PatrolLogPage from "@/pages/patrolLog";
import ReportPage from "@/pages/Report";
import UserPage from "@/pages/user";
import ShiftPage from "@/pages/shift";
import AttendancePage from "@/pages/attendance";
import AdminDashboard from "@/pages/AdminDashboard";
import GuardDashboard from "@/pages/GuardDashboard";
import Signup from "@/pages/Signup";
import Login from "@/pages/Login";
import { authHelper } from "@/lib/api";

// Hook-like wrapper to use auth state
const useAuth = () => {
  const token = localStorage.getItem("token");
  const user = authHelper.getUser();
  return {
    user: {
      role: user?.role || null,
      token,
    },
  };
};

// Role-based protected route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  // Not logged in → redirect
  if (!user.token) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but role not allowed → redirect by role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    } else if (user.role === "guard") {
      return <Navigate to="/guard-dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Guard Layout (if you want a consistent layout for guard routes)
const GuardLayout = () => (
  <div>
    <Outlet />
  </div>
);

function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard
              authToken={localStorage.getItem("token")}
              userRole="admin"
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <UserPage
              authToken={localStorage.getItem("token")}
              userRole="admin"
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shifts"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ShiftPage
              authToken={localStorage.getItem("token")}
              userRole="admin"
            />
          </ProtectedRoute>
        }
      />

      {/* Guard Dashboard - main landing */}
      <Route
        path="/guard-dashboard"
        element={
          <ProtectedRoute allowedRoles={["guard"]}>
            <GuardDashboard
              authToken={localStorage.getItem("token")}
              userRole="guard"
            />
          </ProtectedRoute>
        }
      />

      {/* Guard routes - match sidebar links */}
      <Route
        path="/attendance"
        element={
          <ProtectedRoute allowedRoles={["guard", "admin"]}>
            <AttendancePage
              authToken={localStorage.getItem("token")}
              userRole={authHelper.getUser()?.role}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patrol"
        element={
          <ProtectedRoute allowedRoles={["guard", "admin"]}>
            <PatrolLogPage
              authToken={localStorage.getItem("token")}
              userRole={authHelper.getUser()?.role}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkin"
        element={
          <ProtectedRoute allowedRoles={["guard", "admin"]}>
            <CheckpointPage
              authToken={localStorage.getItem("token")}
              userRole={authHelper.getUser()?.role}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={["guard", "admin"]}>
            <ReportPage
              authToken={localStorage.getItem("token")}
              userRole={authHelper.getUser()?.role}
            />
          </ProtectedRoute>
        }
      />

      {/* Default dashboard redirect */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin", "guard"]}>
            {authHelper.getUser()?.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/guard-dashboard" replace />
            )}
          </ProtectedRoute>
        }
      />

      {/* Catch-all: send logged-in users to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
