import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { decodeToken } from "react-jwt";

const PatrolLogsDashboard = () => {
  // Memoize stable values to prevent infinite re-renders
  const stableToken = useMemo(() => localStorage.getItem("token"), []);
  const stableUser = useMemo(() => stableToken ? decodeToken(stableToken) : null, [stableToken]);
  const stableRole = useMemo(() => stableUser?.role || "guard", [stableUser]);

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedShift, setSelectedShift] = useState('all');
  const [overdueLogs, setOverdueLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [exportLoading, setExportLoading] = useState({});
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // Clear success message after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle authentication errors
  const handleAuthError = useCallback((response) => {
    if (response.status === 401) {
      localStorage.removeItem("token");
      setError("Session expired. Redirecting to login...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return true;
    }
    return false;
  }, []);

  // Fetch patrol logs with stable dependencies
  const fetchPatrolLogs = useCallback(async () => {
    if (!stableToken) {
      setError("Authentication token is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        sortBy: "createdAt",
        sortOrder: "DESC"
      });

      // Only add non-empty filter values
      if (filters.search.trim()) params.append('search', filters.search.trim());
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (selectedShift !== "all") params.append('shift', selectedShift);

      const endpoint = stableRole === "guard" 
        ? `/api/patrol-logs/my-logs?${params}`
        : `/api/patrol-logs?${params}`;

      const response = await fetch(endpoint, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stableToken}` 
        }
      });

      if (handleAuthError(response)) return;
      if (!response.ok) throw new Error("Failed to fetch patrol logs");

      const data = await response.json();
      setLogs(data.data.logs || []);
      setTotalPages(data.data.pagination?.totalPages || 1);
      setStats(data.data.stats || null);
    } catch (err) {
      console.error('Fetch patrol logs error:', err);
      setError(err.message || "Failed to fetch patrol logs");
    } finally {
      setLoading(false);
    }
  }, [stableToken, currentPage, filters, selectedShift, stableRole, handleAuthError]);

  // Fetch overdue logs with stable dependencies
  const fetchOverdueLogs = useCallback(async () => {
    if (stableRole !== 'admin' || !stableToken) return;

    try {
      const response = await fetch('/api/patrol-logs/overdue?hours=24', {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stableToken}` 
        }
      });

      if (handleAuthError(response)) return;
      if (!response.ok) {
        console.error('Failed to fetch overdue logs');
        return;
      }

      const data = await response.json();
      setOverdueLogs(data.data || []);
    } catch (error) {
      console.error('Failed to fetch overdue logs:', error);
    }
  }, [stableRole, stableToken, handleAuthError]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchPatrolLogs();
  }, [fetchPatrolLogs]);

  useEffect(() => {
    fetchOverdueLogs();
  }, [fetchOverdueLogs]);

  // Refresh data when refresh trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchPatrolLogs();
      if (stableRole === 'admin') {
        fetchOverdueLogs();
      }
    }
  }, [refreshTrigger, fetchPatrolLogs, fetchOverdueLogs, stableRole]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedShift]);

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

  // Handle patrol actions with refresh trigger
  const handlePatrolAction = async (logId, action) => {
    if (!stableToken) {
      setError("Authentication token is required");
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [logId]: action }));
      setError('');

      const response = await fetch(`/api/patrol-logs/${logId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stableToken}`
        }
      });

      if (handleAuthError(response)) return;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} patrol`);
      }

      const actionMessages = {
        start: 'Patrol started successfully',
        end: 'Patrol ended successfully', 
        complete: 'Patrol marked as complete'
      };
      
      setSuccessMessage(actionMessages[action] || 'Action completed successfully');
      
      // Trigger refresh without calling functions directly
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error(`Failed to ${action} patrol:`, error);
      setError(error.message || `Failed to ${action} patrol`);
    } finally {
      setActionLoading(prev => ({ ...prev, [logId]: null }));
    }
  };

  // Handle export with proper parameter handling and better error messages
  const handleExport = async (type) => {
    if (!stableToken) {
      setError("Authentication token is required");
      return;
    }

    try {
      setExportLoading(prev => ({ ...prev, [type]: true }));
      setError('');

      // Create clean query parameters - only include non-empty values
      const params = new URLSearchParams();
      if (filters.search && filters.search.trim()) {
        params.append('search', filters.search.trim());
      }
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      if (selectedShift !== "all") {
        params.append('shift', selectedShift);
      }

      const queryString = params.toString();
      const url = `/api/patrol-logs/export/${type}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': type === 'pdf' ? 'application/pdf' : 'text/csv',
          Authorization: `Bearer ${stableToken}`
        }
      });

      if (handleAuthError(response)) return;

      if (response.status === 403) {
        throw new Error("You don't have permission to export logs. Please contact your administrator.");
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Export failed with status ${response.status}:`, errorText);
        throw new Error(`Failed to export ${type}: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `patrol-logs-${new Date().toISOString().split('T')[0]}.${type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      setSuccessMessage(`${type.toUpperCase()} export completed successfully`);
    } catch (error) {
      console.error(`Export ${type} failed:`, error);
      setError(error.message || `Failed to export ${type}`);
    } finally {
      setExportLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Simplified manual refresh handler - no double loading
  const handleManualRefresh = useCallback(async () => {
    await Promise.all([
      fetchPatrolLogs(),
      stableRole === 'admin' ? fetchOverdueLogs() : Promise.resolve()
    ]);
  }, [fetchPatrolLogs, fetchOverdueLogs, stableRole]);

  // Render action buttons based on status
  const renderActionButtons = (log) => {
    const logId = log.id || log._id;
    const isLoading = actionLoading[logId];
    
    return (
      <div className="flex gap-2">
        {log.status === 'pending' && (
          <Button 
            size="sm" 
            onClick={() => handlePatrolAction(logId, 'start')}
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
            onClick={() => handlePatrolAction(logId, 'end')}
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
        
        {(log.status === 'pending' || log.status === 'in-progress') && stableRole === 'admin' && (
          <Button 
            size="sm" 
            onClick={() => handlePatrolAction(logId, 'complete')}
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
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-500">Loading patrol logs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stableToken) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Authentication Required:</strong> Please log in to access the patrol logs dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Stronger error boundary for empty state with errors
  if (error && logs.length === 0 && !loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Error:</strong> {error} – try refreshing or contact support.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={handleManualRefresh} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Retry
          </Button>
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
          </h1>
          <p className="text-gray-600 mt-1">Monitor and manage security patrol activities</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleManualRefresh}
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          
          <Button 
            onClick={() => handleExport('csv')} 
            variant="outline" 
            size="sm" 
            disabled={exportLoading.csv || loading}
          >
            {exportLoading.csv ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
          
          <Button 
            onClick={() => handleExport('pdf')} 
            variant="outline" 
            size="sm" 
            disabled={exportLoading.pdf || loading}
          >
            {exportLoading.pdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

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
                <span className="text-gray-600">{stats.statusBreakdown?.completed || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-blue-600" />
                <span className="font-medium">In Progress:</span>
                <span className="text-gray-600">{stats.statusBreakdown?.['in-progress'] || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Pending:</span>
                <span className="text-gray-600">{stats.statusBreakdown?.pending || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium">Skipped:</span>
                <span className="text-gray-600">{stats.statusBreakdown?.skipped || 0}</span>
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

          {/* Patrol Logs Table with MongoDB _id support */}
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
                        <tr key={log.id || log._id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          {/* Column 1: ID */}
                          <td className="p-4">
                            <span className="font-medium text-gray-900">#{log.id || log._id}</span>
                          </td>
                          
                          {/* Column 2: Guard */}
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-900">{log.guard?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{log.guard?.email || ''}</div>
                            </div>
                          </td>
                          
                          {/* Column 3: Checkpoint */}
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-900">{log.checkpoint?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{log.checkpoint?.location || ''}</div>
                            </div>
                          </td>
                          
                          {/* Column 4: Status */}
                          <td className="p-4">
                            {getStatusBadge(log.status)}
                          </td>
                          
                          {/* Column 5: Timestamp */}
                          <td className="p-4 text-gray-600">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          
                          {/* Column 6: Duration */}
                          <td className="p-4 text-gray-600">
                            {log.startTime && log.endTime ? (
                              `${Math.round((new Date(log.endTime) - new Date(log.startTime)) / 60000)}m`
                            ) : log.startTime ? (
                              `${Math.round((new Date() - new Date(log.startTime)) / 60000)}m`
                            ) : (
                              '-'
                            )}
                          </td>
                          
                          {/* Column 7: Notes */}
                          <td className="p-4 max-w-xs">
                            <span className="text-gray-600 truncate block" title={log.notes}>
                              {log.notes || 'No notes'}
                            </span>
                          </td>
                          
                          {/* Column 8: Actions */}
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