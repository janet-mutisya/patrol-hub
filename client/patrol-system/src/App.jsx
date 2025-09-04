import { Routes, Route } from "react-router-dom";
import DashboardWrapper from "@/pages/DashboardWrapper";
import CheckpointPage from "@/pages/checkpoint";   // lowercase
import PatrolLogPage from "@/pages/patrolLog";     // lowercase camel
import ReportPage from "@/pages/Report";           // capitalized
import UserPage from "@/pages/user";               // lowercase
import DashboardPage from "@/pages/AdminDashboard";
import GuardDashboard from "@/pages/GuardDashboard";
import Signup from "@/pages/Signup";
import Login from "@/pages/Login";

function App() {
  return (
    <Routes>
      {/* Auth pages */}
      <Route path="/" element={<Signup />} />
      <Route path="/login" element={<Login />} />

      {/* Protected area */}
      <Route element={<DashboardWrapper />}>
        {/* Admin dashboard */}
        <Route path="/admin" element={<DashboardPage />} />

        {/* Guard dashboard */}
        <Route path="/guard" element={<GuardDashboard />} />

        {/* Other modules (matching file names exactly) */}
        <Route path="/checkpoint" element={<CheckpointPage />} />
        <Route path="/patrolLog" element={<PatrolLogPage />} />
        <Route path="/reports" element={<ReportPage />} />
        <Route path="/user" element={<UserPage />} />
      </Route>
    </Routes>
  );
}

export default App;
