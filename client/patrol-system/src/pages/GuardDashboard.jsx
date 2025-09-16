import React, { useState, useEffect } from 'react';
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
  BatteryLow
} from 'lucide-react';

const GuardDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(true);
  const [currentPatrolStatus, setCurrentPatrolStatus] = useState('pending');
  const [shiftStartTime] = useState(new Date(Date.now() - 4 * 60 * 60 * 1000));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const guardInfo = {
    name: 'John Smith',
    id: 'GRD-001',
    shift: 'Day Shift',
    shiftTime: '06:00 - 18:00',
    location: 'Building A - Main Entrance',
    avatar: 'JS'
  };

  const todayStats = {
    checkInTime: '06:05 AM',
    patrolsCompleted: 3,
    patrolsPending: 2,
    checkpointsVisited: 8,
    hoursWorked: 4.2,
    incidentsReported: 0,
    efficiency: 92
  };

  const assignedCheckpoints = [
    { id: 1, name: 'Main Entrance', status: 'completed', lastVisit: '10:30 AM', nextDue: '11:30 AM', priority: 'high' },
    { id: 2, name: 'Parking Lot A', status: 'pending', lastVisit: '09:15 AM', nextDue: '11:15 AM', priority: 'medium' },
    { id: 3, name: 'Building C Entrance', status: 'overdue', lastVisit: '08:45 AM', nextDue: '10:45 AM', priority: 'high' },
    { id: 4, name: 'Loading Bay', status: 'completed', lastVisit: '10:00 AM', nextDue: '12:00 PM', priority: 'low' },
    { id: 5, name: 'Emergency Exit B', status: 'pending', lastVisit: '08:30 AM', nextDue: '11:30 AM', priority: 'medium' }
  ];

  const recentPatrols = [
    { id: 1, checkpoint: 'Main Entrance', time: '10:30 AM', status: 'completed', duration: '5 min', issues: 0 },
    { id: 2, checkpoint: 'Loading Bay', time: '10:00 AM', status: 'completed', duration: '7 min', issues: 0 },
    { id: 3, checkpoint: 'Parking Lot B', time: '09:30 AM', status: 'completed', duration: '6 min', issues: 1 },
    { id: 4, checkpoint: 'Building A Lobby', time: '09:00 AM', status: 'completed', duration: '4 min', issues: 0 }
  ];

  const notifications = [
    { id: 1, message: 'Patrol overdue at Building C Entrance', type: 'warning', time: '5 min ago', priority: 'high' },
    { id: 2, message: 'Shift ends in 2 hours', type: 'info', time: '10 min ago', priority: 'medium' },
    { id: 3, message: 'New patrol route assigned', type: 'info', time: '1 hour ago', priority: 'low' },
    { id: 4, message: 'Weather alert: Heavy rain expected', type: 'info', time: '1 hour ago', priority: 'medium' }
  ];

  const getShiftProgress = () => {
    const now = new Date();
    const shiftDuration = 12 * 60 * 60 * 1000;
    const elapsed = now - shiftStartTime;
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

  const handleEmergency = () => {
    setEmergencyMode(true);
    // In real implementation, this would trigger emergency protocols
    alert('Emergency mode activated! Supervisor notified.');
    setTimeout(() => setEmergencyMode(false), 5000);
  };

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
    </div>
  );

  const QuickActionCard = ({ title, subtitle, icon: Icon, color = 'blue', onClick, disabled = false, pulse = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-6 bg-white border-2 rounded-lg shadow hover:shadow-md transition-all duration-200 text-left ${
        disabled 
          ? 'border-gray-200 opacity-50 cursor-not-allowed' 
          : `border-${color}-200 hover:border-${color}-300`
      } ${pulse ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className={`p-3 bg-${color}-100 rounded-full mb-4 inline-block`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
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
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
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
          <a href="#" className="flex items-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg">
            <Activity className="h-5 w-5 mr-3" />
            Dashboard
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Clock className="h-5 w-5 mr-3" />
            Attendance
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Route className="h-5 w-5 mr-3" />
            Patrol Logs
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <MapIcon className="h-5 w-5 mr-3" />
            Checkpoints
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <FileText className="h-5 w-5 mr-3" />
            Reports
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Calendar className="h-5 w-5 mr-3" />
            Schedule
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Settings className="h-5 w-5 mr-3" />
            Settings
          </a>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <SystemStatus />
        </div>
      </nav>
    </div>
  );

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
            <Bell className="h-6 w-6 text-gray-400" />
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
              
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.filter(n => n.type === 'warning').length}
                </span>
              </div>
              
              <button className="flex items-center text-gray-600 hover:text-gray-900" title="Logout">
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
          <div className={`mb-6 p-4 rounded-lg border-2 ${isCheckedIn ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`h-4 w-4 rounded-full mr-3 ${isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <div>
                  <p className={`font-semibold ${isCheckedIn ? 'text-green-900' : 'text-red-900'}`}>
                    {isCheckedIn ? 'On Duty' : 'Off Duty'}
                  </p>
                  <p className={`text-sm ${isCheckedIn ? 'text-green-700' : 'text-red-700'}`}>
                    {isCheckedIn 
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
                    <div className="absolute right-0 top-0 h-full w-1 bg-white rounded-full opacity-50"></div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">{Math.round(getShiftProgress())}% Complete</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <QuickActionCard
              title={isCheckedIn ? "Check Out" : "Check In"}
              subtitle={isCheckedIn ? "End your shift" : "Start your shift"}
              icon={isCheckedIn ? Square : Play}
              color={isCheckedIn ? "red" : "green"}
              onClick={() => setIsCheckedIn(!isCheckedIn)}
            />
            
            <QuickActionCard
              title="Start Patrol"
              subtitle="Begin checkpoint patrol"
              icon={Route}
              color="blue"
              onClick={() => setCurrentPatrolStatus('active')}
              disabled={!isCheckedIn || currentPatrolStatus === 'active'}
              pulse={assignedCheckpoints.some(c => c.status === 'overdue')}
            />
            
            <QuickActionCard
              title="Report Issue"
              subtitle="Log incident/observation"
              icon={Camera}
              color="purple"
              onClick={() => console.log('Report issue')}
            />
            
            <QuickActionCard
              title="Emergency"
              subtitle="Get immediate help"
              icon={emergencyMode ? Zap : AlertCircle}
              color="red"
              onClick={handleEmergency}
              pulse={emergencyMode}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Today's Performance */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Today's Performance</h3>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor('high')}`}>
                    {todayStats.efficiency}% Efficiency
                  </div>
                </div>
                
                <div className="space-y-4">
                  <StatCard 
                    label="Hours Worked" 
                    value={todayStats.hoursWorked.toFixed(1)} 
                    sublabel="of 12 hours"
                    color="blue"
                    icon={Timer}
                    trend={5}
                  />
                  <StatCard 
                    label="Patrols Completed" 
                    value={todayStats.patrolsCompleted} 
                    sublabel={`${todayStats.patrolsPending} pending`}
                    color="green"
                    icon={CheckCircle}
                  />
                  <StatCard 
                    label="Checkpoints Visited" 
                    value={todayStats.checkpointsVisited} 
                    sublabel="All locations covered"
                    color="purple"
                    icon={MapPin}
                  />
                  <StatCard 
                    label="Incidents Reported" 
                    value={todayStats.incidentsReported} 
                    sublabel="No issues today"
                    color="yellow"
                    icon={FileText}
                  />
                </div>
              </div>
            </div>

            {/* Assigned Checkpoints */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Priority Checkpoints</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {assignedCheckpoints.filter(c => c.status === 'overdue').length} overdue
                    </span>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {assignedCheckpoints
                    .sort((a, b) => {
                      const priority = { high: 3, medium: 2, low: 1 };
                      const status = { overdue: 4, pending: 3, active: 2, completed: 1 };
                      return (priority[b.priority] + status[b.status]) - (priority[a.priority] + status[a.status]);
                    })
                    .map((checkpoint) => {
                      const StatusIcon = getStatusIcon(checkpoint.status);
                      return (
                        <div key={checkpoint.id} className={`p-4 rounded-lg border-l-4 ${getStatusColor(checkpoint.status)} 
                          ${checkpoint.priority === 'high' ? 'border-l-red-500' : 
                            checkpoint.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <StatusIcon className="h-5 w-5 mr-3" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{checkpoint.name}</h4>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(checkpoint.priority)}`}>
                                    {checkpoint.priority}
                                  </span>
                                </div>
                                <p className="text-sm opacity-75">Last visit: {checkpoint.lastVisit}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">Next Due</p>
                              <p className="text-sm">{checkpoint.nextDue}</p>
                            </div>
                          </div>
                          
                          {checkpoint.status === 'pending' && (
                            <button className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                              Start Patrol
                            </button>
                          )}
                          
                          {checkpoint.status === 'overdue' && (
                            <button className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium animate-pulse">
                              Urgent - Patrol Now
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Patrol History */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Patrols</h3>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All
                </button>
              </div>
              
              <div className="space-y-3">
                {recentPatrols.map((patrol) => (
                  <div key={patrol.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{patrol.checkpoint}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{patrol.time}</span>
                          {patrol.issues > 0 && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                              {patrol.issues} issue{patrol.issues !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{patrol.duration}</span>
                      <p className="text-xs text-green-600">Completed</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Notifications */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center space-x-2">
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                    {notifications.filter(n => n.type === 'warning').length} Alert
                  </span>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notifications
                  .sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                  })
                  .map((notification) => (
                    <div key={notification.id} className={`p-3 rounded-lg border ${
                      notification.type === 'warning' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-blue-50 border-blue-200'
                    } ${notification.priority === 'high' ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}>
                      <div className="flex items-start">
                        <div className={`p-1 rounded-full mr-3 ${
                          notification.type === 'warning' 
                            ? 'bg-red-100' 
                            : 'bg-blue-100'
                        }`}>
                          {notification.type === 'warning' ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Bell className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              notification.type === 'warning' 
                                ? 'text-red-900' 
                                : 'text-blue-900'
                            }`}>
                              {notification.message}
                            </p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${getPriorityColor(notification.priority)}`}>
                              {notification.priority}
                            </span>
                          </div>
                          <p className={`text-xs ${
                            notification.type === 'warning' 
                              ? 'text-red-600' 
                              : 'text-blue-600'
                          }`}>
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Enhanced Shift Summary */}
          <div className="mt-8 bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Current Shift Overview</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className={`text-sm font-medium ${isCheckedIn ? 'text-green-600' : 'text-gray-500'}`}>
                  {isCheckedIn ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-full inline-block mb-3">
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Shift Duration</p>
                <p className="text-xl font-bold text-gray-900">{guardInfo.shiftTime}</p>
                <p className="text-xs text-blue-600">12 hours total</p>
              </div>
              
              <div className="text-center">
                <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-full inline-block mb-3">
                  <MapPin className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Primary Location</p>
                <p className="text-xl font-bold text-gray-900">Building A</p>
                <p className="text-xs text-green-600">Main assignment</p>
              </div>
              
              <div className="text-center">
                <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-full inline-block mb-3">
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                <p className="text-xl font-bold text-gray-900">{todayStats.patrolsCompleted}/5</p>
                <p className="text-xs text-purple-600">{Math.round((todayStats.patrolsCompleted/5)*100)}% complete</p>
              </div>
              
              <div className="text-center">
                <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-4 rounded-full inline-block mb-3">
                  <Activity className="h-8 w-8 text-yellow-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Performance</p>
                <p className="text-xl font-bold text-gray-900">{todayStats.efficiency}%</p>
                <p className="text-xs text-yellow-600">Above average</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Daily Progress</span>
                <span className="text-sm text-gray-500">{Math.round(getShiftProgress())}% of shift completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 h-4 rounded-full transition-all duration-1000 relative"
                  style={{ width: `${getShiftProgress()}%` }}
                >
                  <div className="absolute inset-0 bg-white bg-opacity-20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Shift Start</span>
                <span>Current Time</span>
                <span>Shift End</span>
              </div>
            </div>
          </div>

          {/* Weather & Environmental Info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Today's Date</p>
                  <p className="font-semibold text-gray-900">{currentTime.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">System Status</p>
                  <p className="font-semibold text-green-600">All Systems Online</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-center">
                <div className="bg-purple-100 p-2 rounded-full mr-3">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Supervisor</p>
                  <p className="font-semibold text-gray-900">Mike Johnson</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )};
  export default GuardDashboard;