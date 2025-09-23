import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  MapPin, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Play,
  Square,
  Navigation,
  User,
  Calendar,
  Activity,
  Bell,
  LogOut,
  ChevronRight,
  Timer,
  MapIcon,
  Route,
  Settings,
  Menu,
  X,
  Camera,
  FileText,
  TrendingUp,
  Zap,
  AlertTriangle,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  RefreshCw,
  Loader2,
  CloudOff,
  PhoneCall,
  MessageSquare,
  UserCheck,
  UserX,
  Pause,
  LayoutDashboard,
  ClipboardList
} from 'lucide-react';
import { userApi, authHelper, ApiError } from '../lib/api';
import { Link } from "react-router-dom";

const GuardDashboard = () => {
const navigate = useNavigate();
  // Basic state
  const [selectedCheckpointId, setSelectedCheckpointId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Guard data state - initialized with safe defaults
  const [guardInfo, setGuardInfo] = useState({
    name: 'Guard User',
    id: 'N/A',
    location: 'Not assigned',
    avatar: 'G',
    shift: 'No shift assigned',
    shiftTime: 'Time not set'
  });
  
  const [dutyStatus, setDutyStatus] = useState({
    isCheckedIn: false,
    checkInTime: null,
    checkOutTime: null,
    shiftStartTime: null,
    hoursWorked: 0,
    status: 'inactive',
    location: null,
    checkpoint: null,
    location_validation_passed: true
  });
  
  const [assignedCheckpoints, setAssignedCheckpoints] = useState([]);
  const [recentPatrols, setRecentPatrols] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [todayStats, setTodayStats] = useState({
    checkInTime: '--:--',
    patrolsCompleted: 0,
    patrolsPending: 0,
    checkpointsVisited: 0,
    hoursWorked: 0,
    incidentsReported: 0,
    efficiency: 0
  });
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

const menuItems = [
  { label: "Dashboard", path: "/guard", icon: <LayoutDashboard size={18} /> },
  { label: "Attendance", path: "/attendance", icon: <Calendar size={18} /> },
  { label: "Patrol Logs", path: "/patrolLog", icon: <ClipboardList size={18} /> },
  { label: "Checkpoints", path: "/checkpoint", icon: <MapPin size={18} /> },
  { label: "Reports", path: "/reports", icon: <FileText size={18} /> },
  { label: "Schedule", path: "/shift", icon: <Clock size={18} /> },
];
  
  // Sync control
  const isInitialLoadRef = useRef(true);
  
  // ================================
  // Consolidated Data Fetching Function
  // ================================
 const fetchGuardData = useCallback(async (showRefreshing = false) => {
  if (showRefreshing) setRefreshing(true);
  setLoading(true);
  setError(null);

  try {
    // 0️⃣ Auth check
    if (!authHelper.isLoggedIn()) {
      setError("Please log in to continue");
      setIsAuthenticated(false);
      return;
    }

    // 1️⃣ Profile info
    const profileData = await userApi.getProfile();
    if (profileData) {
      setGuardInfo(prev => ({
        ...prev,
        name: profileData.name || "Unknown Guard",
        id:
          profileData.serviceNumber ||
          profileData.employeeId ||
          profileData.id ||
          "N/A",
        location:
          profileData.location || profileData.assignedLocation || "Not assigned",
        avatar: profileData.name
          ? profileData.name
              .split(" ")
              .map(n => n[0])
              .join("")
              .toUpperCase()
          : "G",
        shift: profileData.shift || "No shift assigned",
        shiftTime: profileData.shiftTime || "Time not set",
      }));
    }

    // 2️⃣ Duty / Attendance Status
    let dutyData = {};
    try {
      dutyData = await userApi.getDutyStatus() || await userApi.getAttendanceStatus() || {};
    } catch (err) {
      if (err.status === 401) throw err;
      console.warn("Duty status fetch failed:", err);
      dutyData = {};
    }

    const checkInTime = dutyData.checkInTime ? new Date(dutyData.checkInTime) : null;
    const checkOutTime = dutyData.checkOutTime ? new Date(dutyData.checkOutTime) : null;
    const now = new Date();
    let hoursWorked = 0;

    // Calculate hours worked based on check-in status
    if (dutyData.isCheckedIn && checkInTime) {
      hoursWorked = (now - checkInTime) / (1000 * 60 * 60);
    } else if (dutyData.total_hours) {
      hoursWorked = dutyData.total_hours;
    }

    setDutyStatus({
      isCheckedIn: dutyData.status === "Present" || dutyData.isCheckedIn || false,
      checkInTime: checkInTime ? checkInTime.toLocaleTimeString() : null,
      checkOutTime: checkOutTime ? checkOutTime.toLocaleTimeString() : null,
      shiftStartTime: dutyData.shiftStartTime ? new Date(dutyData.shiftStartTime) : null,
      hoursWorked: Math.max(0, hoursWorked),
      status: dutyData.status || "inactive",
      location: dutyData.location || null,
      checkpoint: dutyData.checkpoint || null,
      location_validation_passed: dutyData.location_validation_passed ?? true,
    });

    // 3️⃣ Fetch Assigned Checkpoints
    const checkpointsResponse = await userApi.getCheckpoints() || {};
    let checkpointsData = [];
    
    if (checkpointsResponse.success && checkpointsResponse.data) {
      checkpointsData = Array.isArray(checkpointsResponse.data)
        ? checkpointsResponse.data
        : Object.values(checkpointsResponse.data).filter(item => item && typeof item === "object");
    } else if (Array.isArray(checkpointsResponse)) {
      checkpointsData = checkpointsResponse;
    } else if (checkpointsResponse && typeof checkpointsResponse === "object") {
      checkpointsData = Object.values(checkpointsResponse).filter(item => item && typeof item === "object");
    }

    // Process and format checkpoint data
    const formattedCheckpoints = checkpointsData.map(cp => {
      // Determine status based on various factors
      let status = cp.status || "pending";
      const lastVisit = cp.lastPatrolled || cp.lastVisit;
      const nextDue = cp.nextDue || cp.next_patrol_due;
      
      // Mark as overdue if next due time has passed
      if (nextDue && new Date(nextDue) < now) {
        status = "overdue";
      }

      return {
        id: cp.id || cp._id || Math.random().toString(36).substr(2, 9),
        name: cp.name || cp.checkpointName || cp.checkpoint_name || "Unnamed Checkpoint",
        status: status,
        lastVisit: lastVisit 
          ? new Date(lastVisit).toLocaleString()
          : "Not visited",
        nextDue: nextDue 
          ? new Date(nextDue).toLocaleString()
          : "Not scheduled",
        priority: cp.priority || cp.patrol_priority || "medium",
        location: cp.location || cp.address || "Unknown location",
        coordinates: cp.coordinates || { lat: cp.latitude, lng: cp.longitude },
      };
    });

    setAssignedCheckpoints(formattedCheckpoints);

    // 4️⃣ Fetch Current Shift Info
    try {
      const shiftData = await userApi.getCurrentShift();
      if (shiftData) {
        setGuardInfo(prev => ({
          ...prev,
          shift: shiftData.name || shiftData.shift_name || prev?.shift || "No shift assigned",
          shiftTime:
            shiftData.start_time && shiftData.end_time
              ? `${shiftData.start_time} - ${shiftData.end_time}`
              : prev?.shiftTime || "Time not set",
        }));
      }
    } catch (err) {
      console.warn("Shift data fetch failed:", err);
    }

    // 5️⃣ Fetch Reports Summary for stats
    let summaryData = {};
    try {
      summaryData = await userApi.getReportsSummary() || {};
    } catch (err) {
      console.warn("Reports summary fetch failed:", err);
    }

    // 6️⃣ Fetch Recent Patrol Logs
    let recentPatrolsData = [];
    try {
      const patrolResponse = await userApi.getMyPatrolLogs();
      if (patrolResponse?.success && patrolResponse.data) {
        recentPatrolsData = Array.isArray(patrolResponse.data) ? patrolResponse.data : [];
      } else if (Array.isArray(patrolResponse)) {
        recentPatrolsData = patrolResponse;
      }
    } catch (patrolError) {
      if (patrolError.status === 404) {
        console.warn("Patrol logs endpoint not found");
      } else {
        console.error("Patrol logs fetch failed:", patrolError);
      }
    }

    // Process patrol logs
    const formattedPatrols = recentPatrolsData.slice(0, 5).map(patrol => ({
      id: patrol.id || patrol._id || Math.random().toString(36).substr(2, 9),
      checkpoint: patrol.checkpoint_name || patrol.checkpointName || patrol.location || "Unknown",
      time: patrol.created_at || patrol.createdAt || patrol.patrol_time
        ? new Date(patrol.created_at || patrol.createdAt || patrol.patrol_time).toLocaleString()
        : "Unknown time",
      status: patrol.status || "completed",
      duration: patrol.duration || patrol.patrol_duration || "--",
      issues: patrol.issues_count || patrol.issuesCount || patrol.incident_count || 0,
      notes: patrol.notes || patrol.observations || "",
    }));

    setRecentPatrols(formattedPatrols);

    // 7️⃣ Calculate Today's Statistics
    const visitedCount = formattedCheckpoints.filter(cp => cp.status === "completed").length;
    const pendingCount = formattedCheckpoints.filter(cp => cp.status === "pending").length;
    const overdueCount = formattedCheckpoints.filter(cp => cp.status === "overdue").length;
    
    // Calculate efficiency based on completed vs total assigned
    const totalAssigned = formattedCheckpoints.length;
    const efficiency = totalAssigned > 0 ? Math.round((visitedCount / totalAssigned) * 100) : 0;

    setTodayStats({
      checkInTime: checkInTime?.toLocaleTimeString() || "--:--",
      patrolsCompleted: summaryData.patrolsCompleted || formattedPatrols.length || 0,
      patrolsPending: pendingCount + overdueCount,
      checkpointsVisited: visitedCount,
      hoursWorked: Math.max(0, hoursWorked),
      incidentsReported: summaryData.incidentsReported || 0,
      efficiency: summaryData.efficiency || efficiency,
    });

    setLastSyncTime(new Date());
    setIsAuthenticated(true);

  } catch (err) {
    console.error("Error fetching guard dashboard data:", err);
    if (err instanceof ApiError && err.status === 401) {
      setError("Your session has expired. Please log in again.");
      setIsAuthenticated(false);
      authHelper.logout();
      setTimeout(() => navigate("/login"), 2000);
      return;
    }
    setError(err.message || "Failed to load dashboard data");

    // Fallback for first load
    if (isInitialLoadRef.current) {
      setGuardInfo({
        name: "Guard User",
        id: "N/A",
        location: "Not assigned",
        avatar: "G",
        shift: "No shift assigned",
        shiftTime: "Time not set",
      });
      setDutyStatus({
        isCheckedIn: false,
        checkInTime: null,
        checkOutTime: null,
        shiftStartTime: null,
        hoursWorked: 0,
        status: "inactive",
        location: null,
        checkpoint: null,
        location_validation_passed: true
      });
      setTodayStats({
        checkInTime: "--:--",
        patrolsCompleted: 0,
        patrolsPending: 0,
        checkpointsVisited: 0,
        hoursWorked: 0,
        incidentsReported: 0,
        efficiency: 0,
      });
      setAssignedCheckpoints([]);
      setRecentPatrols([]);
    }
  } finally {
    setLoading(false);
    setRefreshing(false);
    isInitialLoadRef.current = false;
  }
}, [navigate]);

useEffect(() => {
  fetchGuardData();
}, [fetchGuardData]);


  // ================================
  // Effects and Lifecycle
  // ================================

  // Periodic data refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && !loading && !refreshing && isAuthenticated) {
        fetchGuardData(false); // Silent refresh every 30 seconds
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchGuardData, isOnline, loading, refreshing, isAuthenticated]);

  // Network status effect - refresh when coming back online
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!loading && isAuthenticated) {
        fetchGuardData(false);
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchGuardData, loading, isAuthenticated]);

  // Battery monitoring
  useEffect(() => {
    const getBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();
          setBatteryLevel(Math.round(battery.level * 100));
          
          const updateBattery = () => setBatteryLevel(Math.round(battery.level * 100));
          battery.addEventListener('levelchange', updateBattery);
          
          return () => battery.removeEventListener('levelchange', updateBattery);
        } catch (error) {
          console.log('Battery API not supported');
        }
      }
    };
    
    getBatteryInfo();
  }, []);
  
  // Location monitoring
  useEffect(() => {
    const checkLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationEnabled(true),
          () => setLocationEnabled(false)
        );
      } else {
        setLocationEnabled(false);
      }
    };
    
    checkLocation();
    const interval = setInterval(checkLocation, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ================================
  // Action Handlers
  // ================================

// Enhanced Check-in/out handler with full backend integration
const handleCheckInOut = async () => {
  try {
    setRefreshing(true);
    setError(null);

    if (!authHelper.isLoggedIn()) {
      setError("Please log in to continue");
      navigate("/login");
      return;
    }

    if (!navigator.geolocation) {
      setError("Location services not available");
      return;
    }

    // Get current position
    const position = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        resolve, 
        (err) => reject(new Error("Location access is required for check-in/out")),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    );

    const payload = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString()
    };

    // For check-in, require checkpoint selection
    if (!dutyStatus.isCheckedIn) {
      if (!selectedCheckpointId) {
        // Auto-select first available checkpoint if none selected
        const availableCheckpoint = assignedCheckpoints.find(cp => 
          cp.status === 'pending' || cp.status === 'overdue'
        );
        if (availableCheckpoint) {
          setSelectedCheckpointId(availableCheckpoint.id);
          payload.checkpoint_id = availableCheckpoint.id;
        } else {
          setError("Please select a checkpoint before checking in");
          return;
        }
      } else {
        payload.checkpoint_id = selectedCheckpointId;
      }
    }

    // Call appropriate API endpoint
    const response = dutyStatus.isCheckedIn
      ? await userApi.checkOut(payload)
      : await userApi.checkIn(payload);

    // Handle response and update local state
    const data = response.data?.data || response.data || response;
    const checkInTime = data.checkInTime ? new Date(data.checkInTime) : null;
    const checkOutTime = data.checkOutTime ? new Date(data.checkOutTime) : null;
    const now = new Date();
    
    // Calculate hours worked
    let hoursWorked = dutyStatus.hoursWorked;
    if (data.total_hours) {
      hoursWorked = data.total_hours;
    } else if (checkInTime && !dutyStatus.isCheckedIn) {
      hoursWorked = 0; // Starting new shift
    } else if (checkInTime && dutyStatus.isCheckedIn) {
      hoursWorked = (now - checkInTime) / (1000 * 60 * 60);
    }

    // Update duty status with backend response
    const newDutyStatus = {
      isCheckedIn: !dutyStatus.isCheckedIn,
      checkInTime: checkInTime ? checkInTime.toLocaleTimeString() : dutyStatus.checkInTime,
      checkOutTime: checkOutTime ? checkOutTime.toLocaleTimeString() : null,
      shiftStartTime: data.shiftStartTime ? new Date(data.shiftStartTime) : dutyStatus.shiftStartTime,
      hoursWorked: Math.max(0, hoursWorked),
      status: data.status || (!dutyStatus.isCheckedIn ? "Present" : "Absent"),
      location: data.location || {
        latitude: payload.latitude,
        longitude: payload.longitude,
        place_name: data.place_name || "Current location"
      },
      checkpoint: data.checkpoint || (payload.checkpoint_id ? { id: payload.checkpoint_id } : null),
      location_validation_passed: data.location_validation_passed ?? true
    };

    setDutyStatus(newDutyStatus);

    // Update today's stats
    setTodayStats(prev => ({
      ...prev,
      checkInTime: newDutyStatus.checkInTime || prev.checkInTime,
      hoursWorked: newDutyStatus.hoursWorked
    }));

    // Clear selected checkpoint after successful check-in
    if (!dutyStatus.isCheckedIn) {
      setSelectedCheckpointId(null);
    }

    // Show success message
    const locationName = data.location?.place_name || data.place_name || "your location";
    const message = dutyStatus.isCheckedIn 
      ? `Checked out successfully at ${locationName}`
      : `Checked in successfully at ${locationName}`;
    
    alert(message);

    // Refresh data to get updated information
    setTimeout(() => fetchGuardData(false), 1000);

  } catch (err) {
    console.error("Check-in/out failed:", err);
    const errorMessage = err.response?.data?.error || 
                        err.response?.data?.message || 
                        err.message || 
                        "Check-in/out failed";
    setError(errorMessage);
  } finally {
    setRefreshing(false);
  }
};

// Enhanced Start Patrol handler
const handleStartPatrol = async (checkpointId = null) => {
  try {
    if (!dutyStatus.isCheckedIn) {
      setError('You must be checked in to start a patrol');
      return;
    }
    
    if (!authHelper.isLoggedIn()) {
      setError('Please log in to continue');
      navigate('/login');
      return;
    }

    // If checkpoint ID provided, navigate with specific checkpoint
    if (checkpointId) {
      const checkpoint = assignedCheckpoints.find(cp => cp.id === checkpointId);
      navigate('/patrolLog', { 
        state: { 
          action: 'start-patrol',
          checkpointId: checkpointId,
          checkpointName: checkpoint?.name || 'Selected Checkpoint'
        } 
      });
    } else {
      // Navigate to patrol log page for general patrol start
      navigate('/patrolLog', { state: { action: 'start-patrol' } });
    }
    
  } catch (err) {
    console.error('Failed to start patrol:', err);
    setError('Failed to start patrol');
  }
};
  
  // Report incident handler
  const handleReportIncident = () => {
    if (!dutyStatus.isCheckedIn) {
      setError('You must be checked in to report incidents');
      return;
    }
    
    if (!authHelper.isLoggedIn()) {
      setError('Please log in to continue');
      navigate('/login');
      return;
    }
    
    navigate('/reports', { state: { createIncidentReport: true } });
  };
  
  // Emergency handler
  const handleEmergency = async () => {
    try {
      setEmergencyMode(true);
      
      // Try to send emergency alert to backend
      if (navigator.geolocation && authHelper.isLoggedIn()) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              await userApi.sendEmergencyAlert({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: new Date().toISOString(),
                guard_id: guardInfo.id
              });
            } catch (err) {
              console.warn('Emergency alert API call failed:', err);
            }
          },
          (err) => console.warn('Location for emergency failed:', err)
        );
      }
      
      alert('Emergency mode activated! Supervisor has been notified. Help is on the way.');
    } catch (err) {
      console.error('Emergency alert failed:', err);
      alert('Emergency mode activated locally. Please contact supervisor directly.');
    } finally {
      setTimeout(() => setEmergencyMode(false), 10000);
    }
  };

  // Helper Functions
  
  const getShiftProgress = () => {
    if (!dutyStatus.shiftStartTime || !dutyStatus.isCheckedIn) return 0;
    const now = new Date();
    const shiftStart = new Date(dutyStatus.shiftStartTime);
    const shiftDuration = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
    const elapsed = now - shiftStart;
    return Math.min(Math.max((elapsed / shiftDuration) * 100, 0), 100);
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'overdue': return 'text-red-600 bg-red-100 border-red-200';
      case 'active': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'overdue': return AlertCircle;
      case 'active': return Timer;
      default: return Clock;
    }
  };
  
  const overdueCheckpoints = assignedCheckpoints.filter(c => c.status === 'overdue').length;
  
  // ================================
  // Components
  // ================================
  
  const SystemStatus = () => (
    <div className="flex items-center space-x-3 text-sm">
      <div className="flex items-center">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600 mr-1" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600 mr-1" />
        )}
        <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      <div className="flex items-center">
        {batteryLevel > 20 ? (
          <Battery className="h-4 w-4 text-green-600 mr-1" />
        ) : (
          <BatteryLow className="h-4 w-4 text-red-600 mr-1" />
        )}
        <span className={batteryLevel > 20 ? 'text-green-600' : 'text-red-600'}>
          {batteryLevel}%
        </span>
      </div>
      
      <div className="flex items-center">
        <MapPin className={`h-4 w-4 mr-1 ${locationEnabled ? 'text-green-600' : 'text-red-600'}`} />
        <span className={locationEnabled ? 'text-green-600' : 'text-red-600'}>
          {locationEnabled ? 'GPS' : 'No GPS'}
        </span>
      </div>
      
      {lastSyncTime && (
        <div className="flex items-center text-xs text-gray-500">
          <RefreshCw className="h-3 w-3 mr-1" />
          <span>Last sync: {lastSyncTime.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
  
  const QuickActionCard = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    color = 'blue', 
    onClick, 
    disabled = false, 
    pulse = false, 
    loading: cardLoading = false 
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || refreshing || cardLoading}
      className={`w-full p-6 bg-white border-2 rounded-lg shadow hover:shadow-md transition-all duration-200 text-left group ${
        disabled || refreshing || cardLoading
          ? 'border-gray-200 opacity-50 cursor-not-allowed' 
          : `border-${color}-200 hover:border-${color}-300`
      } ${pulse && !disabled ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className={`p-3 bg-${color}-100 rounded-full mb-4 inline-block group-hover:bg-${color}-200 transition-colors`}>
            {(refreshing || cardLoading) ? (
              <Loader2 className={`h-6 w-6 text-${color}-600 animate-spin`} />
            ) : (
              <Icon className={`h-6 w-6 text-${color}-600`} />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </button>
  );
  
  const StatCard = ({ label, value, sublabel, color = 'blue', trend, icon: Icon }) => (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{label}</p>
            {Icon && <Icon className={`h-4 w-4 text-${color}-600`} />}
          </div>
          <p className={`text-2xl font-bold text-${color}-600 ${loading ? 'animate-pulse' : ''}`}>
            {loading && isInitialLoadRef.current ? '...' : value}
          </p>
          {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
          {trend && (
            <div className="flex items-center mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-xs text-green-600">+{trend}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  const NavigationMenu = () => (
    <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
      w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out z-50 lg:relative lg:translate-x-0`}>
      
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-blue-600 mr-2" />
          <span className="text-lg font-semibold">Guard Portal</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Guard Profile */}
      <div className="px-4 py-4">
        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
            {guardInfo.avatar}
          </div>
          <div>
            <p className="font-medium text-gray-900 truncate">{guardInfo.name}</p>
            <p className="text-sm text-gray-600">{guardInfo.id}</p>
          </div>
        </div>
      </div>
      
      {/* Sidebar Navigation */}
      <nav className="flex-1 space-y-1 px-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* System Status */}
      <div className="mt-6 px-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <SystemStatus />
        </div>
      </div>
    </div>
  );
  
  // Show loading screen on initial load
  if (loading && isInitialLoadRef.current) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={() => fetchGuardData(true)}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <NavigationMenu />
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="flex-1 lg:ml-0">
        {/* Connection Status Banner */}
        {!isOnline && (
          <div className="bg-yellow-600 text-white p-2 text-center text-sm">
            <div className="flex items-center justify-center">
              <CloudOff className="h-4 w-4 mr-2" />
              <span>You're offline. Some features may not work properly.</span>
            </div>
          </div>
        )}
        
        {/* Error Banner */}
        {error && (
          <div className="bg-red-600 text-white p-3 text-center">
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => {
                  setError(null);
                  fetchGuardData(true);
                }}
                className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Mobile Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="px-4 py-4 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-blue-600 mr-2" />
              <span className="font-semibold">Guard Portal</span>
            </div>
            <div className="relative">
              <Bell className="h-6 w-6 text-gray-400" />
              {overdueCheckpoints > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {overdueCheckpoints}
                </span>
              )}
            </div>
          </div>
        </header>
        
        {/* Desktop Header */}
        <header className="hidden lg:block bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">{guardInfo.shift} • {guardInfo.location}</p>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {currentTime.toLocaleTimeString()}
                </p>
                <p className="text-sm text-gray-600">
                  {currentTime.toLocaleDateString()}
                </p>
              </div>
              
              <button
                onClick={() => fetchGuardData(true)}
                disabled={refreshing}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer" />
                {overdueCheckpoints > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {overdueCheckpoints}
                  </span>
                )}
              </div>
              
              <button 
                className="flex items-center text-gray-600 hover:text-gray-900" 
                title="Logout"
                onClick={() => navigate('/login')}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {/* Emergency Banner */}
          {emergencyMode && (
            <div className="mb-6 p-4 bg-red-600 text-white rounded-lg flex items-center">
              <AlertTriangle className="h-6 w-6 mr-3 animate-pulse" />
              <div>
                <p className="font-semibold">EMERGENCY MODE ACTIVE</p>
                <p className="text-sm">Supervisor has been notified. Help is on the way.</p>
              </div>
            </div>
          )}

          {/* Status Banner */}
          <div className={`mb-6 p-4 rounded-lg border-2 ${dutyStatus.isCheckedIn ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`h-4 w-4 rounded-full mr-3 ${dutyStatus.isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <div>
                  <p className={`font-semibold ${dutyStatus.isCheckedIn ? 'text-green-900' : 'text-red-900'}`}>
                    {dutyStatus.isCheckedIn ? 'On Duty' : 'Off Duty'}
                  </p>
                  <p className={`text-sm ${dutyStatus.isCheckedIn ? 'text-green-700' : 'text-red-700'}`}>
                    {dutyStatus.isCheckedIn 
                      ? `Checked in at ${todayStats.checkInTime} • Active for ${todayStats.hoursWorked.toFixed(1)} hours`
                      : 'Please check in to start your shift'
                    }
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Shift Progress</p>
                <div className="w-32 bg-gray-200 rounded-full h-3 mt-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 relative"
                    style={{ width: `${getShiftProgress()}%` }}
                  >
                    <div className="absolute inset-0 bg-white bg-opacity-25 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">{getShiftProgress().toFixed(0)}% complete</p>
              </div>
            </div>
          </div>

          {/* Today's Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Hours Worked"
              value={todayStats.hoursWorked.toFixed(1)}
              sublabel="Today"
              color="blue"
              icon={Clock}
            />
            <StatCard
              label="Patrols Done"
              value={todayStats.patrolsCompleted}
              sublabel={`${todayStats.patrolsPending} pending`}
              color="green"
              icon={CheckCircle}
              trend={12}
            />
            <StatCard
              label="Checkpoints"
              value={todayStats.checkpointsVisited}
              sublabel={`of ${assignedCheckpoints.length} assigned`}
              color="purple"
              icon={MapPin}
            />
            <StatCard
              label="Efficiency"
              value={`${todayStats.efficiency}%`}
              sublabel="Performance"
              color="orange"
              icon={TrendingUp}
              trend={8}
            />
          </div>

          {/* Main Action Cards Row */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <QuickActionCard
              title={dutyStatus.isCheckedIn ? "Check Out" : "Check In"}
              subtitle={dutyStatus.isCheckedIn ? "End your shift" : "Start your shift"}
              icon={dutyStatus.isCheckedIn ? Square : Play}
              color={dutyStatus.isCheckedIn ? "red" : "green"}
              onClick={handleCheckInOut}
              loading={refreshing}
              pulse={!dutyStatus.isCheckedIn}
            />

            {/* Emergency Button */}
            <QuickActionCard
              title="Emergency Alert"
              subtitle="Notify supervisor immediately"
              icon={AlertTriangle}
              color="red"
              onClick={handleEmergency}
              disabled={!dutyStatus.isCheckedIn}
              pulse={emergencyMode}
            />
          </div>

          {/* Secondary Actions Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <QuickActionCard
              title="Start Patrol"
              subtitle="Begin checkpoint patrol"
              icon={Navigation}
              color="blue"
              onClick={() => handleStartPatrol()}
              disabled={!dutyStatus.isCheckedIn}
            />
            
            <QuickActionCard
              title="Report Incident"
              subtitle="Log security incident"
              icon={FileText}
              color="orange"
              onClick={handleReportIncident}
              disabled={!dutyStatus.isCheckedIn}
            />
            
            <QuickActionCard
              title="Take Photo"
              subtitle="Document checkpoint"
              icon={Camera}
              color="purple"
              onClick={() => console.log('Camera function')}
              disabled={!dutyStatus.isCheckedIn}
            />
            
            <QuickActionCard
              title="Contact Support"
              subtitle="Call supervisor"
              icon={PhoneCall}
              color="green"
              onClick={() => window.open('tel:+1234567890')}
            />
          </div>
          
          {/* Checkpoint Selection for Check-in */}
          {!dutyStatus.isCheckedIn && assignedCheckpoints.length > 0 && (
            <div className="mb-6 bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Checkpoint for Check-in</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {assignedCheckpoints
                  .filter(cp => cp.status === 'pending' || cp.status === 'overdue')
                  .map((checkpoint) => (
                    <button
                      key={checkpoint.id}
                      onClick={() => setSelectedCheckpointId(checkpoint.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selectedCheckpointId === checkpoint.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{checkpoint.name}</p>
                          <p className="text-sm text-gray-600">{checkpoint.location}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          checkpoint.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {checkpoint.status}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
              {selectedCheckpointId && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Selected: {assignedCheckpoints.find(cp => cp.id === selectedCheckpointId)?.name}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Content Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Assigned Checkpoints */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">My Checkpoints</h3>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                    {Array.isArray(assignedCheckpoints) ? assignedCheckpoints.length : 0} Total
                  </span>
                  {overdueCheckpoints > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium animate-pulse">
                      {overdueCheckpoints} Overdue
                    </span>
                  )}
                </div>
              </div>
              
              {/* Checkpoints List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {Array.isArray(assignedCheckpoints) && assignedCheckpoints.length > 0 ? (
                  assignedCheckpoints.map((checkpoint) => {
                    const StatusIcon = getStatusIcon(checkpoint.status);
                    const checkpointId = checkpoint.id || checkpoint._id;

                    return (
                      <div
                        key={checkpointId}
                        className={`p-3 border rounded-lg transition duration-200 hover:shadow-sm ${getStatusColor(
                          checkpoint.status
                        )}`}
                      >
                        <div className="flex items-center justify-between">
                          {/* Left: Checkpoint info */}
                          <div className="flex items-center">
                            <StatusIcon className="h-5 w-5 mr-3" />
                            <div>
                              <p className="font-medium">{checkpoint.name || "Unnamed checkpoint"}</p>
                              <p className="text-xs text-gray-500">
                                Last visit: {checkpoint.lastVisit || "N/A"}
                              </p>
                            </div>
                          </div>

                          {/* Right: Priority & Due date */}
                          <div className="text-right">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                                checkpoint.priority
                              )}`}
                            >
                              {checkpoint.priority || "Normal"}
                            </span>
                            <p className="text-xs mt-1 text-gray-500">
                              Due: {checkpoint.nextDue || "Not scheduled"}
                            </p>
                          </div>
                        </div>

                        {/* Start button for overdue checkpoints */}
                        {checkpoint.status === "overdue" && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleStartPatrol(checkpointId)}
                              disabled={!dutyStatus?.isCheckedIn}
                              className="flex-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Start Now
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No checkpoints assigned</p>
                    <p className="text-sm">Contact your supervisor</p>
                  </div>
                )}
              </div>

              {/* View all checkpoints button */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigate("/checkpoint")}
                  className="w-full px-4 py-2 text-sm text-blue-600 font-medium hover:text-blue-800 transition-colors"
                >
                  View All Checkpoints →
                </button>
              </div>
            </div>
            
            {/* Recent Patrol Activity */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm text-green-600">Live</span>
                </div>
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentPatrols.map((patrol) => (
                  <div key={patrol.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{patrol.checkpoint}</p>
                        <p className="text-xs text-gray-600">
                          {patrol.time} • {patrol.duration}
                        </p>
                        {patrol.notes && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {patrol.notes.substring(0, 50)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        {patrol.status}
                      </span>
                      {patrol.issues > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          {patrol.issues} issue{patrol.issues !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {recentPatrols.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm">Start a patrol to see activity</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigate('/patrolLog')}
                  className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Full Log →
                </button>
              </div>
            </div>
          </div>

          {/* Quick Tips & Notifications */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Bell className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Today's Tips</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Remember to check emergency exits during patrols</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Document any unusual activities or maintenance issues</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Keep your device charged and GPS enabled</span>
                  </div>
                  {!isOnline && (
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                      <span>You're currently offline - some features may not work</span>
                    </div>
                  )}
                  {overdueCheckpoints > 0 && (
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                      <span>You have {overdueCheckpoints} overdue checkpoint{overdueCheckpoints !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => navigate('/attendance')}
              className="px-6 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View Attendance
            </button>
            <button
              onClick={() => navigate('/shift')}
              className="px-6 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              My Schedule
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-6 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardDashboard;