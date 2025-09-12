import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Download, 
  Users,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Shield,
  Play,
  Square,
  Loader2
} from 'lucide-react';

const PatrolLogsDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedShift, setSelectedShift] = useState('all');
  const [overdueLogs, setOverdueLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [authError, setAuthError] = useState(false);

  // Get user role and token - NO FALLBACK for token
  const userRole = 'admin'; // Hardcoded for demo, replace with real logic
  const token = localStorage.getItem('token'); 

  // Clear success message after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Generate mock data
  const generateMockData = useCallback(() => {
    const mockLogs = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        status: 'completed',
        notes: 'All security checks completed successfully. Perimeter secure.',
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date().toISOString(),
        guard: { name: 'John Doe', email: 'john@company.com' },
        checkpoint: { name: 'Main Entrance', location: 'Building A' }
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        status: 'pending',
        notes: 'Scheduled patrol awaiting guard assignment',
        guard: { name: 'Jane Smith', email: 'jane@company.com' },
        checkpoint: { name: 'Parking Lot', location: 'Area B' }
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        status: 'in-progress',
        notes: 'Currently patrolling assigned area',
        startTime: new Date(Date.now() - 1800000).toISOString(),
        guard: { name: 'Mike Johnson', email: 'mike@company.com' },
        checkpoint: { name: 'Emergency Exit', location: 'Building C' }
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        status: 'skipped',
        notes: 'Guard unavailable - shift coverage needed',
        guard: { name: 'Sarah Wilson', email: 'sarah@company.com' },
        checkpoint: { name: 'Rooftop Access', location: 'Building D' }
      },
      {
        id: 5,
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        status: 'completed',
        notes: 'Night patrol completed without incidents',
        startTime: new Date(Date.now() - 16200000).toISOString(),
        endTime: new Date(Date.now() - 14400000).toISOString(),
        guard: { name: 'Tom Brown', email: 'tom@company.com' },
        checkpoint: { name: 'Server Room', location: 'Building E' }
      }
    ];

    const mockStats = {
      totalLogs: 150,
      uniqueGuards: 12,
      uniqueCheckpoints: 25,
      avgDurationMinutes: 18,
      statusBreakdown: {
        completed: 85,
        pending: 35,
        skipped: 20,
        'in-progress': 10
      }
    };

    const mockOverdue = [
      {
        id: 6,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'pending',
        notes: 'Night shift patrol overdue - requires immediate attention',
        guard: { name: 'Alex Chen', email: 'alex@company.com' },
        checkpoint: { name: 'Warehouse', location: 'Building F' }
      },
      {
        id: 7,
        timestamp: new Date(Date.now() - 129600000).toISOString(),
        status: 'pending',
        notes: 'Weekend patrol missed - security gap identified',
        guard: { name: 'Lisa Martinez', email: 'lisa@company.com' },
        checkpoint: { name: 'Loading Dock', location: 'Area G' }
      }
    ];

    return { logs: mockLogs, stats: mockStats, overdue: mockOverdue };
  }, []);

  // Fetch patrol logs with filters and pagination
  const fetchPatrolLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setAuthError(false);

      // If no token, use demo data immediately
      if (!token) {
        console.log('No token found, using demo data');
        const mockData = generateMockData();
        setLogs(mockData.logs);
        setStats(mockData.stats);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(selectedShift && selectedShift !== 'all' && { shift: selectedShift }),
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });

      const endpoint = userRole === 'guard' 
        ? '/api/patrol-logs/my-logs' 
        : `/api/patrol-logs?${params}`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        setAuthError(true);
        throw new Error('Authentication failed. Please log in again.');
      }

      if (response.ok) {
        const data = await response.json();
        setLogs(data.data.logs || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
        
        // Set stats if provided
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      } else {
        throw new Error(`Failed to fetch patrol logs: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch patrol logs:', error);
      setError(error.message || 'Failed to fetch patrol logs');
      
      // Use mock data as fallback
      if (!authError) {
        const mockData = generateMockData();
        setLogs(mockData.logs);
        setStats(mockData.stats);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, selectedShift, userRole, token, generateMockData, authError]);

  // Fetch overdue logs
  const fetchOverdueLogs = useCallback(async () => {
    if (userRole !== 'admin') return;

    try {
      // If no token, use demo data
      if (!token) {
        const mockData = generateMockData();
        setOverdueLogs(mockData.overdue);
        return;
      }

      const response = await fetch('/api/patrol-logs/overdue?hours=24', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOverdueLogs(data.data || []);
      } else {
        console.error('Failed to fetch overdue logs');
        // Use mock overdue data
        const mockData = generateMockData();
        setOverdueLogs(mockData.overdue);
      }
    } catch (error) {
      console.error('Failed to fetch overdue logs:', error);
      // Use mock overdue data as fallback
      const mockData = generateMockData();
      setOverdueLogs(mockData.overdue);
    }
  }, [userRole, token, generateMockData]);

  useEffect(() => {
    fetchPatrolLogs();
    fetchOverdueLogs();
  }, [fetchPatrolLogs, fetchOverdueLogs]);

  // Status badge with support for all statuses
  const getStatusBadge = (status) => {
    const variants = {
      completed: { 
        icon: CheckCircle, 
        className: "bg-green-100 text-green-800 hover:bg-green-100"
      },
      pending: { 
        icon: Clock, 
        className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      },
      'in-progress': { 
        icon: Play, 
        className: "bg-blue-100 text-blue-800 hover:bg-blue-100"
      },
      skipped: { 
        icon: XCircle, 
        className: "bg-red-100 text-red-800 hover:bg-red-100"
      }
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Handle patrol actions
  const handlePatrolAction = async (logId, action) => {
    try {
      setActionLoading(prev => ({ ...prev, [logId]: action }));
      setError('');

      // Demo mode - just simulate the action
      if (!token) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        
        const actionMessages = {
          start: 'Patrol started successfully',
          end: 'Patrol ended successfully', 
          complete: 'Patrol marked as complete'
        };
        
        setSuccessMessage(actionMessages[action] || 'Action completed successfully');
        
        // Update the log status in mock data
        setLogs(prevLogs => 
          prevLogs.map(log => {
            if (log.id === logId) {
              if (action === 'start') return { ...log, status: 'in-progress', startTime: new Date().toISOString() };
              if (action === 'end') return { ...log, status: 'completed', endTime: new Date().toISOString() };
              if (action === 'complete') return { ...log, status: 'completed', endTime: new Date().toISOString() };
            }
            return log;
          })
        );
        
        return;
      }

      const response = await fetch(`/api/patrol-logs/${logId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const actionMessages = {
          start: 'Patrol started successfully',
          end: 'Patrol ended successfully', 
          complete: 'Patrol marked as complete'
        };
        
        setSuccessMessage(actionMessages[action] || 'Action completed successfully');
        fetchPatrolLogs();
        fetchOverdueLogs();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} patrol`);
      }
    } catch (error) {
      console.error(`Failed to ${action} patrol:`, error);
      setError(error.message || `Failed to ${action} patrol`);
    } finally {
      setActionLoading(prev => ({ ...prev, [logId]: null }));
    }
  };

  // Handle export
  const handleExport = async (type) => {
    try {
      if (!token) {
        setSuccessMessage(`${type.toUpperCase()} export simulated successfully (demo mode)`);
        return;
      }

      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/patrol-logs/export/${type}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `patrol-logs-${new Date().toISOString().split('T')[0]}.${type}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setSuccessMessage(`${type.toUpperCase()} export completed successfully`);
      } else {
        throw new Error(`Failed to export ${type}`);
      }
    } catch (error) {
      console.error(`Export ${type} failed:`, error);
      setError(`Failed to export ${type}`);
    }
  };

  // Render action buttons based on status
  const renderActionButtons = (log) => {
    const isLoading = actionLoading[log.id];
    
    return (
      <div className="flex gap-2">
        {log.status === 'pending' && (
          <Button 
            size="sm" 
            onClick={() => handlePatrolAction(log.id, 'start')}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading === 'start' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Start
              </>
            )}
          </Button>
        )}
        
        {log.status === 'in-progress' && (
          <Button 
            size="sm" 
            onClick={() => handlePatrolAction(log.id, 'end')}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading === 'end' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Square className="h-4 w-4 mr-1" />
                End
              </>
            )}
          </Button>
        )}
        
        {(log.status === 'pending' || log.status === 'in-progress') && userRole === 'admin' && (
          <Button 
            size="sm" 
            onClick={() => handlePatrolAction(log.id, 'complete')}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading === 'complete' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  if (loading && logs.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Patrol Logs
            {!token && (
              <Badge className="ml-2 bg-orange-100 text-orange-800 text-xs">
                DEMO MODE
              </Badge>
            )}
          </h1>
          <p className="text-gray-600 mt-1">Monitor and manage security patrol activities</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => handleExport('pdf')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Demo Mode Notice */}
      {!token && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Demo Mode:</strong> This dashboard is showing sample data. Connect to a real backend API for live data.
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Patrols</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalLogs}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Guards</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.uniqueGuards}</div>
              <p className="text-xs text-gray-500 mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Checkpoints</CardTitle>
              <MapPin className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.uniqueCheckpoints}</div>
              <p className="text-xs text-gray-500 mt-1">Total locations</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.avgDurationMinutes}m</div>
              <p className="text-xs text-gray-500 mt-1">Per patrol</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Overview */}
      {stats && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Completed:</span>
                <span className="text-gray-600">{stats.statusBreakdown.completed}</span>
              </div>
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-blue-600" />
                <span className="font-medium">In Progress:</span>
                <span className="text-gray-600">{stats.statusBreakdown['in-progress'] || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Pending:</span>
                <span className="text-gray-600">{stats.statusBreakdown.pending}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium">Skipped:</span>
                <span className="text-gray-600">{stats.statusBreakdown.skipped}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Alert */}
      {overdueLogs.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <span className="font-medium">{overdueLogs.length} patrol(s) are overdue</span> and require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all">All Patrols</TabsTrigger>
          <TabsTrigger value="overdue" className="relative">
            Overdue
            {overdueLogs.length > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full bg-red-600 text-xs p-0 flex items-center justify-center">
                {overdueLogs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Shift</label>
                  <Select
                    value={selectedShift}
                    onValueChange={(value) => setSelectedShift(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shifts</SelectItem>
                      <SelectItem value="day">Day Shift</SelectItem>
                      <SelectItem value="night">Night Shift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
                <Input
                  type="date"
                  placeholder="End Date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Patrol Logs */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-semibold text-gray-900">ID</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Guard</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Checkpoint</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Timestamp</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Duration</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Notes</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-8 text-gray-500">
                          No patrol logs found
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, index) => (
                        <tr key={log.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="p-4">
                            <span className="font-medium text-gray-900">#{log.id}</span>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-900">{log.guard?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{log.guard?.email || ''}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-900">{log.checkpoint?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{log.checkpoint?.location || ''}</div>
                            </div>
                          </td>
                          <td className="p-4">{getStatusBadge(log.status)}</td>
                          <td className="p-4 text-gray-600">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4 text-gray-600">
                            {log.startTime && log.endTime ? (
                              `${Math.round((new Date(log.endTime) - new Date(log.startTime)) / 60000)}m`
                            ) : log.startTime ? (
                              `${Math.round((new Date() - new Date(log.startTime)) / 60000)}m`
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-4 max-w-xs">
                            <span className="text-gray-600 truncate block" title={log.notes}>
                              {log.notes || 'No notes'}
                            </span>
                          </td>
                          <td className="p-4">
                            {renderActionButtons(log)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                Overdue Patrols
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-red-50">
                      <th className="text-left p-4 font-semibold text-gray-900">ID</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Guard</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Checkpoint</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Overdue Since</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-gray-500">
                          No overdue patrols
                        </td>
                      </tr>
                    ) : (
                      overdueLogs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-red-25 bg-white">
                          <td className="p-4">
                            <span className="font-medium text-gray-900">#{log.id}</span>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-900">{log.guard?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{log.guard?.email || ''}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-900">{log.checkpoint?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{log.checkpoint?.location || ''}</div>
                            </div>
                          </td>
                          <td className="p-4 text-red-600 font-medium">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4">
                            {renderActionButtons(log)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatrolLogsDashboard;