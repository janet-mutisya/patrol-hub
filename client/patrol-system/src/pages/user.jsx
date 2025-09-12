import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit,
  Trash2,
  RotateCcw,
  Shield,
  CheckCircle,
  XCircle,
  BarChart3,
  Eye,
  AlertTriangle,
  RefreshCw,
  User,
  Settings
} from 'lucide-react';

const UserManagementPage = ({ authToken }) => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'DESC'
  });
  
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_count: 0,
    total_pages: 0
  });

  // API utility function
  const makeApiCall = async (endpoint, options = {}) => {
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  // Fetch current user info to prevent self-deletion
  const fetchCurrentUser = async () => {
    try {
      const response = await makeApiCall('/api/auth/me');
      setCurrentUser(response.user || response.data || response);
    } catch (error) {
      console.error('Error fetching current user:', error);
      setError('Failed to fetch current user information');
    }
  };

  // Fetch users with filters and pagination
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: pagination.current_page.toString(),
        limit: pagination.per_page.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      // Add optional filters
      if (filters.search.trim()) params.append('search', filters.search.trim());
      if (filters.role) params.append('role', filters.role);
      
      // Handle tab-based status filtering
      let statusFilter = filters.status;
      if (activeTab === 'active') statusFilter = 'active';
      if (activeTab === 'inactive') statusFilter = 'inactive';
      if (statusFilter) params.append('status', statusFilter);

      const response = await makeApiCall(`/api/users?${params}`);
      
      setUsers(response.data || response.users || []);
      
      // Handle different pagination response formats
      const paginationData = response.pagination || response.meta || {};
      setPagination(prev => ({
        ...prev,
        total_count: paginationData.total_count || paginationData.total || response.total || 0,
        total_pages: paginationData.total_pages || paginationData.pages || Math.ceil((paginationData.total || 0) / prev.per_page),
        current_page: paginationData.current_page || paginationData.page || prev.current_page
      }));
    } catch (error) {
      setError(`Failed to load users: ${error.message}`);
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current_page, pagination.per_page, filters, activeTab, authToken]);

  // Fetch user statistics
  const fetchStats = async () => {
    try {
      const response = await makeApiCall('/api/users/stats/summary');
      const statsData = response.data || response;
      
      setStats({
        total: statsData.total || 0,
        active: statsData.active || 0,
        inactive: statsData.inactive || 0,
        recent: statsData.recent || statsData.recentlyCreated || 0,
        byRole: {
          admin: statsData.byRole?.admin || statsData.adminCount || 0,
          moderator: statsData.byRole?.moderator || statsData.moderatorCount || 0,
          user: statsData.byRole?.user || statsData.userCount || 0
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Calculate fallback stats from current users if API fails
      if (users.length > 0) {
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.isActive || u.status === 'active').length;
        const inactiveUsers = totalUsers - activeUsers;
        
        setStats({
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          recent: 0,
          byRole: {
            admin: users.filter(u => u.role === 'admin').length,
            moderator: users.filter(u => u.role === 'moderator').length,
            user: users.filter(u => u.role === 'user').length
          }
        });
      }
    }
  };

  // Create new user
  const handleCreateUser = async (userData) => {
    try {
      setError(null);
      await makeApiCall('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role || 'user',
          badgeNumber: userData.badgeNumber
        })
      });
      
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      setError(`Failed to create user: ${error.message}`);
    }
  };

  // Update user
  const handleUpdateUser = async (userId, userData) => {
    try {
      setError(null);
      await makeApiCall(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(userData)
      });
      
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      setError(`Failed to update user: ${error.message}`);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (currentUser && currentUser.id === parseInt(userId)) {
      setError('You cannot delete your own account');
      return;
    }

    const userToDelete = users.find(u => u.id === parseInt(userId));
    if (!userToDelete) return;

    if (!confirm(`Are you sure you want to delete ${userToDelete.name}? This action cannot be undone.`)) return;

    try {
      setError(null);
      await makeApiCall(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      setError(`Failed to delete user: ${error.message}`);
    }
  };

  // Reactivate user
  const handleReactivateUser = async (userId) => {
    try {
      setError(null);
      await makeApiCall(`/api/users/${userId}/reactivate`, {
        method: 'PATCH'
      });
      
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      setError(`Failed to reactivate user: ${error.message}`);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 })); // Reset to first page
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setPagination(prev => ({ ...prev, current_page: newPage }));
    }
  };

  // Handle tab change
  const handleTabChange = (value) => {
    setActiveTab(value);
    setPagination(prev => ({ ...prev, current_page: 1 })); // Reset to first page
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      role: '',
      status: '',
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    });
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  useEffect(() => {
    if (authToken) {
      fetchCurrentUser();
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      fetchUsers();
    }
  }, [fetchUsers, authToken]);

  useEffect(() => {
    if (authToken && (users.length > 0 || pagination.current_page === 1)) {
      fetchStats();
    }
  }, [users.length, authToken]);

  // Badge components
  const getRoleBadge = (role) => {
    const variants = {
      admin: { className: "bg-red-100 text-red-800", label: "Admin", icon: <Shield className="h-3 w-3" /> },
      moderator: { className: "bg-blue-100 text-blue-800", label: "Moderator", icon: <Settings className="h-3 w-3" /> },
      user: { className: "bg-gray-100 text-gray-800", label: "User", icon: <User className="h-3 w-3" /> }
    };
    
    const config = variants[role?.toLowerCase()] || variants.user;
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (user) => {
    const isActive = user.isActive !== undefined ? user.isActive : user.status === 'active';
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Inactive
      </Badge>
    );
  };

  // Permission checking functions
  const canDeleteUser = (user) => {
    return currentUser && currentUser.id !== user.id;
  };

  // FIXED: Added the missing canEditUser function
  const canEditUser = (user) => {
    if (!currentUser) return false;
    
    // Admin can edit anyone except themselves (for role changes)
    if (currentUser.role === 'admin') {
      return true;
    }
    
    // Moderators can edit regular users but not admins or other moderators
    if (currentUser.role === 'moderator') {
      return user.role === 'user';
    }
    
    // Regular users can only edit their own profile (basic info only)
    return currentUser.id === user.id;
  };

  const getFilteredUserCount = (status) => {
    if (!stats) return 0;
    switch (status) {
      case 'active': return stats.active;
      case 'inactive': return stats.inactive;
      default: return stats.total;
    }
  };

  const isUserActive = (user) => {
    return user.isActive !== undefined ? user.isActive : user.status === 'active';
  };

  if (!authToken) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Authentication token is required to access user management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            User Management
          </h1>
          <p className="text-gray-600 mt-1">Manage user accounts, roles, and permissions</p>
        </div>
        
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            // This would typically open a create user modal or navigate to create page
            console.log('Open create user modal/form');
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setError(null);
                fetchUsers();
              }}
              className="ml-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-gray-500">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Inactive Users</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
              <p className="text-xs text-gray-500">Deactivated</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">New This Week</CardTitle>
              <UserPlus className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.recent}</div>
              <p className="text-xs text-gray-500">Last 7 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Role Distribution */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <Shield className="h-5 w-5 text-red-600" />
                <div>
                  <div className="font-semibold text-red-700">Administrators</div>
                  <div className="text-2xl font-bold text-red-600">{stats.byRole.admin}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-700">Moderators</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.byRole.moderator}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="h-5 w-5 text-gray-600" />
                <div>
                  <div className="font-semibold text-gray-700">Users</div>
                  <div className="text-2xl font-bold text-gray-600">{stats.byRole.user}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Users ({getFilteredUserCount('all')})</TabsTrigger>
          <TabsTrigger value="active">Active ({getFilteredUserCount('active')})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({getFilteredUserCount('inactive')})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>

                {activeTab === 'all' && (
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Date Created</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DESC">Newest First</SelectItem>
                    <SelectItem value="ASC">Oldest First</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="whitespace-nowrap"
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-semibold text-gray-900">User</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Role</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Badge #</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Created</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <div className="text-gray-500">Loading users...</div>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <div>No users found</div>
                          {(filters.search || filters.role || filters.status) && (
                            <Button variant="link" onClick={clearFilters} className="mt-2">
                              Clear filters to see all users
                            </Button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      users.map((user, index) => (
                        <tr key={user.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              {currentUser && currentUser.id === user.id && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs mt-1">You</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4">{getRoleBadge(user.role)}</td>
                          <td className="p-4">{getStatusBadge(user)}</td>
                          <td className="p-4 text-gray-600">{user.badgeNumber || '-'}</td>
                          <td className="p-4 text-gray-600">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => console.log('View user', user.id)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => console.log('Edit user', user.id)}
                                disabled={!canEditUser(user)}
                                title={canEditUser(user) ? "Edit user" : "You don't have permission to edit this user"}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {isUserActive(user) ? (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={!canDeleteUser(user)}
                                  className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={canDeleteUser(user) ? "Delete user" : "Cannot delete your own account"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleReactivateUser(user.id)}
                                  className="text-green-600 hover:text-green-700"
                                  title="Reactivate user"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-gray-500">
                      Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to {Math.min(pagination.current_page * pagination.per_page, pagination.total_count)} of {pagination.total_count} users
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={pagination.current_page === 1 || loading}
                      >
                        Previous
                      </Button>
                      
                      {/* Page numbers */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                          const pageNum = pagination.current_page <= 3 
                            ? i + 1 
                            : pagination.current_page + i - 2;
                          
                          if (pageNum <= pagination.total_pages && pageNum > 0) {
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === pagination.current_page ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                disabled={loading}
                                className="min-w-[40px]"
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                        disabled={pagination.current_page === pagination.total_pages || loading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagementPage;