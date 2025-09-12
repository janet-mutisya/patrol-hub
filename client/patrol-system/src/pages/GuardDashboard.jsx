import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Clock,
  MapPin,
  Calendar,
  User,
  Bell,
  Activity,
  CheckCircle,
  AlertTriangle,
  Menu,
  X,
  Home,
  FileText,
  Navigation
} from 'lucide-react';

// Import your actual page components
import Shift from './shift.jsx';
import Checkpoint from './checkpoint.jsx';
import Attendance from './attendance.jsx';
import PatrolLog from './patrolLog.jsx';
import Report from './Report.jsx';

const GuardDashboard = ({ authToken, userRole = 'guard' }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock user data - replace with actual API call
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Mock API call - replace with actual implementation
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUser({
          name: 'John Smith',
          id: 'GRD001',
          shift: 'Day Shift',
          checkpoint: 'Main Gate',
          lastCheckIn: '08:00 AM'
        });
        
        // Mock notifications
        setNotifications([
          {
            id: 1,
            type: 'info',
            message: 'Your shift starts in 30 minutes',
            time: '30m ago'
          },
          {
            id: 2,
            type: 'success',
            message: 'Attendance logged successfully',
            time: '2h ago'
          }
        ]);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (authToken) {
      fetchUserData();
    }
  }, [authToken]);

  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Home,
      description: 'Dashboard home'
    },
    {
      id: 'shifts',
      label: 'My Shifts',
      icon: Clock,
      description: 'View shift schedules'
    },
    {
      id: 'checkpoints',
      label: 'Checkpoints',
      icon: MapPin,
      description: 'View assigned locations'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: CheckCircle,
      description: 'Track my attendance'
    },
    {
      id: 'patrol',
      label: 'Patrol Logs',
      icon: Navigation,
      description: 'Log patrol activities'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      description: 'Submit reports'
    }
  ];

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-full">
                  <Shield className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-amber-900">
                    Welcome back, {user?.name || 'Guard'}!
                  </h2>
                  <p className="text-amber-700">
                    Guard ID: {user?.id} | Ready for duty
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Quick Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current Shift:</span>
              <span className="font-medium">{user?.shift || 'Not assigned'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Checkpoint:</span>
              <span className="font-medium">{user?.checkpoint || 'None'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Check-in:</span>
              <span className="font-medium">{user?.lastCheckIn || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {navigationItems.slice(1).map((item) => {
              const IconComponent = item.icon;
              return (
                <Button
                  key={item.id}
                  variant="outline"
                  className="h-20 flex flex-col items-center gap-2 hover:bg-amber-50 hover:border-amber-300"
                  onClick={() => setActiveTab(item.id)}
                >
                  <IconComponent className="h-6 w-6 text-amber-600" />
                  <span className="text-xs text-center">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">8.5</p>
                <p className="text-sm text-gray-600">Hours Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Navigation className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">12</p>
                <p className="text-sm text-gray-600">Patrols Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700">3</p>
                <p className="text-sm text-gray-600">Reports Filed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'shifts':
        return <Shift authToken={authToken} userRole={userRole} />;
      case 'checkpoints':
        return <Checkpoint authToken={authToken} userRole={userRole} />;
      case 'attendance':
        return <Attendance authToken={authToken} userRole={userRole} />;
      case 'patrol':
        return <PatrolLog authToken={authToken} userRole={userRole} />;
      case 'reports':
        return <Report authToken={authToken} userRole={userRole} />;
      default:
        return renderOverview();
    }
  };

  if (!authToken) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Authentication required to access guard dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-amber-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Guard Portal</h1>
              <Badge className="bg-amber-100 text-amber-800 text-xs">
                {userRole.toUpperCase()}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  isActive 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                    : 'hover:bg-amber-50 hover:text-amber-700'
                }`}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
              >
                <IconComponent className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs opacity-70">{item.description}</div>
                </div>
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl font-bold text-gray-900 capitalize">
                  {activeTab === 'overview' ? 'Dashboard' : activeTab}
                </h2>
                <p className="text-sm text-gray-600">
                  {navigationItems.find(item => item.id === activeTab)?.description || 'Guard dashboard'}
                </p>
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-5 w-5 text-gray-400" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.name || 'Guard'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Area */}
        {notifications.length > 0 && (
          <div className="p-4 space-y-2">
            {notifications.map((notification) => (
              <Alert
                key={notification.id}
                className={`${
                  notification.type === 'success' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <Bell className={`h-4 w-4 ${
                  notification.type === 'success' ? 'text-green-600' : 'text-blue-600'
                }`} />
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    <span className={
                      notification.type === 'success' ? 'text-green-800' : 'text-blue-800'
                    }>
                      {notification.message}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {notification.time}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearNotification(notification.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Page Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default GuardDashboard;