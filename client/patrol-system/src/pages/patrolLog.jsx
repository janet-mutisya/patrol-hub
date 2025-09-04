import React, { useState, useEffect } from 'react';
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
  Shield
} from 'lucide-react';

const PatrolLogsDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [overdueLogs, setOverdueLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // Mock data
  const mockLogs = [
    {
      id: 1,
      timestamp: '2024-12-27T10:30:00Z',
      status: 'completed',
      notes: 'All security checks completed successfully',
      guard: { name: 'John Doe', email: 'john@company.com' },
      checkpoint: { name: 'Main Entrance', location: 'Building A' }
    },
    {
      id: 2,
      timestamp: '2024-12-27T14:15:00Z',
      status: 'pending',
      notes: 'Awaiting completion',
      guard: { name: 'Jane Smith', email: 'jane@company.com' },
      checkpoint: { name: 'Parking Lot', location: 'Area B' }
    },
    {
      id: 3,
      timestamp: '2024-12-27T09:00:00Z',
      status: 'skipped',
      notes: 'Equipment malfunction reported',
      guard: { name: 'Mike Johnson', email: 'mike@company.com' },
      checkpoint: { name: 'Emergency Exit', location: 'Building C' }
    },
    {
      id: 4,
      timestamp: '2024-12-27T16:45:00Z',
      status: 'completed',
      notes: 'Routine patrol completed',
      guard: { name: 'Sarah Wilson', email: 'sarah@company.com' },
      checkpoint: { name: 'Warehouse', location: 'Building D' }
    }
  ];

  const mockStats = {
    totalLogs: 150,
    uniqueGuards: 12,
    uniqueCheckpoints: 25,
    avgDurationMinutes: 15,
    statusBreakdown: {
      completed: 85,
      pending: 45,
      skipped: 20
    }
  };

  const mockOverdue = [
    {
      id: 5,
      timestamp: '2024-12-26T18:00:00Z',
      status: 'pending',
      notes: 'Night shift patrol overdue',
      guard: { name: 'Tom Brown', email: 'tom@company.com' },
      checkpoint: { name: 'Server Room', location: 'Building E' }
    }
  ];

  useEffect(() => {
    // Simulate API loading
    const timer = setTimeout(() => {
      setLogs(mockLogs);
      setStats(mockStats);
      setOverdueLogs(mockOverdue);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusBadge = (status) => {
    const variants = {
      completed: { 
        variant: "default", 
        icon: CheckCircle, 
        className: "bg-green-100 text-green-800 hover:bg-green-100"
      },
      pending: { 
        variant: "secondary", 
        icon: Clock, 
        className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      },
      skipped: { 
        variant: "destructive", 
        icon: XCircle, 
        className: "bg-red-100 text-red-800 hover:bg-red-100"
      }
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleExport = (type) => {
    console.log(`Exporting as ${type}`);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !filters.search || 
      log.guard.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      log.checkpoint.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      log.notes.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesStatus = !filters.status || log.status === filters.status;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
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
                
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>

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
                      <th className="text-left p-4 font-semibold text-gray-900">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-gray-500">
                          No patrol logs found
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log, index) => (
                        <tr key={log.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="p-4">
                            <span className="font-medium text-gray-900">#{log.id}</span>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-900">{log.guard.name}</div>
                              <div className="text-sm text-gray-500">{log.guard.email}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-900">{log.checkpoint.name}</div>
                              <div className="text-sm text-gray-500">{log.checkpoint.location}</div>
                            </div>
                          </td>
                          <td className="p-4">{getStatusBadge(log.status)}</td>
                          <td className="p-4 text-gray-600">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4 max-w-xs">
                            <span className="text-gray-600 truncate block">
                              {log.notes || 'No notes'}
                            </span>
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
                              <div className="font-medium text-gray-900">{log.guard.name}</div>
                              <div className="text-sm text-gray-500">{log.guard.email}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-900">{log.checkpoint.name}</div>
                              <div className="text-sm text-gray-500">{log.checkpoint.location}</div>
                            </div>
                          </td>
                          <td className="p-4 text-red-600 font-medium">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              Mark Complete
                            </Button>
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