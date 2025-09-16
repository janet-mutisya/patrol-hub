import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  FileText,
  Settings,
  Bell,
  Search,
  Plus,
  Calendar,
  TrendingUp,
  Eye,
  BarChart3,
  Navigation,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
  Server,
  Database,
  Zap,
  RefreshCw,
  Filter,
  Download,
  AlertCircle,
  ChevronRight,
  Timer,
  MapIcon,
  UserCheck,
  UserX,
  Pause,
  Play
} from 'lucide-react';

const AdminDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAlerts, setActiveAlerts] = useState(3);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedTimeRange, setSelectedTimeRange] = useState('today');
  const [refreshing, setRefreshing] = useState(false);

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

  // Enhanced mock data with more realistic metrics
  const metrics = {
    totalGuards: 24,
    activeGuards: 18,
    onBreakGuards: 3,
    totalCheckpoints: 12,
    activePatrols: 7,
    overduePatrols: 2,
    completedPatrols: 45,
    attendanceRate: 94.2,
    completionRate: 88.5,
    avgResponseTime: '3.2 min',
    incidentsToday: 2,
    systemUptime: 99.8
  };

  const recentActivity = [
    { id: 1, type: 'patrol', message: 'Guard John Smith completed patrol at Main Entrance', time: '2 min ago', status: 'success', guard: 'John Smith' },
    { id: 2, type: 'alert', message: 'Patrol overdue at Building C Entrance - 25 minutes', time: '15 min ago', status: 'warning', priority: 'high' },
    { id: 3, type: 'attendance', message: 'Guard Sarah Johnson checked in for night shift', time: '32 min ago', status: 'info', guard: 'Sarah Johnson' },
    { id: 4, type: 'checkpoint', message: 'New checkpoint "Loading Bay East" created', time: '1 hour ago', status: 'info' },
    { id: 5, type: 'patrol', message: 'Guard Mike Rodriguez started patrol route Alpha', time: '1 hour ago', status: 'info', guard: 'Mike Rodriguez' },
    { id: 6, type: 'incident', message: 'Security incident reported at Parking Lot B', time: '2 hours ago', status: 'error', priority: 'high' },
  ];

  const overduePatrols = [
    { guard: 'Alex Johnson', checkpoint: 'Parking Lot A', overdue: '25 min', severity: 'high', lastSeen: '10:30 AM', guardId: 'GRD-005' },
    { guard: 'Maria Rodriguez', checkpoint: 'Building C Entrance', overdue: '12 min', severity: 'medium', lastSeen: '10:43 AM', guardId: 'GRD-008' }
  ];

  const activeGuardsList = [
    { name: 'John Smith', location: 'Main Entrance', status: 'patrolling', battery: 85, lastUpdate: '1 min ago' },
    { name: 'Sarah Johnson', location: 'Building A', status: 'stationed', battery: 92, lastUpdate: '30 sec ago' },
    { name: 'Mike Rodriguez', location: 'Parking Lot C', status: 'patrolling', battery: 67, lastUpdate: '2 min ago' },
    { name: 'Emma Wilson', location: 'Loading Bay', status: 'break', battery: 78, lastUpdate: '15 min ago' }
  ];

  const navigation = [
    { name: 'Dashboard', icon: BarChart3, path: '/', active: true, color: 'blue' },
    { name: 'Guards Management', icon: Users, path: '/users', color: 'green' },
    { name: 'Attendance System', icon: Clock, path: '/attendance', color: 'purple' },
    { name: 'Checkpoints', icon: MapPin, path: '/checkpoints', color: 'yellow' },
    { name: 'Patrol Logs', icon: Shield, path: '/patrols', color: 'indigo' },
    { name: 'Shifts Management', icon: Calendar, path: '/shifts', color: 'pink' },
    { name: 'Reports', icon: FileText, path: '/reports', color: 'orange' },
    { name: 'Settings', icon: Settings, path: '/settings', color: 'gray' }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

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
          <p className={`text-3xl font-bold text-${color}-600 ${loading ? 'animate-pulse' : ''}`}>
            {loading ? '...' : value}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-4 bg-${color}-100 rounded-full`}>
          <Icon className={`h-8 w-8 text-${color}-600`} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <TrendingUp className={`h-4 w-4 mr-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}% from last week
          </span>
        </div>
      )}
    </div>
  );

  const QuickActionButton = ({ title, icon: Icon, onClick, color = 'blue', disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center p-4 bg-${color}-50 hover:bg-${color}-100 border-2 border-${color}-200 
        rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Icon className={`h-6 w-6 text-${color}-600 mr-2`} />
      <span className={`text-sm font-medium text-${color}-700`}>{title}</span>
    </button>
  );

  const ActivityItem = ({ activity }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'success': return 'text-green-600 bg-green-100';
        case 'warning': return 'text-yellow-600 bg-yellow-100';
        case 'error': return 'text-red-600 bg-red-100';
        default: return 'text-blue-600 bg-blue-100';
      }
    };

    const getIcon = (type) => {
      switch (type) {
        case 'patrol': return Shield;
        case 'alert': return AlertTriangle;
        case 'attendance': return Clock;
        case 'checkpoint': return MapPin;
        case 'incident': return AlertCircle;
        default: return Activity;
      }
    };

    const Icon = getIcon(activity.type);

    return (
      <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
        <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">{activity.message}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">{activity.time}</p>
            {activity.priority && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                activity.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {activity.priority}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const NavigationMenu = () => (
    <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
      w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out z-50 md:relative md:translate-x-0`}>
      
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-600 mr-2" />
            <span className="text-xl font-bold text-gray-900">SecureGuard</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 mt-6 px-2">
          <div className="space-y-1">
            {navigation.map((item) => (
              <button
                key={item.name}
                className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  item.active
                    ? `bg-${item.color}-100 text-${item.color}-900`
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`mr-3 h-5 w-5 ${item.active ? `text-${item.color}-600` : ''}`} />
                {item.name}
                {item.active && <ChevronRight className="ml-auto h-4 w-4" />}
              </button>
            ))}
          </div>
        </nav>

        <div className="border-t border-gray-200">
          <SystemStatus />
        </div>
        
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <button className="flex-shrink-0 w-full group block">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  A
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">Admin User</p>
                  <p className="text-xs text-gray-500">System Administrator</p>
                </div>
              </div>
              <LogOut className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      <NavigationMenu />
      
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
              <Menu className="h-6 w-6" />
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
                  <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
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

          {/* Enhanced Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <MetricCard
              title="Total Guards"
              value={metrics.totalGuards}
              subtitle={`${metrics.activeGuards} active, ${metrics.onBreakGuards} on break`}
              icon={Users}
              color="blue"
              trend={5.2}
              onClick={() => console.log('Navigate to guards')}
              loading={refreshing}
            />
            <MetricCard
              title="Active Patrols"
              value={metrics.activePatrols}
              subtitle={`${metrics.overduePatrols} overdue, ${metrics.completedPatrols} completed`}
              icon={Shield}
              color="green"
              trend={-2.1}
              onClick={() => console.log('Navigate to patrols')}
              loading={refreshing}
            />
            <MetricCard
              title="Attendance Rate"
              value={`${metrics.attendanceRate}%`}
              subtitle="Above target (90%)"
              icon={Clock}
              color="purple"
              trend={2.1}
              onClick={() => console.log('Navigate to attendance')}
              loading={refreshing}
            />
            <MetricCard
              title="Response Time"
              value={metrics.avgResponseTime}
              subtitle="Average response"
              icon={Timer}
              color="indigo"
              trend={-15.3}
              onClick={() => console.log('View response metrics')}
              loading={refreshing}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                  onClick={() => console.log('Add guard')}
                  color="blue"
                />
                <QuickActionButton
                  title="New Route"
                  icon={Navigation}
                  color="green"
                  onClick={() => console.log('New patrol route')}
                />
                <QuickActionButton
                  title="Live View"
                  icon={Eye}
                  color="purple"
                  onClick={() => console.log('Live monitoring')}
                />
                <QuickActionButton
                  title="Export Data"
                  icon={Download}
                  color="orange"
                  onClick={() => console.log('Export reports')}
                />
              </div>
            </div>

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
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    patrol.severity === 'high' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${patrol.severity === 'high' ? 'text-red-900' : 'text-yellow-900'}`}>
                          {patrol.guard}
                        </p>
                        <p className={`text-sm ${patrol.severity === 'high' ? 'text-red-700' : 'text-yellow-700'}`}>
                          {patrol.checkpoint}
                        </p>
                        <p className="text-xs text-gray-500">Last seen: {patrol.lastSeen}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${patrol.severity === 'high' ? 'text-red-900' : 'text-yellow-900'}`}>
                          {patrol.overdue}
                        </p>
                        <p className={`text-xs ${patrol.severity === 'high' ? 'text-red-600' : 'text-yellow-600'}`}>
                          overdue
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex space-x-2">
                      <button className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors">
                        Contact Guard
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
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        guard.status === 'patrolling' ? 'bg-green-500 animate-pulse' : 
                        guard.status === 'stationed' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{guard.name}</p>
                        <p className="text-xs text-gray-600">{guard.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          guard.status === 'patrolling' ? 'bg-green-100 text-green-800' :
                          guard.status === 'stationed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {guard.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Battery: {guard.battery}%
                      </p>
                    </div>
                  </div>
                ))}
                
                <button className="w-full mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm">
                  View All Guards
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Recent Activity */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Real-time Activity Feed</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">Live</span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-4">
                    View All
                  </button>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;