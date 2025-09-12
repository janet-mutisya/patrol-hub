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
  Download,
  Users,
  Navigation,
  Shield,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Timer
} from 'lucide-react';

// Missing utility functions that are referenced in the code
const calculateAttendanceStatus = (checkInTime, shiftName) => {
  // Add your logic here based on shift timing
  const hour = checkInTime.getHours();
  if (shiftName === 'Day') {
    if (hour >= 6 && hour <= 7) return 'present';
    if (hour > 7 && hour <= 9) return 'late';
    if (hour > 9) return 'toolate';
  } else {
    if (hour >= 18 && hour <= 19) return 'present';
    if (hour > 19 && hour <= 21) return 'late';
    if (hour > 21) return 'toolate';
  }
  return 'absent';
};

const getCurrentShift = () => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'Day' : 'Night';
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const getShiftTimes = (shiftName) => {
  if (shiftName === 'Day') {
    return { startHour: 6, endHour: 18 };
  } else {
    return { startHour: 18, endHour: 6 };
  }
};

// Missing components that are referenced but not defined
const ShiftInfoCard = ({ currentShift, assignedShift, status, onShiftRefresh }) => {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Current Shift Information
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onShiftRefresh}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Current Shift:</span>
            <span className="font-medium">{currentShift?.name || 'No active shift'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Assigned Shift:</span>
            <span className="font-medium">{assignedShift?.name || 'Not assigned'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StatusInsights = ({ status, history }) => {
  const totalDays = history.length;
  const presentDays = history.filter(h => h.status?.toLowerCase() === 'present').length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Attendance Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700">{attendanceRate}%</div>
            <div className="text-sm text-gray-600">Attendance Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-700">{totalDays}</div>
            <div className="text-sm text-gray-600">Total Days</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Attendance = ({ authToken = 'demo-token' }) => {
  const [status, setStatus] = useState('Ready');
  const [history, setHistory] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [assignedShift, setAssignedShift] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [error, setError] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distanceFromCheckpoint, setDistanceFromCheckpoint] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistoryPages, setTotalHistoryPages] = useState(1);
  const [notification, setNotification] = useState(null);
  const [role, setRole] = useState('guard');
  const [loadingRole, setLoadingRole] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);

  // Constants
  const GEOFENCE_RADIUS = 100; // 100 meters requirement
  const HISTORY_PAGE_SIZE = 10;

  // Show notification
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const toRad = (deg) => deg * (Math.PI / 180);
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // distance in meters
  }, []);

  // API utility function with authentication
  const makeApiCall = useCallback(async (endpoint, options = {}) => {
    if (!authToken) {
      throw new Error('Authentication token is required');
    }

    const defaultHeaders = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(endpoint, {
      headers: { ...defaultHeaders, ...options.headers },
      ...options
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse error response as JSON:', jsonError);
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }, [authToken]);

  // Get current location with improved error handling
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      setLoadingLocation(true);

      const timeoutId = setTimeout(() => {
        setLoadingLocation(false);
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
          
          console.log('Location obtained:', location);
          setCurrentLocation(location);
          setLoadingLocation(false);
          
          // Simulate distance calculation for demo
          const demoDistance = Math.random() * 150; // Random distance between 0-150m
          setDistanceFromCheckpoint(demoDistance);
          
          resolve(location);
        },
        (error) => {
          clearTimeout(timeoutId);
          setLoadingLocation(false);
          let message = 'Location access failed';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user. Please enable location permissions.';
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
          console.error('Geolocation error:', error);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000 // 1 minute
        }
      );
    });
  }, []);

  // Handle check-in
  const handleCheckIn = useCallback(async () => {
    console.log('Check-in button clicked');
    setLoadingAction(true);
    setError(null);

    try {
      // Get current location
      console.log('Getting location...');
      const location = await getCurrentLocation();
      console.log('Location obtained:', location);

      // Calculate distance (demo)
      const distance = distanceFromCheckpoint
        ? `${Math.round(distanceFromCheckpoint)}m`
        : 'N/A';

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update state
      const now = new Date();
      setCheckInTime(now);
      setStatus('Checked In');
      
      showNotification(`Checked in successfully! Distance: ${distance}`, 'success');
      console.log('Check-in completed successfully');

      // TODO: Replace with actual API call
      // await makeApiCall('/api/attendance/checkin', {
      //   method: 'POST',
      //   body: JSON.stringify({ 
      //     latitude: location.latitude, 
      //     longitude: location.longitude,
      //     timestamp: now.toISOString()
      //   })
      // });

    } catch (err) {
      console.error('Check-in error:', err);
      setError(err.message);
      showNotification(err.message, 'error');
    } finally {
      setLoadingAction(false);
    }
  }, [distanceFromCheckpoint, getCurrentLocation, makeApiCall, showNotification]);

  // Handle check-out
  const handleCheckOut = useCallback(async () => {
    console.log('Check-out button clicked');
    setLoadingAction(true);
    setError(null);

    try {
      if (!currentLocation) {
        await getCurrentLocation();
      }

      // Calculate distance (demo)
      const distance = distanceFromCheckpoint
        ? `${Math.round(distanceFromCheckpoint)}m`
        : 'N/A';

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update state
      const now = new Date();
      setCheckOutTime(now);
      setStatus('Checked Out');
      
      showNotification(`Checked out successfully! Distance: ${distance}`, 'success');
      console.log('Check-out completed successfully');

      // TODO: Replace with actual API call
      // await makeApiCall('/api/attendance/checkout', {
      //   method: 'POST',
      //   body: JSON.stringify({ 
      //     latitude: currentLocation.latitude, 
      //     longitude: currentLocation.longitude,
      //     timestamp: now.toISOString()
      //   })
      // });

    } catch (err) {
      console.error('Check-out error:', err);
      setError(err.message);
      showNotification(err.message, 'error');
    } finally {
      setLoadingAction(false);
    }
  }, [currentLocation, distanceFromCheckpoint, getCurrentLocation, makeApiCall, showNotification]);

  // Format time for display
  const formatTime = (date) => {
    if (!date) return 'Not checked in';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Simplified attendance interface
  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-8 w-8 text-amber-600" />
            Attendance Tracking
            {role && (
              <Badge className="ml-2 bg-amber-100 text-amber-800 text-xs">
                {role.toUpperCase()}
              </Badge>
            )}
          </h1>
          <p className="text-gray-600 mt-1">
            Track your work hours and attendance status
          </p>
        </div>
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

      {/* Current Status Card */}
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
                  <span className="text-gray-600">Current Status:</span>
                  <Badge className={`${
                    status === 'Checked In' ? 'bg-green-100 text-green-800' :
                    status === 'Checked Out' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  } flex items-center gap-1`}>
                    <CheckCircle className="h-3 w-3" />
                    {status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Shift:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Sun className="h-4 w-4" />
                    Day Shift
                  </span>
                </div>
                {distanceFromCheckpoint !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Distance from checkpoint:</span>
                    <span className="font-medium text-blue-600">
                      {Math.round(distanceFromCheckpoint)}m
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Check-in Time:</span>
                  <span className="font-medium">{formatTime(checkInTime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Check-out Time:</span>
                  <span className="font-medium">{formatTime(checkOutTime)}</span>
                </div>
              </div>
            </div>

            {/* Location Status */}
            {loadingLocation && (
              <div className="flex items-center justify-center py-2 text-blue-600">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Getting location...
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t">
              {/* Check In Button */}
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50"
                onClick={handleCheckIn}
                disabled={loadingAction || status === 'Checked In'}
              >
                <MapPin className="h-4 w-4" />
                {loadingAction && status !== 'Checked In' ? 'Checking In...' : 'Check In'}
              </Button>

              {/* Check Out Button */}
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
                onClick={handleCheckOut}
                disabled={loadingAction || status !== 'Checked In'}
              >
                <MapPin className="h-4 w-4" />
                {loadingAction && status === 'Checked In' ? 'Checking Out...' : 'Check Out'}
              </Button>
              
              {/* Reset Button for Demo */}
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                  setStatus('Ready');
                  setCheckInTime(null);
                  setCheckOutTime(null);
                  setError(null);
                  showNotification('Status reset successfully!', 'success');
                }}
                disabled={loadingAction}
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              My Attendance History
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No attendance history found</p>
            <p className="text-sm text-gray-400 mt-1">Your attendance records will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;