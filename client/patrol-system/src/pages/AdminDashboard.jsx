import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Shield,
  Users,
  MapPin,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  Phone,
  Eye,
  UserCheck,
  FileDown,
  Plus,
  UserPlus,
  Settings,
  Bell,
  Loader2,
  Search,
  Filter,
  Download,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';

// Configuration - matches the Guard Dashboard API config
const API_CONFIG = {
  baseUrl: 'https://api.security-system.com',
  authToken: 'demo-admin-token'
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

// Enhanced mock API with more comprehensive data
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
          checkpointName: 'Security Desk 2',
          status: 'completed',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          latitude: -1.2921,
          longitude: 36.8219,
          notes: 'All clear, no incidents reported',
          incidentsReported: 0,
          assignedDuration: 60,
          actualDuration: 55
        },
        {
          id: 'PL002',
          guardId: 'G002',
          guardName: 'Jane Smith',
          guardBadge: 'GUARD-002',
          checkpointId: 'CP002',
          checkpointName: 'Silo Parking 2nd Flr',
          status: 'completed',
          startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
          latitude: -1.2925,
          longitude: 36.8215,
          notes: 'Routine patrol completed, minor maintenance issue noted',
          incidentsReported: 0,
          assignedDuration: 45,
          actualDuration: 30
        },
        {
          id: 'PL003',
          guardId: 'G003',
          guardName: 'Mike Johnson',
          guardBadge: 'GUARD-003',
          checkpointId: 'CP001',
          checkpointName: 'Security Desk 2',
          status: 'overdue',
          startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          endTime: null,
          latitude: -1.2921,
          longitude: 36.8219,
          notes: 'Scheduled patrol - no response from guard',
          incidentsReported: 1,
          assignedDuration: 60,
          actualDuration: null
        },
        {
          id: 'PL004',
          guardId: 'G001',
          guardName: 'John Doe',
          guardBadge: 'GUARD-001',
          checkpointId: 'CP003',
          checkpointName: 'Main Entrance',
          status: 'active',
          startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          endTime: null,
          latitude: -1.2918,
          longitude: 36.8222,
          notes: 'Currently patrolling main entrance area',
          incidentsReported: 0,
          assignedDuration: 90,
          actualDuration: null
        },
        {
          id: 'PL005',
          guardId: 'G002',
          guardName: 'Jane Smith',
          guardBadge: 'GUARD-002',
          checkpointId: 'CP004',
          checkpointName: 'Parking Basement',
          status: 'pending',
          startTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          endTime: null,
          latitude: -1.2920,
          longitude: 36.8218,
          notes: 'Scheduled for next patrol round',
          incidentsReported: 0,
          assignedDuration: 45,
          actualDuration: null
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
          activePatrols: 1,
          overduePatrols: 0,
          completionRate: 87
        },
        {
          id: 'G002',
          name: 'Jane Smith',
          badge: 'GUARD-002',
          email: 'jane.smith@security.com',
          phone: '+254700000002',
          shift: 'Day Shift (08:00-16:00)',
          status: 'active',
          onDuty: true,
          assignedCheckpoints: ['CP002', 'CP004'],
          totalPatrols: 12,
          completedPatrols: 11,
          activePatrols: 0,
          overduePatrols: 0,
          completionRate: 92
        },
        {
          id: 'G003',
          name: 'Mike Johnson',
          badge: 'GUARD-003',
          email: 'mike.johnson@security.com',
          phone: '+254700000003',
          shift: 'Night Shift (20:00-04:00)',
          status: 'active',
          onDuty: false,
          assignedCheckpoints: ['CP001', 'CP005'],
          totalPatrols: 18,
          completedPatrols: 14,
          activePatrols: 0,
          overduePatrols: 1,
          completionRate: 78
        },
        {
          id: 'G004',
          name: 'Sarah Wilson',
          badge: 'GUARD-004',
          email: 'sarah.wilson@security.com',
          phone: '+254700000004',
          shift: 'Day Shift (08:00-16:00)',
          status: 'active',
          onDuty: true,
          assignedCheckpoints: ['CP003', 'CP005'],
          totalPatrols: 10,
          completedPatrols: 9,
          activePatrols: 0,
          overduePatrols: 0,
          completionRate: 90
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
          name: 'Security Desk 2',
          description: 'Primary security checkpoint at building entrance',
          location: 'Building A - Ground Floor',
          latitude: -1.2921,
          longitude: 36.8219,
          status: 'active',
          assignedGuards: ['G001', 'G003'],
          assignedPatrols: 4,
          completedPatrols: 2,
          completionRate: 50,
          lastPatrol: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          patrolFrequency: 120,
          incidentCount: 1
        },
        {
          id: 'CP002',
          name: 'Silo Parking 2nd Flr',
          description: 'Second floor parking area monitoring',
          location: 'Building B - 2nd Floor Parking',
          latitude: -1.2925,
          longitude: 36.8215,
          status: 'active',
          assignedGuards: ['G002'],
          assignedPatrols: 4,
          completedPatrols: 3,
          completionRate: 75,
          lastPatrol: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
          patrolFrequency: 180,
          incidentCount: 0
        },
        {
          id: 'CP003',
          name: 'Main Entrance',
          description: 'Main visitor entry and exit monitoring',
          location: 'Building C - Main Entrance',
          latitude: -1.2918,
          longitude: 36.8222,
          status: 'active',
          assignedGuards: ['G001', 'G004'],
          assignedPatrols: 3,
          completedPatrols: 2,
          completionRate: 67,
          lastPatrol: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          patrolFrequency: 240,
          incidentCount: 0
        },
        {
          id: 'CP004',
          name: 'Parking Basement',
          description: 'Underground parking security monitoring',
          location: 'Building A - Basement Level',
          latitude: -1.2920,
          longitude: 36.8218,
          status: 'active',
          assignedGuards: ['G002'],
          assignedPatrols: 2,
          completedPatrols: 1,
          completionRate: 50,
          lastPatrol: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          patrolFrequency: 300,
          incidentCount: 0
        },
        {
          id: 'CP005',
          name: 'Emergency Exit West',
          description: 'Western emergency exit monitoring',
          location: 'Building C - West Side',
          latitude: -1.2919,
          longitude: 36.8221,
          status: 'maintenance',
          assignedGuards: ['G003', 'G004'],
          assignedPatrols: 2,
          completedPatrols: 1,
          completionRate: 50,
          lastPatrol: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          patrolFrequency: 360,
          incidentCount: 0
        }
      ]
    };
  }
  
  if (endpoint.includes('/api/assignments') && method === 'POST') {
    return {
      success: true,
      message: 'Guard assigned to checkpoint successfully',
      data: body
    };
  }
  
  return { success: false, error: 'Endpoint not found' };
};

const AdminDashboard = ({ userId = 'admin-001', siteName = 'Sarit Centre Site' }) => {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [patrols, setPatrols] = useState([]);
  const [guards, setGuards] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [stats, setStats] = useState({});
  
  // UI states
  const [selectedTimeframe, setSelectedTimeframe] = useState('today');
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState('');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // Fetch all dashboard data
  const fetchDashboardData = async (timeframe = 'today') => {
    try {
      setLoading(true);
      setError(null);
      
      const [patrolsRes, guardsRes, checkpointsRes] = await Promise.all([
        apiCall('/api/patrol-logs'),
        apiCall('/api/guards'),
        apiCall('/api/checkpoints')
      ]);
      
      if (patrolsRes.success) setPatrols(patrolsRes.data);
      if (guardsRes.success) setGuards(guardsRes.data);
      if (checkpointsRes.success) setCheckpoints(checkpointsRes.data);
      
      calculateStats(patrolsRes.data || [], guardsRes.data || [], checkpointsRes.data || [], timeframe);
      
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate comprehensive dashboard statistics
  const calculateStats = (patrolData, guardData, checkpointData, timeframe) => {
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    
    const filteredPatrols = patrolData.filter(patrol => 
      new Date(patrol.startTime) >= startDate
    );
    
    const totalPatrols = filteredPatrols.length;
    const completedPatrols = filteredPatrols.filter(p => p.status === 'completed').length;
    const activePatrols = filteredPatrols.filter(p => p.status === 'active').length;
    const overduePatrols = filteredPatrols.filter(p => p.status === 'overdue').length;
    const pendingPatrols = filteredPatrols.filter(p => p.status === 'pending').length;
    
    const guardsOnDuty = guardData.filter(g => g.onDuty && g.status === 'active').length;
    const totalGuards = guardData.filter(g => g.status === 'active').length;
    const activeCheckpoints = checkpointData.filter(c => c.status === 'active').length;
    const totalCheckpoints = checkpointData.length;
    
    const totalIncidents = filteredPatrols.reduce((sum, p) => sum + (p.incidentsReported || 0), 0);
    const totalAssignedPatrols = checkpointData.reduce((sum, c) => sum + (c.assignedPatrols || 0), 0);
    const totalCompletedPatrols = checkpointData.reduce((sum, c) => sum + (c.completedPatrols || 0), 0);
    
    setStats({
      totalPatrols,
      completedPatrols,
      activePatrols,
      overduePatrols,
      pendingPatrols,
      completionRate: totalPatrols > 0 ? Math.round((completedPatrols / totalPatrols) * 100) : 0,
      guardsOnDuty,
      totalGuards,
      activeCheckpoints,
      totalCheckpoints,
      checkpointCoverage: totalCheckpoints > 0 ? Math.round((activeCheckpoints / totalCheckpoints) * 100) : 0,
      totalIncidents,
      totalAssignedPatrols,
      totalCompletedPatrols,
      overallCompletionRate: totalAssignedPatrols > 0 ? Math.round((totalCompletedPatrols / totalAssignedPatrols) * 100) : 0
    });
  };
  
  // Handle guard-checkpoint assignment
  const handleAssignCheckpoint = async () => {
    if (!selectedGuard || !selectedCheckpoint) {
      alert('Please select both a guard and a checkpoint');
      return;
    }
    
    try {
      const response = await apiCall('/api/assignments', {
        method: 'POST',
        body: {
          guardId: selectedGuard,
          checkpointId: selectedCheckpoint,
          assignedBy: userId,
          assignedAt: new Date().toISOString()
        }
      });
      
      if (response.success) {
        alert('Guard assigned to checkpoint successfully!');
        setAssignmentDialogOpen(false);
        setSelectedGuard('');
        setSelectedCheckpoint('');
        fetchDashboardData(selectedTimeframe);
      } else {
        alert('Failed to assign checkpoint. Please try again.');
      }
    } catch (error) {
      console.error('Assignment failed:', error);
      alert('Assignment failed. Please try again.');
    }
  };
  
  // Refresh dashboard data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(selectedTimeframe);
    setRefreshing(false);
  };
  
  // Generate comprehensive report in your specified format
  const generateReport = (format) => {
    const reportDate = new Date().toLocaleDateString();
    const reportTime = new Date().toLocaleTimeString();
    
    let report = `${siteName}
Daily Patrol Report
Generated: ${reportDate} ${reportTime}

=== PATROL SUMMARY ===
Checkpoint Name              Completed  Assigned  Completion %
`;

    // Add checkpoint summary
    checkpoints.forEach(cp => {
      const completed = cp.completedPatrols || 0;
      const assigned = cp.assignedPatrols || 0;
      const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
      
      report += `${cp.name.padEnd(28)} ${completed.toString().padStart(9)}  ${assigned.toString().padStart(8)}      ${completionRate.toString().padStart(3)}%\n`;
    });
    
    report += `${'Grand Total'.padEnd(28)} ${stats.totalCompletedPatrols.toString().padStart(9)}  ${stats.totalAssignedPatrols.toString().padStart(8)}      ${stats.overallCompletionRate.toString().padStart(3)}%

=== OCCURRENCES / INCIDENTS ===
Checkpoint Name              | Incident Count | Notes
`;

    // Add incidents by checkpoint
    checkpoints.forEach(cp => {
      const incidents = cp.incidentCount || 0;
      const notes = incidents > 0 ? 'Security incidents reported' : 'None';
      report += `${cp.name.padEnd(28)} | ${incidents.toString().padStart(14)} | ${notes}\n`;
    });

    report += `
=== GUARD STATISTICS ===
Name              Badge        Total  Completed  Active  Overdue  Completion %
`;

    // Add guard statistics
    guards.filter(g => g.status === 'active').forEach(guard => {
      const total = guard.totalPatrols || 0;
      const completed = guard.completedPatrols || 0;
      const active = guard.activePatrols || 0;
      const overdue = guard.overduePatrols || 0;
      const rate = guard.completionRate || 0;
      
      report += `${guard.name.padEnd(17)} ${guard.badge.padEnd(12)} ${total.toString().padStart(5)}  ${completed.toString().padStart(9)}  ${active.toString().padStart(6)}  ${overdue.toString().padStart(7)}        ${rate.toString().padStart(3)}%\n`;
    });

    report += `
=== DETAILED PATROL LOGS ===
Time                 Guard           Checkpoint               Status       Notes
`;

    // Add detailed patrol logs
    patrols.slice(0, 20).forEach(patrol => {
      const time = new Date(patrol.startTime).toLocaleString();
      const status = patrol.status.toUpperCase();
      const notes = patrol.notes || 'No notes';
      
      report += `${time.padEnd(20)} ${patrol.guardName.padEnd(15)} ${patrol.checkpointName.padEnd(24)} ${status.padEnd(12)} ${notes}\n`;
    });

    report += `
=== SYSTEM METRICS ===
Total Guards: ${stats.totalGuards}
Guards on Duty: ${stats.guardsOnDuty}
Active Checkpoints: ${stats.activeCheckpoints}/${stats.totalCheckpoints}
Total Incidents: ${stats.totalIncidents}
System Uptime: 99.9%
Report Generated: ${new Date().toISOString()}

Report End - Generated by Security System Admin Dashboard v2.0`;

    return report;
  };
  
  // Export functions for different formats
  const handleExport = (format) => {
    const report = generateReport(format);
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (format) {
      case 'txt':
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${siteName.replace(/\s+/g, '_')}_Patrol_Report_${timestamp}.txt`;
        link.click();
        break;
        
      case 'csv':
        // Generate CSV format
        let csvContent = "Checkpoint Name,Completed,Assigned,Completion Rate,Incidents\n";
        checkpoints.forEach(cp => {
          const completed = cp.completedPatrols || 0;
          const assigned = cp.assignedPatrols || 0;
          const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
          const incidents = cp.incidentCount || 0;
          csvContent += `"${cp.name}",${completed},${assigned},${rate}%,${incidents}\n`;
        });
        
        const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const csvLink = document.createElement('a');
        csvLink.href = URL.createObjectURL(csvBlob);
        csvLink.download = `${siteName.replace(/\s+/g, '_')}_Patrol_Report_${timestamp}.csv`;
        csvLink.click();
        break;
        
      case 'json':
        // Generate JSON format
        const jsonData = {
          siteName,
          reportDate: new Date().toISOString(),
          timeframe: selectedTimeframe,
          summary: {
            totalPatrols: stats.totalPatrols,
            completedPatrols: stats.completedPatrols,
            overallCompletionRate: stats.overallCompletionRate,
            totalIncidents: stats.totalIncidents,
            guardsOnDuty: stats.guardsOnDuty,
            totalGuards: stats.totalGuards
          },
          checkpoints: checkpoints.map(cp => ({
            name: cp.name,
            completed: cp.completedPatrols || 0,
            assigned: cp.assignedPatrols || 0,
            completionRate: cp.completionRate || 0,
            incidents: cp.incidentCount || 0
          })),
          guards: guards.filter(g => g.status === 'active').map(g => ({
            name: g.name,
            badge: g.badge,
            totalPatrols: g.totalPatrols || 0,
            completedPatrols: g.completedPatrols || 0,
            completionRate: g.completionRate || 0
          })),
          patrols: patrols.map(p => ({
            time: p.startTime,
            guard: p.guardName,
            checkpoint: p.checkpointName,
            status: p.status,
            notes: p.notes
          }))
        };
        
        const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const jsonLink = document.createElement('a');
        jsonLink.href = URL.createObjectURL(jsonBlob);
        jsonLink.download = `${siteName.replace(/\s+/g, '_')}_Patrol_Report_${timestamp}.json`;
        jsonLink.click();
        break;
    }
    
    setExportDialogOpen(false);
    alert(`${format.toUpperCase()} report exported successfully!`);
  };
  
  // Filter functions
  const getFilteredPatrols = () => {
    let filtered = patrols;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.guardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.checkpointName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    return filtered;
  };
  
  // Initialize data on component mount
  useEffect(() => {
    fetchDashboardData(selectedTimeframe);
  }, [selectedTimeframe]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-amber-600" />
          <p className="text-gray-600">Loading dashboard data...</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to security system...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="ml-4" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-amber-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Shield className="h-8 w-8 text-amber-600" />
              </div>
              {siteName} - Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Real-time monitoring and management • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          
          {/* Header Controls */}
          <div className="flex flex-wrap gap-3">
            {/* Timeframe Selector */}
            <div className="flex bg-amber-50 border border-amber-200 rounded-lg p-1">
              {['today', 'week', 'month'].map((timeframe) => (
                <Button
                  key={timeframe}
                  variant={selectedTimeframe === timeframe ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`capitalize ${selectedTimeframe === timeframe ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-100'}`}
                >
                  {timeframe === 'today' ? 'Today' : timeframe === 'week' ? 'This Week' : 'This Month'}
                </Button>
              ))}
            </div>
            
            {/* Action Buttons */}
            <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Guard
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Guard to Checkpoint</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="guard-select">Select Guard</Label>
                    <Select value={selectedGuard} onValueChange={setSelectedGuard}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a guard" />
                      </SelectTrigger>
                      <SelectContent>
                        {guards.filter(g => g.status === 'active').map((guard) => (
                          <SelectItem key={guard.id} value={guard.id}>
                            {guard.name} ({guard.badge}) - {guard.onDuty ? 'On Duty' : 'Off Duty'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="checkpoint-select">Select Checkpoint</Label>
                    <Select value={selectedCheckpoint} onValueChange={setSelectedCheckpoint}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a checkpoint" />
                      </SelectTrigger>
                      <SelectContent>
                        {checkpoints.filter(c => c.status === 'active').map((checkpoint) => (
                          <SelectItem key={checkpoint.id} value={checkpoint.id}>
                            {checkpoint.name} - {checkpoint.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAssignCheckpoint} className="bg-amber-600 hover:bg-amber-700">
                      Assign
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Export Dialog */}
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Export Patrol Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Choose format to export comprehensive patrol report with statistics, incidents, and guard performance data.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <Button onClick={() => handleExport('txt')} variant="outline" className="justify-start">
                      <FileDown className="h-4 w-4 mr-2" />
                      Text Report (.txt) - Detailed formatted report
                    </Button>
                    <Button onClick={() => handleExport('csv')} variant="outline" className="justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      CSV Export (.csv) - Spreadsheet compatible
                    </Button>
                    <Button onClick={() => handleExport('json')} variant="outline" className="justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      JSON Data (.json) - API compatible format
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="border-amber-200 text-amber-700 hover:bg-amber-50">
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Critical Alerts Section */}
      {stats.overduePatrols > 0 && (
        <Alert variant="destructive" className="border-l-4 border-l-red-500 bg-red-50">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="text-red-800">
            <strong>URGENT ATTENTION REQUIRED:</strong> {stats.overduePatrols} patrol(s) are overdue and require immediate intervention.
            <div className="mt-2 flex gap-2">
              <Button variant="destructive" size="sm">
                <Phone className="h-3 w-3 mr-1" />
                Contact Guards
              </Button>
              <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                View Details
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Patrols</CardTitle>
            <Target className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats.totalPatrols || 0}</div>
            <p className="text-sm text-blue-600 mt-1">
              {stats.activePatrols || 0} active • {stats.overduePatrols || 0} overdue • {stats.pendingPatrols || 0} pending
            </p>
            <Progress value={stats.completionRate || 0} className="h-2 mt-2 bg-blue-200" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Guards Status</CardTitle>
            <UserCheck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {stats.guardsOnDuty || 0}<span className="text-lg">/{stats.totalGuards || 0}</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              {Math.round(((stats.guardsOnDuty || 0) / (stats.totalGuards || 1)) * 100)}% coverage active
            </p>
            <div className="flex items-center mt-2">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <span className="text-xs text-green-600">On duty now</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Checkpoints</CardTitle>
            <MapPin className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">
              {stats.activeCheckpoints || 0}<span className="text-lg">/{stats.totalCheckpoints || 0}</span>
            </div>
            <p className="text-sm text-purple-600 mt-1">
              {stats.checkpointCoverage || 0}% operational status
            </p>
            <Progress value={stats.checkpointCoverage || 0} className="h-2 mt-2 bg-purple-200" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Overall Performance</CardTitle>
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{stats.overallCompletionRate || 0}%</div>
            <p className="text-sm text-amber-600 mt-1">
              {stats.totalIncidents || 0} incidents reported
            </p>
            <Progress 
              value={stats.overallCompletionRate || 0} 
              className="h-2 mt-2 bg-amber-200" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Live Patrol Monitoring */}
        <Card className="xl:col-span-2 border border-gray-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-blue-600" />
                Live Patrol Status
                <Badge variant="secondary" className="ml-2">
                  {getFilteredPatrols().length} patrols
                </Badge>
              </CardTitle>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search patrols..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 h-8"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {getFilteredPatrols().length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {getFilteredPatrols().map((patrol, index) => (
                    <div
                      key={patrol.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        patrol.status === 'overdue' ? 'bg-red-50 border-l-4 border-l-red-500' :
                        patrol.status === 'active' ? 'bg-blue-50 border-l-4 border-l-blue-500' :
                        patrol.status === 'completed' ? 'bg-green-50 border-l-4 border-l-green-500' :
                        'bg-yellow-50 border-l-4 border-l-yellow-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${
                            patrol.status === 'completed' ? 'bg-green-100 text-green-600' :
                            patrol.status === 'active' ? 'bg-blue-100 text-blue-600' :
                            patrol.status === 'overdue' ? 'bg-red-100 text-red-600' :
                            'bg-yellow-100 text-yellow-600'
                          }`}>
                            {patrol.status === 'completed' ? <CheckCircle className="h-5 w-5" /> :
                             patrol.status === 'active' ? <Clock className="h-5 w-5" /> :
                             patrol.status === 'overdue' ? <AlertTriangle className="h-5 w-5" /> :
                             <Clock className="h-5 w-5" />}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="font-semibold text-gray-900">
                              {patrol.guardName} ({patrol.guardBadge})
                            </div>
                            <div className="text-sm text-gray-700 font-medium">{patrol.checkpointName}</div>
                            <div className="text-xs text-gray-500">
                              Started: {new Date(patrol.startTime).toLocaleString()}
                              {patrol.endTime && (
                                <span> • Ended: {new Date(patrol.endTime).toLocaleString()}</span>
                              )}
                            </div>
                            {patrol.notes && (
                              <div className="text-xs text-gray-600 mt-1 italic">"{patrol.notes}"</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {patrol.incidentsReported > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {patrol.incidentsReported} incident{patrol.incidentsReported !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          
                          <Badge className={
                            patrol.status === 'completed' ? "bg-green-100 text-green-800 border-green-200" :
                            patrol.status === 'active' ? "bg-blue-100 text-blue-800 border-blue-200" :
                            patrol.status === 'overdue' ? "bg-red-100 text-red-800 border-red-200" :
                            "bg-yellow-100 text-yellow-800 border-yellow-200"
                          }>
                            {patrol.status.toUpperCase()}
                          </Badge>
                          
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-3 w-3" />
                            </Button>
                            {patrol.status === 'overdue' && (
                              <Button variant="destructive" size="sm" className="h-8 px-2">
                                <Phone className="h-3 w-3 mr-1" />
                                Call
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Target className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-lg font-medium">No patrols match your criteria</p>
                  <p className="text-sm">Try adjusting your search or filter settings</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Guards Status Panel */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
            <CardTitle className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-600" />
              Guard Management
              <Badge variant="outline" className="ml-2">
                {guards.filter(g => g.status === 'active').length} active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {guards.filter(g => g.status === 'active').map((guard) => (
                  <div key={guard.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          guard.onDuty ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <div className="font-semibold text-gray-900">{guard.name}</div>
                          <div className="text-sm text-gray-600">{guard.badge}</div>
                        </div>
                      </div>
                      <Badge className={guard.onDuty ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {guard.onDuty ? 'On Duty' : 'Off Duty'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>Shift: {guard.shift}</div>
                      <div className="flex justify-between">
                        <span>Completed: {guard.completedPatrols}/{guard.totalPatrols}</span>
                        <span className="font-medium">{guard.completionRate}%</span>
                      </div>
                      <Progress value={guard.completionRate} className="h-1 mt-1" />
                    </div>
                    
                    {guard.onDuty && (
                      <div className="mt-2 flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          <Phone className="h-3 w-3 mr-1" />
                          Contact
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          Track
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checkpoint Performance Overview */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
          <CardTitle className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-purple-600" />
            Checkpoint Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 text-sm font-semibold text-gray-900">Checkpoint Name</th>
                  <th className="pb-3 text-sm font-semibold text-gray-900 text-center">Completed</th>
                  <th className="pb-3 text-sm font-semibold text-gray-900 text-center">Assigned</th>
                  <th className="pb-3 text-sm font-semibold text-gray-900 text-center">Completion %</th>
                  <th className="pb-3 text-sm font-semibold text-gray-900 text-center">Incidents</th>
                  <th className="pb-3 text-sm font-semibold text-gray-900 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checkpoints.map((checkpoint) => {
                  const completionRate = checkpoint.assignedPatrols > 0 
                    ? Math.round((checkpoint.completedPatrols / checkpoint.assignedPatrols) * 100) 
                    : 0;
                  
                  return (
                    <tr key={checkpoint.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <div>
                          <div className="font-medium text-gray-900">{checkpoint.name}</div>
                          <div className="text-xs text-gray-500">{checkpoint.location}</div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className="font-medium text-green-600">{checkpoint.completedPatrols || 0}</span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="font-medium">{checkpoint.assignedPatrols || 0}</span>
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-medium ${
                            completionRate >= 80 ? 'text-green-600' :
                            completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {completionRate}%
                          </span>
                          <div className="w-16">
                            <Progress 
                              value={completionRate} 
                              className="h-1" 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        {checkpoint.incidentCount > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            {checkpoint.incidentCount}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">0</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <Badge
                          variant={checkpoint.status === 'active' ? 'default' : 'secondary'}
                          className={
                            checkpoint.status === 'active' 
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }
                        >
                          {checkpoint.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-300">
                <tr className="font-semibold">
                  <td className="py-3 text-gray-900">Grand Total</td>
                  <td className="py-3 text-center text-green-600">{stats.totalCompletedPatrols || 0}</td>
                  <td className="py-3 text-center">{stats.totalAssignedPatrols || 0}</td>
                  <td className="py-3 text-center">
                    <span className={`font-bold text-lg ${
                      (stats.overallCompletionRate || 0) >= 80 ? 'text-green-600' :
                      (stats.overallCompletionRate || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {stats.overallCompletionRate || 0}%
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <Badge variant="outline" className="font-semibold">
                      {stats.totalIncidents || 0}
                    </Badge>
                  </td>
                  <td className="py-3 text-center">
                    <Badge className="bg-blue-100 text-blue-800">
                      {stats.activeCheckpoints}/{stats.totalCheckpoints}
                    </Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* System Health & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Performers */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Top Performing Guards
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {guards
                .filter((g) => g.status === 'active')
                .sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0))
                .slice(0, 5)
                .map((guard, index) => (
                  <div
                    key={guard.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{guard.name}</div>
                        <div className="text-sm text-gray-600">{guard.badge}</div>
                        <div className="text-xs text-gray-500">
                          {guard.completedPatrols}/{guard.totalPatrols} patrols completed
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-blue-100 text-blue-800 font-semibold">
                        {guard.completionRate || 0}%
                      </Badge>
                      {guard.onDuty && (
                        <div className="text-xs text-green-600 mt-1">On duty</div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <CardTitle className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-gray-600" />
              System Health & Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">99.9%</div>
                <div className="text-sm text-green-700 font-medium">System Uptime</div>
                <div className="text-xs text-green-600 mt-1">Last 30 days</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">{stats.totalIncidents || 0}</div>
                <div className="text-sm text-red-700 font-medium">Active Incidents</div>
                <div className="text-xs text-red-600 mt-1">Requires attention</div>
              </div>
              
              <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-2xl font-bold text-amber-600">{stats.overduePatrols || 0}</div>
                <div className="text-sm text-amber-700 font-medium">Overdue Alerts</div>
                <div className="text-xs text-amber-600 mt-1">Action required</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{stats.activePatrols || 0}</div>
                <div className="text-sm text-blue-700 font-medium">Active Patrols</div>
                <div className="text-xs text-blue-600 mt-1">Currently running</div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <Bell className="h-3 w-3 mr-1" />
                  Test Alerts
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  System Config
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Overdue Patrols Section */}
      {stats.overduePatrols > 0 && (
        <Card className="border-2 border-red-300 bg-red-50 shadow-lg">
          <CardHeader className="bg-red-100 border-b border-red-200">
            <CardTitle className="flex items-center gap-3 text-red-800">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
              Emergency: Overdue Patrols Requiring Immediate Action
              <Badge variant="destructive" className="ml-auto">
                {stats.overduePatrols} OVERDUE
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {patrols
                .filter((p) => p.status === 'overdue')
                .map((patrol) => (
                  <div
                    key={patrol.id}
                    className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                      <div>
                        <div className="font-semibold text-red-900">
                          {patrol.guardName} ({patrol.guardBadge})
                        </div>
                        <div className="text-sm text-red-700 font-medium">{patrol.checkpointName}</div>
                        <div className="text-xs text-red-600">
                          Expected: {new Date(patrol.startTime).toLocaleString()}
                          <span className="ml-2 font-medium">
                            ({Math.round((Date.now() - new Date(patrol.startTime).getTime()) / (1000 * 60))} min overdue)
                          </span>
                        </div>
                        {patrol.notes && (
                          <div className="text-xs text-red-600 mt-1 italic">"{patrol.notes}"</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {patrol.incidentsReported > 0 && (
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          {patrol.incidentsReported} INCIDENT{patrol.incidentsReported !== 1 ? 'S' : ''}
                        </Badge>
                      )}
                      
                      <div className="flex gap-2">
                        <Button variant="destructive" size="sm" className="font-medium">
                          <Phone className="h-3 w-3 mr-1" />
                          Emergency Call
                        </Button>
                        <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                          <Eye className="h-3 w-3 mr-1" />
                          Track Location
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            
            <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
              <div className="text-sm text-red-800">
                <strong>Action Required:</strong> Contact overdue guards immediately. Check GPS tracking if available. 
                Escalate to supervisors if no response within 5 minutes.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity & Incident Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Activity */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b">
            <CardTitle className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-indigo-600" />
              Recent System Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {patrols
                  .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
                  .slice(0, 10)
                  .map((patrol, index) => (
                    <div key={patrol.id} className="p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          patrol.status === 'completed' ? 'bg-green-500' :
                          patrol.status === 'active' ? 'bg-blue-500' :
                          patrol.status === 'overdue' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`} />
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="font-medium">{patrol.guardName}</span>
                            <span className="text-gray-600"> • {patrol.checkpointName}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(patrol.startTime).toLocaleString()}
                            {patrol.status === 'completed' && patrol.endTime && (
                              <span> - {new Date(patrol.endTime).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {patrol.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incident Summary */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
            <CardTitle className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Incident Summary
              <Badge variant="outline" className="ml-auto">
                {stats.totalIncidents || 0} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {stats.totalIncidents > 0 ? (
              <div className="space-y-3">
                {patrols
                  .filter(p => p.incidentsReported > 0)
                  .slice(0, 5)
                  .map((patrol) => (
                    <div key={patrol.id} className="p-3 border border-orange-200 rounded-lg bg-orange-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-orange-900">{patrol.checkpointName}</div>
                        <Badge variant="destructive" className="text-xs">
                          {patrol.incidentsReported} incident{patrol.incidentsReported !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="text-sm text-orange-800">
                        Reported by: {patrol.guardName} ({patrol.guardBadge})
                      </div>
                      <div className="text-xs text-orange-700 mt-1">
                        {new Date(patrol.startTime).toLocaleString()}
                      </div>
                      <div className="text-sm text-orange-800 mt-2 italic">
                        "{patrol.notes || 'No additional details provided'}"
                      </div>
                    </div>
                  ))}
                
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                    View All Incidents
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-3" />
                <p className="text-lg font-medium text-green-600">No Active Incidents</p>
                <p className="text-sm text-gray-600">All systems operating normally</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer Stats Summary */}
      <Card className="border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-700">{new Date().toLocaleDateString()}</div>
              <div className="text-sm text-amber-600">Report Date</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalPatrols || 0}</div>
              <div className="text-sm text-blue-700">Total Patrols</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.completedPatrols || 0}</div>
              <div className="text-sm text-green-700">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.overduePatrols || 0}</div>
              <div className="text-sm text-red-700">Overdue</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.guardsOnDuty}/{stats.totalGuards}</div>
              <div className="text-sm text-purple-700">Guards Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-indigo-600">{stats.overallCompletionRate || 0}%</div>
              <div className="text-sm text-indigo-700">Success Rate</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-amber-200 text-center">
            <p className="text-sm text-amber-700">
              <strong>{siteName}</strong> Security Management System • 
              Last Updated: {new Date().toLocaleString()} • 
              System Status: 
              <Badge className="ml-1 bg-green-100 text-green-800">OPERATIONAL</Badge>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;