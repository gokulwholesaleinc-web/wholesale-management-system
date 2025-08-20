import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RefreshCw, Save, UserPlus, ShoppingBag, XCircle, MapPin, Edit, Trash2, CreditCard } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { adminApi } from '@/lib/adminApi';
import { normalizeUserRoles, getRoleDisplayName, getRoleBadgeColor } from '../../shared/roleUtils';

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  address?: string;
  isAdmin: boolean;
  isEmployee?: boolean;
  is_admin?: boolean;
  is_employee?: boolean;
  customerLevel: number;
  createdAt: string;
  updatedAt: string;
  // Business information
  fein?: string;
  taxId?: string;
  businessType?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

interface UserFormData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  address: string;
  password: string;
  customerLevel: number;
  isAdmin: boolean;
  isEmployee: boolean;
  // Business information
  fein: string;        // Federal Employer Identification Number
  taxId: string;       // State Tax ID
  businessType: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
}

export default function Admin() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    address: '',
    password: '',
    customerLevel: 1,
    isAdmin: false,
    isEmployee: false,
    // Business information
    fein: '',
    taxId: '',
    businessType: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: ''
  });

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<'add' | 'edit'>('add');

  // State for customer order history modal
  const [orderHistoryUser, setOrderHistoryUser] = useState<{id: string, username: string} | null>(null);
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);

  // State for customer credit account modal
  const [creditAccountUser, setCreditAccountUser] = useState<{id: string, username: string} | null>(null);
  const [creditAccountOpen, setCreditAccountOpen] = useState(false);

  // State for delivery addresses
  const [selectedUserAddresses, setSelectedUserAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressEditForm, setAddressEditForm] = useState<any>({});

  // Fetch addresses for a specific user
  const fetchUserAddresses = async (userId: string) => {
    setLoadingAddresses(true);
    try {
      const addresses = await apiRequest('GET', `/api/users/${userId}/addresses`);
      setSelectedUserAddresses(addresses || []);
    } catch (error) {
      console.error('Error fetching user addresses:', error);
      setSelectedUserAddresses([]);
      toast({
        title: "Error",
        description: "Failed to load delivery addresses",
        variant: "destructive",
      });
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Function to start editing an address
  const startEditingAddress = (address: any) => {
    setEditingAddressId(address.id);
    setAddressEditForm({
      name: address.name || '',
      businessName: address.businessName || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      phone: address.phone || '',
      notes: address.notes || '',
      isDefault: address.isDefault || false
    });
  };

  // Function to cancel editing
  const cancelAddressEdit = () => {
    setEditingAddressId(null);
    setAddressEditForm({});
  };

  // Function to save address changes
  const saveAddressChanges = async () => {
    if (!editingAddressId || !selectedUserId) return;
    
    try {
      await apiRequest('PUT', `/api/users/${selectedUserId}/addresses/${editingAddressId}`, addressEditForm);
      
      toast({
        title: "Success",
        description: "Delivery address updated successfully",
      });
      
      // Refresh addresses and exit edit mode
      await fetchUserAddresses(selectedUserId);
      setEditingAddressId(null);
      setAddressEditForm({});
    } catch (error) {
      console.error('Error updating address:', error);
      toast({
        title: "Error",
        description: "Failed to update delivery address",
        variant: "destructive",
      });
    }
  };

  // Function to delete an address
  const deleteAddress = async (addressId: number) => {
    if (!selectedUserId) return;
    
    if (!confirm('Are you sure you want to delete this delivery address?')) return;
    
    try {
      await apiRequest('DELETE', `/api/users/${selectedUserId}/addresses/${addressId}`);
      
      toast({
        title: "Success",
        description: "Delivery address deleted successfully",
      });
      
      // Refresh addresses
      await fetchUserAddresses(selectedUserId);
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        title: "Error",
        description: "Failed to delete delivery address",
        variant: "destructive",
      });
    }
  };

  // Fetch all users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/users');
      return response as User[];
    },
    enabled: !isLoading && !!user?.isAdmin
  });

  // Create a new user with enhanced mobile support
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      // Get admin token for auth header
      const adminToken = localStorage.getItem('authToken');

      // Log details for debugging
      console.log('Creating user with token:', adminToken?.substring(0, 10) + '...');
      console.log('Is mobile:', /Mobi|Android/i.test(navigator.userAgent));

      // For mobile, use a customized approach with direct fetch for more control
      if (/Mobi|Android/i.test(navigator.userAgent)) {
        console.log('Using mobile-optimized user creation method');

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        // Include token in multiple formats for better compatibility
        if (adminToken) {
          headers['Authorization'] = `Bearer ${adminToken}`;
          headers['x-auth-token'] = adminToken;
          // Include token in a cookie-like header for additional compatibility
          headers['x-admin-token'] = adminToken;
        }

        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers,
          body: JSON.stringify(userData),
          credentials: 'include'
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('User creation error:', response.status, errorText);
          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        return await response.json();
      }

      // For desktop, use the regular API request function
      return await apiRequest('POST', '/api/admin/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Created",
        description: "The user account has been successfully created.",
      });
      resetForm();
    },
    onError: (error: any) => {
      console.error('User creation error details:', error);
      toast({
        title: "Error Creating User",
        description: error.message || "There was an error creating the user. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update an existing user with enhanced mobile support
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<UserFormData> & { id: string }) => {
      const { id, ...data } = userData;

      // Get admin token for auth header
      const adminToken = localStorage.getItem('authToken');

      // Log details for debugging
      console.log('Updating user with token:', adminToken?.substring(0, 10) + '...');
      console.log('Is mobile:', /Mobi|Android/i.test(navigator.userAgent));

      // For mobile, use a customized approach with direct fetch for more control
      if (/Mobi|Android/i.test(navigator.userAgent)) {
        console.log('Using mobile-optimized user update method');

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        // Include token in multiple formats for better compatibility
        if (adminToken) {
          headers['Authorization'] = `Bearer ${adminToken}`;
          headers['x-auth-token'] = adminToken;
          // Include token in a cookie-like header for additional compatibility
          headers['x-admin-token'] = adminToken;
        }

        const response = await fetch(`/api/admin/users/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
          credentials: 'include'
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('User update error:', response.status, errorText);
          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        return await response.json();
      }

      // For desktop, use the regular API request function
      return await apiRequest('PUT', `/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Updated",
        description: "The user account has been successfully updated.",
      });
      resetForm();
    },
    onError: (error: any) => {
      console.error('User update error details:', error);
      toast({
        title: "Error Updating User",
        description: error.message || "There was an error updating the user. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete a user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Deleted",
        description: "The user account has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting User",
        description: error.message || "There was an error deleting the user. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSelectUser = (user: User) => {
    setSelectedUserId(user.id);
    setFormData({
      username: user.username || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: (user as any).email || '',
      company: user.company || '',
      address: user.address || '',
      password: '',
      customerLevel: user.customerLevel || 1,
      isAdmin: user.isAdmin || false,
      // Check both camel and snake case properties for compatibility
      isEmployee: user.isEmployee || user.is_employee || false,
      // Business information
      fein: user.fein || '',
      taxId: user.taxId || '',
      businessType: user.businessType || '',
      phone: user.phone || '',
      addressLine1: user.addressLine1 || '',
      addressLine2: user.addressLine2 || '',
      city: user.city || '',
      state: user.state || '',
      postalCode: user.postalCode || ''
    });
    setMode('edit');

    // Automatically fetch delivery addresses for this user
    fetchUserAddresses(user.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'add') {
      createUserMutation.mutate(formData);
    } else if (mode === 'edit' && selectedUserId) {
      // Don't send password if it's empty
      const userData: Partial<UserFormData> = {...formData};
      if (!userData.password || userData.password === '') {
        userData.password = undefined;
      }

      updateUserMutation.mutate({
        id: selectedUserId,
        ...userData
      });
    }
  };

  const handleDelete = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      address: '',
      password: '',
      customerLevel: 1,
      isAdmin: false,
      isEmployee: false,
      // Business information
      fein: '',
      taxId: '',
      businessType: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: ''
    });
    setSelectedUserId(null);
    setMode('add');
  };

  // Redirect if not an admin or staff member
  // Check all possible property naming variations
  if (!isLoading && (!user || (!user.isAdmin && !user.is_admin && !user.isEmployee && !user.is_employee))) {
    return (
      <AppLayout title="Unauthorized">
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-center mb-2">Staff Access Required</h1>
          <p className="text-gray-600 text-center mb-6">You need staff privileges to access this page.</p>
          <Button asChild>
            <a href="/">Return to Dashboard</a>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="User Management">
      <div className="container px-4 py-6 mx-auto">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>
                  {mode === 'add' ? (
                    <div className="flex items-center">
                      <UserPlus className="w-5 h-5 mr-2" />
                      Add New User
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="w-5 h-5 mr-2" />
                      Edit User
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  {mode === 'add' 
                    ? "Create a new customer account" 
                    : "Update user information"
                  }
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input 
                      id="username" 
                      name="username" 
                      value={formData.username} 
                      onChange={handleChange} 
                      placeholder="Enter username" 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">
                      {mode === 'add' ? 'Password *' : 'New Password (leave blank to keep current)'}
                    </Label>
                    <Input 
                      id="password" 
                      name="password" 
                      type="password"
                      value={formData.password} 
                      onChange={handleChange} 
                      placeholder="Enter password" 
                      required={mode === 'add'} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        name="firstName" 
                        value={formData.firstName} 
                        onChange={handleChange} 
                        placeholder="First name" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        name="lastName" 
                        value={formData.lastName} 
                        onChange={handleChange} 
                        placeholder="Last name" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input 
                      id="company" 
                      name="company" 
                      value={formData.company} 
                      onChange={handleChange} 
                      placeholder="Company name" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email"
                      value={formData.email} 
                      onChange={handleChange} 
                      placeholder="Email address" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Legacy Address (backwards compatibility)</Label>
                    <Input 
                      id="address" 
                      name="address" 
                      value={formData.address} 
                      onChange={handleChange} 
                      placeholder="Legacy address field" 
                    />
                    <p className="text-xs text-gray-500">
                      This field is kept for compatibility with older accounts
                    </p>
                  </div>

                  {/* Business Information Section */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-medium text-base mb-3">Business Information</h3>

                    <div className="space-y-2">
                      <Label htmlFor="fein">FEIN (Federal Employer Identification Number)</Label>
                      <Input 
                        id="fein" 
                        name="fein" 
                        value={formData.fein} 
                        onChange={handleChange} 
                        placeholder="Enter Federal ID Number" 
                      />
                      <p className="text-xs text-gray-500">
                        Required for tobacco purchases
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxId">State Tax ID</Label>
                      <Input 
                        id="taxId" 
                        name="taxId" 
                        value={formData.taxId} 
                        onChange={handleChange} 
                        placeholder="Enter State Tax ID" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Input 
                        id="businessType" 
                        name="businessType" 
                        value={formData.businessType} 
                        onChange={handleChange} 
                        placeholder="Type of business" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleChange} 
                        placeholder="Business phone number" 
                      />
                    </div>
                  </div>

                  {/* Address Details Section */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-medium text-base mb-3">Business Address</h3>

                    <div className="space-y-2">
                      <Label htmlFor="addressLine1">Address Line 1</Label>
                      <Input 
                        id="addressLine1" 
                        name="addressLine1" 
                        value={formData.addressLine1} 
                        onChange={handleChange} 
                        placeholder="Street address" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="addressLine2">Address Line 2</Label>
                      <Input 
                        id="addressLine2" 
                        name="addressLine2" 
                        value={formData.addressLine2} 
                        onChange={handleChange} 
                        placeholder="Suite, unit, building, etc." 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input 
                          id="city" 
                          name="city" 
                          value={formData.city} 
                          onChange={handleChange} 
                          placeholder="City" 
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input 
                          id="state" 
                          name="state" 
                          value={formData.state} 
                          onChange={handleChange} 
                          placeholder="State" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input 
                        id="postalCode" 
                        name="postalCode" 
                        value={formData.postalCode} 
                        onChange={handleChange} 
                        placeholder="ZIP/Postal code" 
                      />
                    </div>
                  </div>

                  {/* Delivery Addresses Section - Only show when editing existing users */}
                  {mode === 'edit' && selectedUserId && (
                    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium flex items-center">
                          <MapPin className="w-5 h-5 mr-2" />
                          Saved Delivery Addresses
                        </h3>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => fetchUserAddresses(selectedUserId)}
                          disabled={loadingAddresses}
                        >
                          {loadingAddresses ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Refresh
                            </>
                          )}
                        </Button>
                      </div>

                      {selectedUserAddresses.length > 0 ? (
                        <div className="space-y-3">
                          {selectedUserAddresses.map((address, index) => (
                            <div key={address.id || index} className="p-3 bg-white border rounded-md">
                              {editingAddressId === address.id ? (
                                // Edit form
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs">Name/Label</Label>
                                      <Input
                                        value={addressEditForm.name || ''}
                                        onChange={(e) => setAddressEditForm({...addressEditForm, name: e.target.value})}
                                        placeholder="Home, Office, etc."
                                        className="text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Business Name</Label>
                                      <Input
                                        value={addressEditForm.businessName || ''}
                                        onChange={(e) => setAddressEditForm({...addressEditForm, businessName: e.target.value})}
                                        placeholder="Business name"
                                        className="text-sm"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-xs">Address Line 1</Label>
                                    <Input
                                      value={addressEditForm.addressLine1 || ''}
                                      onChange={(e) => setAddressEditForm({...addressEditForm, addressLine1: e.target.value})}
                                      placeholder="Street address"
                                      className="text-sm"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-xs">Address Line 2</Label>
                                    <Input
                                      value={addressEditForm.addressLine2 || ''}
                                      onChange={(e) => setAddressEditForm({...addressEditForm, addressLine2: e.target.value})}
                                      placeholder="Apt, suite, etc."
                                      className="text-sm"
                                    />
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs">City</Label>
                                      <Input
                                        value={addressEditForm.city || ''}
                                        onChange={(e) => setAddressEditForm({...addressEditForm, city: e.target.value})}
                                        placeholder="City"
                                        className="text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">State</Label>
                                      <Input
                                        value={addressEditForm.state || ''}
                                        onChange={(e) => setAddressEditForm({...addressEditForm, state: e.target.value})}
                                        placeholder="State"
                                        className="text-sm"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs">ZIP Code</Label>
                                      <Input
                                        value={addressEditForm.postalCode || ''}
                                        onChange={(e) => setAddressEditForm({...addressEditForm, postalCode: e.target.value})}
                                        placeholder="ZIP code"
                                        className="text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Phone</Label>
                                      <Input
                                        value={addressEditForm.phone || ''}
                                        onChange={(e) => setAddressEditForm({...addressEditForm, phone: e.target.value})}
                                        placeholder="Phone number"
                                        className="text-sm"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-xs">Notes</Label>
                                    <Input
                                      value={addressEditForm.notes || ''}
                                      onChange={(e) => setAddressEditForm({...addressEditForm, notes: e.target.value})}
                                      placeholder="Delivery instructions"
                                      className="text-sm"
                                    />
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={addressEditForm.isDefault || false}
                                      onChange={(e) => setAddressEditForm({...addressEditForm, isDefault: e.target.checked})}
                                      className="rounded border-gray-300"
                                    />
                                    <Label className="text-xs">Set as default address</Label>
                                  </div>
                                  
                                  <div className="flex justify-end space-x-2 pt-2">
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm"
                                      onClick={cancelAddressEdit}
                                    >
                                      Cancel
                                    </Button>
                                    <Button 
                                      type="button" 
                                      size="sm"
                                      onClick={saveAddressChanges}
                                    >
                                      Save Changes
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                // Display view
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">
                                      {address.name || `Address ${index + 1}`}
                                      {address.isDefault && (
                                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                          Default
                                        </span>
                                      )}
                                    </div>
                                    {address.businessName && (
                                      <div className="text-sm text-gray-600 mt-1">
                                        {address.businessName}
                                      </div>
                                    )}
                                    <div className="text-sm text-gray-700 mt-1">
                                      {address.addressLine1}
                                      {address.addressLine2 && (
                                        <div>{address.addressLine2}</div>
                                      )}
                                      <div>
                                        {address.city}, {address.state} {address.postalCode}
                                      </div>
                                    </div>
                                    {address.phone && (
                                      <div className="text-sm text-gray-600 mt-1">
                                        Phone: {address.phone}
                                      </div>
                                    )}
                                    {address.notes && (
                                      <div className="text-sm text-gray-600 mt-1">
                                        Notes: {address.notes}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex space-x-2 ml-4">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startEditingAddress(address)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteAddress(address.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          {loadingAddresses ? (
                            <div className="flex items-center justify-center">
                              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                              Loading addresses...
                            </div>
                          ) : (
                            'No delivery addresses saved for this customer'
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="customerLevel">Pricing Tier</Label>
                    <Select
                      value={formData.customerLevel.toString()}
                      onValueChange={(value) => setFormData({...formData, customerLevel: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pricing tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Tier 1 (Standard)</SelectItem>
                        <SelectItem value="2">Tier 2</SelectItem>
                        <SelectItem value="3">Tier 3</SelectItem>
                        <SelectItem value="4">Tier 4</SelectItem>
                        <SelectItem value="5">Tier 5 (Wholesale)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Higher tiers receive better pricing on products
                    </p>
                  </div>

                  <div className="space-y-4 border p-3 rounded-md bg-slate-50">
                    <h4 className="font-medium text-sm">User Role</h4>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isEmployee"
                        name="isEmployee"
                        checked={formData.isEmployee || false}
                        onChange={(e) => setFormData({...formData, isEmployee: e.target.checked})}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="isEmployee" className="cursor-pointer">Staff Access (Manage Orders & Products)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isAdmin"
                        name="isAdmin"
                        checked={formData.isAdmin}
                        onChange={handleChange}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="isAdmin" className="cursor-pointer">Administrator Access (Full Control)</Label>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between">
                  {mode === 'edit' && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                    >
                      Cancel
                    </Button>
                  )}

                  <Button 
                    type="submit"
                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  >
                    {(createUserMutation.isPending || updateUserMutation.isPending) ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      mode === 'add' ? 'Create User' : 'Update User'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* User List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  Manage existing user accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex justify-center py-6">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : !users || users.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    No users found. Create your first user with the form.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left">Username</th>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Email</th>
                          <th className="px-4 py-2 text-left">Company</th>
                          <th className="px-4 py-2 text-center">Tier</th>
                          <th className="px-4 py-2 text-center">Role</th>
                          <th className="px-4 py-2 text-center">Notifications</th>
                          <th className="px-4 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">{user.username}</td>
                            <td className="px-4 py-2">
                              {user.firstName || user.lastName 
                                ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
                                : '—'}
                            </td>
                            <td className="px-4 py-2">{(user as any).email || '—'}</td>
                            <td className="px-4 py-2">{user.company || '—'}</td>
                            <td className="px-4 py-2 text-center">{user.customerLevel}</td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex flex-col gap-1 items-center">
                                {user.isAdmin && (
                                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">Admin</span>
                                )}
                                {(user.isEmployee || user.is_employee) && (
                                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Staff</span>
                                )}
                                {!user.isAdmin && !user.isEmployee && !user.is_employee && (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex flex-col gap-1 items-center">
                                {(user as any).initialNotificationOptinCompleted ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Setup Complete</span>
                                    {(user as any).smsNotifications && (
                                      <span className="bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded-full font-medium">SMS</span>
                                    )}
                                    {(user as any).emailNotifications && (
                                      <span className="bg-purple-100 text-purple-800 text-xs px-1 py-0.5 rounded-full font-medium">Email</span>
                                    )}
                                  </div>
                                ) : !user.isAdmin && !user.isEmployee && !user.is_employee ? (
                                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">Pending Setup</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex justify-end space-x-1">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    setOrderHistoryUser({id: user.id, username: user.username});
                                    setOrderHistoryOpen(true);
                                  }}
                                >
                                  <ShoppingBag className="h-4 w-4 mr-1 md:mr-2" />
                                  <span className="hidden md:inline">Orders</span>
                                </Button>
                                {!user.isAdmin && !user.isEmployee && !user.is_employee && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                      setCreditAccountUser({id: user.id, username: user.username});
                                      setCreditAccountOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <CreditCard className="h-4 w-4 mr-1 md:mr-2" />
                                    <span className="hidden md:inline">Credit</span>
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleSelectUser(user)}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={() => handleDelete(user.id)}
                                  disabled={deleteUserMutation.isPending}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Customer Order History Modal */}
      <Dialog open={orderHistoryOpen} onOpenChange={setOrderHistoryOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Order History for {orderHistoryUser?.username}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setOrderHistoryOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              View all orders placed by this customer
            </DialogDescription>
          </DialogHeader>

          {orderHistoryUser && (
            <UnifiedOrderList
              userId={orderHistoryUser.id} 
              username={orderHistoryUser.username} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Credit Account Modal */}
      <Dialog open={creditAccountOpen} onOpenChange={setCreditAccountOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Credit Account for {creditAccountUser?.username}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setCreditAccountOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Manage customer credit limits, balances, and payment processing
            </DialogDescription>
          </DialogHeader>

          {creditAccountUser && (
            <CustomerCreditManager
              customerId={creditAccountUser.id} 
              customerName={creditAccountUser.username} 
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}