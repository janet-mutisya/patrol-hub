import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Menu,
  X,
  Shield,
  Users,
  Clock,
  MapPin,
  Calendar,
  FileText,
  AlertTriangle,
  RefreshCw,
  User,
  LogOut,
  Activity,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Download
} from 'lucide-react';

const AdminDashboard = ({ token, onLogout }) => {
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('guards');
  
  // Data state
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tab-specific data
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState({});
  const [tabError, setTabError] = useState({});

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Navigation items
  const navigationItems = [
    { id: 'guards', label: 'Manage Guards', icon: Users },
    { id: 'shifts', label: 'Manage Shifts', icon: Clock },
    { id: 'checkpoints', label: 'Manage Checkpoints', icon: MapPin },
    { id: 'attendance', label: 'Attendance History', icon: Calendar },
    { id: 'patrols', label: 'Patrol Logs', icon: Activity },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  // API utility function
  const makeApiCall = useCallback(async (endpoint, options = {}) => {
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const defaultHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${process.env.REACT_APP_API_URL || ''}${endpoint}`, {
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
  }, [token]);

  // Mock data for development - remove when backend is ready
  const getMockData = (tabId) => {
    switch (tabId) {
      case 'guards':
        return [
          { id: 1, username: 'john_doe', name: 'John Doe', email: 'john@example.com', role: 'guard', status: 'active', phone: '+254712345678', hire_date: '2025-01-15' },
          { id: 2, username: 'jane_smith', name: 'Jane Smith', email: 'jane@example.com', role: 'guard', status: 'active', phone: '+254712345679', hire_date: '2025-02-01' },
          { id: 3, username: 'mike_wilson', name: 'Mike Wilson', email: 'mike@example.com', role: 'guard', status: 'inactive', phone: '+254712345680', hire_date: '2024-12-10' },
          { id: 4, username: 'sarah_jones', name: 'Sarah Jones', email: 'sarah@example.com', role: 'supervisor', status: 'active', phone: '+254712345681', hire_date: '2024-11-20' }
        ];
      case 'shifts':
        return [
          { id: 1, name: 'Morning Shift', start_time: '06:00', end_time: '14:00', assigned_guard: 'John Doe', guard_id: 1, status: 'active', description: 'Standard morning security shift' },
          { id: 2, name: 'Evening Shift', start_time: '14:00', end_time: '22:00', assigned_guard: 'Jane Smith', guard_id: 2, status: 'active', description: 'Evening security coverage' },
          { id: 3, name: 'Night Shift', start_time: '22:00', end_time: '06:00', assigned_guard: 'Mike Wilson', guard_id: 3, status: 'inactive', description: 'Overnight security patrol' },
          { id: 4, name: 'Weekend Shift', start_time: '08:00', end_time: '20:00', assigned_guard: 'Sarah Jones', guard_id: 4, status: 'active', description: 'Weekend coverage' }
        ];
      case 'checkpoints':
        return [
          { id: 1, name: 'Main Entrance', location: 'Building A - Lobby', description: 'Primary security checkpoint', status: 'active', qr_code: 'CP001', created_at: '2025-01-01' },
          { id: 2, name: 'Parking Garage', location: 'Underground Level B1', description: 'Vehicle access control', status: 'active', qr_code: 'CP002', created_at: '2025-01-01' },
          { id: 3, name: 'Emergency Exit', location: 'Building C - Rear', description: 'Emergency route monitoring', status: 'inactive', qr_code: 'CP003', created_at: '2025-01-01' },
          { id: 4, name: 'Executive Floor', location: 'Building A - 15th Floor', description: 'VIP area security', status: 'active', qr_code: 'CP004', created_at: '2025-01-01' }
        ];
      case 'attendance':
        return [
          { id: 1, staff_name: 'John Doe', guard_id: 1, date: '2025-09-12', check_in: '06:00', check_out: '14:00', status: 'present', hours_worked: 8 },
          { id: 2, staff_name: 'Jane Smith', guard_id: 2, date: '2025-09-12', check_in: '14:05', check_out: '22:00', status: 'late', hours_worked: 7.9 },
          { id: 3, staff_name: 'Mike Wilson', guard_id: 3, date: '2025-09-12', check_in: null, check_out: null, status: 'absent', hours_worked: 0 },
          { id: 4, staff_name: 'Sarah Jones', guard_id: 4, date: '2025-09-11', check_in: '08:00', check_out: '20:00', status: 'present', hours_worked: 12 }
        ];
      case 'patrols':
        return [
          { id: 1, guard_name: 'John Doe', guard_id: 1, checkpoint_name: 'Main Entrance', checkpoint_id: 1, timestamp: '2025-09-12 07:30', notes: 'All clear, no incidents', status: 'completed', duration: 15 },
          { id: 2, guard_name: 'Jane Smith', guard_id: 2, checkpoint_name: 'Parking Garage', checkpoint_id: 2, timestamp: '2025-09-12 15:15', notes: 'Minor lighting issue reported', status: 'completed', duration: 10 },
          { id: 3, guard_name: 'John Doe', guard_id: 1, checkpoint_name: 'Executive Floor', checkpoint_id: 4, timestamp: '2025-09-12 10:00', notes: 'VIP meeting in progress', status: 'completed', duration: 5 },
          { id: 4, guard_name: 'Jane Smith', guard_id: 2, checkpoint_name: 'Emergency Exit', checkpoint_id: 3, timestamp: '2025-09-12 18:45', notes: 'Door alarm test completed', status: 'pending', duration: null }
        ];
      case 'reports':
        return [
          { id: 1, title: 'Daily Security Summary', type: 'daily', created_by: 'Admin User', created_at: '2025-09-12 08:00', status: 'completed', file_url: '/reports/daily_summary_2025-09-12.pdf' },
          { id: 2, title: 'Weekly Attendance Report', type: 'attendance', created_by: 'Admin User', created_at: '2025-09-09 09:00', status: 'completed', file_url: '/reports/weekly_attendance_2025-W37.pdf' },
          { id: 3, title: 'Incident Analysis Q3', type: 'incident', created_by: 'Manager', created_at: '2025-09-10 14:30', status: 'pending', file_url: null },
          { id: 4, title: 'Monthly Patrol Coverage', type: 'patrol', created_by: 'Admin User', created_at: '2025-09-01 10:00', status: 'completed', file_url: '/reports/monthly_patrol_2025-08.pdf' }
        ];
      default:
        return [];
    }
  };

  // Fetch data for specific tab
  const fetchTabData = useCallback(async (tabId) => {
    console.log('Fetching data for tab:', tabId);
    setTabLoading(prev => ({ ...prev, [tabId]: true }));
    setTabError(prev => ({ ...prev, [tabId]: null }));

    try {
      // Configuration: Set to false when your backend APIs are ready
      const useMockData = true;
      
      if (useMockData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        const mockData = getMockData(tabId);
        console.log('Mock data for', tabId, ':', mockData);
        setTabData(prev => ({ ...prev, [tabId]: mockData }));
        return;
      }

      // Real API calls - uncomment and modify when backend is ready
      let endpoint = '';
      let params = '';

      switch (tabId) {
        case 'guards':
          endpoint = '/api/admin/guards';
          params = `?status=${filterStatus !== 'all' ? filterStatus : ''}&search=${searchTerm}`;
          break;
        case 'shifts':
          endpoint = '/api/admin/shifts';
          params = `?status=${filterStatus !== 'all' ? filterStatus : ''}&search=${searchTerm}`;
          break;
        case 'checkpoints':
          endpoint = '/api/admin/checkpoints';
          params = `?status=${filterStatus !== 'all' ? filterStatus : ''}&search=${searchTerm}`;
          break;
        case 'attendance':
          endpoint = '/api/admin/attendance';
          params = `?date_from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&date_to=${new Date().toISOString().split('T')[0]}`;
          break;
        case 'patrols':
          endpoint = '/api/admin/patrols';
          params = `?date_from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&date_to=${new Date().toISOString().split('T')[0]}`;
          break;
        case 'reports':
          endpoint = '/api/admin/reports';
          params = `?status=${filterStatus !== 'all' ? filterStatus : ''}&type=${searchTerm}`;
          break;
        default:
          console.log('Unknown tab:', tabId);
          return;
      }

      console.log('API endpoint:', `${endpoint}${params}`);
      const response = await makeApiCall(`${endpoint}${params}`);
      console.log('API response for', tabId, ':', response);
      setTabData(prev => ({ ...prev, [tabId]: response.data || response }));
    } catch (err) {
      console.error(`Failed to fetch ${tabId} data:`, err);
      setTabError(prev => ({ ...prev, [tabId]: err.message }));
    } finally {
      setTabLoading(prev => ({ ...prev, [tabId]: false }));
    }
  }, [makeApiCall, filterStatus, searchTerm]);

  // CRUD operations
  const handleCreate = async (tabId, data) => {
    try {
      const endpoint = `/api/admin/${tabId}`;
      const response = await makeApiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      console.log('Created successfully:', response);
      // Refresh data
      fetchTabData(tabId);
      return response;
    } catch (err) {
      console.error('Create failed:', err);
      throw err;
    }
  };

  const handleUpdate = async (tabId, id, data) => {
    try {
      const endpoint = `/api/admin/${tabId}/${id}`;
      const response = await makeApiCall(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      console.log('Updated successfully:', response);
      // Refresh data
      fetchTabData(tabId);
      return response;
    } catch (err) {
      console.error('Update failed:', err);
      throw err;
    }
  };

  const handleDelete = async (tabId, id) => {
    try {
      const endpoint = `/api/admin/${tabId}/${id}`;
      await makeApiCall(endpoint, { method: 'DELETE' });
      console.log('Deleted successfully');
      // Refresh data
      fetchTabData(tabId);
    } catch (err) {
      console.error('Delete failed:', err);
      throw err;
    }
  };

  // Fetch admin profile data
  const fetchAdminData = useCallback(async () => {
    try {
      // Uncomment when backend is ready
      // const response = await makeApiCall('/api/auth/me');
      // const userData = response.data || response;
      // setAdminData(userData);
      
      // Mock data for now
      setAdminData({
        id: 1,
        name: 'Admin User',
        username: 'admin',
        email: 'admin@security.com',
        role: 'admin',
        profile_image: null
      });
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setError('Failed to load admin profile data');
    }
  }, [makeApiCall]);

  // Initialize dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      const currentToken = getAuthToken();
      if (!currentToken) {
        setError('Authentication token is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        await fetchAdminData();
      } catch (err) {
        console.error('Dashboard initialization error:', err);
        setError('Failed to initialize admin dashboard');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [fetchAdminData]);

  // Fetch data when tab changes
  useEffect(() => {
    if (!loading && !error && activeTab) {
      fetchTabData(activeTab);
    }
  }, [activeTab, loading, error, fetchTabData]);

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false); // Close mobile sidebar
    setSearchTerm(''); // Reset search
    setFilterStatus('all'); // Reset filter
  };

  // Handle refresh
  const handleRefresh = () => {
    if (activeTab) {
      fetchTabData(activeTab);
    }
  };

  // Filter data based on search and status
  const filterData = (data) => {
    if (!data) return [];
    
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    return filtered;
  };

  // Enhanced Data table component
  const DataTable = ({ data, columns, title, onAdd, onEdit, onDelete, onView, showSearch = true, showFilter = true }) => {
    const filteredData = filterData(data);

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex gap-2">
            {onAdd && (
              <Button 
                onClick={onAdd}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            )}
          </div>
        </CardHeader>
        
        {/* Search and Filter Controls */}
        {(showSearch || showFilter) && (
          <div className="px-6 pb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {showSearch && (
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}
              
              {showFilter && (
                <div className="flex gap-2">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <CardContent>
          {filteredData && filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    {columns.map((col) => (
                      <th key={col.key} className="text-left py-3 px-4 font-medium text-gray-700">
                        {col.label}
                      </th>
                    ))}
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, index) => (
                    <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                      {columns.map((col) => (
                        <td key={col.key} className="py-3 px-4 text-gray-600">
                          {col.render ? col.render(item[col.key], item) : item[col.key] || '-'}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1 justify-end">
                          {onView && (
                            <Button variant="ghost" size="sm" onClick={() => onView(item)} title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {onEdit && (
                            <Button variant="ghost" size="sm" onClick={() => onEdit(item)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this item?')) {
                                  onDelete(item);
                                }
                              }} 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {data && data.length > 0 ? 'No items match your search criteria' : 'No data available'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Tab components with enhanced functionality
  const GuardsTab = () => {
    const data = tabData.guards || [];
    const columns = [
      { key: 'username', label: 'Username' },
      { key: 'name', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { 
        key: 'role', 
        label: 'Role',
        render: (value) => {
          const roleColors = {
            admin: 'bg-red-100 text-red-800',
            supervisor: 'bg-purple-100 text-purple-800',
            guard: 'bg-blue-100 text-blue-800'
          };
          return (
            <Badge className={roleColors[value?.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
              {value?.toUpperCase()}
            </Badge>
          );
        }
      },
      { 
        key: 'status', 
        label: 'Status',
        render: (value) => (
          <Badge className={value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            {value?.toUpperCase() || 'INACTIVE'}
          </Badge>
        )
      },
      { key: 'hire_date', label: 'Hire Date' }
    ];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Manage Guards</h2>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={tabLoading.guards}
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${tabLoading.guards ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {tabError.guards && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{tabError.guards}</AlertDescription>
          </Alert>
        )}
        
        {tabLoading.guards ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mr-3" />
            <span className="text-lg text-gray-600">Loading guards...</span>
          </div>
        ) : (
          <DataTable 
            data={data}
            columns={columns}
            title="Guards Management"
            onAdd={() => console.log('Add guard - would open modal/form')}
            onEdit={(guard) => console.log('Edit guard:', guard)}
            onDelete={(guard) => console.log('Delete guard:', guard)}
            onView={(guard) => console.log('View guard details:', guard)}
          />
        )}
      </div>
    );
  };

  const ShiftsTab = () => {
    const data = tabData.shifts || [];
    const columns = [
      { key: 'name', label: 'Shift Name' },
      { key: 'start_time', label: 'Start Time' },
      { key: 'end_time', label: 'End Time' },
      { key: 'assigned_guard', label: 'Assigned Guard' },
      { key: 'description', label: 'Description' },
      { 
        key: 'status', 
        label: 'Status',
        render: (value) => (
          <Badge className={value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            {value?.toUpperCase() || 'INACTIVE'}
          </Badge>
        )
      }
    ];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Manage Shifts</h2>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={tabLoading.shifts}
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${tabLoading.shifts ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {tabError.shifts && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{tabError.shifts}</AlertDescription>
          </Alert>
        )}
        
        {tabLoading.shifts ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mr-3" />
            <span className="text-lg text-gray-600">Loading shifts...</span>
          </div>
        ) : (
          <DataTable 
            data={data}
            columns={columns}
            title="Shifts Management"
            onAdd={() => console.log('Add shift - would open modal/form')}
            onEdit={(shift) => console.log('Edit shift:', shift)}
            onDelete={(shift) => console.log('Delete shift:', shift)}
            onView={(shift) => console.log('View shift details:', shift)}
          />
        )}
      </div>
    );
  };

  const CheckpointsTab = () => {
    const data = tabData.checkpoints || [];
    const columns = [
      { key: 'name', label: 'Checkpoint Name' },
      { key: 'location', label: 'Location' },
      { key: 'qr_code', label: 'QR Code' },
      { key: 'description', label: 'Description' },
      { 
        key: 'status', 
        label: 'Status',
        render: (value) => (
          <Badge className={value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            {value?.toUpperCase() || 'INACTIVE'}
          </Badge>
        )
      },
      { key: 'created_at', label: 'Created' }
    ];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Manage Checkpoints</h2>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={tabLoading.checkpoints}
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${tabLoading.checkpoints ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {tabError.checkpoints && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{tabError.checkpoints}</AlertDescription>
          </Alert>
        )}
        
        {tabLoading.checkpoints ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mr-3" />
            <span className="text-lg text-gray-600">Loading checkpoints...</span>
          </div>
        ) : (
          <DataTable 
            data={data}
            columns={columns}
            title="Checkpoints Management"
            onAdd={() => console.log('Add checkpoint - would open modal/form')}
            onEdit={(checkpoint) => console.log('Edit checkpoint:', checkpoint)}
            onDelete={(checkpoint) => console.log('Delete checkpoint:', checkpoint)}
            onView={(checkpoint) => console.log('View checkpoint details:', checkpoint)}
          />
        )}
      </div>
    );
  };

  const AttendanceTab = () => {
    const data = tabData.attendance || [];
    const columns = [
      { key: 'staff_name', label: 'Staff Name' },
      { key: 'date', label: 'Date' },
      { key: 'check_in', label: 'Check In' },
      { key: 'check_out', label: 'Check Out' },
      { 
        key: 'hours_worked', 
        label: 'Hours',
        render: (value) => value ? `${value}h` : '-'
      },
      { 
        key: 'status', 
        label: 'Status',
        render: (value) => {
          const statusColors = {
            present: 'bg-green-100 text-green-800',
            absent: 'bg-red-100 text-red-800',
            late: 'bg-yellow-100 text-yellow-800'
          };
          return (
            <Badge className={statusColors[value?.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
              {value?.toUpperCase() || 'UNKNOWN'}
            </Badge>
          );
        }
      }
    ];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Attendance History</h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={tabLoading.attendance}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${tabLoading.attendance ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline"
              onClick={() => console.log('Export attendance data')}
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        {tabError.attendance && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{tabError.attendance}</AlertDescription>
          </Alert>
        )}
        
        {tabLoading.attendance ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mr-3" />
            <span className="text-lg text-gray-600">Loading attendance...</span>
          </div>
        ) : (
          <DataTable 
            data={data}
            columns={columns}
            title="Attendance Records"
            onView={(record) => console.log('View attendance details:', record)}
            showFilter={true}
            showSearch={true}
          />
        )}
      </div>
    );
  };

  const PatrolsTab = () => {
    const data = tabData.patrols || [];
    const columns = [
      { key: 'guard_name', label: 'Guard Name' },
      { key: 'checkpoint_name', label: 'Checkpoint' },
      { 
        key: 'timestamp', 
        label: 'Timestamp',
        render: (value) => new Date(value).toLocaleString()
      },
      { 
        key: 'duration', 
        label: 'Duration',
        render: (value) => value ? `${value} min` : 'Pending'
      },
      { key: 'notes', label: 'Notes' },
      { 
        key: 'status', 
        label: 'Status',
        render: (value) => (
          <Badge className={value === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
            {value?.toUpperCase() || 'PENDING'}
          </Badge>
        )
      }
    ];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Patrol Logs</h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={tabLoading.patrols}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${tabLoading.patrols ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline"
              onClick={() => console.log('Export patrol logs')}
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        {tabError.patrols && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{tabError.patrols}</AlertDescription>
          </Alert>
        )}
        
        {tabLoading.patrols ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mr-3" />
            <span className="text-lg text-gray-600">Loading patrol logs...</span>
          </div>
        ) : (
          <DataTable 
            data={data}
            columns={columns}
            title="Patrol Logs"
            onView={(log) => console.log('View patrol log details:', log)}
          />
        )}
      </div>
    );
  };

  const ReportsTab = () => {
    const data = tabData.reports || [];
    const columns = [
      { key: 'title', label: 'Report Title' },
      { 
        key: 'type', 
        label: 'Type',
        render: (value) => {
          const typeColors = {
            daily: 'bg-blue-100 text-blue-800',
            weekly: 'bg-green-100 text-green-800',
            monthly: 'bg-purple-100 text-purple-800',
            attendance: 'bg-orange-100 text-orange-800',
            patrol: 'bg-indigo-100 text-indigo-800',
            incident: 'bg-red-100 text-red-800'
          };
          return (
            <Badge className={typeColors[value?.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
              {value?.toUpperCase()}
            </Badge>
          );
        }
      },
      { key: 'created_by', label: 'Created By' },
      { 
        key: 'created_at', 
        label: 'Created At',
        render: (value) => new Date(value).toLocaleDateString()
      },
      { 
        key: 'status', 
        label: 'Status',
        render: (value) => (
          <Badge className={value === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
            {value?.toUpperCase() || 'PENDING'}
          </Badge>
        )
      },
      { 
        key: 'file_url', 
        label: 'Download',
        render: (value, item) => value ? (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => console.log('Download report:', item.title)}
            className="text-blue-600 hover:text-blue-700"
          >
            <Download className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-gray-400">-</span>
        )
      }
    ];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={tabLoading.reports}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${tabLoading.reports ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => console.log('Generate new report')}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
        
        {tabError.reports && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{tabError.reports}</AlertDescription>
          </Alert>
        )}
        
        {tabLoading.reports ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mr-3" />
            <span className="text-lg text-gray-600">Loading reports...</span>
          </div>
        ) : (
          <DataTable 
            data={data}
            columns={columns}
            title="Reports Management"
            onAdd={() => console.log('Generate new report')}
            onView={(report) => console.log('View report:', report)}
            onDelete={(report) => console.log('Delete report:', report)}
          />
        )}
      </div>
    );
  };

  // Render active tab content
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'guards':
        return <GuardsTab />;
      case 'shifts':
        return <ShiftsTab />;
      case 'checkpoints':
        return <CheckpointsTab />;
      case 'attendance':
        return <AttendanceTab />;
      case 'patrols':
        return <PatrolsTab />;
      case 'reports':
        return <ReportsTab />;
      default:
        return <GuardsTab />;
    }
  };

  if (!token && !localStorage.getItem('authToken') && !localStorage.getItem('token') && !sessionStorage.getItem('authToken') && !sessionStorage.getItem('token')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Authentication token is required to access the admin dashboard.
            <br />
            <small className="text-xs mt-2 block">
              Debug Info: 
              <br />• Token prop: {token ? '✓' : '✗'}
              <br />• localStorage token: {localStorage.getItem('authToken') || localStorage.getItem('token') ? '✓' : '✗'}
              <br />• sessionStorage token: {sessionStorage.getItem('authToken') || sessionStorage.getItem('token') ? '✓' : '✗'}
            </small>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-amber-600" />
            <h1 className="text-lg font-bold text-gray-900">Security Admin</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                onClick={() => handleTabChange(item.id)}
                className={`w-full justify-start gap-3 ${
                  isActive 
                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full justify-start gap-3 text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900 capitalize">
                  {navigationItems.find(item => item.id === activeTab)?.label || 'Admin Dashboard'}
                </h2>
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Admin Profile */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {adminData?.name || adminData?.username || 'Admin'}
                  </p>
                  <Badge className="bg-amber-100 text-amber-800 text-xs">
                    ADMIN
                  </Badge>
                </div>
                <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mr-3" />
              <span className="text-lg text-gray-600">Loading admin dashboard...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="ml-4"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Tab Content */}
          {!loading && !error && renderActiveTab()}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;