import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { BreadcrumbNavigation } from "@/components/navigation/BreadcrumbNavigation";

interface DeliveryAddress {
  id: number;
  userId: string;
  name: string;
  businessName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  notes?: string;
  isDefault: boolean;
}

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}

export default function AdminAddressManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<DeliveryAddress>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState<Partial<DeliveryAddress>>({
    name: '',
    businessName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
    phone: '',
    notes: '',
    isDefault: false
  });
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Fetch all delivery addresses and users
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all addresses
      const addressResponse = await fetch('/api/admin/delivery-addresses');
      if (addressResponse.ok) {
        const addressData = await addressResponse.json();
        setAddresses(addressData);
      }
      
      // Fetch all users
      const userResponse = await fetch('/api/admin/users');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load address data"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (address: DeliveryAddress) => {
    setEditingId(address.id);
    setEditForm(address);
  };

  const handleSave = async (addressId: number) => {
    try {
      const response = await fetch(`/api/admin/delivery-addresses/${addressId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Address updated successfully"
        });
        
        setEditingId(null);
        setEditForm({});
        fetchData(); // Refresh the data
      } else {
        throw new Error('Failed to update address');
      }
    } catch (error) {
      console.error('Error updating address:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update address"
      });
    }
  };

  const handleDelete = async (addressId: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const response = await fetch(`/api/admin/delivery-addresses/${addressId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Address deleted successfully"
        });
        fetchData(); // Refresh the data
      } else {
        throw new Error('Failed to delete address');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete address"
      });
    }
  };

  const handleAddNew = async () => {
    if (!selectedUserId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a user"
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/delivery-addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newAddressForm,
          userId: selectedUserId
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Address added successfully"
        });
        
        setShowAddForm(false);
        setNewAddressForm({
          name: '',
          businessName: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'USA',
          phone: '',
          notes: '',
          isDefault: false
        });
        setSelectedUserId('');
        fetchData(); // Refresh the data
      } else {
        throw new Error('Failed to add address');
      }
    } catch (error) {
      console.error('Error adding address:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add address"
      });
    }
  };

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.username} (${user.company || 'No Company'})` : userId;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <BreadcrumbNavigation />
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <h1 className="text-2xl font-bold">Delivery Address Management</h1>
        </div>

        {/* Add New Address Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Address
          </Button>
        </div>

        {/* Add New Address Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add New Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="user-select">Select User</Label>
                <select
                  id="user-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} - {user.company || 'No Company'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-name">Address Name</Label>
                  <Input
                    id="new-name"
                    value={newAddressForm.name || ''}
                    onChange={(e) => setNewAddressForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Store 1, Main Office"
                  />
                </div>
                <div>
                  <Label htmlFor="new-business">Business Name</Label>
                  <Input
                    id="new-business"
                    value={newAddressForm.businessName || ''}
                    onChange={(e) => setNewAddressForm(prev => ({ ...prev, businessName: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="new-address1">Address Line 1</Label>
                <Input
                  id="new-address1"
                  value={newAddressForm.addressLine1 || ''}
                  onChange={(e) => setNewAddressForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="new-address2">Address Line 2 (Optional)</Label>
                <Input
                  id="new-address2"
                  value={newAddressForm.addressLine2 || ''}
                  onChange={(e) => setNewAddressForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="new-city">City</Label>
                  <Input
                    id="new-city"
                    value={newAddressForm.city || ''}
                    onChange={(e) => setNewAddressForm(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="new-state">State</Label>
                  <Input
                    id="new-state"
                    value={newAddressForm.state || ''}
                    onChange={(e) => setNewAddressForm(prev => ({ ...prev, state: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="new-postal">Postal Code</Label>
                  <Input
                    id="new-postal"
                    value={newAddressForm.postalCode || ''}
                    onChange={(e) => setNewAddressForm(prev => ({ ...prev, postalCode: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="new-country">Country</Label>
                  <Input
                    id="new-country"
                    value={newAddressForm.country || ''}
                    onChange={(e) => setNewAddressForm(prev => ({ ...prev, country: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="new-phone">Phone (Optional)</Label>
                <Input
                  id="new-phone"
                  value={newAddressForm.phone || ''}
                  onChange={(e) => setNewAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="new-notes">Notes (Optional)</Label>
                <Textarea
                  id="new-notes"
                  value={newAddressForm.notes || ''}
                  onChange={(e) => setNewAddressForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="new-default"
                  checked={newAddressForm.isDefault || false}
                  onChange={(e) => setNewAddressForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                />
                <Label htmlFor="new-default">Set as default address</Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddNew}>Add Address</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Address List */}
        <div className="space-y-4">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <span className="text-lg">{address.name}</span>
                    {address.isDefault && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {getUserDisplayName(address.userId)}
                    </span>
                    {editingId === address.id ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleSave(address.id)}
                          className="flex items-center gap-1"
                        >
                          <Save className="h-3 w-3" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditForm({});
                          }}
                          className="flex items-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(address)}
                          className="flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(address.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingId === address.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Address Name</Label>
                        <Input
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Business Name</Label>
                        <Input
                          value={editForm.businessName || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, businessName: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Address Line 1</Label>
                      <Input
                        value={editForm.addressLine1 || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label>Address Line 2</Label>
                      <Input
                        value={editForm.addressLine2 || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label>City</Label>
                        <Input
                          value={editForm.city || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Input
                          value={editForm.state || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Postal Code</Label>
                        <Input
                          value={editForm.postalCode || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, postalCode: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <Input
                          value={editForm.country || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.isDefault || false}
                        onChange={(e) => setEditForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                      />
                      <Label>Set as default address</Label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {address.businessName && (
                      <p><strong>Business:</strong> {address.businessName}</p>
                    )}
                    <p><strong>Address:</strong> {address.addressLine1}</p>
                    {address.addressLine2 && (
                      <p><strong>Address 2:</strong> {address.addressLine2}</p>
                    )}
                    <p><strong>Location:</strong> {address.city}, {address.state} {address.postalCode}, {address.country}</p>
                    {address.phone && (
                      <p><strong>Phone:</strong> {address.phone}</p>
                    )}
                    {address.notes && (
                      <p><strong>Notes:</strong> {address.notes}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {addresses.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No delivery addresses found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}