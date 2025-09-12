import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Search,
  BarChart3,
  Moon,
  Sun,
  Timer,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

// Utility functions
const getCurrentShift = () => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 6 && hour < 18 ? 'Day' : 'Night';
};

const getShiftTimes = (shiftName) => {
  if (shiftName === 'Day') {
    return { startHour: 6, endHour: 18 };
  } else {
    return { startHour: 18, endHour: 6 }; // Night shift crosses midnight
  }
};

const formatTime = (hour) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Helper function to handle API responses
const handleApiResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
    // Try to get error message from response
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // If JSON parsing fails, keep the HTTP status message
      }
    } else if (contentType && contentType.includes('text/html')) {
      errorMessage = 'Server returned HTML instead of JSON. Check your API endpoints.';
    }
    
    throw new Error(errorMessage);
  }
  
  // Check if response is JSON
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Server did not return JSON data. Check your API endpoints.');
  }
  
  return await response.json();
};

// Current Shift Banner
const CurrentShiftBanner = ({ currentShift, loading }) => {
  const shiftTimes = currentShift ? getShiftTimes(currentShift.name) : null;
  const currentDetected = getCurrentShift();

  if (loading) {
    return (
      <Card className="border-amber-200 bg-amber-50 mb-6">
        <CardContent className="pt-6 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />
          <span className="text-amber-900">Loading current shift...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 mb-6">
      <CardContent className="pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentDetected === 'Day' ? (
            <Sun className="h-6 w-6 text-amber-600" />
          ) : (
            <Moon className="h-6 w-6 text-amber-700" />
          )}
          <div>
            <h3 className="font-semibold text-amber-900">
              Current Shift: {currentShift ? currentShift.name : currentDetected}
            </h3>
            {currentShift && shiftTimes && (
              <p className="text-sm text-amber-700">
                {formatTime(shiftTimes.startHour)} - {formatTime(shiftTimes.endHour)}
                {shiftTimes.startHour > shiftTimes.endHour && ' (Next Day)'}
              </p>
            )}
          </div>
        </div>
        <Badge className={`${
          currentShift?.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {currentShift?.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </CardContent>
    </Card>
  );
};

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onToggle, disabled = false, size = 'default' }) => {
  const sizeClasses = size === 'small' ? 'w-10 h-5' : 'w-12 h-6';
  const thumbClasses = size === 'small' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      className={`${sizeClasses} rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
        enabled ? 'bg-amber-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={onToggle}
      disabled={disabled}
      aria-label={enabled ? 'Disable' : 'Enable'}
    >
      <div
        className={`${thumbClasses} bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
          enabled ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

// Confirm Dialog Component
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmStyle = 'destructive' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className={confirmStyle === 'destructive' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Shift Form Modal
const ShiftForm = ({ isOpen, onClose, shift, onSave, loading }) => {
  const [formData, setFormData] = useState({ name:'', start_time:'', end_time:'', description:'', is_active:true });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (shift) {
      setFormData({ ...shift });
    } else {
      setFormData({ name:'', start_time:'', end_time:'', description:'', is_active:true });
    }
    setErrors({});
  }, [shift, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Shift name required';
    if (!formData.start_time) newErrors.start_time = 'Start time required';
    if (!formData.end_time) newErrors.end_time = 'End time required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) onSave(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{shift ? 'Edit Shift' : 'Create New Shift'}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="e.g., Day Shift"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="time" value={formData.start_time} onChange={e => handleChange('start_time', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${errors.start_time ? 'border-red-300' : 'border-gray-300'}`} />
              {errors.start_time && <p className="text-red-500 text-xs mt-1">{errors.start_time}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="time" value={formData.end_time} onChange={e => handleChange('end_time', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${errors.end_time ? 'border-red-300' : 'border-gray-300'}`} />
              {errors.end_time && <p className="text-red-500 text-xs mt-1">{errors.end_time}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows="3" placeholder="Optional description..." />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Active</span>
            <ToggleSwitch enabled={formData.is_active} onToggle={() => handleChange('is_active', !formData.is_active)} size="small"/>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={loading}>
              {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              {shift ? 'Update Shift' : 'Create Shift'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main ShiftsPage
const ShiftsPage = ({ authToken, userRole = 'guard' }) => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentShift, setCurrentShift] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState(null);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/shifts', {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
      });
      const data = await handleApiResponse(res);
      
      // Ensure the API returned an array
      const shiftsArray = Array.isArray(data) ? data : [];
      setShifts(shiftsArray);
      
      // Determine current active shift
      const current = shiftsArray.find(s => s.is_active) || { name: getCurrentShift(), is_active: true };
      setCurrentShift(current);
    } catch (err) {
      console.error('Fetch shifts error:', err);
      // Show the error message in UI
      setError(err.message || 'Failed to fetch shifts');
      // Fallback to empty array so .map won't crash
      setShifts([]);
      // Fallback current shift
      setCurrentShift({ name: getCurrentShift(), is_active: true });
      
      // Optional: mock/demo data if API fails completely
      if (err.message.includes('Failed to fetch') || err.message.includes('HTML instead of JSON')) {
        console.warn('Using mock demo shifts');
        const mockShifts = [
          { _id: '1', name: 'Day Shift', start_time: '06:00', end_time: '18:00', description: 'Standard day shift', is_active: true },
          { _id: '2', name: 'Night Shift', start_time: '18:00', end_time: '06:00', description: 'Standard night shift', is_active: false }
        ];
        setShifts(mockShifts);
        setCurrentShift(mockShifts[0]);
        setError('Using demo data - API not connected');
      }
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleDelete = async () => {
    if (!shiftToDelete) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/shifts/${shiftToDelete._id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
      });
      
      await handleApiResponse(res);
      setShifts(prev => prev.filter(s => s._id !== shiftToDelete._id));
      setIsConfirmOpen(false);
      setShiftToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete shift');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShift = async (formData) => {
    try {
      setLoading(true);
      if (selectedShift) {
        // Update existing shift
        const res = await fetch(`/api/shifts/${selectedShift._id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${authToken}` 
          },
          body: JSON.stringify(formData),
        });
        
        const updated = await handleApiResponse(res);
        setShifts(prev => prev.map(s => s._id === updated._id ? updated : s));
      } else {
        // Create new shift
        const res = await fetch('/api/shifts', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${authToken}` 
          },
          body: JSON.stringify(formData),
        });
        
        const created = await handleApiResponse(res);
        setShifts(prev => [...prev, created]);
      }
      setIsFormOpen(false);
      setSelectedShift(null);
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save shift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <CurrentShiftBanner currentShift={currentShift} loading={loading} />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button type="button" variant="outline" onClick={fetchShifts} disabled={loading}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      {userRole === 'admin' && (
        <div className="mb-4 flex justify-end">
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Shift
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts.map(shift => (
          <Card key={shift._id} className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {shift.name}
                <Badge className={shift.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {shift.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-2">{shift.description}</p>
              <p className="text-sm text-gray-600">
                {shift.start_time} - {shift.end_time}
              </p>
              {userRole === 'admin' && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedShift(shift); setIsFormOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { setShiftToDelete(shift); setIsConfirmOpen(true); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals */}
      <ShiftForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setSelectedShift(null); }}
        shift={selectedShift}
        onSave={handleSaveShift}
        loading={loading}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => { setIsConfirmOpen(false); setShiftToDelete(null); }}
        onConfirm={handleDelete}
        title="Delete Shift"
        message={`Are you sure you want to delete the shift "${shiftToDelete?.name}"?`}
        confirmText="Delete"
        confirmStyle="destructive"
      />
    </div>
  );
};

export default ShiftsPage;