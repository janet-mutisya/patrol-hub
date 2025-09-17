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
  Pause
} from 'lucide-react';
import { dashboardApi, userApi } from '../lib/api';

const GuardDashboard = () => {
  const navigate = useNavigate();
  
  // Basic state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);
  
  // Data state with proper initialization
  const [guardInfo, setGuardInfo] = useState({
    name: 'Loading...',
    id: '...',
    shift: '...',
    shiftTime: '...',
    location: '...',
    avatar: '?'
  });
  
  const [dutyStatus, setDutyStatus] = useState({
    isCheckedIn: false,
    checkInTime: null,
    shiftStartTime: null,
    hoursWorked: 0,
    status: 'inactive'
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
  
  // Sync control
  const syncIntervalRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  
  // ================================
  // API Integration Functions
  // ================================
  
  const fetchAllData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    if (isInitialLoadRef.current) setLoading(true);
    
    try {
      setError(null);
      
      // Fetch all data in parallel using your existing API
      const [
        profileResult,
        dutyStatusResult,
        checkpointsResult,
        performanceResult,
        patrolLogsResult,
        currentShiftResult
      ] = await Promise.allSettled([
        userApi.getProfile(),
        userApi.getDutyStatus(),
        dashboardApi.getCheckpoints(),
        userApi.getMyPerformance(),
        dashboardApi.getPatrolLogs(),
        userApi.getCurrentShift()
      ]);
      
      // Update state with fetched data
      if (profileResult.status === 'fulfilled' && profileResult.value) {
        const profile = profileResult.value;
        setGuardInfo({
          name: profile.name || profile.fullName || 'Unknown',
          id: profile.id || profile.employeeId || 'N/A',
          shift: profile.shift || 'Not assigned',
          shiftTime: profile.shiftTime || 'N/A',
          location: profile.location || profile.assignedLocation || 'Not assigned',
          avatar: profile.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
        });
      }
      
      if (dutyStatusResult.status === 'fulfilled' && dutyStatusResult.value) {
        const dutyData = dutyStatusResult.value;
        setDutyStatus(prev => ({
          ...prev,
          isCheckedIn: dutyData.isCheckedIn || dutyData.status === 'active',
          checkInTime: dutyData.checkInTime,
          shiftStartTime: dutyData.shiftStartTime,
          hoursWorked: dutyData.hoursWorked || 0,
          status: dutyData.status || 'inactive'
        }));
      }
      
      if (checkpointsResult.status === 'fulfilled' && Array.isArray(checkpointsResult.value)) {
        // Transform checkpoint data to match dashboard format
        const checkpoints = checkpointsResult.value.map(cp => ({
          id: cp.id,
          name: cp.name || cp.checkpointName,
          status: cp.status || 'pending',
          lastVisit: cp.lastVisit ? new Date(cp.lastVisit).toLocaleTimeString() : 'Not visited',
          nextDue: cp.nextDue ? new Date(cp.nextDue).toLocaleTimeString() : 'N/A',
          priority: cp.priority || 'medium'
        }));
        setAssignedCheckpoints(checkpoints);
      }
      
      if (performanceResult.status === 'fulfilled' && performanceResult.value) {
        const stats = performanceResult.value;
        setTodayStats(prev => ({
          ...prev,
          patrolsCompleted: stats.patrolsCompleted || 0,
          patrolsPending: stats.patrolsPending || 0,
          checkpointsVisited: stats.checkpointsVisited || 0,
          incidentsReported: stats.incidentsReported || 0,
          efficiency: stats.efficiency || 0,
          checkInTime: dutyStatus.checkInTime || prev.checkInTime
        }));
      }
      
      if (patrolLogsResult.status === 'fulfilled' && Array.isArray(patrolLogsResult.value)) {
        // Get recent patrols (latest 4)
        const patrols = patrolLogsResult.value
          .filter(log => log.guardId === guardInfo.id || log.userId === guardInfo.id)
          .slice(0, 4)
          .map(log => ({
            id: log.id,
            checkpoint: log.checkpointName || log.checkpoint,
            time: new Date(log.timestamp || log.createdAt).toLocaleTimeString(),
            status: log.status || 'completed',
            duration: log.duration || '5 min',
            issues: log.issuesCount || 0
          }));
        setRecentPatrols(patrols);
      }
      
      if (currentShiftResult.status === 'fulfilled' && currentShiftResult.value) {
        const shift = currentShiftResult.value;
        setGuardInfo(prev => ({
          ...prev,
          shift: shift.name || shift.shiftName || prev.shift,
          shiftTime: shift.timeRange || `${shift.startTime} - ${shift.endTime}` || prev.shiftTime
        }));
      }
      
      setLastSyncTime(new Date());
      
      // Handle any failed requests
      const failedRequests = [
        profileResult, dutyStatusResult, checkpointsResult, 
        performanceResult, patrolLogsResult, currentShiftResult
      ].filter(result => result.status === 'rejected');
      
      if (failedRequests.length > 0) {
        console.warn('Some data requests failed:', failedRequests.map(r => r.reason));
        if (failedRequests.length === 6) {
          throw new Error('All data requests failed. Please check your connection.');
        }
      }
      
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isInitialLoadRef.current = false;
    }
  }, [guardInfo.id]);
  
  const handleCheckInOut = async () => {
    try {
      setRefreshing(true);
      const result = await userApi.toggleDutyStatus({ 
        currentStatus: dutyStatus.isCheckedIn 
      });
      
      // Update local state immediately for better UX
      setDutyStatus(prev => ({
        ...prev,
        isCheckedIn: result.isCheckedIn,
        checkInTime: result.isCheckedIn ? new Date().toLocaleTimeString() : null,
        status: result.isCheckedIn ? 'active' : 'inactive'
      }));
      
      // Refresh all data to get updated information
      setTimeout(() => fetchAllData(), 1000);
      
    } catch (err) {
      console.error('Failed to toggle duty status:', err);
      setError('Failed to update duty status. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleStartPatrol = async (checkpointId) => {
    try {
      setRefreshing(true);
      // This would typically call a start patrol API endpoint
      // For now, navigate to patrol logs page where they can start patrol
      navigate('/patrolLog', { state: { startPatrolForCheckpoint: checkpointId } });
      
    } catch (err) {
      console.error('Failed to start patrol:', err);
      setError('Failed to start patrol. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleReportIncident = () => {
    // Navigate to reports page for incident reporting
    navigate('/Report', { state: { createIncidentReport: true } });
  };
  
  const handleEmergency = () => {
    setEmergencyMode(true);
    // In real implementation, this would trigger emergency protocols via API
    alert('Emergency mode activated! Supervisor notified.');
    setTimeout(() => setEmergencyMode(false), 5000);
  };
  
  // ================================
  // Effects and Lifecycle
  // ================================
  
  // Initial data load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  // Set up real-time sync
  useEffect(() => {
    // Real-time updates every 30 seconds
    syncIntervalRef.current = setInterval(() => {
      if (isOnline) {
        fetchAllData(false); // Silent refresh
      }
    }, 30000);
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [fetchAllData, isOnline]);
  
  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchAllData(); // Refresh data when coming back online
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchAllData]);
  
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
  
  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // ================================
  // Helper Functions
  // ================================
  
  const getShiftProgress = () => {
    if (!dutyStatus.shiftStartTime) return 0;
    const now = new Date();
    const shiftDuration = 12 * 60 * 60 * 1000; // 12 hours
    const elapsed = now - new Date(dutyStatus.shiftStartTime);
    return Math.min((elapsed / shiftDuration) * 100, 100);
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
          <span>
            Synced {lastSyncTime.toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
  
  const QuickActionCard = ({ title, subtitle, icon: Icon, color = 'blue', onClick, disabled = false, pulse = false, loading: cardLoading = false }) => (
    <button
      onClick={onClick}
      disabled={disabled || refreshing || cardLoading}
      className={`w-full p-6 bg-white border-2 rounded-lg shadow hover:shadow-md transition-all duration-200 text-left ${
        disabled || refreshing || cardLoading
          ? 'border-gray-200 opacity-50 cursor-not-allowed' 
          : `border-${color}-200 hover:border-${color}-300`
      } ${pulse && !disabled ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className={`p-3 bg-${color}-100 rounded-full mb-4 inline-block`}>
            {(refreshing || cardLoading) ? (
              <Loader2 className={`h-6 w-6 text-${color}-600 animate-spin`} />
            ) : (
              <Icon className={`h-6 w-6 text-${color}-600`} />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
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
            {loading ? '...' : value}
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
      
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-blue-600 mr-2" />
          <span className="text-lg font-semibold">Guard Portal</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 mb-4">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
              {guardInfo.avatar}
            </div>
            <div>
              <p className="font-medium text-gray-900">{guardInfo.name}</p>
              <p className="text-sm text-gray-600">{guardInfo.id}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-1 px-4">
          <button 
            onClick={() => navigate('/GuardDashboard')}
            className="w-full flex items-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg text-left"
          >
            <Activity className="h-5 w-5 mr-3" />
            Dashboard
          </button>
          <button 
            onClick={() => navigate('/attendance')}
            className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-left"
          >
            <Clock className="h-5 w-5 mr-3" />
            Attendance
          </button>
          <button 
            onClick={() => navigate('/patrolLog')}
            className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-left"
          >
            <Route className="h-5 w-5 mr-3" />
            Patrol Logs
          </button>
          <button 
            onClick={() => navigate('/checkpoint')}
            className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-left"
          >
            <MapIcon className="h-5 w-5 mr-3" />
            Checkpoints
          </button>
          <button 
            onClick={() => navigate('/Report')}
            className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-left"
          >
            <FileText className="h-5 w-5 mr-3" />
            Reports
          </button>
          <button 
            onClick={() => navigate('/shift')}
            className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-left"
          >
            <Calendar className="h-5 w-5 mr-3" />
            Schedule
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-left"
          >
            <Settings className="h-5 w-5 mr-3" />
            Settings
          </button>
        </div>
        
        <div className="absolute bottom-4 left-4 right-4">
          <SystemStatus />
        </div>
      </nav>
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
                onClick={() => fetchAllData()}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
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
      
      {/* Overlay for mobile */}
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
                  fetchAllData(true);
                }}
                className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30"
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
                onClick={() => fetchAllData(true)}
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
                onClick={() => {
                  // Handle logout logic
                  navigate('/login');
                }}
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
            {/* Check In/Out Card */}
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
              onClick={() => navigate('/patrolLog')}
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

          {/* Content Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Assigned Checkpoints */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">My Checkpoints</h3>
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                    {assignedCheckpoints.length} Total
                  </span>
                  {overdueCheckpoints > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium animate-pulse">
                      {overdueCheckpoints} Overdue
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {assignedCheckpoints.map((checkpoint) => {
                  const StatusIcon = getStatusIcon(checkpoint.status);
                  return (
                    <div
                      key={checkpoint.id}
                      className={`p-3 border rounded-lg transition-all duration-200 hover:shadow-sm ${getStatusColor(checkpoint.status)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <StatusIcon className="h-5 w-5 mr-3" />
                          <div>
                            <p className="font-medium">{checkpoint.name}</p>
                            <p className="text-xs opacity-75">
                              Last visit: {checkpoint.lastVisit}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(checkpoint.priority)}`}>
                            {checkpoint.priority}
                          </div>
                          <p className="text-xs mt-1 opacity-75">
                            Due: {checkpoint.nextDue}
                          </p>
                        </div>
                      </div>
                      
                      {checkpoint.status === 'overdue' && (
                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={() => handleStartPatrol(checkpoint.id)}
                            className="flex-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                            disabled={!dutyStatus.isCheckedIn}
                          >
                            Start Now
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {assignedCheckpoints.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No checkpoints assigned</p>
                    <p className="text-sm">Contact your supervisor</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigate('/checkpoint')}
                  className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
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