import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User,
  Target,
  PlayCircle,
  StopCircle,
  Navigation,
  Bell,
  Loader2,
  Phone,
  FileText,
  Eye,
  UserCircle,
  TrendingUp,
  FileDown
} from 'lucide-react';

// Configuration - in a real app, these would come from environment variables
const API_CONFIG = {
  baseUrl: 'https://api.security-system.com',
  authToken: 'demo-token'
};

// Real API call implementation
const apiCall = async (endpoint, options = {}) => {
  const { method = 'GET', body } = options;
  
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.authToken}`,
        ...options.headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed, using mock data:', error);
    // Fallback to mock data for demo
    return mockApiCall(endpoint, options);
  }
};

// Mock API fallback for demonstration
const mockApiCall = async (endpoint, options = {}) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const { method = 'GET', body } = options;
  
  if (endpoint === '/api/patrol-logs' && method === 'GET') {
    return {
      success: true,
      data: [
        {
          id: 'PL001',
          guardId: 'G001',
          guardName: 'John Doe',
          guardBadge: 'GUARD-001',
          checkpointId: 'CP001',
          checkpointName: 'Security Desk',
          status: 'completed',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          latitude: -1.2921,
          longitude: 36.8219,
          notes: 'All clear, no incidents reported',
          incidentsReported: 0
        },
        {
          id: 'PL002',
          guardId: 'G001',
          guardName: 'John Doe',
          guardBadge: 'GUARD-001',
          checkpointId: 'CP003',
          checkpointName: 'Main Entrance',
          status: 'completed',
          startTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          latitude: -1.2918,
          longitude: 36.8222,
          notes: 'Routine patrol completed',
          incidentsReported: 0
        },
        {
          id: 'PL003',
          guardId: 'G001',
          guardName: 'John Doe',
          guardBadge: 'GUARD-001',
          checkpointId: 'CP001',
          checkpointName: 'Security Desk',
          status: 'overdue',
          startTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          endTime: null,
          latitude: -1.2921,
          longitude: 36.8219,
          notes: 'Patrol started but not completed',
          incidentsReported: 1
        }
      ]
    };
  }
  
  if (endpoint === '/api/guards' && method === 'GET') {
    return {
      success: true,
      data: [
        {
          id: 'G001',
          name: 'John Doe',
          badge: 'GUARD-001',
          email: 'john.doe@security.com',
          phone: '+254700000001',
          shift: 'Day Shift (08:00-16:00)',
          status: 'active',
          onDuty: true,
          assignedCheckpoints: ['CP001', 'CP003'],
          totalPatrols: 15,
          completedPatrols: 13,
          completionRate: 87
        }
      ]
    };
  }
  
  if (endpoint === '/api/checkpoints' && method === 'GET') {
    return {
      success: true,
      data: [
        {
          id: 'CP001',
          name: 'Security Desk',
          description: 'Primary security checkpoint at main building entrance',
          location: 'Building A - Ground Floor',
          latitude: -1.2921,
          longitude: 36.8219,
          status: 'active',
          assignedGuards: ['G001'],
          lastPatrol: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          patrolFrequency: 120
        },
        {
          id: 'CP003',
          name: 'Main Entrance',
          description: 'Main visitor entry and exit monitoring',
          location: 'Building C - Main Entrance',
          latitude: -1.2918,
          longitude: 36.8222,
          status: 'active',
          assignedGuards: ['G001'],
          lastPatrol: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          patrolFrequency: 240
        }
      ]
    };
  }
  
  return { success: false, error: 'Endpoint not found' };
};

const GuardDashboard = ({ userId = 'G001' }) => {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [guardInfo, setGuardInfo] = useState(null);
  const [assignedCheckpoints, setAssignedCheckpoints] = useState([]);
  const [guardPatrols, setGuardPatrols] = useState([]);
  const [stats, setStats] = useState({});
  
  // Guard operational states
  const [activePatrol, setActivePatrol] = useState(null);
  const [onDuty, setOnDuty] = useState(true);
  const [patrolLoading, setPatrolLoading] = useState(false);
  const [patrolNotes, setPatrolNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Fetch guard-specific dashboard data
  const fetchGuardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [guardsRes, checkpointsRes, patrolsRes] = await Promise.all([
        apiCall('/api/guards'),
        apiCall('/api/checkpoints'),
        apiCall('/api/patrol-logs')
      ]);
      
      // Get current guard info
      if (guardsRes.success && guardsRes.data) {
        const currentGuard = guardsRes.data.find(g => g.id === userId);
        if (currentGuard) {
          setGuardInfo(currentGuard);
          setOnDuty(currentGuard.onDuty);
        }
      }
      
      // Get assigned checkpoints
      if (checkpointsRes.success && checkpointsRes.data) {
        const assignedCPs = checkpointsRes.data.filter(cp => 
          cp.assignedGuards && cp.assignedGuards.includes(userId)
        );
        setAssignedCheckpoints(assignedCPs);
      }
      
      // Get guard's patrol logs
      if (patrolsRes.success && patrolsRes.data) {
        const guardPatrolsData = patrolsRes.data.filter(p => p.guardId === userId);
        setGuardPatrols(guardPatrolsData);
        
        // Update recent activity from patrols
        const activity = guardPatrolsData.slice(0, 5).map(patrol => ({
          id: patrol.id,
          checkpoint: patrol.checkpointName,
          time: new Date(patrol.startTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          status: patrol.status,
          notes: patrol.notes || 'No notes',
          type: 'patrol'
        }));
        setRecentActivity(activity);
      }
      
    } catch (err) {
      console.error('Failed to fetch guard data:', err);
      setError('Failed to load guard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate guard-specific statistics
  const calculateGuardStats = () => {
    const totalPatrols = guardPatrols.length;
    const completedPatrols = guardPatrols.filter(p => p.status === 'completed').length;
    const activePatrols = guardPatrols.filter(p => p.status === 'active').length;
    const overduePatrols = guardPatrols.filter(p => p.status === 'overdue').length;
    const pendingPatrols = guardPatrols.filter(p => p.status === 'pending').length;
    
    setStats({
      totalPatrols,
      completedPatrols,
      activePatrols,
      overduePatrols,
      pendingPatrols,
      completionRate: totalPatrols > 0 ? Math.round((completedPatrols / totalPatrols) * 100) : 0,
      assignedCheckpoints: assignedCheckpoints.length,
      hoursOnDuty: 6.5,
      totalIncidents: guardPatrols.reduce((sum, p) => sum + (p.incidentsReported || 0), 0)
    });
  };
  
  // Get current position
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  // Start a new patrol
  const handleStartPatrol = async () => {
    const primaryCheckpoint = assignedCheckpoints[0];
    
    if (!primaryCheckpoint) {
      alert('No checkpoint assigned. Please contact your supervisor.');
      return;
    }

    if (!onDuty) {
      alert('Please clock in before starting a patrol.');
      return;
    }

    setPatrolLoading(true);
    try {
      let position = null;
      try {
        position = await getCurrentPosition();
      } catch (gpsError) {
        console.warn('Could not get GPS location:', gpsError);
      }

      const newPatrol = {
        id: `patrol-${Date.now()}`,
        checkpointId: primaryCheckpoint.id,
        checkpointName: primaryCheckpoint.name,
        guardId: userId,
        guardName: guardInfo?.name || 'Guard',
        badgeNumber: guardInfo?.badge || 'GUARD-000',
        latitude: position?.coords.latitude || primaryCheckpoint.latitude,
        longitude: position?.coords.longitude || primaryCheckpoint.longitude,
        startTime: new Date().toISOString(),
        status: 'active'
      };

      setActivePatrol(newPatrol);
      alert('Patrol started successfully!');
    } catch (error) {
      console.error('Error starting patrol:', error);
      alert('Error starting patrol. Please try again.');
    } finally {
      setPatrolLoading(false);
    }
  };

  // Complete the active patrol
  const handleCompletePatrol = async () => {
    if (!activePatrol) return;
    
    setPatrolLoading(true);
    try {
      // Add to recent activity
      const newActivity = {
        id: Date.now(),
        checkpoint: activePatrol.checkpointName,
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        status: 'completed',
        notes: patrolNotes || 'Patrol completed successfully',
        type: 'patrol'
      };
      setRecentActivity(prev => [newActivity, ...prev.slice(0, 9)]);

      setActivePatrol(null);
      setPatrolNotes('');
      
      alert('Patrol completed successfully!');
    } catch (error) {
      console.error('Error completing patrol:', error);
      alert('Error completing patrol. Please try again.');
    } finally {
      setPatrolLoading(false);
    }
  };

  const handleClockInOut = async () => {
    try {
      const newOnDutyStatus = !onDuty;
      setOnDuty(newOnDutyStatus);
      
      if (newOnDutyStatus) {
        alert('Successfully clocked in!');
      } else {
        if (activePatrol) {
          handleCompletePatrol();
        }
        alert('Successfully clocked out!');
      }
    } catch (error) {
      console.error('Error updating duty status:', error);
      alert('Error updating duty status. Please try again.');
    }
  };

  // Quick Action Handlers
  const handleQuickAction = (action) => {
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    switch (action) {
      case 'incident':
        const newIncident = {
          id: Date.now(),
          checkpoint: activePatrol?.checkpointName || assignedCheckpoints[0]?.name || 'Current Location',
          time: currentTime,
          status: 'pending',
          notes: 'Incident reported - awaiting details',
          type: 'incident'
        };
        setRecentActivity(prev => [newIncident, ...prev.slice(0, 9)]);
        alert('Incident report created. Please provide details in the patrol log.');
        break;
        
      case 'directions':
        const targetCheckpoint = assignedCheckpoints[0];
        if (targetCheckpoint) {
          const lat = targetCheckpoint.latitude || -1.2921;
          const lng = targetCheckpoint.longitude || 36.8219;
          const url = `https://maps.google.com/maps?daddr=${lat},${lng}&dirflg=d`;
          window.open(url, '_blank');
        } else {
          alert('No checkpoint assigned to navigate to');
        }
        break;
        
      case 'supervisor':
        const confirmed = confirm('Call supervisor at +254700000000?');
        if (confirmed) {
          window.open('tel:+254700000000');
        }
        break;
        
      case 'emergency':
        const emergencyActivity = {
          id: Date.now(),
          checkpoint: 'Emergency Check-in',
          time: currentTime,
          status: 'completed',
          notes: 'Emergency check-in completed',
          type: 'emergency'
        };
        setRecentActivity(prev => [emergencyActivity, ...prev.slice(0, 9)]);
        alert('Emergency check-in recorded successfully');
        break;
        
      case 'checkpoint':
        if (assignedCheckpoints.length > 0) {
          const cp = assignedCheckpoints[0];
          alert(`Checkpoint Details:\n\nName: ${cp.name}\nLocation: ${cp.location}\nDescription: ${cp.description}`);
        } else {
          alert('No checkpoint assigned');
        }
        break;
        
      case 'profile':
        if (guardInfo) {
          alert(`Guard Profile:\nName: ${guardInfo.name}\nBadge: ${guardInfo.badge}\nShift: ${guardInfo.shift}\nStatus: ${onDuty ? 'On Duty' : 'Off Duty'}\nCompletion Rate: ${guardInfo.completionRate}%`);
        }
        break;
    }
  };

  // Export personal patrol report
  const handleExportReport = () => {
    const siteName = 'Sarit Centre Site';
    
    const report = `${siteName}
Personal Patrol Report - ${guardInfo?.name} (${guardInfo?.badge})
Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

=== GUARD STATISTICS ===
Name: ${guardInfo?.name}
Badge: ${guardInfo?.badge}
Shift: ${guardInfo?.shift}
Status: ${onDuty ? 'On Duty' : 'Off Duty'}

Total Patrols: ${stats.totalPatrols || 0}
Completed: ${stats.completedPatrols || 0}
Active: ${stats.activePatrols || 0}
Overdue: ${stats.overduePatrols || 0}
Completion Rate: ${stats.completionRate || 0}%

Assigned Checkpoints: ${stats.assignedCheckpoints || 0}
Hours on Duty Today: ${stats.hoursOnDuty || 0}h
Incidents Reported: ${stats.totalIncidents || 0}

=== ASSIGNED CHECKPOINTS ===
${assignedCheckpoints.map(cp => 
  `${cp.name} - ${cp.location}
Description: ${cp.description}
Last Patrol: ${new Date(cp.lastPatrol).toLocaleString()}`
).join('\n\n')}

=== RECENT PATROL ACTIVITY ===
${recentActivity.map(activity => 
  `${activity.time} - ${activity.checkpoint} - ${activity.status.toUpperCase()}
Notes: ${activity.notes}`
).join('\n\n')}

=== MY PATROL LOGS ===
${guardPatrols.slice(0, 10).map(p => 
  `${new Date(p.startTime).toLocaleString()} - ${p.checkpointName} - ${p.status.toUpperCase()}
Notes: ${p.notes || 'No notes'}`
).join('\n\n')}

Report End - Generated by Security System v2.0`;

    // Trigger download
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Patrol_Report_${guardInfo?.badge || 'guard'}_${Date.now()}.txt`;
    link.click();
    alert('Personal patrol report exported successfully!');
  };

  // Filter patrol logs
  const getFilteredPatrols = () => {
    let filtered = guardPatrols;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.checkpointName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    return filtered;
  };

  // Fetch guard data on mount
  useEffect(() => {
    fetchGuardData();
  }, [userId]);

  // Recalculate stats when patrols or checkpoints change
  useEffect(() => {
    calculateGuardStats();
  }, [guardPatrols, assignedCheckpoints]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-12 h-12 text-yellow-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-yellow-600" />
            Welcome, {guardInfo?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Badge</p>
              <p className="font-semibold">{guardInfo?.badge}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Shift</p>
              <p className="font-semibold">{guardInfo?.shift}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge variant={onDuty ? 'default' : 'secondary'}>
                {onDuty ? 'On Duty' : 'Off Duty'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="font-semibold text-green-600">{stats.completionRate}%</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleClockInOut}
              variant={onDuty ? 'destructive' : 'default'}
            >
              <Clock className="w-4 h-4 mr-2" />
              {onDuty ? 'Clock Out' : 'Clock In'}
            </Button>
            <Button 
              onClick={handleStartPatrol} 
              disabled={patrolLoading || !onDuty || activePatrol}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              {patrolLoading ? 'Starting...' : 'Start Patrol'}
            </Button>
            <Button 
              onClick={handleCompletePatrol} 
              disabled={!activePatrol || patrolLoading}
              variant="outline"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Complete Patrol
            </Button>
            <Button onClick={handleExportReport} variant="outline">
              <FileDown className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>

          {activePatrol && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Active patrol at {activePatrol.checkpointName} - Started at {new Date(activePatrol.startTime).toLocaleTimeString()}
              </AlertDescription>
            </Alert>
          )}

          {activePatrol && (
            <div className="mt-4">
              <Textarea
                placeholder="Add patrol notes..."
                value={patrolNotes}
                onChange={(e) => setPatrolNotes(e.target.value)}
                className="mb-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalPatrols || 0}</div>
              <div className="text-sm text-gray-600">Total Patrols</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedPatrols || 0}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.overduePatrols || 0}</div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.totalIncidents || 0}</div>
              <div className="text-sm text-gray-600">Incidents</div>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button 
              onClick={() => handleQuickAction('incident')} 
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
            >
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <span>Report Incident</span>
            </Button>
            <Button 
              onClick={() => handleQuickAction('directions')} 
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
            >
              <Navigation className="w-6 h-6 text-blue-500" />
              <span>Directions</span>
            </Button>
            <Button 
              onClick={() => handleQuickAction('supervisor')} 
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
            >
              <Phone className="w-6 h-6 text-green-500" />
              <span>Call Supervisor</span>
            </Button>
            <Button 
              onClick={() => handleQuickAction('emergency')} 
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
            >
              <Bell className="w-6 h-6 text-red-500" />
              <span>Emergency</span>
            </Button>
            <Button 
              onClick={() => handleQuickAction('checkpoint')} 
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
            >
              <Target className="w-6 h-6 text-purple-500" />
              <span>Checkpoint Info</span>
            </Button>
            <Button 
              onClick={() => handleQuickAction('profile')} 
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
            >
              <UserCircle className="w-6 h-6 text-gray-500" />
              <span>My Profile</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Checkpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Assigned Checkpoints ({assignedCheckpoints.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignedCheckpoints.map(cp => (
                <div key={cp.id} className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{cp.name}</h4>
                    <Badge variant="secondary">{cp.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{cp.description}</p>
                  <p className="text-sm text-gray-500">📍 {cp.location}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Last patrol: {new Date(cp.lastPatrol).toLocaleString()}
                  </p>
                </div>
              ))}
              {assignedCheckpoints.length === 0 && (
                <p className="text-gray-500 text-center py-4">No checkpoints assigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivity.map(activity => (
                <div 
                  key={activity.id} 
                  className={`p-3 border rounded-lg ${
                    activity.status === 'overdue' ? 'border-red-200 bg-red-50' : 
                    activity.type === 'incident' ? 'border-orange-200 bg-orange-50' :
                    activity.type === 'emergency' ? 'border-purple-200 bg-purple-50' :
                    'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{activity.checkpoint}</span>
                    <span className="text-sm text-gray-500">{activity.time}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge 
                      variant={
                        activity.status === 'completed' ? 'default' : 
                        activity.status === 'overdue' ? 'destructive' : 
                        activity.status === 'pending' ? 'secondary' :
                        activity.status === 'reported' ? 'outline' : 'outline'
                      }
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                    {activity.priority && activity.type === 'incident' && (
                      <Badge 
                        variant={
                          activity.priority === 'critical' ? 'destructive' :
                          activity.priority === 'high' ? 'destructive' :
                          activity.priority === 'medium' ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {activity.priority} priority
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{activity.notes}</p>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patrol Logs with Search & Filter */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              My Patrol Logs
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search patrols by checkpoint, notes, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="active">Active</option>
                <option value="overdue">Overdue</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Patrol Logs List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {getFilteredPatrols().map(patrol => (
              <div 
                key={patrol.id}
                className={`p-4 border rounded-lg ${
                  patrol.status === 'overdue' ? 'border-red-200 bg-red-50' :
                  patrol.status === 'active' ? 'border-blue-200 bg-blue-50' :
                  patrol.status === 'completed' ? 'border-green-200 bg-green-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{patrol.checkpointName}</h4>
                    <p className="text-sm text-gray-600">
                      Started: {new Date(patrol.startTime).toLocaleString()}
                    </p>
                    {patrol.endTime && (
                      <p className="text-sm text-gray-600">
                        Ended: {new Date(patrol.endTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        patrol.status === 'completed' ? 'default' : 
                        patrol.status === 'overdue' ? 'destructive' : 
                        patrol.status === 'active' ? 'secondary' : 'outline'
                      }
                    >
                      {patrol.status}
                    </Badge>
                    {patrol.incidentsReported > 0 && (
                      <div className="mt-1">
                        <Badge variant="destructive" className="text-xs">
                          {patrol.incidentsReported} incident{patrol.incidentsReported !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700">
                  <strong>Notes:</strong> {patrol.notes || 'No notes provided'}
                </p>
                {patrol.latitude && patrol.longitude && (
                  <p className="text-xs text-gray-500 mt-1">
                    Location: {patrol.latitude.toFixed(4)}, {patrol.longitude.toFixed(4)}
                  </p>
                )}
              </div>
            ))}
            {getFilteredPatrols().length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No patrols match your search criteria' 
                    : 'No patrol logs available'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );}
  export default GuardDashboard;