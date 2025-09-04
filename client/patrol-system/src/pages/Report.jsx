import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  FileBarChart, 
  Download, 
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle,
  Target
} from 'lucide-react';

const ReportsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState('day');
  const [loading, setLoading] = useState(false);
  
  // Report data states
  const [checkpointReport, setCheckpointReport] = useState([]);
  const [guardReport, setGuardReport] = useState([]);
  const [summaryReport, setSummaryReport] = useState(null);
  const [missedVisits, setMissedVisits] = useState([]);

  // Mock API calls - replace with actual endpoints
  const fetchCheckpointReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/checkpoints?date=${selectedDate}&shift=${selectedShift}`);
      const data = await response.json();
      
      // Mock data
      setCheckpointReport([
        { checkpointName: 'Main Entrance', expected: 8, completed: 7, missed: 1 },
        { checkpointName: 'Parking Lot', expected: 6, completed: 6, missed: 0 },
        { checkpointName: 'Emergency Exit', expected: 4, completed: 3, missed: 1 },
        { checkpointName: 'Warehouse', expected: 12, completed: 10, missed: 2 }
      ]);
    } catch (error) {
      console.error('Error fetching checkpoint report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuardReport = async () => {
    try {
      const response = await fetch(`/api/reports/guards?date=${selectedDate}&shift=${selectedShift}`);
      const data = await response.json();
      
      // Mock data
      setGuardReport([
        { guardName: 'John Doe', expected: 30, completed: 26, missed: 4 },
        { guardName: 'Jane Smith', expected: 30, completed: 30, missed: 0 },
        { guardName: 'Mike Johnson', expected: 30, completed: 28, missed: 2 }
      ]);
    } catch (error) {
      console.error('Error fetching guard report:', error);
    }
  };

  const fetchSummaryReport = async () => {
    try {
      const response = await fetch(`/api/reports/summary?date=${selectedDate}&shift=${selectedShift}`);
      const data = await response.json();
      
      // Mock data
      setSummaryReport({
        totalCheckpoints: 25,
        totalExpected: 90,
        totalCompleted: 84,
        totalMissed: 6
      });
    } catch (error) {
      console.error('Error fetching summary report:', error);
    }
  };

  const fetchMissedVisits = async () => {
    try {
      const response = await fetch(`/api/reports/missed?date=${selectedDate}&shift=${selectedShift}`);
      const data = await response.json();
      
      // Mock data
      setMissedVisits([
        { checkpointName: 'Main Entrance', expected: 8, completed: 7, missed: 1 },
        { checkpointName: 'Emergency Exit', expected: 4, completed: 3, missed: 1 },
        { checkpointName: 'Warehouse', expected: 12, completed: 10, missed: 2 }
      ]);
    } catch (error) {
      console.error('Error fetching missed visits:', error);
    }
  };

  const handleExport = async (format) => {
    const params = new URLSearchParams({
      date: selectedDate,
      ...(selectedShift && { shift: selectedShift })
    });
    
    // window.open(`/api/reports/export/${format}?${params}`, '_blank');
    console.log(`Exporting ${format} report for ${selectedDate}`);
  };

  const fetchAllReports = () => {
    fetchCheckpointReport();
    fetchGuardReport();
    fetchSummaryReport();
    fetchMissedVisits();
  };

  useEffect(() => {
    fetchAllReports();
  }, [selectedDate, selectedShift]);

  const getCompletionRate = (completed, expected) => {
    if (expected === 0) return 100;
    return Math.round((completed / expected) * 100);
  };

  const getStatusBadge = (rate) => {
    if (rate >= 95) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (rate >= 80) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Attention</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart className="h-8 w-8 text-blue-600" />
            Security Reports
          </h1>
          <p className="text-gray-600 mt-1">Generate and view patrol performance reports</p>
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
                  <SelectValue placeholder="All Shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchAllReports} className="w-full">
                Generate Reports
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
              <CardTitle className="text-sm font-medium text-gray-600">Total Checkpoints</CardTitle>
              <MapPin className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryReport.totalCheckpoints}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Expected Visits</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryReport.totalExpected}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summaryReport.totalCompleted}</div>
              <p className="text-xs text-gray-500">
                {getCompletionRate(summaryReport.totalCompleted, summaryReport.totalExpected)}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Missed</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summaryReport.totalMissed}</div>
              <p className="text-xs text-gray-500">Requires attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Tabs */}
      <Tabs defaultValue="checkpoints" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
          <TabsTrigger value="guards">Guards</TabsTrigger>
          <TabsTrigger value="missed">Missed Visits</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Checkpoint Report */}
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
                        <td colSpan={6} className="text-center p-6">Loading...</td>
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

        {/* Guard Report */}
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
                    {guardReport.map((item, index) => {
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
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Missed Visits */}
        <TabsContent value="missed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Missed Visits Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {missedVisits.length === 0 ? (
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
                          <td className="p-3">{item.expected}</td>
                          <td className="p-3 text-yellow-600 font-medium">{item.completed}</td>
                          <td className="p-3 text-red-600 font-bold">{item.missed}</td>
                          <td className="p-3">
                            <Badge variant="destructive">High</Badge>
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

        {/* Performance Overview */}
        <TabsContent value="performance">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="font-medium">Excellent Performance (≥95%)</span>
                    <Badge className="bg-green-100 text-green-800">
                      {checkpointReport.filter(item => getCompletionRate(item.completed, item.expected) >= 95).length} checkpoints
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                    <span className="font-medium">Good Performance (80-94%)</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {checkpointReport.filter(item => {
                        const rate = getCompletionRate(item.completed, item.expected);
                        return rate >= 80 && rate < 95;
                      }).length} checkpoints
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <span className="font-medium">Needs Attention (80%)</span>
                    <Badge className="bg-red-100 text-red-800">
                      {checkpointReport.filter(item => getCompletionRate(item.completed, item.expected) < 80).length} checkpoints
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;