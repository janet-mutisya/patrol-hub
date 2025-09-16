import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, MapPin, Edit, Trash2, Eye, MoreHorizontal, Filter, Loader2, CheckCircle } from 'lucide-react';

// Backend configuration
const BASE_URL = 'http://localhost:5000';

// Simple JWT decode (no external lib)
function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

const CheckpointDashboard = () => {
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isToggling, setIsToggling] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    coordinates: { latitude: '', longitude: '' },
    isActive: true
  });

  // Get user info from localStorage or context
  const userRole = localStorage.getItem('userRole') || 'admin';
  const userId = parseInt(localStorage.getItem('userId')) || 1;

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Reset currentPage if it exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  // Fetch checkpoints function with proper auth
  const fetchCheckpoints = async () => {
    // Get auth data from localStorage inside the function
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole") || "admin";
    const userId = parseInt(localStorage.getItem("userId"), 10);

    if (!token) {
      setError("Authentication token not found");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let url = "";
      
      if (role === "admin") {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "10",
          search: searchTerm,
          status: statusFilter === "all" ? "" : statusFilter,
        });
        url = `${BASE_URL}/api/checkpoints?${params.toString()}`;
      } else if (role === "guard" && userId) {
        url = `${BASE_URL}/api/checkpoints/guard/${userId}`;
      } else {
        // Fallback for other roles
        url = `${BASE_URL}/api/checkpoints`;
      }

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to fetch checkpoints" }));
        throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (role === "admin") {
        // Admin gets paginated response
        setCheckpoints(data.data?.checkpoints || data.checkpoints || []);
        setTotalPages(data.data?.pagination?.totalPages || data.totalPages || 1);
      } else {
        // Guard gets direct array or single checkpoint
        const checkpointData = Array.isArray(data) ? data : [data];
        setCheckpoints(checkpointData.filter(Boolean)); // Filter out null/undefined
        setTotalPages(1); // Guards typically don't need pagination
      }
    } catch (err) {
      console.error("Failed to fetch checkpoints:", err);
      setError(err.message || "Failed to fetch checkpoints");
      setCheckpoints([]); // Show empty table on error
    } finally {
      setLoading(false);
    }
  };

  // Update the useEffect to be dependency-aware
  useEffect(() => {
    fetchCheckpoints();
  }, [currentPage, searchTerm, statusFilter]); // Dependencies that should trigger refetch

  // Validation function
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Checkpoint name is required');
      return false;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }
    
    // Validate coordinates if provided
    if (formData.coordinates.latitude || formData.coordinates.longitude) {
      const lat = parseFloat(formData.coordinates.latitude);
      const lng = parseFloat(formData.coordinates.longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        setError('Please provide valid latitude and longitude coordinates');
        return false;
      }
      
      if (lat < -90 || lat > 90) {
        setError('Latitude must be between -90 and 90');
        return false;
      }
      
      if (lng < -180 || lng > 180) {
        setError('Longitude must be between -180 and 180');
        return false;
      }
    }
    
    setError('');
    return true;
  };

  // Create checkpoint
  const handleCreateCheckpoint = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsCreating(true);
      setError('');
      const token = localStorage.getItem('token');
      
      // Prepare payload with proper coordinate handling
      const payload = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        description: formData.description.trim() || null,
        isActive: formData.isActive
      };

      // Only include coordinates if both latitude and longitude are provided
      if (formData.coordinates.latitude && formData.coordinates.longitude) {
        payload.coordinates = {
          latitude: parseFloat(formData.coordinates.latitude),
          longitude: parseFloat(formData.coordinates.longitude)
        };
      }

      const response = await fetch(`${BASE_URL}/api/checkpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        setSuccessMessage('Checkpoint created successfully!');
        fetchCheckpoints();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkpoint');
      }
    } catch (error) {
      console.error('Failed to create checkpoint:', error);
      setError(error.message || 'Failed to create checkpoint. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      description: '',
      coordinates: { latitude: '', longitude: '' },
      isActive: true
    });
    setError('');
  };

  // Toggle checkpoint status with confirmation
  const handleToggleStatus = (checkpoint) => {
    setShowConfirmDialog(checkpoint);
  };

  const confirmToggleStatus = async () => {
    const checkpoint = showConfirmDialog;
    if (!checkpoint) return;

    try {
      setIsToggling(checkpoint.id);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${BASE_URL}/api/checkpoints/${checkpoint.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !checkpoint.isActive })
      });

      if (response.ok) {
        setSuccessMessage(`Checkpoint ${!checkpoint.isActive ? 'activated' : 'deactivated'} successfully!`);
        fetchCheckpoints();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update checkpoint status');
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
      setError(error.message || 'Failed to update checkpoint status. Please try again.');
    } finally {
      setIsToggling(null);
      setShowConfirmDialog(null);
    }
  };

  // Handle view checkpoint
  const handleViewCheckpoint = (checkpoint) => {
    setSelectedCheckpoint(checkpoint);
    setShowViewModal(true);
  };

  // Handle edit checkpoint
  const handleEditCheckpoint = (checkpoint) => {
    setSelectedCheckpoint(checkpoint);
    setFormData({
      name: checkpoint.name,
      location: checkpoint.location,
      description: checkpoint.description || '',
      coordinates: {
        latitude: checkpoint.coordinates?.latitude?.toString() || '',
        longitude: checkpoint.coordinates?.longitude?.toString() || ''
      },
      isActive: checkpoint.isActive
    });
    setShowEditModal(true);
  };

  // Update checkpoint
  const handleUpdateCheckpoint = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsCreating(true);
      setError('');
      const token = localStorage.getItem('token');
      
      // Prepare payload with proper coordinate handling
      const payload = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        description: formData.description.trim() || null,
        isActive: formData.isActive
      };

      // Only include coordinates if both latitude and longitude are provided
      if (formData.coordinates.latitude && formData.coordinates.longitude) {
        payload.coordinates = {
          latitude: parseFloat(formData.coordinates.latitude),
          longitude: parseFloat(formData.coordinates.longitude)
        };
      }

      // Try different possible endpoints for updating
      let response = await fetch(`${BASE_URL}/api/checkpoints/${selectedCheckpoint.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      // If /update doesn't exist, try without /update
      if (!response.ok && response.status === 404) {
        response = await fetch(`${BASE_URL}/api/checkpoints/${selectedCheckpoint.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      // If PUT doesn't work, try PATCH
      if (!response.ok && response.status === 405) {
        response = await fetch(`${BASE_URL}/api/checkpoints/${selectedCheckpoint.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        setShowEditModal(false);
        resetForm();
        setSelectedCheckpoint(null);
        setSuccessMessage('Checkpoint updated successfully!');
        fetchCheckpoints();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update checkpoint' }));
        throw new Error(errorData.message || 'Failed to update checkpoint');
      }
    } catch (error) {
      console.error('Failed to update checkpoint:', error);
      setError(error.message || 'Failed to update checkpoint. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Get nearby checkpoints function (for potential future use)
  const fetchNearbyCheckpoints = async (latitude, longitude, radius = 1000) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/checkpoints/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          latitude: parseFloat(latitude), 
          longitude: parseFloat(longitude), 
          radius 
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.data.checkpoints || [];
      } else {
        throw new Error('Failed to fetch nearby checkpoints');
      }
    } catch (error) {
      console.error('Failed to fetch nearby checkpoints:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkpoint Management</h1>
          <p className="mt-2 text-gray-600">Manage security checkpoints and monitoring locations</p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Checkpoints</p>
                  <p className="text-2xl font-bold text-gray-900">{checkpoints.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Checkpoints</p>
                  <p className="text-2xl font-bold text-green-600">
                    {checkpoints.filter(c => c.isActive).length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-green-500"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive Checkpoints</p>
                  <p className="text-2xl font-bold text-red-600">
                    {checkpoints.filter(c => !c.isActive).length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-red-500"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">With Coordinates</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {checkpoints.filter(c => c.coordinates).length}
                  </p>
                </div>
                <MapPin className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search checkpoints..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {userRole === 'admin' && (
                <Dialog open={showCreateModal} onOpenChange={(open) => {
                  setShowCreateModal(open);
                  if (!open) {
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Checkpoint
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Checkpoint</DialogTitle>
                      <DialogDescription>
                        Add a new security checkpoint to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Main Entrance"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location *</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                          placeholder="Building A, Ground Floor"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          placeholder="Additional details about this checkpoint"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="latitude">Latitude</Label>
                          <Input
                            id="latitude"
                            type="number"
                            step="any"
                            value={formData.coordinates.latitude}
                            onChange={(e) => setFormData({
                              ...formData, 
                              coordinates: {...formData.coordinates, latitude: e.target.value}
                            })}
                            placeholder="-1.2921"
                          />
                        </div>
                        <div>
                          <Label htmlFor="longitude">Longitude</Label>
                          <Input
                            id="longitude"
                            type="number"
                            step="any"
                            value={formData.coordinates.longitude}
                            onChange={(e) => setFormData({
                              ...formData, 
                              coordinates: {...formData.coordinates, longitude: e.target.value}
                            })}
                            placeholder="36.8219"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        onClick={handleCreateCheckpoint}
                        disabled={isCreating || !formData.name.trim() || !formData.location.trim()}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Checkpoint'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Checkpoint Modal */}
        <Dialog open={showEditModal} onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) {
            resetForm();
            setSelectedCheckpoint(null);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Checkpoint</DialogTitle>
              <DialogDescription>
                Update checkpoint information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Main Entrance"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Location *</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Building A, Ground Floor"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Additional details about this checkpoint"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-latitude">Latitude</Label>
                  <Input
                    id="edit-latitude"
                    type="number"
                    step="any"
                    value={formData.coordinates.latitude}
                    onChange={(e) => setFormData({
                      ...formData, 
                      coordinates: {...formData.coordinates, latitude: e.target.value}
                    })}
                    placeholder="-1.2921"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-longitude">Longitude</Label>
                  <Input
                    id="edit-longitude"
                    type="number"
                    step="any"
                    value={formData.coordinates.longitude}
                    onChange={(e) => setFormData({
                      ...formData, 
                      coordinates: {...formData.coordinates, longitude: e.target.value}
                    })}
                    placeholder="36.8219"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                onClick={handleUpdateCheckpoint}
                disabled={isCreating || !formData.name.trim() || !formData.location.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Checkpoint'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Checkpoint Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Checkpoint Details</DialogTitle>
            </DialogHeader>
            {selectedCheckpoint && (
              <div className="grid gap-4 py-4">
                <div>
                  <Label className="font-medium">Name</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedCheckpoint.name}</p>
                </div>
                <div>
                  <Label className="font-medium">Location</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedCheckpoint.location}</p>
                </div>
                {selectedCheckpoint.description && (
                  <div>
                    <Label className="font-medium">Description</Label>
                    <p className="text-sm text-gray-600 mt-1">{selectedCheckpoint.description}</p>
                  </div>
                )}
                <div>
                  <Label className="font-medium">Status</Label>
                  <Badge 
                    variant={selectedCheckpoint.isActive ? "default" : "secondary"}
                    className={`mt-1 ${selectedCheckpoint.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                  >
                    {selectedCheckpoint.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {selectedCheckpoint.coordinates && (
                  <div>
                    <Label className="font-medium">Coordinates</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedCheckpoint.coordinates.latitude?.toFixed(6)}, {selectedCheckpoint.coordinates.longitude?.toFixed(6)}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="font-medium">Created By</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedCheckpoint.creator?.name || 'System'}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowViewModal(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={!!showConfirmDialog} onOpenChange={() => setShowConfirmDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Status Change</DialogTitle>
              <DialogDescription>
                Are you sure you want to {showConfirmDialog?.isActive ? 'deactivate' : 'activate'} the checkpoint "{showConfirmDialog?.name}"?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(null)}>
                Cancel
              </Button>
              <Button onClick={confirmToggleStatus}>
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Checkpoints Table */}
        <Card>
          <CardHeader>
            <CardTitle>Checkpoints</CardTitle>
            <CardDescription>
              Manage all security checkpoints in your system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <div className="text-gray-500">Loading checkpoints...</div>
              </div>
            ) : checkpoints.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">No checkpoints found</div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium text-gray-600">Name</th>
                        <th className="text-left p-4 font-medium text-gray-600">Location</th>
                        <th className="text-left p-4 font-medium text-gray-600">Status</th>
                        <th className="text-left p-4 font-medium text-gray-600">Coordinates</th>
                        <th className="text-left p-4 font-medium text-gray-600">Created By</th>
                        <th className="text-left p-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkpoints.map((checkpoint) => (
                        <tr key={checkpoint.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{checkpoint.name}</td>
                          <td className="p-4">{checkpoint.location}</td>
                          <td className="p-4">
                            <Badge 
                              variant={checkpoint.isActive ? "default" : "secondary"}
                              className={checkpoint.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                            >
                              {checkpoint.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {checkpoint.coordinates ? (
                              <span className="text-sm text-gray-600">
                                {checkpoint.coordinates.latitude?.toFixed(4)}, {checkpoint.coordinates.longitude?.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">No coordinates</span>
                            )}
                          </td>
                          <td className="p-4">
                            {checkpoint.creator?.name || 'System'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {userRole === 'admin' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStatus(checkpoint)}
                                  disabled={isToggling === checkpoint.id}
                                >
                                  {isToggling === checkpoint.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    checkpoint.isActive ? 'Deactivate' : 'Activate'
                                  )}
                                </Button>
                              )}
                              {userRole === 'admin' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditCheckpoint(checkpoint)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewCheckpoint(checkpoint)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1 || loading}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages || loading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckpointDashboard; 