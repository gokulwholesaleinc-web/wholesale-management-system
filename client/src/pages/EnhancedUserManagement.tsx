import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layout/AppLayout';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertCircle, 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  ShoppingBag,
  CreditCard,
  MapPin,
  Shield,
  UserCheck,
  Building,
  Phone,
  Mail,
  Calendar,
  Eye,
  EyeOff,
  MessageCircle,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Truck,
  DollarSign,
  FileText,
  Settings
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmailCampaignManagement } from '@/components/admin/EmailCampaignManagement';
import AccountRequestsManagement from '@/components/admin/AccountRequestsManagement';
import { CustomerCreditManager } from '@/components/admin/CustomerCreditManager';

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
  lastLogin?: string;
  feinNumber?: string;
  taxId?: string;
  businessType?: string;
  phone?: string;
  businessPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  // Notification Fields
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  smsConsentGiven?: boolean;
  smsConsentDate?: string | null;
  smsConsentMethod?: string | null;
  smsConsentIpAddress?: string | null;
  smsOptOutDate?: string | null;
  smsOptOutMethod?: string | null;
  marketingSmsConsent?: boolean;
  transactionalSmsConsent?: boolean;
  privacyPolicyAccepted?: boolean;
  privacyPolicyVersion?: string | null;
  privacyPolicyAcceptedDate?: string | null;
  notificationTypes?: Record<string, boolean>;
  // Tax Fields
  applyFlatTax?: boolean;
}

interface UserFormData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  password: string;
  customerLevel: number;
  isAdmin: boolean;
  isEmployee: boolean;
  feinNumber: string;
  taxId: string;
  businessType: string;
  phone: string;
  businessPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  // Notification Fields
  emailNotifications: boolean;
  smsNotifications: boolean;
  // Privacy Policy Fields
  privacyPolicyAccepted: boolean;
  // Tax Fields
  applyFlatTax: boolean;
}

export default function EnhancedUserManagement() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // UI State
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Handle URL parameters for direct tab navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['users', 'requests', 'emails', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Form State
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    password: '',
    customerLevel: 1,
    isAdmin: false,
    isEmployee: false,
    feinNumber: '',
    taxId: '',
    businessType: '',
    phone: '',
    businessPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    emailNotifications: false,
    smsNotifications: false,
    privacyPolicyAccepted: false,  // Set to false - user will accept on first login
    applyFlatTax: false
  });

  // Modal States
  const [orderHistoryUser, setOrderHistoryUser] = useState<{id: string, username: string} | null>(null);
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [creditAccountUser, setCreditAccountUser] = useState<{id: string, username: string} | null>(null);
  const [creditAccountOpen, setCreditAccountOpen] = useState(false);
  const [loyaltyAdjustUser, setLoyaltyAdjustUser] = useState<{id: string, username: string, loyaltyPoints: number} | null>(null);
  const [loyaltyAdjustOpen, setLoyaltyAdjustOpen] = useState(false);

  // Fetch all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/users');
      return response as User[];
    },
    enabled: !isLoading && !!user?.isAdmin
  });

  // Fetch order settings for the settings tab
  const { data: orderSettings } = useQuery({
    queryKey: ['/api/admin/order-settings'],
    retry: 3,
    enabled: !isLoading && !!user?.isAdmin
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      return await apiRequest('POST', '/api/admin/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setShowCreateDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<UserFormData> & { id: string }) => {
      const { id, ...data } = userData;
      return await apiRequest('PATCH', `/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setShowEditDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  });

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      password: '',
      customerLevel: 1,
      isAdmin: false,
      isEmployee: false,
      feinNumber: '',
      taxId: '',
      businessType: '',
      phone: '',
      businessPhone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      emailNotifications: false,
      smsNotifications: false,
      privacyPolicyAccepted: false,  // Set to false - user will accept on first login
      applyFlatTax: false
    });
    setSelectedUser(null);
  };

  // Handle edit user
  const handleEditUser = (user: User) => {
    setFormData({
      username: user.username || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: (user as any).email || '',
      company: user.company || '',
      password: '',
      customerLevel: user.customerLevel || 1,
      isAdmin: user.isAdmin || false,
      isEmployee: user.isEmployee || user.is_employee || false,
      feinNumber: user.feinNumber || '',
      taxId: user.taxId || '',
      businessType: user.businessType || '',
      phone: user.phone || '',
      businessPhone: user.businessPhone || '',
      addressLine1: user.addressLine1 || '',
      addressLine2: user.addressLine2 || '',
      city: user.city || '',
      state: user.state || '',
      postalCode: user.postalCode || '',
      emailNotifications: user.emailNotifications || false,
      smsNotifications: user.smsNotifications || false,
      privacyPolicyAccepted: user.privacyPolicyAccepted || false,
      applyFlatTax: user.applyFlatTax || false
    });
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUser) {
      // Update user
      const updateData: Partial<UserFormData> & { id: string } = {
        id: selectedUser.id,
        ...formData
      };
      
      // Don't send empty password
      if (!formData.password) {
        delete updateData.password;
      }
      
      updateUserMutation.mutate(updateData);
    } else {
      // Create user
      createUserMutation.mutate(formData);
    }
  };

  // Handle delete
  const handleDelete = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Handle SMS consent actions
  const handleSmsConsentAction = async (userId: string, action: string) => {
    try {
      let consentData: any = {};
      
      switch (action) {
        case 'opt-in-all':
          consentData = {
            smsNotifications: true,
            smsConsentGiven: true,
            marketingSmsConsent: true,
            transactionalSmsConsent: true
          };
          break;
        case 'opt-out-all':
          consentData = {
            smsNotifications: false,
            smsConsentGiven: false,
            marketingSmsConsent: false,
            transactionalSmsConsent: false
          };
          break;
        case 'marketing-only':
          consentData = {
            smsNotifications: true,
            smsConsentGiven: true,
            marketingSmsConsent: true,
            transactionalSmsConsent: false
          };
          break;
        case 'transactional-only':
          consentData = {
            smsNotifications: true,
            smsConsentGiven: true,
            marketingSmsConsent: false,
            transactionalSmsConsent: true
          };
          break;
      }

      const response = await apiRequest('PUT', `/api/admin/sms-consent/${userId}`, consentData);
      
      if (response.ok) {
        // Update form data to reflect changes
        setFormData(prev => ({
          ...prev,
          ...consentData
        }));
        
        // Refresh user data
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        
        toast({
          title: "Success",
          description: `SMS consent updated for ${action.replace('-', ' ')}`,
          variant: "default",
        });
      } else {
        throw new Error('Failed to update SMS consent');
      }
    } catch (error) {
      console.error('SMS consent update error:', error);
      toast({
        title: "Error",
        description: "Failed to update SMS consent settings",
        variant: "destructive",
      });
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = 
      filterRole === 'all' ||
      (filterRole === 'admin' && user.isAdmin) ||
      (filterRole === 'employee' && (user.isEmployee || user.is_employee)) ||
      (filterRole === 'customer' && !user.isAdmin && !user.isEmployee && !user.is_employee);

    const matchesTier = 
      filterTier === 'all' || 
      user.customerLevel.toString() === filterTier;

    return matchesSearch && matchesRole && matchesTier;
  });

  // Get user statistics
  const userStats = {
    total: users.length,
    customers: users.filter(u => !u.isAdmin && !u.isEmployee && !u.is_employee).length,
    staff: users.filter(u => u.isEmployee || u.is_employee).length,
    admins: users.filter(u => u.isAdmin).length
  };

  // Authorization check
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
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">Manage customers, staff, and admin accounts</p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add New User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new customer, staff member, or administrator account
                  </DialogDescription>
                </DialogHeader>
                <UserForm 
                  formData={formData}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  isLoading={createUserMutation.isPending}
                  mode="create"
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  setFormData={setFormData}
                  selectedUser={null}
                  handleSmsConsentAction={handleSmsConsentAction}
                />
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setActiveTab('requests')}
            >
              <AlertCircle className="h-4 w-4" />
              Account Requests
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{userStats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Customers</p>
                  <p className="text-2xl font-bold">{userStats.customers}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Staff</p>
                  <p className="text-2xl font-bold">{userStats.staff}</p>
                </div>
                <Building className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Admins</p>
                  <p className="text-2xl font-bold">{userStats.admins}</p>
                </div>
                <Shield className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Users and Account Requests */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 gap-2 h-auto p-2 bg-gray-100 rounded-lg">
            <TabsTrigger 
              value="users" 
              className="flex items-center justify-center gap-2 text-xs sm:text-sm py-3 px-2 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Existing Users</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger 
              value="requests" 
              className="flex items-center justify-center gap-2 text-xs sm:text-sm py-3 px-2 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
            >
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Account Requests</span>
              <span className="sm:hidden">Requests</span>
            </TabsTrigger>
            <TabsTrigger 
              value="emails" 
              className="flex items-center justify-center gap-2 text-xs sm:text-sm py-3 px-2 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email Management</span>
              <span className="sm:hidden">Email</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex items-center justify-center gap-2 text-xs sm:text-sm py-3 px-2 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Order Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="employee">Staff</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterTier} onValueChange={setFilterTier}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="1">Tier 1</SelectItem>
                      <SelectItem value="2">Tier 2</SelectItem>
                      <SelectItem value="3">Tier 3</SelectItem>
                      <SelectItem value="4">Tier 4</SelectItem>
                      <SelectItem value="5">Tier 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Users ({filteredUsers.length})</CardTitle>
                <CardDescription>
                  {searchTerm || filterRole !== 'all' || filterTier !== 'all' 
                    ? `Filtered results from ${users.length} total users`
                    : 'All registered users'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm || filterRole !== 'all' || filterTier !== 'all' 
                      ? 'No users match the current filters'
                      : 'No users found'
                    }
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">User</th>
                          <th className="text-left py-3 px-4 font-medium">Contact</th>
                          <th className="text-left py-3 px-4 font-medium">Role</th>
                          <th className="text-left py-3 px-4 font-medium">Tier</th>
                          <th className="text-left py-3 px-4 font-medium">Joined</th>
                          <th className="text-left py-3 px-4 font-medium">Last Login</th>
                          <th className="text-right py-3 px-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <UserRow 
                            key={user.id} 
                            user={user}
                            onEdit={() => handleEditUser(user)}
                            onDelete={() => handleDelete(user.id)}
                            onViewOrders={() => {
                              setOrderHistoryUser({id: user.id, username: user.username});
                              setOrderHistoryOpen(true);
                            }}
                            onViewCredit={() => {
                              setCreditAccountUser({id: user.id, username: user.username});
                              setCreditAccountOpen(true);
                            }}
                            onAdjustLoyalty={() => {
                              setLoyaltyAdjustUser({id: user.id, username: user.username, loyaltyPoints: user.loyaltyPoints || 0});
                              setLoyaltyAdjustOpen(true);
                            }}
                            isDeleting={deleteUserMutation.isPending}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <AccountRequestsManagement />
          </TabsContent>

          <TabsContent value="emails" className="space-y-6">
            <EmailCampaignManagement />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <OrderDeliverySettingsCard />
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and settings
              </DialogDescription>
            </DialogHeader>
            <UserForm 
              formData={formData}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              isLoading={updateUserMutation.isPending}
              mode="edit"
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              setFormData={setFormData}
              selectedUser={selectedUser}
              handleSmsConsentAction={handleSmsConsentAction}
            />
          </DialogContent>
        </Dialog>

        {/* Order History Modal */}
        <Dialog open={orderHistoryOpen} onOpenChange={setOrderHistoryOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Order History - {orderHistoryUser?.username}
              </DialogTitle>
              <DialogDescription>
                View all orders placed by this customer
              </DialogDescription>
            </DialogHeader>
            {orderHistoryUser && (
              <div className="p-4 text-center text-gray-600">
                Order history for {orderHistoryUser.username} will be available here.
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Credit Account Modal */}
        <Dialog open={creditAccountOpen} onOpenChange={setCreditAccountOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Credit Account - {creditAccountUser?.username}
              </DialogTitle>
              <DialogDescription>
                Manage customer credit limits, balances, and payments
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

        {/* Loyalty Points Adjustment Modal */}
        <Dialog open={loyaltyAdjustOpen} onOpenChange={setLoyaltyAdjustOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Adjust Loyalty Points - {loyaltyAdjustUser?.username}
              </DialogTitle>
              <DialogDescription>
                Manually add or remove loyalty points for this customer
              </DialogDescription>
            </DialogHeader>
            {loyaltyAdjustUser && (
              <LoyaltyPointsAdjustment 
                userId={loyaltyAdjustUser.id} 
                username={loyaltyAdjustUser.username}
                currentPoints={loyaltyAdjustUser.loyaltyPoints}
                onSuccess={() => {
                  setLoyaltyAdjustOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

// Loyalty Points Adjustment Component
function LoyaltyPointsAdjustment({ 
  userId, 
  username, 
  currentPoints, 
  onSuccess 
}: {
  userId: string;
  username: string;
  currentPoints: number;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [pointsAmount, setPointsAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');

  const adjustPointsMutation = useMutation({
    mutationFn: async (data: { userId: string; pointsAmount: number; description: string }) => {
      return await apiRequest('POST', '/api/admin/loyalty/manual-adjust', data);
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: response.message || "Loyalty points adjusted successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to adjust loyalty points",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const points = parseFloat(pointsAmount);
    if (isNaN(points) || points === 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of points",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Error", 
        description: "Please provide a description for this adjustment",
        variant: "destructive",
      });
      return;
    }

    const finalPointsAmount = adjustmentType === 'subtract' ? -Math.abs(points) : Math.abs(points);
    
    adjustPointsMutation.mutate({
      userId,
      pointsAmount: finalPointsAmount,
      description: description.trim()
    });
  };

  const projectedBalance = currentPoints + (adjustmentType === 'subtract' ? -Math.abs(parseFloat(pointsAmount) || 0) : Math.abs(parseFloat(pointsAmount) || 0));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Current Balance</Label>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">{currentPoints} points</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Adjustment Type</Label>
        <Select value={adjustmentType} onValueChange={(value: 'add' | 'subtract') => setAdjustmentType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Add Points</SelectItem>
            <SelectItem value="subtract">Subtract Points</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Points Amount</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={pointsAmount}
          onChange={(e) => setPointsAmount(e.target.value)}
          placeholder="Enter points amount..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Reason for adjustment..."
          required
        />
      </div>

      {pointsAmount && (
        <div className="space-y-2">
          <Label>Projected Balance</Label>
          <div className={`flex items-center gap-2 p-3 rounded-md ${projectedBalance >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <Star className="h-4 w-4" />
            <span className="font-medium">{Math.max(0, projectedBalance)} points</span>
            {projectedBalance < 0 && (
              <span className="text-xs">(will be set to 0)</span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={adjustPointsMutation.isPending || !pointsAmount || !description.trim()}
          className="flex-1"
        >
          {adjustPointsMutation.isPending ? (
            <div className="h-4 w-4 animate-spin border border-white border-t-transparent rounded-full mr-2" />
          ) : null}
          {adjustmentType === 'add' ? 'Add Points' : 'Subtract Points'}
        </Button>
      </div>
    </form>
  );
}

// User Row Component
function UserRow({ 
  user, 
  onEdit, 
  onDelete, 
  onViewOrders, 
  onViewCredit,
  onAdjustLoyalty,
  isDeleting 
}: {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
  onViewOrders: () => void;
  onViewCredit: () => void;
  onAdjustLoyalty: () => void;
  isDeleting: boolean;
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
  const isStaff = user.isAdmin || user.isEmployee || user.is_employee;
  
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-3 px-4">
        <div>
          <div className="font-medium">{user.username}</div>
          <div className="text-sm text-gray-600">{fullName}</div>
          {user.company && (
            <div className="text-sm text-gray-500">{user.company}</div>
          )}
        </div>
      </td>
      
      <td className="py-3 px-4">
        <div className="text-sm">
          {(user as any).email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {(user as any).email}
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-1 text-gray-600">
              <Phone className="h-3 w-3" />
              <span className="text-xs text-blue-600">Cell:</span> {user.phone}
            </div>
          )}
          {user.businessPhone && (
            <div className="flex items-center gap-1 text-gray-600">
              <Phone className="h-3 w-3" />
              <span className="text-xs text-gray-500">Bus:</span> {user.businessPhone}
            </div>
          )}
        </div>
      </td>
      
      <td className="py-3 px-4">
        <div className="flex flex-col gap-1">
          {user.isAdmin && (
            <Badge variant="destructive" className="w-fit">Admin</Badge>
          )}
          {(user.isEmployee || user.is_employee) && (
            <Badge variant="secondary" className="w-fit">Staff</Badge>
          )}
          {!isStaff && (
            <Badge variant="outline" className="w-fit">Customer</Badge>
          )}
        </div>
      </td>
      
      <td className="py-3 px-4">
        <Badge variant="outline">
          Tier {user.customerLevel}
        </Badge>
      </td>
      
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Calendar className="h-3 w-3" />
          {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </td>
      
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Clock className="h-3 w-3" />
          {user.lastLogin ? (
            <span>
              {new Date(user.lastLogin).toLocaleDateString()}
              <br />
              <span className="text-xs text-gray-500">
                {new Date(user.lastLogin).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </span>
          ) : (
            <span className="text-gray-400 italic">Never</span>
          )}
        </div>
      </td>
      
      <td className="py-3 px-4">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewOrders}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                View Orders
              </DropdownMenuItem>
              {!isStaff && (
                <DropdownMenuItem onClick={onViewCredit}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Credit Account
                </DropdownMenuItem>
              )}
              {!isStaff && (
                <DropdownMenuItem onClick={onAdjustLoyalty}>
                  <Star className="h-4 w-4 mr-2" />
                  Adjust Loyalty Points
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}

// User Form Component
function UserForm({ 
  formData, 
  handleChange, 
  handleSubmit, 
  isLoading, 
  mode,
  showPassword,
  setShowPassword,
  setFormData,
  selectedUser,
  handleSmsConsentAction
}: {
  formData: UserFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  mode: 'create' | 'edit';
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
  selectedUser?: User | null;
  handleSmsConsentAction?: (userId: string, action: string) => Promise<void>;
}) {
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1 bg-gray-100 rounded-lg">
          <TabsTrigger 
            value="basic" 
            className="text-xs sm:text-sm py-2 px-3 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
          >
            Basic Info
          </TabsTrigger>
          <TabsTrigger 
            value="business" 
            className="text-xs sm:text-sm py-2 px-3 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
          >
            Business
          </TabsTrigger>
          <TabsTrigger 
            value="permissions" 
            className="text-xs sm:text-sm py-2 px-3 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
          >
            Permissions
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="flex items-center justify-center gap-1 text-xs sm:text-sm py-2 px-3 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
          >
            <Bell className="h-3 w-3" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Notify</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">
                {mode === 'create' ? 'Password *' : 'New Password'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required={mode === 'create'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {mode === 'edit' && (
                <p className="text-xs text-gray-500">Leave blank to keep current password</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                Cell Phone 
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  SMS Notifications
                </span>
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Cell phone for SMS notifications"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessPhone">Business Phone</Label>
              <Input
                id="businessPhone"
                name="businessPhone"
                value={formData.businessPhone}
                onChange={handleChange}
                placeholder="Business/landline phone (optional)"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
              />
            </div>
          </div>

          {mode === 'create' && (
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
              <div className="flex items-start space-x-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-blue-800">
                    Privacy Policy Notice
                  </Label>
                  <p className="text-xs text-blue-700">
                    The user will be prompted to agree to the{' '}
                    <a 
                      href="/privacy-policy" 
                      target="_blank" 
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Privacy Policy
                    </a>{' '}
                    during their first login. No action required here.
                  </p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="business" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feinNumber">FEIN</Label>
              <Input
                id="feinNumber"
                name="feinNumber"
                value={formData.feinNumber}
                onChange={handleChange}
                placeholder="Federal Employer ID"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taxId">State Tax ID</Label>
              <Input
                id="taxId"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type</Label>
            <Input
              id="businessType"
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              name="addressLine2"
              value={formData.addressLine2}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="postalCode">ZIP Code</Label>
              <Input
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="permissions" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerLevel">Pricing Tier</Label>
            <Select
              value={formData.customerLevel.toString()}
              onValueChange={(value) => setFormData(prev => ({...prev, customerLevel: parseInt(value)}))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Tier 1 (Standard)</SelectItem>
                <SelectItem value="2">Tier 2 (Bronze)</SelectItem>
                <SelectItem value="3">Tier 3 (Silver)</SelectItem>
                <SelectItem value="4">Tier 4 (Gold)</SelectItem>
                <SelectItem value="5">Tier 5 (Platinum)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isEmployee"
                name="isEmployee"
                checked={formData.isEmployee}
                onChange={handleChange}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isEmployee">Staff Access</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isAdmin"
                name="isAdmin"
                checked={formData.isAdmin}
                onChange={handleChange}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isAdmin">Administrator Access</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="applyFlatTax"
                name="applyFlatTax"
                checked={formData.applyFlatTax}
                onChange={handleChange}
                className="rounded border-gray-300"
              />
              <Label htmlFor="applyFlatTax">Flat Tax Enabled</Label>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4" />
                Notification Settings
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                Manage notification preferences for this user. SMS notifications include consent for all types of messages.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      name="emailNotifications"
                      checked={formData.emailNotifications}
                      onChange={(e) => setFormData(prev => ({
                        ...prev, 
                        emailNotifications: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="emailNotifications" className="text-sm font-medium">Email Notifications Enabled</Label>
                  </div>
                  {formData.emailNotifications ? 
                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                    <XCircle className="h-4 w-4 text-red-600" />
                  }
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="smsNotifications"
                      name="smsNotifications"
                      checked={formData.smsNotifications}
                      onChange={(e) => setFormData(prev => ({
                        ...prev, 
                        smsNotifications: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="smsNotifications" className="text-sm font-medium">SMS Notifications Enabled (with consent)</Label>
                  </div>
                  {formData.smsNotifications ? 
                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                    <XCircle className="h-4 w-4 text-red-600" />
                  }
                </div>
                
                {formData.smsNotifications && (
                  <div className="ml-6 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">SMS consent automatically granted for:</span>
                    </div>
                    <ul className="mt-1 ml-4 list-disc text-xs">
                      <li>Order confirmations and status updates</li>
                      <li>Marketing and promotional messages</li>
                      <li>Account notifications</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            {mode === 'edit' && selectedUser && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  SMS Consent History & Data
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Review stored consent data and opt-in/opt-out history for compliance tracking.
                </p>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-700">SMS Consent Given:</label>
                      <p className="text-gray-900">
                        {selectedUser.smsConsentGiven ? 'Yes' : 'No'}
                        {selectedUser.smsConsentDate && (
                          <span className="text-gray-500 ml-2">
                            on {new Date(selectedUser.smsConsentDate).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <label className="font-medium text-gray-700">Consent Method:</label>
                      <p className="text-gray-900">{selectedUser.smsConsentMethod || 'Not recorded'}</p>
                    </div>
                    
                    <div>
                      <label className="font-medium text-gray-700">IP Address:</label>
                      <p className="text-gray-900 font-mono">{selectedUser.smsConsentIpAddress || 'Not recorded'}</p>
                    </div>
                    
                    <div>
                      <label className="font-medium text-gray-700">Marketing Consent:</label>
                      <p className="text-gray-900">{selectedUser.marketingSmsConsent ? 'Opted In' : 'Opted Out'}</p>
                    </div>
                    
                    <div>
                      <label className="font-medium text-gray-700">Transactional Consent:</label>
                      <p className="text-gray-900">{selectedUser.transactionalSmsConsent ? 'Opted In' : 'Opted Out'}</p>
                    </div>
                    
                    <div>
                      <label className="font-medium text-gray-700">Privacy Policy:</label>
                      <p className="text-gray-900">
                        {selectedUser.privacyPolicyAccepted ? 'Accepted' : 'Not Accepted'}
                        {selectedUser.privacyPolicyVersion && (
                          <span className="text-gray-500 ml-2">
                            (v{selectedUser.privacyPolicyVersion})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {selectedUser.smsOptOutDate && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="flex items-center gap-2 text-red-800">
                        <XCircle className="h-4 w-4" />
                        <span className="font-medium">User Opted Out</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        Opted out on {new Date(selectedUser.smsOptOutDate).toLocaleDateString()}
                        {selectedUser.smsOptOutMethod && ` via ${selectedUser.smsOptOutMethod}`}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* SMS Consent Management Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSmsConsentAction(selectedUser.id, 'opt-in-all')}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enable All SMS
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => selectedUser && handleSmsConsentAction(selectedUser.id, 'opt-out-all')}
                      disabled={!selectedUser}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Disable All SMS
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectedUser && handleSmsConsentAction(selectedUser.id, 'marketing-only')}
                      disabled={!selectedUser}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Marketing Only
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectedUser && handleSmsConsentAction(selectedUser.id, 'transactional-only')}
                      disabled={!selectedUser}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      Transactional Only
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end space-x-2">
        <Button 
          type="submit" 
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (mode === 'create' ? 'Create User' : 'Update User')}
        </Button>

      </div>
    </form>
  );
}


// Order & Delivery Settings Card Component
function OrderDeliverySettingsCard() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    minimumOrderAmount: 0,
    deliveryFee: 0,
    freeDeliveryThreshold: 0,
    loyaltyPointsRate: 0,
    invoiceStyle: "legacy" as "legacy" | "enhanced"
  });

  // Fetch order settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/admin/order-settings"],
    retry: 3,
  });

  // Initialize form data when settings load
  React.useEffect(() => {
    if (settings && !isEditing) {
      setFormData({
        minimumOrderAmount: settings.minimumOrderAmount || 0,
        deliveryFee: settings.deliveryFee || 0,
        freeDeliveryThreshold: settings.freeDeliveryThreshold || 0,
        loyaltyPointsRate: settings.loyaltyPointsRate || 0,
        invoiceStyle: settings.invoiceStyle || "legacy"
      });
    }
  }, [settings, isEditing]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PUT", "/api/admin/order-settings", data);
    },
    onSuccess: () => {
      // Invalidate and refetch the cache to get updated data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/order-settings"] });
      toast({
        title: "Settings Updated",
        description: "Order and delivery settings have been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: `Failed to update settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (settings) {
      setFormData({
        minimumOrderAmount: settings.minimumOrderAmount || 0,
        deliveryFee: settings.deliveryFee || 0,
        freeDeliveryThreshold: settings.freeDeliveryThreshold || 0,
        loyaltyPointsRate: settings.loyaltyPointsRate || 0,
        invoiceStyle: settings.invoiceStyle || "legacy"
      });
    }
  };

  if (isLoadingSettings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Order & Delivery Settings</CardTitle>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configure Settings
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="outline" size="sm">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                size="sm"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          Configure minimum orders & delivery fees
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <div className="text-sm text-gray-600 space-y-2">
            <p>Set minimum order amounts (${settings?.minimumOrderAmount || 30}), delivery fees (${settings?.deliveryFee || 5}), free delivery threshold (${settings?.freeDeliveryThreshold || 250}), loyalty points rate ({((settings?.loyaltyPointsRate || 0.02) * 100).toFixed(1)}%), and invoice style ({settings?.invoiceStyle || "legacy"}).</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimumOrderAmount">Minimum Order Amount ($)</Label>
                <Input
                  id="minimumOrderAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minimumOrderAmount}
                  onChange={(e) => setFormData({ ...formData, minimumOrderAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryFee">Delivery Fee ($)</Label>
                <Input
                  id="deliveryFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.deliveryFee}
                  onChange={(e) => setFormData({ ...formData, deliveryFee: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="freeDeliveryThreshold">Free Delivery Threshold ($)</Label>
                <Input
                  id="freeDeliveryThreshold"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.freeDeliveryThreshold}
                  onChange={(e) => setFormData({ ...formData, freeDeliveryThreshold: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loyaltyPointsRate">Loyalty Points Rate (%)</Label>
                <Input
                  id="loyaltyPointsRate"
                  type="number"
                  min="0"
                  max="1"
                  step="0.001"
                  value={formData.loyaltyPointsRate}
                  onChange={(e) => setFormData({ ...formData, loyaltyPointsRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceStyle">Invoice Style</Label>
              <Select 
                value={formData.invoiceStyle} 
                onValueChange={(value: "legacy" | "enhanced") => setFormData({ ...formData, invoiceStyle: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legacy">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Legacy Format
                    </div>
                  </SelectItem>
                  <SelectItem value="enhanced">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Enhanced Format
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Choose between legacy invoice format and enhanced format with improved styling
              </p>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
