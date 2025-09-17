import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Users, MapPin, Clock, AlertTriangle, CheckCircle, Activity,
  FileText, Settings, Bell, Search, Plus, Calendar, TrendingUp, Eye, 
  BarChart3, Navigation, LogOut, Menu, X, Wifi, WifiOff, Server, Database,
  Zap, RefreshCw, Filter, Download, AlertCircle, ChevronRight, Timer,
  MapIcon, UserCheck, UserX, Pause, Play, Shield
} from 'lucide-react';
import QuickActionButton from "@/components/QuickActionButton";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { dashboardApi } from '../lib/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(null);
  const [guards, setGuards] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('today');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddGuardModal, setShowAddGuardModal] = useState(false);
  const [newGuard, setNewGuard] = useState({ name: '', email: '', phone: '', shift: '' });
  const [validationErrors, setValidationErrors] = useState({});
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [selectedGuardPhone, setSelectedGuardPhone] = useState('');
  const [selectedGuardName, setSelectedGuardName] = useState('');
  const [showRouteModal, setShowRouteModal] = useState(false); 
  const [routeName, setRouteName] = useState(""); 
  const [selectedCheckpoints, setSelectedCheckpoints] = useState([]);
  const [availableCheckpoints, setAvailableCheckpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLiveViewModal, setShowLiveViewModal] = useState(false);

  // FIXED: Initialize metrics with default values
  const [metrics, setMetrics] = useState({
    totalGuards: 0,
    activeGuards: 0,
    onBreakGuards: 0,
    totalCheckpoints: 0,
    activePatrols: 0,
    overduePatrols: 0,
    completedPatrols: 0,
    attendanceRate: 0,
    completionRate: 0,
    avgResponseTime: '0 min',
    incidentsToday: 0,
    systemUptime: 0
  });

  // FIXED: Initialize with empty arrays instead of mock data
  const [recentActivity, setRecentActivity] = useState([]);
  const [overduePatrols, setOverduePatrols] = useState([]);
  const [activeGuardsList, setActiveGuardsList] = useState([]);

  // Fetch live data
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const data = await dashboardApi.getActiveGuards();
        setGuards(Array.isArray(data) ? data : []);
        setActiveGuardsList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching live status:", err);
        setGuards([]);
        setActiveGuardsList([]);
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 10000);
    return () => clearInterval(interval);
  }, []);
  
  const openPhoneModal = (patrol) => {
    setSelectedGuardPhone(patrol.phone);
    setSelectedGuardName(patrol.name);
    setShowPhoneModal(true);
  };

  // Validation function
  const validateGuardForm = () => {
    const errors = {};

    if (!newGuard.name.trim()) {
      errors.name = 'Full name is required';
    } else if (newGuard.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (newGuard.name.trim().length > 50) {
      errors.name = 'Name must be less than 50 characters';
    }

    if (!newGuard.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newGuard.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!newGuard.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,15}$/.test(newGuard.phone.trim())) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (!newGuard.shift) {
      errors.shift = 'Please select a shift';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleAddGuard = async () => {
    setModalError('');
    if (!validateGuardForm()) {
      setModalError('Please fix the errors below');
      return;
    }

    setIsSubmitting(true);
    try {
      const guardData = {
        name: newGuard.name.trim(),
        email: newGuard.email.trim().toLowerCase(),
        phone: newGuard.phone.trim(),
        shift: newGuard.shift
      };

      await dashboardApi.createUser(guardData);

      setShowAddGuardModal(false);
      setValidationErrors({});
      setModalError('');
      setNewGuard({ name: '', email: '', phone: '', shift: '' });
      
      alert('Guard added successfully!');
      
    } catch (error) {
      console.error('Add guard error:', error);
      
      if (error.message?.includes('email')) {
        setValidationErrors(prev => ({ ...prev, email: 'Email already exists' }));
      } else if (error.message?.includes('phone')) {
        setValidationErrors(prev => ({ ...prev, phone: 'Phone number already exists' }));
      }
      setModalError(error.message || 'Failed to add guard. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to open modal
  const openAddGuardModal = () => {
    setNewGuard({ name: '', email: '', phone: '', shift: '' });
    setValidationErrors({});
    setModalError('');
    setShowAddGuardModal(true);
  };

  // Auto-focus the first input when modal opens
  useEffect(() => {
    if (showAddGuardModal) {
      document.getElementById('guard-name')?.focus();
    }
  }, [showAddGuardModal]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showAddGuardModal && !isSubmitting) {
        setShowAddGuardModal(false);
        setNewGuard({ name: '', email: '', phone: '', shift: '' });
        setValidationErrors({});
        setModalError('');
      }
    };

    if (showAddGuardModal) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [showAddGuardModal, isSubmitting]);

  // OnChange helpers
  const handleChange = (field) => (e) => {
    const value = e.target.value.replace(/^\s+/, '');
    setNewGuard(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) setValidationErrors(prev => ({ ...prev, [field]: '' }));
    if (modalError) setModalError('');
  };

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch checkpoints from backend
  useEffect(() => {
    const fetchCheckpoints = async () => {
      try {
        const data = await dashboardApi.getCheckpoints();
        if (Array.isArray(data)) {
          setAvailableCheckpoints(data);
        }
      } catch (err) {
        console.error("Failed to fetch checkpoints:", err);
      }
    };

    if (showRouteModal) {
      fetchCheckpoints();
    }
  }, [showRouteModal]);

  // Get checkpoints not yet selected
  const unselectedCheckpoints = availableCheckpoints.filter(
    (cp) => !selectedCheckpoints.find((selected) => selected.id === cp.id)
  );

  const handleAddCheckpoint = (checkpointId) => {
    const checkpoint = availableCheckpoints.find((cp) => cp.id === checkpointId);
    if (checkpoint && !selectedCheckpoints.find((selected) => selected.id === checkpointId)) {
      setSelectedCheckpoints([...selectedCheckpoints, checkpoint]);
    }
  };

  const handleRemoveCheckpoint = (checkpointId) => {
    setSelectedCheckpoints(selectedCheckpoints.filter((cp) => cp.id !== checkpointId));
  };

  const handleSaveRoute = async () => {
    if (!routeName.trim()) {
      alert("Please enter a route name");
      return;
    }
    if (selectedCheckpoints.length === 0) {
      alert("Please select at least one checkpoint");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: routeName.trim(),
          checkpoints: selectedCheckpoints.map((cp) => cp.id),
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setShowRouteModal(false);
        setRouteName("");
        setSelectedCheckpoints([]);
        alert('Route saved successfully!');
      } else {
        alert(result.message || "Failed to save route");
      }
    } catch (err) {
      console.error("Save route error:", err);
      alert("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setRouteName("");
    setSelectedCheckpoints([]);
    setShowRouteModal(false);
  };

  // FIXED: Fetch metrics with proper error handling
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetricsLoading(true);
        setMetricsError(null);

        const [usersResult, checkpointsResult, attendanceResult] = await Promise.allSettled([
          dashboardApi.getUsers(),
          dashboardApi.getCheckpoints(), 
          dashboardApi.getActiveGuards()
        ]);

        const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
        const checkpoints = checkpointsResult.status === 'fulfilled' ? checkpointsResult.value : [];
        const attendance = attendanceResult.status === 'fulfilled' ? attendanceResult.value : [];

        setMetrics(prev => ({
          ...prev,
          totalGuards: Array.isArray(users) ? users.length : 0,
          activeGuards: Array.isArray(attendance) ? attendance.length : 0,
          onBreakGuards: Array.isArray(users) ? users.filter(u => u.status === 'on_break').length : 0,
          totalCheckpoints: Array.isArray(checkpoints) ? checkpoints.length : 0,
          systemUptime: 99.5
        }));

        // Try to fetch additional data
        try {
          const [patrolsResult, reportsResult] = await Promise.allSettled([
            dashboardApi.getPatrolLogs(),
            dashboardApi.getSystemSummary()
          ]);

          const patrols = patrolsResult.status === 'fulfilled' ? patrolsResult.value : [];
          const summary = reportsResult.status === 'fulfilled' ? reportsResult.value : null;

          if (Array.isArray(patrols)) {
            const activePatrols = patrols.filter(p => p.status === 'active').length;
            const overduePatrols = patrols.filter(p => p.status === 'overdue').length;
            const completedPatrols = patrols.filter(p => p.status === 'completed').length;
            
            setMetrics(prev => ({
              ...prev,
              activePatrols,
              overduePatrols, 
              completedPatrols
            }));

            // Set overdue patrols for alerts
            setOverduePatrols(patrols.filter(p => p.status === 'overdue'));
            setActiveAlerts(overduePatrols);
          }

          if (summary) {
            setMetrics(prev => ({
              ...prev,
              attendanceRate: summary.attendanceRate || prev.attendanceRate,
              completionRate: summary.completionRate || prev.completionRate,
              avgResponseTime: summary.avgResponseTime || prev.avgResponseTime,
              incidentsToday: summary.incidentsToday || prev.incidentsToday
            }));
          }
        } catch (additionalError) {
          console.warn('Could not fetch additional metrics:', additionalError.message);
        }

      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        setMetricsError(error.message);
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // FIXED: Fetch recent activity from API
  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        // You might need to add this endpoint to your backend
        const activity = await dashboardApi.getSystemSummary();
        if (activity?.recentActivity) {
          setRecentActivity(activity.recentActivity);
        }
      } catch (error) {
        console.warn('Could not fetch recent activity:', error);
      }
    };

    fetchRecentActivity();
    const interval = setInterval(fetchRecentActivity, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  const MetricCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend, onClick, loading = false }) => (
    <div 
      className={`bg-white rounded-lg shadow p-6 border border-gray-200 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600 ${loading || metricsLoading ? 'animate-pulse' : ''}`}>
            {loading || metricsLoading ? '...' : value}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-4 bg-${color}-100 rounded-full`}>
          <Icon className={`h-8 w-8 text-${color}-600`} />
        </div>
      </div>
      {trend && !loading && !metricsLoading && (
        <div className="mt-4 flex items-center">
          <TrendingUp className={`h-4 w-4 mr-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}% from last week
          </span>
        </div>
      )}
    </div>
  );

  const navigation = [
    { name: 'Dashboard', icon: BarChart3, path: '/admin', color: 'blue' },
    { name: 'Guards Management', icon: Users, path: '/user', color: 'green' },
    { name: 'Attendance System', icon: Clock, path: '/attendance', color: 'purple' },
    { name: 'Checkpoints', icon: MapPin, path: '/checkpoint', color: 'yellow' },
    { name: 'Patrol Logs', icon: Shield, path: '/patrolLog', color: 'indigo' },
    { name: 'Shifts Management', icon: Calendar, path: '/shift', color: 'pink' },
    { name: 'Reports', icon: FileText, path: '/reports', color: 'orange' },
    { name: 'Settings', icon: Settings, path: '/settings', color: 'gray' }
  ].map(item => ({
    ...item,
    active: location.pathname === item.path
  }));

  const handleRefresh = () => {
    setRefreshing(true);
    // Trigger all data fetches
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const Sidebar = () => (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg md:static md:translate-x-0 transform transition-transform duration-200 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="p-4 flex items-center space-x-2 border-b">
        <Shield className="h-6 w-6 text-blue-600" />
        <span className="font-bold text-gray-900">Admin Panel</span>
      </div>
      <nav className="p-4 space-y-1">
        {navigation.map((item) => (
          <button
            key={item.name}
            onClick={() => {
              navigate(item.path);
              setSidebarOpen(false);
            }}
            className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              item.active
                ? "bg-blue-100 text-blue-900"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <item.icon
              className={`mr-3 h-5 w-5 ${
                item.active ? "text-blue-600" : ""
              }`}
            />
            {item.name}
            {item.active && <ChevronRight className="ml-auto h-4 w-4" />}
          </button>
        ))}
      </nav>
    </div>
  );

  const SystemStatus = () => (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      <h4 className="font-medium text-gray-900 mb-3">System Health</h4>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500 mr-2" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500 mr-2" />
            )}
            <span className="text-sm text-gray-600">Network</span>
          </div>
          <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Server className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-sm text-gray-600">Server</span>
          </div>
          <span className="text-sm font-medium text-green-600">Online</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-sm text-gray-600">Database</span>
          </div>
          <span className="text-sm font-medium text-green-600">Connected</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="h-4 w-4 text-yellow-500 mr-2" />
            <span className="text-sm text-gray-600">Uptime</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{metrics.systemUptime}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      <Sidebar />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 md:ml-0">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 md:hidden">
          <div className="px-4 py-4 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)}>
              
            </button>
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-blue-600 mr-2" />
              <span className="font-bold">Admin</span>
            </div>
            <div className="relative">
              <Bell className="h-6 w-6 text-gray-400" />
              {activeAlerts > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeAlerts}
                </span>
              )}
              </div>
              </div>
              </header>
              {/* Desktop Header */}
        <header className="hidden md:block bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1">Security Management Center</p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {currentTime.toLocaleTimeString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentTime.toLocaleDateString()}
                  </p>
                </div>
                  <div className="relative">
                  <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search guards, checkpoints..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>

                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
                </button>
                 <div className="relative">
                  <Bell className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
                  {activeAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {activeAlerts}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Time Range Filter */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-1 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {isOnline ? 'System Online' : 'System Offline'}
              </span>
            </div>
          </div>

          {showPhoneModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="bg-white rounded-lg w-full max-w-sm p-6 shadow-xl relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Contact {selectedGuardName}</h2>
        <button
          type="button"
          onClick={() => setShowPhoneModal(false)}
          className="text-gray-400 hover:text-gray-600 text-2xl font-light"
        >
          ×
        </button>
      </div>

      <div className="mb-4 text-center">
        <p className="text-gray-700 mb-2">Phone Number:</p>
        <p className="text-lg font-medium text-gray-900">{selectedGuardPhone}</p>
      </div>

      <div className="flex justify-around mt-4">
        <a
          href={`tel:${selectedGuardPhone}`}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Call
        </a>
        <button
          onClick={() => navigator.clipboard.writeText(selectedGuardPhone)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Copy
        </button>
      </div>
    </div>
  </div>
)}
     {showRouteModal && (
  <Dialog open={showRouteModal} onOpenChange={handleCloseModal}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Create New Patrol Route</DialogTitle>
        <DialogDescription>
          Define a new patrol route by naming it and assigning checkpoints.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Route Name */}
        <div>
          <label className="text-sm font-medium mb-2 block">Route Name *</label>
          <Input
            placeholder="Enter route name"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
          />
        </div>

        {/* Checkpoint Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Add Checkpoints *</label>
          {unselectedCheckpoints.length > 0 ? (
            <Select onValueChange={handleAddCheckpoint}>
              <SelectTrigger>
                <SelectValue placeholder="Select checkpoint to add" />
              </SelectTrigger>
              <SelectContent>
                {unselectedCheckpoints.map((cp) => (
                  <SelectItem key={cp.id} value={cp.id}>
                    {cp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-gray-500">All checkpoints have been added</p>
          )}
        </div>

        {/* Selected Checkpoints */}
        {selectedCheckpoints.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">
              Selected Checkpoints ({selectedCheckpoints.length})
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedCheckpoints.map((cp, index) => (
                <div
                  key={cp.id}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono bg-gray-200 px-1 rounded">
                      {index + 1}
                    </span>
                    <span className="text-sm">{cp.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveCheckpoint(cp.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
)}
          {/* Enhanced Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <MetricCard
              title="Total Guards"
              value={metrics.totalGuards}
              subtitle={`${metrics.activeGuards} active, ${metrics.onBreakGuards} on break`}
              icon={Users}
              color="blue"
              trend={5.2}
              onClick={() => navigate("/user")}
              loading={refreshing}
            />
            <MetricCard
              title="Active Patrols"
              value={metrics.activePatrols}
              subtitle={`${metrics.overduePatrols} overdue, ${metrics.completedPatrols} completed`}
              icon={Shield}
              color="green"
              trend={-2.1}
              onClick={() => navigate("/patrolLog")}
              loading={refreshing}
            />
            <MetricCard
              title="Attendance Rate"
              value={`${metrics.attendanceRate}%`}
              subtitle="Above target (90%)"
              icon={Clock}
              color="purple"
              trend={2.1}
              onClick={() => navigate("/attendance")}
              loading={refreshing}
            />
            <MetricCard
              title="Response Time"
              value={metrics.avgResponseTime}
              subtitle="Average response"
              icon={Timer}
              color="indigo"
              trend={-15.3}
              onClick={() => console.log("View response metrics")}
              loading={refreshing}
            />
          </div>
          {/* Enhanced Quick Actions */}
<div className="bg-white rounded-lg shadow p-6 border border-gray-200">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
    <Plus className="h-5 w-5 text-gray-400" />
  </div>
  <div className="grid grid-cols-2 gap-3">
    <QuickActionButton
      title="Add Guard"
      icon={Plus}
      onClick={() => setShowAddGuardModal(true)}
      color="blue"
    />
    <QuickActionButton
      title="New Route"
      icon={Navigation}
      color="green"
      onClick={() => setShowRouteModal(true)}
    />
    <QuickActionButton
      title="Live View"
      icon={Eye}
      color="purple"
      onClick={() => setShowLiveViewModal(true)}
    />
    <QuickActionButton
      title="Export Data"
      icon={Download}
      color="orange"
      onClick={() => console.log("Export reports")}
    />
  </div>
</div>

{/* Add Guard Modal */}
{showAddGuardModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Add New Guard</h2>
        <button
          type="button"
          onClick={() => {
            setShowAddGuardModal(false);
            setNewGuard({ name: '', email: '', phone: '', shift: '' });
            setValidationErrors({});
            setModalError('');
          }}
          className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          disabled={isSubmitting}
        >
          ×
        </button>
      </div>

      {/* Error Display */}
      {modalError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <div className="text-red-400 mt-0.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="ml-2 text-sm text-red-700">{modalError}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAddGuard();
        }}
        className="space-y-4"
      >
        {/* Full Name Field */}
        <div>
          <label htmlFor="guard-name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            id="guard-name"
            type="text"
            placeholder="Enter full name"
            className={`w-full border rounded-md px-3 py-2 text-sm transition-colors ${
              validationErrors.name 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            } focus:outline-none focus:ring-2`}
            value={newGuard.name}
            onChange={(e) => {
              setNewGuard({ ...newGuard, name: e.target.value });
              if (validationErrors.name) {
                setValidationErrors({ ...validationErrors, name: '' });
              }
              if (modalError) setModalError('');
            }}
            disabled={isSubmitting}
            required
          />
          {validationErrors.name && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.name}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="guard-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            id="guard-email"
            type="email"
            placeholder="Enter email address"
            className={`w-full border rounded-md px-3 py-2 text-sm transition-colors ${
              validationErrors.email 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            } focus:outline-none focus:ring-2`}
            value={newGuard.email}
            onChange={(e) => {
              setNewGuard({ ...newGuard, email: e.target.value });
              if (validationErrors.email) {
                setValidationErrors({ ...validationErrors, email: '' });
              }
              if (modalError) setModalError('');
            }}
            disabled={isSubmitting}
            required
          />
          {validationErrors.email && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.email}</p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label htmlFor="guard-phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            id="guard-phone"
            type="tel"
            placeholder="Enter phone number"
            className={`w-full border rounded-md px-3 py-2 text-sm transition-colors ${
              validationErrors.phone 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            } focus:outline-none focus:ring-2`}
            value={newGuard.phone}
            onChange={(e) => {
              setNewGuard({ ...newGuard, phone: e.target.value });
              if (validationErrors.phone) {
                setValidationErrors({ ...validationErrors, phone: '' });
              }
              if (modalError) setModalError('');
            }}
            disabled={isSubmitting}
            required
          />
          {validationErrors.phone && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.phone}</p>
          )}
        </div>

        {/* Shift Selection */}
        <div>
          <label htmlFor="guard-shift" className="block text-sm font-medium text-gray-700 mb-1">
            Assigned Shift *
          </label>
          <select
            id="guard-shift"
            className={`w-full border rounded-md px-3 py-2 text-sm transition-colors ${
              validationErrors.shift 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            } focus:outline-none focus:ring-2`}
            value={newGuard.shift}
            onChange={(e) => {
              setNewGuard({ ...newGuard, shift: e.target.value });
              if (validationErrors.shift) {
                setValidationErrors({ ...validationErrors, shift: '' });
              }
              if (modalError) setModalError('');
            }}
            disabled={isSubmitting}
            required
          >
            <option value="">Select a shift</option>
            <option value="morning">Morning (0600 AM - 1800 PM)</option>
            <option value="night">Night (1800 PM - 0600 AM)</option>
          </select>
          {validationErrors.shift && (
            <p className="mt-1 text-xs text-red-600">{validationErrors.shift}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              setShowAddGuardModal(false);
              setNewGuard({ name: '', email: '', phone: '', shift: '' });
              setValidationErrors({});
              setModalError('');
            }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              'Add Guard'
            )}
          </button>
        </div>
      </form>

      {/* Helper Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <p className="text-xs text-blue-700">
          <strong>Note:</strong> The guard will receive login credentials via email after successful creation.
        </p>
      </div>
    </div>
  </div>
)}

{/* Live View Modal */}
{showLiveViewModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="bg-white rounded-lg w-full max-w-4xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">👀 Live Guard Status</h2>
        <button
          type="button"
          onClick={() => setShowLiveViewModal(false)}
          className="text-gray-400 hover:text-gray-600 text-2xl font-light"
        >
          ×
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Guard</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Last Checkpoint</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {guards.length > 0 ? (
              guards.map((g) => (
                <tr key={g.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{g.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{g.lastCheckpoint || "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {g.lastSeen ? new Date(g.lastSeen).toLocaleString() : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {g.isActive ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Offline
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No guard data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

{/* Enhanced Critical Alerts */}
<div className="bg-white rounded-lg shadow p-6 border border-gray-200">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-900">Critical Alerts</h3>
    <div className="flex items-center space-x-2">
      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
        {overduePatrols.length} Critical
      </span>
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
    </div>
  </div>

  <div className="space-y-3 max-h-64 overflow-y-auto">
    {overduePatrols.map((patrol, index) => (
      <div
        key={index}
        className={`p-3 rounded-lg border-l-4 ${
          patrol.severity === "high"
            ? "bg-red-50 border-red-500"
            : "bg-yellow-50 border-yellow-500"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className={`font-medium ${
                patrol.severity === "high" ? "text-red-900" : "text-yellow-900"
              }`}
            >
              {patrol.guard}
            </p>
            <p
              className={`text-sm ${
                patrol.severity === "high" ? "text-red-700" : "text-yellow-700"
              }`}
            >
              {patrol.checkpoint}
            </p>
            <p className="text-xs text-gray-500">Last seen: {patrol.lastSeen}</p>
          </div>
          <div className="text-right">
            <p
              className={`text-sm font-bold ${
                patrol.severity === "high" ? "text-red-900" : "text-yellow-900"
              }`}
            >
              {patrol.overdue}
            </p>
            <p
              className={`text-xs ${
                patrol.severity === "high" ? "text-red-600" : "text-yellow-600"
              }`}
            >
              overdue
            </p>
          </div>
        </div>

        <div className="mt-3 flex space-x-2">
          <button
            onClick={() => openPhoneModal(patrol)}
            className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Show Phone
          </button>
          <button className="flex-1 px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors">
            Send Backup
          </button>
        </div>
      </div>
    ))}
  </div>
</div>

{/* Active Guards Status */}
<div className="bg-white rounded-lg shadow p-6 border border-gray-200">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-900">Active Guards</h3>
    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
      {metrics.activeGuards} Online
    </span>
  </div>

  <div className="space-y-3 max-h-64 overflow-y-auto">
    {activeGuardsList.map((guard, index) => (
      <div
        key={index}
        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
      >
        <div className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full mr-3 ${
              guard.status === "patrolling"
                ? "bg-green-500 animate-pulse"
                : guard.status === "stationed"
                ? "bg-blue-500"
                : "bg-yellow-500"
            }`}
          ></div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{guard.name}</p>
            <p className="text-xs text-gray-600">{guard.location}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                guard.status === "patrolling"
                  ? "bg-green-100 text-green-800"
                  : guard.status === "stationed"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {guard.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Battery: {guard.battery}%</p>
        </div>
      </div>
    ))}

    <button className="w-full mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm">
      View All Guards
    </button>
  </div>
</div>

{/* Enhanced Recent Activity */}
<div className="bg-white rounded-lg shadow border border-gray-200">
  {/* Header */}
  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
    <h3 className="text-lg font-semibold text-gray-900">
      Real-time Activity Feed
    </h3>
    <div className="flex items-center space-x-2">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span className="text-sm text-green-600 font-medium">Live</span>
      <button
        onClick={() => navigate("/reports")}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-4"
      >
        View All
      </button>
    </div>
  </div>

  {/* Activity List */}
  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
    {recentActivity.length > 0 ? (
      recentActivity.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))
    ) : (
      <div className="p-4 text-center text-sm text-gray-500">
        No recent activity yet
      </div>
    )}
  </div>
</div>
</main>
</div>
</div>
  )};

export default AdminDashboard;