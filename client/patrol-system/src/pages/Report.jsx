import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileBarChart, 
  Download, 
  MapPin,
  Target,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  User,
  Shield
} from 'lucide-react';

const ReportsPage = ({ userRole = 'admin', authToken = 'your-jwt-token-here' }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Report data states
  const [checkpointReport, setCheckpointReport] = useState([]);
  const [guardReport, setGuardReport] = useState([]);
  const [myPerformanceReport, setMyPerformanceReport] = useState(null);
  const [summaryReport, setSummaryReport] = useState(null);
  const [missedVisits, setMissedVisits] = useState([]);

  const isAdmin = userRole === 'admin';
  const isGuard = userRole === 'guard';

  // Helper functions
  const getCompletionRate = (completed, expected) => {
    if (expected === 0) return 100;
    return Math.round((completed / expected) * 100);
  };

  const getStatusBadge = (rate) => {
    if (rate >= 95) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (rate >= 80) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Attention</Badge>;
  };

  const makeApiCall = async (endpoint) => {
    const response = await fetch(endpoint, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  };
  // ====================
// Admin API calls
// ====================
const fetchCheckpointReport = async () => {
  try {
    const data = await makeApiCall(`/api/reports/checkpoints?date=${selectedDate}&shift=${selectedShift}`);
    setCheckpointReport(Array.isArray(data) ? data : []);  // ✅ always array
  } catch (error) {
    console.error("Error fetching checkpoint report:", error);
    setCheckpointReport([]); // ✅ prevent crash
  }
};

const fetchGuardReport = async () => {
  try {
    const data = await makeApiCall(`/api/reports/guards?date=${selectedDate}&shift=${selectedShift}`);
    setGuardReport(Array.isArray(data) ? data : []); // ✅ always array
  } catch (error) {
    console.error("Error fetching guard report:", error);
    setGuardReport([]); // ✅ prevent crash
  }
};

// ====================
// Guard API calls
// ====================
const fetchMyPerformanceReport = async () => {
  try {
    const data = await makeApiCall(`/api/reports/my-performance?date=${selectedDate}&shift=${selectedShift}`);
    setMyPerformanceReport(Array.isArray(data) ? data : []); // ✅ always array
  } catch (error) {
    console.error("Error fetching my performance report:", error);
    setMyPerformanceReport([]); // ✅ prevent crash
  }
};

// ====================
// Shared API calls
// ====================
const fetchSummaryReport = async () => {
  try {
    const data = await makeApiCall(`/api/reports/summary?date=${selectedDate}&shift=${selectedShift}`);
    setSummaryReport(Array.isArray(data) ? data : []); // ✅ always array
  } catch (error) {
    console.error("Error fetching summary report:", error);
    setSummaryReport([]); // ✅ prevent crash
  }
};

const fetchMissedVisits = async () => {
  try {
    const data = await makeApiCall(`/api/reports/missed-visits?date=${selectedDate}&shift=${selectedShift}`);
    setMissedVisits(Array.isArray(data) ? data : []); // ✅ always array
  } catch (error) {
    console.error("Error fetching missed visits:", error);
    setMissedVisits([]); // ✅ prevent crash
  }
};

// ====================
// Fetch all reports together
// ====================
const fetchAllReports = async () => {
  setLoading(true);
  setError(null);

  try {
    const promises = [fetchSummaryReport(), fetchMissedVisits()];

    if (isAdmin) {
      promises.push(fetchCheckpointReport(), fetchGuardReport());
    } else if (isGuard) {
      promises.push(fetchMyPerformanceReport());
    }

    await Promise.all(promises);
  } catch (error) {
    console.error("Error loading reports:", error);
    setError(`Failed to load reports: ${error.message || error}`);
  } finally {
    setLoading(false);
  }
};

// ====================
// Export reports
// ====================
const handleExport = (format) => {
  if (!isAdmin) return;

  const params = new URLSearchParams({
    date: selectedDate,
    shift: selectedShift
  });

  window.open(`/api/reports/export/${format}?${params}`, '_blank');
};
  useEffect(() => {
    fetchAllReports();
  }, [selectedDate, selectedShift, userRole, authToken]);

  // Get tabs based on user role
  const getAvailableTabs = () => {
    if (isAdmin) {
      return [
        { value: 'checkpoints', label: 'Checkpoints' },
        { value: 'guards', label: 'Guards' },
        { value: 'missed', label: 'Missed Visits' },
        { value: 'performance', label: 'Performance' }
      ];
    } else if (isGuard) {
      return [
        { value: 'my-performance', label: 'My Performance' },
        { value: 'missed', label: 'My Missed Visits' },
        { value: 'summary', label: 'Summary' }
      ];
    }
    return [];
  };

  const tabs = getAvailableTabs();

  // Memoized performance calculations for admin
  const performanceStats = useMemo(() => {
  if (!isAdmin || !Array.isArray(checkpointReport) || checkpointReport.length === 0) {
    return { excellent: 0, good: 0, needsAttention: 0 };
  }

  return checkpointReport.reduce((stats, item) => {
    const rate = getCompletionRate(item.completed, item.expected);
    if (rate >= 95) stats.excellent++;
    else if (rate >= 80) stats.good++;
    else stats.needsAttention++;
    return stats;
  }, { excellent: 0, good: 0, needsAttention: 0 });
}, [checkpointReport, isAdmin]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart className="h-8 w-8 text-blue-600" />
            Security Reports
            {isGuard && <User className="h-6 w-6 text-green-600 ml-2" />}
            {isAdmin && <Shield className="h-6 w-6 text-purple-600 ml-2" />}
          </h1>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Generate and view all patrol performance reports' : 'View your patrol performance reports'}
          </p>
        </div>
        
        {isAdmin && (
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
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAllReports} 
              className="ml-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Shift</label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={fetchAllReports} 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Generate Reports'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summaryReport && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {isGuard ? 'My Checkpoints' : 'Total Checkpoints'}
              </CardTitle>
              <MapPin className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryReport.totalCheckpoints || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Expected Visits</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryReport.totalExpected || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summaryReport.totalCompleted || 0}</div>
              <p className="text-xs text-gray-500">
                {getCompletionRate(summaryReport.totalCompleted || 0, summaryReport.totalExpected || 0)}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Missed</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summaryReport.totalMissed || 0}</div>
              <p className="text-xs text-gray-500">
                {summaryReport.totalMissed > 0 ? 'Requires attention' : 'Great job!'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Tabs */}
      {tabs.length > 0 && (
        <Tabs defaultValue={tabs[0]?.value} className="space-y-4">
          <TabsList 
            className="grid w-full" 
            style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
          >
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Admin: Checkpoint Report */}
          {isAdmin && (
            <TabsContent value="checkpoints">
              <Card>
                <CardHeader>
                  <CardTitle>Checkpoint Performance Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold">Checkpoint</th>
                          <th className="text-left p-3 font-semibold">Expected</th>
                          <th className="text-left p-3 font-semibold">Completed</th>
                          <th className="text-left p-3 font-semibold">Missed</th>
                          <th className="text-left p-3 font-semibold">Rate</th>
                          <th className="text-left p-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={6} className="text-center p-6">
                              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                              Loading checkpoint data...
                            </td>
                          </tr>
                        ) : checkpointReport.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center p-6 text-gray-500">
                              No checkpoint data available for the selected date and shift.
                            </td>
                          </tr>
                        ) : (
                          checkpointReport.map((item, index) => {
                            const rate = getCompletionRate(item.completed, item.expected);
                            return (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{item.checkpointName}</td>
                                <td className="p-3">{item.expected}</td>
                                <td className="p-3 text-green-600 font-medium">{item.completed}</td>
                                <td className="p-3 text-red-600 font-medium">{item.missed}</td>
                                <td className="p-3">{rate}%</td>
                                <td className="p-3">{getStatusBadge(rate)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Admin: Guard Report */}
          {isAdmin && (
            <TabsContent value="guards">
              <Card>
                <CardHeader>
                  <CardTitle>Guard Performance Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold">Guard</th>
                          <th className="text-left p-3 font-semibold">Expected</th>
                          <th className="text-left p-3 font-semibold">Completed</th>
                          <th className="text-left p-3 font-semibold">Missed</th>
                          <th className="text-left p-3 font-semibold">Rate</th>
                          <th className="text-left p-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={6} className="text-center p-6">
                              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                              Loading guard data...
                            </td>
                          </tr>
                        ) : guardReport.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center p-6 text-gray-500">
                              No guard data available for the selected date and shift.
                            </td>
                          </tr>
                        ) : (
                          guardReport.map((item, index) => {
                            const rate = getCompletionRate(item.completed, item.expected);
                            return (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{item.guardName}</td>
                                <td className="p-3">{item.expected}</td>
                                <td className="p-3 text-green-600 font-medium">{item.completed}</td>
                                <td className="p-3 text-red-600 font-medium">{item.missed}</td>
                                <td className="p-3">{rate}%</td>
                                <td className="p-3">{getStatusBadge(rate)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Guard: My Performance Report */}
          {isGuard && (
            <TabsContent value="my-performance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-green-600" />
                    My Performance Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center p-6">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading your performance data...
                    </div>
                  ) : !myPerformanceReport ? (
                    <div className="text-center p-6 text-gray-500">
                      <User className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No performance data available for the selected date and shift.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-sm text-blue-600">Expected Visits</div>
                          <div className="text-2xl font-bold text-blue-700">{myPerformanceReport.expected || 0}</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-sm text-green-600">Completed</div>
                          <div className="text-2xl font-bold text-green-700">{myPerformanceReport.completed || 0}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <div className="text-sm text-red-600">Missed</div>
                          <div className="text-2xl font-bold text-red-700">{myPerformanceReport.missed || 0}</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-sm text-purple-600">Completion Rate</div>
                          <div className="text-2xl font-bold text-purple-700">
                            {getCompletionRate(myPerformanceReport.completed || 0, myPerformanceReport.expected || 0)}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Overall Status</h4>
                        {getStatusBadge(getCompletionRate(myPerformanceReport.completed || 0, myPerformanceReport.expected || 0))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Missed Visits (Both roles) */}
          <TabsContent value="missed">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  {isGuard ? 'My Missed Visits' : 'Missed Visits Report'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center p-6">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading missed visits data...
                  </div>
                ) : missedVisits.length === 0 ? (
                  <div className="text-center p-6 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    <p>No missed visits for the selected date and shift!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-red-50">
                          <th className="text-left p-3 font-semibold">Checkpoint</th>
                          {isAdmin && <th className="text-left p-3 font-semibold">Guard</th>}
                          <th className="text-left p-3 font-semibold">Expected</th>
                          <th className="text-left p-3 font-semibold">Completed</th>
                          <th className="text-left p-3 font-semibold">Missed</th>
                          <th className="text-left p-3 font-semibold">Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missedVisits.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-red-50">
                            <td className="p-3 font-medium">{item.checkpointName}</td>
                            {isAdmin && <td className="p-3">{item.guardName}</td>}
                            <td className="p-3">{item.expected}</td>
                            <td className="p-3 text-yellow-600 font-medium">{item.completed}</td>
                            <td className="p-3 text-red-600 font-bold">{item.missed}</td>
                            <td className="p-3">
                              <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'}>
                                {item.priority || 'High'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Guard: Summary Tab */}
          {isGuard && (
            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>My Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center p-6">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading summary data...
                    </div>
                  ) : !summaryReport ? (
                    <div className="text-center p-6 text-gray-500">
                      <Target className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No summary data available for the selected date and shift.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                          {getCompletionRate(summaryReport.totalCompleted || 0, summaryReport.totalExpected || 0)}%
                        </div>
                        <div className="text-lg text-gray-600">Overall Completion Rate</div>
                        <div className="mt-2">
                          {getStatusBadge(getCompletionRate(summaryReport.totalCompleted || 0, summaryReport.totalExpected || 0))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{summaryReport.totalCompleted || 0}</div>
                          <div className="text-sm text-green-700">Completed Visits</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{summaryReport.totalMissed || 0}</div>
                          <div className="text-sm text-red-700">Missed Visits</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Admin: Performance Overview */}
          {isAdmin && (
            <TabsContent value="performance">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center p-6">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading performance overview...
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                          <span className="font-medium">Excellent Performance (≥95%)</span>
                          <Badge className="bg-green-100 text-green-800">
                            {performanceStats.excellent} checkpoints
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                          <span className="font-medium">Good Performance (80-94%)</span>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {performanceStats.good} checkpoints
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                          <span className="font-medium">Needs Attention (&lt;80%)</span>
                          <Badge className="bg-red-100 text-red-800">
                            {performanceStats.needsAttention} checkpoints
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
};

export default ReportsPage;