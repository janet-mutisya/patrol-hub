import { Routes, Route, Navigate } from "react-router-dom";
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

// Fixed auth helper - reads user data from localStorage
const useAuth = () => {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : {};

  return {
    user: {
      role: user.role || null,
      token: localStorage.getItem("token") || null,
    },
  };
};

// Role-based protected route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user.token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<Signup />} />
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
        path="/user"
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
        path="/shift"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ShiftPage
              authToken={localStorage.getItem("token")}
              userRole="admin"
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AttendancePage
              authToken={localStorage.getItem("token")}
              userRole="admin"
            />
          </ProtectedRoute>
        }
      />

      {/* Guard routes */}
      <Route
        path="/guard"
        element={
          <ProtectedRoute allowedRoles={["guard"]}>
            <GuardDashboard
              authToken={localStorage.getItem("token")}
              userRole="guard"
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkpoint"
        element={
          <ProtectedRoute allowedRoles={["guard", "admin"]}>
            <CheckpointPage
              authToken={localStorage.getItem("token")}
              userRole={
                JSON.parse(localStorage.getItem("user") || "{}")?.role
              }
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patrolLog"
        element={
          <ProtectedRoute allowedRoles={["guard", "admin"]}>
            <PatrolLogPage
              authToken={localStorage.getItem("token")}
              userRole={
                JSON.parse(localStorage.getItem("user") || "{}")?.role
              }
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
              userRole={
                JSON.parse(localStorage.getItem("user") || "{}")?.role
              }
            />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
