import React from "react";
import { useLocation, Outlet } from "react-router-dom";
import { getNavigationItems, getActiveTabFromPath } from "../utils/navigation";
import Navbar from "@/components/ui/Navbar";

const DashboardWrapper = ({ userRole }) => {
  const location = useLocation();
  const navigationItems = getNavigationItems(userRole || "admin"); // fallback for now
  const activeTab = getActiveTabFromPath(location.pathname);

  return (
    <div className="flex h-screen">
      {/* Sidebar/Navbar */}
      <Navbar items={navigationItems} activeTab={activeTab} />

      {/* Main content area */}
      <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardWrapper;
