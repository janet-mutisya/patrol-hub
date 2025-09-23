import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Calendar,
  RefreshCw,
  AlertTriangle,
  Shield,
  Sun,
  Moon,
  Timer,
  Navigation,
  Users,
  FileDown,
  Eye,
  UserX,
  BarChart3,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  MapIcon,
  Building
} from 'lucide-react';

// Constants
const MAX_CHECKPOINT_DISTANCE = 100; // meters
const ROLES = {
  GUARD: 'guard',
  ADMIN: 'admin'
};

// Utility functions
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
      typeof lat2 !== 'number' || typeof lon2 !== 'number') {
    console.error('Invalid coordinates provided to calculateDistance');
    return Infinity;
  }
  
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

const findNearestCheckpoint = (userLocation, checkpoints) => {
  if (!checkpoints || checkpoints.length === 0) {
    return null;
  }

  let nearest = null;
  let minDistance = Infinity;

  checkpoints.forEach(checkpoint => {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      checkpoint.latitude,
      checkpoint.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...checkpoint, distance };
    }
  });

  return nearest;
};

const getCurrentShift = () => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'Day' : 'Night';
};

const formatTime = (dateString) => {
  if (!dateString) return 'Not available';
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'present': return 'bg-green-100 text-green-800';
    case 'absent': return 'bg-red-100 text-red-800';
    case 'late': return 'bg-yellow-100 text-yellow-800';
    case 'checked_in': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const AttendanceSystem = ({ 
  checkpoints = [], 
  authToken = null,
  userRole = ROLES.GUARD,
  userId = null,
  apiBaseUrl = '/api' 
}) => {
  // State variables
  const [attendanceStatus, setAttendanceStatus] = useState({
    isCheckedIn: false,
    checkInTime: null,
    checkOutTime: null,
    shift: null
  });
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearestCheckpoint, setNearestCheckpoint] = useState(null);
  const [loading, setLoading] = useState({
    status: false,
    action: false,
    location: false,
    history: false,
    admin: false
  });
  
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [currentShift, setCurrentShift] = useState(getCurrentShift());
  
  // Admin state
  const [activeTab, setActiveTab] = useState('status');
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [activeGuards, setActiveGuards] = useState([]);
  const [dailyStats, setDailyStats] = useState(null);
  const [allCheckins, setAllCheckins] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0
  });
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    guardId: '',
    status: ''
  });

  // API call utility
  const makeApiCall = async (endpoint, options = {}) => {
    const { method = 'GET', body = null, ...otherOptions } = options;
    
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        ...otherOptions.headers
      },
      ...otherOptions
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${apiBaseUrl}/attendance${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  // Notification function
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Get current location
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      setLoading(prev => ({ ...prev, location: true }));

      const timeoutId = setTimeout(() => {
        setLoading(prev => ({ ...prev, location: false }));
        reject(new Error('Location request timed out'));
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          };
          
          setCurrentLocation(location);
          setLoading(prev => ({ ...prev, location: false }));

          if (checkpoints.length > 0) {
            const nearest = findNearestCheckpoint(location, checkpoints);
            setNearestCheckpoint(nearest);
          }
          
          resolve(location);
        },
        (error) => {
          clearTimeout(timeoutId);
          setLoading(prev => ({ ...prev, location: false }));
          
          let message = 'Location access failed';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
            default:
              message = `Location error: ${error.message}`;
          }
          
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000
        }
      );
    });
  }, [checkpoints]);

  // Fetch attendance status
  const fetchAttendanceStatus = useCallback(async () => {
    if (!authToken) return;

    setLoading(prev => ({ ...prev, status: true }));
    setError(null);

    try {
      const data = await makeApiCall('/status');
      setAttendanceStatus({
        isCheckedIn: data.isCheckedIn || false,
        checkInTime: data.checkInTime || null,
        checkOutTime: data.checkOutTime || null,
        shift: data.shift || null
      });
    } catch (err) {
      console.error('Fetch attendance status error:', err);
      setError('Failed to load attendance status: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, status: false }));
    }
  }, [authToken, apiBaseUrl]);

  // Fetch attendance history
  const fetchAttendanceHistory = useCallback(async (page = 1) => {
    if (!authToken) return;

    setLoading(prev => ({ ...prev, history: true }));

    try {
      const data = await makeApiCall(`/history?page=${page}&limit=${pagination.limit}`);
      setAttendanceHistory(data.data || []);
      setPagination(prev => ({
        ...prev,
        page: data.pagination?.page || page,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || 0
      }));
    } catch (err) {
      console.error('Fetch history error:', err);
      setError('Failed to load attendance history: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, history: false }));
    }
  }, [authToken, apiBaseUrl, pagination.limit]);

  // Admin functions
  const fetchActiveGuards = useCallback(async () => {
    if (!authToken || userRole !== ROLES.ADMIN) return;

    setLoading(prev => ({ ...prev, admin: true }));

    try {
      const data = await makeApiCall('/active-guards');
      setActiveGuards(data.guards || []);
    } catch (err) {
      console.error('Fetch active guards error:', err);
      setError('Failed to load active guards: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, admin: false }));
    }
  }, [authToken, userRole, apiBaseUrl]);

  const fetchAllCheckins = useCallback(async (page = 1) => {
    if (!authToken || userRole !== ROLES.ADMIN) return;

    setLoading(prev => ({ ...prev, admin: true }));

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.date && { date: filters.date }),
        ...(filters.guardId && { guard_id: filters.guardId })
      });

      const data = await makeApiCall(`/checkins?${params}`);
      setAllCheckins(data.data || []);
      setPagination(prev => ({
        ...prev,
        page: data.pagination?.page || page,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || 0
      }));
    } catch (err) {
      console.error('Fetch all checkins error:', err);
      setError('Failed to load check-ins: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, admin: false }));
    }
  }, [authToken, userRole, apiBaseUrl, pagination.limit, filters]);

  const fetchDailyStats = useCallback(async () => {
    if (!authToken || userRole !== ROLES.ADMIN) return;

    try {
      const data = await makeApiCall('/stats');
      setDailyStats(data.stats);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  }, [authToken, userRole, apiBaseUrl]);

  const handleMarkAbsent = async () => {
    if (userRole !== ROLES.ADMIN) return;

    setLoading(prev => ({ ...prev, admin: true }));

    try {
      await makeApiCall('/mark-absent', { method: 'POST' });
      showNotification('Absent guards marked successfully!', 'success');
      fetchActiveGuards();
      fetchDailyStats();
    } catch (err) {
      showNotification('Failed to mark absent guards: ' + err.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, admin: false }));
    }
  };

  const handleExportReport = async (format = 'csv') => {
    if (userRole !== ROLES.ADMIN) return;

    try {
      const response = await fetch(
        `${apiBaseUrl}/attendance/export?date=${filters.date}&format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${filters.date}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);

      showNotification(`Report exported as ${format.toUpperCase()}!`, 'success');
    } catch (err) {
      showNotification('Export failed: ' + err.message, 'error');
    }
  };

  // Handle check-in
  const handleCheckIn = useCallback(async () => {
    if (!authToken) {
      setError('Authentication token is required');
      return;
    }

    setLoading(prev => ({ ...prev, action: true }));
    setError(null);

    try {
      const location = await getCurrentLocation();
      const nearest = findNearestCheckpoint(location, checkpoints);
      
      if (!nearest) {
        throw new Error('No checkpoint found nearby. Please ensure you are within range of a checkpoint.');
      }

      if (nearest.distance > MAX_CHECKPOINT_DISTANCE) {
        throw new Error(`You are ${Math.round(nearest.distance)}m away from the nearest checkpoint "${nearest.name}". Please move closer (within ${MAX_CHECKPOINT_DISTANCE}m).`);
      }

      const payload = {
        latitude: location.latitude,
        longitude: location.longitude,
        checkpoint_id: nearest.id
      };

      const response = await makeApiCall('/check-in', {
        method: 'POST',
        body: payload
      });

      setAttendanceStatus(prev => ({
        ...prev,
        isCheckedIn: true,
        checkInTime: response.checkInTime,
        shift: response.shift
      }));

      showNotification(
        `Successfully checked in at ${nearest.name}! Distance: ${Math.round(nearest.distance)}m`,
        'success'
      );

    } catch (err) {
      console.error('Check-in error:', err);
      setError(err.message);
      showNotification(err.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, [authToken, checkpoints, getCurrentLocation, apiBaseUrl]);

  // Handle check-out
  const handleCheckOut = useCallback(async () => {
    if (!authToken) {
      setError('Authentication token is required');
      return;
    }

    setLoading(prev => ({ ...prev, action: true }));
    setError(null);

    try {
      let location = currentLocation;
      
      if (!location) {
        location = await getCurrentLocation();
      }

      const payload = {
        latitude: location.latitude,
        longitude: location.longitude
      };

      const response = await makeApiCall('/check-out', {
        method: 'POST',
        body: payload
      });

      setAttendanceStatus(prev => ({
        ...prev,
        isCheckedIn: false,
        checkOutTime: response.checkOutTime
      }));

      showNotification(
        `Successfully checked out! Total hours worked: ${response.total_hours || 'N/A'}`,
        'success'
      );

    } catch (err) {
      console.error('Check-out error:', err);
      setError(err.message);
      showNotification(err.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, [authToken, currentLocation, getCurrentLocation, apiBaseUrl]);

  // Initial load and updates
  useEffect(() => {
    setCurrentShift(getCurrentShift());
    
    if (authToken) {
      fetchAttendanceStatus();
      
      if (userRole === ROLES.GUARD) {
        fetchAttendanceHistory();
        getCurrentLocation().catch(err => {
          console.warn('Unable to get initial location:', err.message);
        });
      } else if (userRole === ROLES.ADMIN) {
        fetchActiveGuards();
        fetchDailyStats();
        fetchAllCheckins();
      }
    }

    const shiftInterval = setInterval(() => {
      setCurrentShift(getCurrentShift());
    }, 60000);

    return () => clearInterval(shiftInterval);
  },[]);

  useEffect(() => {
    if (currentLocation && checkpoints.length > 0) {
      const nearest = findNearestCheckpoint(currentLocation, checkpoints);
      setNearestCheckpoint(nearest);
    }
  }, [currentLocation, checkpoints]);

  if (!authToken) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Authentication token is required to use the attendance system.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Attendance System
            <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs uppercase">
              {userRole}
            </Badge>
          </h1>
          <p className="text-gray-600 mt-1">
            {userRole === ROLES.ADMIN ? 'Monitor and manage attendance' : 'Track your work hours and attendance status'}
          </p>
        </div>

        {/* Admin Tabs */}
        {userRole === ROLES.ADMIN && (
          <div className="flex gap-2 bg-white rounded-lg p-1 border">
            <Button
              variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={activeTab === 'guards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('guards')}
              className="flex items-center gap-1"
            >
              <Users className="h-4 w-4" />
              Active Guards
            </Button>
            <Button
              variant={activeTab === 'checkins' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('checkins')}
              className="flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              All Check-ins
            </Button>
          </div>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <Alert className={notification.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CheckCircle className={`h-4 w-4 ${notification.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
          <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Admin Dashboard */}
      {userRole === ROLES.ADMIN && activeTab === 'dashboard' && dailyStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Guards</p>
                  <p className="text-2xl font-bold text-gray-900">{dailyStats.total_active_guards}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Check-ins</p>
                  <p className="text-2xl font-bold text-green-600">{dailyStats.todays_checkins}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Currently Active</p>
                  <p className="text-2xl font-bold text-blue-600">{dailyStats.currently_active}</p>
                </div>
                <Timer className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{dailyStats.attendance_rate}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card className="md:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={handleMarkAbsent}
                  disabled={loading.admin}
                  className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
                >
                  <UserX className="h-4 w-4" />
                  Mark Absent Guards
                </Button>

                <Button
                  onClick={() => handleExportReport('csv')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export CSV
                </Button>

                <Button
                  onClick={() => handleExportReport('xlsx')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Export Excel
                </Button>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Date:</label>
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                    className="px-3 py-1 border rounded-md text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Guards View (Admin) */}
      {userRole === ROLES.ADMIN && activeTab === 'guards' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Currently Active Guards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading.admin ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-gray-500">Loading active guards...</p>
              </div>
            ) : activeGuards.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No guards currently active</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeGuards.map((guard) => (
                  <div key={guard.id} className="flex items-center justify-between p-4 bg-white border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{guard.name}</h3>
                        <p className="text-sm text-gray-600">Badge: {guard.badge_number}</p>
                        <p className="text-xs text-gray-500">
                          Checked in: {formatTime(guard.checkInTime)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-800 mb-2">
                        {guard.shift} Shift
                      </Badge>
                      {guard.location && (
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <MapIcon className="h-3 w-3" />
                          {guard.location.place_name || 'Location available'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Check-ins View (Admin) */}
      {userRole === ROLES.ADMIN && activeTab === 'checkins' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                All Check-ins
              </span>
              <Button
                onClick={() => fetchAllCheckins(pagination.page)}
                disabled={loading.admin}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading.admin ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading.admin ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-gray-500">Loading check-ins...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Guard</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Date</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Check-in</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Check-out</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Status</th>
                        <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allCheckins.map((checkin, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-3">
                            <div>
                              <p className="font-medium">{checkin.guard_name}</p>
                              <p className="text-sm text-gray-600">{checkin.badge_number}</p>
                            </div>
                          </td>
                          <td className="border border-gray-200 px-4 py-3">
                            {formatDate(checkin.date)}
                          </td>
                          <td className="border border-gray-200 px-4 py-3">
                            {formatTime(checkin.checkInTime)}
                          </td>
                          <td className="border border-gray-200 px-4 py-3">
                            {checkin.checkOutTime ? formatTime(checkin.checkOutTime) : '-'}
                          </td>
                          <td className="border border-gray-200 px-4 py-3">
                            <Badge className={getStatusColor(checkin.status)}>
                              {checkin.status}
                            </Badge>
                          </td>
                          <td className="border border-gray-200 px-4 py-3">
                            <div className="text-sm">
                              {checkin.location?.checkin?.place_name ? (
                                <div className="flex items-center gap-1">
                                  <MapIcon className="h-3 w-3" />
                                  <span className="truncate max-w-32" title={checkin.location.checkin.place_name}>
                                    {checkin.location.checkin.place_name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">No location</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for Admin Check-ins */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAllCheckins(pagination.page - 1)}
                        disabled={pagination.page === 1 || loading.admin}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAllCheckins(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages || loading.admin}
                      >
                        Next
                      </Button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                          <span className="font-medium">{pagination.totalPages}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchAllCheckins(pagination.page - 1)}
                          disabled={pagination.page === 1 || loading.admin}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchAllCheckins(pagination.page + 1)}
                          disabled={pagination.page === pagination.totalPages || loading.admin}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Guard Status Card (Always visible, but different layout for admin) */}
      {userRole === ROLES.GUARD  && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={`${
                      attendanceStatus.isCheckedIn 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    } flex items-center gap-1`}>
                      {attendanceStatus.isCheckedIn ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {attendanceStatus.isCheckedIn ? 'Checked In' : 'Checked Out'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-1">
                      {currentShift === 'Day' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      Current Shift:
                    </span>
                    <span className="font-medium text-blue-600">{currentShift}</span>
                  </div>
                  

                  {nearestCheckpoint && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Nearest Checkpoint:</span>
                        <span className="font-medium text-blue-600">
                          {nearestCheckpoint.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Distance:</span>
                        <span className={`font-medium flex items-center gap-1 ${
                          nearestCheckpoint.distance <= MAX_CHECKPOINT_DISTANCE ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <Navigation className="h-3 w-3" />
                          {Math.round(nearestCheckpoint.distance)}m
                          {nearestCheckpoint.distance <= MAX_CHECKPOINT_DISTANCE ? ' ✓' : ' (too far)'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Check-in Time:</span>
                    <span className="font-medium">{formatTime(attendanceStatus.checkInTime)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Check-out Time:</span>
                    <span className="font-medium">{formatTime(attendanceStatus.checkOutTime)}</span>
                  </div>
                  {attendanceStatus.shift && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Assigned Shift:</span>
                      <span className="font-medium">{attendanceStatus.shift}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Status */}
              {loading.location && (
                <div className="flex items-center justify-center py-2 text-blue-600">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Getting location...
                </div>
              )}

              {/* Checkpoints Status */}
              {checkpoints.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Available Checkpoints:</h4>
                  <div className="space-y-1">
                    {checkpoints.map(checkpoint => (
                      <div key={checkpoint.id} className="flex items-center justify-between text-sm">
                        <span className="text-blue-800 flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {checkpoint.name}
                        </span>
                        {currentLocation && (
                          <span className={`text-blue-600 ${
                            calculateDistance(
                              currentLocation.latitude,
                              currentLocation.longitude,
                              checkpoint.latitude,
                              checkpoint.longitude
                            ) <= MAX_CHECKPOINT_DISTANCE ? 'font-semibold' : ''
                          }`}>
                            {Math.round(calculateDistance(
                              currentLocation.latitude,
                              currentLocation.longitude,
                              checkpoint.latitude,
                              checkpoint.longitude
                            ))}m away
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {checkpoints.length === 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    No checkpoints available. Please contact your administrator.
                  </AlertDescription>
                </Alert>
              )}
               <div>
                 <Button
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    fetchAttendanceStatus();
                    if (userRole === ROLES.ADMIN) {
                      fetchDailyStats();
                      if (activeTab === 'guards') fetchActiveGuards();
                      if (activeTab === 'checkins') fetchAllCheckins();
                    } else {
                      fetchAttendanceHistory();
                    }
                    getCurrentLocation().catch(() => {});
                  }}
                  disabled={loading.action || loading.status}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading.status || loading.admin ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance History (Guard only or when admin not in dashboard) */}
      {userRole === ROLES.GUARD && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              My Attendance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading.history ? (
              <div className="text-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-gray-500">Loading attendance history...</p>
              </div>
            ) : !attendanceHistory || attendanceHistory.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No attendance history found</p>
                <p className="text-gray-400 text-sm mt-1">Your attendance records will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            Date
                          </div>
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-500" />
                            Check-in Time
                          </div>
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-500" />
                            Check-out Time
                          </div>
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                            Status
                          </div>
                        </th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <MapIcon className="h-4 w-4 text-purple-500" />
                            Location
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {attendanceHistory.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {formatDate(entry.date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {entry.checkInTime ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                {formatTime(entry.checkInTime)}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {entry.checkOutTime ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                {formatTime(entry.checkOutTime)}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge className={getStatusColor(entry.status)}>
                              {entry.status || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {entry.location?.checkin?.place_name ? (
                              <div className="max-w-32 truncate" title={entry.location.checkin.place_name}>
                                {entry.location.checkin.place_name}
                              </div>
                            ) : (
                              <span className="text-gray-400">No location</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for Guard History */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAttendanceHistory(pagination.page - 1)}
                        disabled={pagination.page === 1 || loading.history}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAttendanceHistory(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages || loading.history}
                      >
                        Next
                      </Button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                          <span className="font-medium">{pagination.totalPages}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchAttendanceHistory(pagination.page - 1)}
                          disabled={pagination.page === 1 || loading.history}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchAttendanceHistory(pagination.page + 1)}
                          disabled={pagination.page === pagination.totalPages || loading.history}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceSystem;