import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, UserX, UserCog, Key } from 'lucide-react';
import { CustomerActionsMenu } from '@/components/ui/customer-actions-menu';

// Interface for user data
interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  isEmployee?: boolean;
  businessName?: string;
  email?: string;
  phone?: string;
  customerLevel?: number;
}

export function EmployeeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for managing the user creation/edit form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmployee, setIsEmployee] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Filter for staff members (employees and admins)
  const staffMembers = users.filter(user => {
    // Only use the correct camelCase property names
    return user.isAdmin || user.isEmployee;
  });
  
  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return await apiRequest('POST', '/api/admin/users', userData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee account created successfully",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee account",
        variant: "destructive",
      });
    },
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      if (!editingUser) return;
      return await apiRequest('PUT', `/api/admin/users/${editingUser.id}`, userData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account updated successfully",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account",
        variant: "destructive",
      });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string, newPassword: string }) => {
      return await apiRequest('POST', `/api/admin/users/${userId}/reset-password`, { password: newPassword });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });
  
  // Customer Actions Menu handlers
  const handleViewDetails = (customerId: string) => {
    const user = users.find(u => u.id === customerId);
    if (user) {
      handleEditUser(user);
    }
  };

  const handleViewOrders = (customerId: string) => {
    toast({
      title: "View Orders",
      description: "Order history feature coming soon",
    });
  };

  const handleCreateOrder = (customerId: string) => {
    window.open(`/pos?customer=${customerId}`, '_blank');
  };

  const handleViewInvoices = (customerId: string) => {
    toast({
      title: "View Invoices",
      description: "Invoice history feature coming soon",
    });
  };

  const handleViewAddresses = (customerId: string) => {
    toast({
      title: "View Addresses",
      description: "Address management feature coming soon",
    });
  };

  const handleViewAnalytics = (customerId: string) => {
    toast({
      title: "View Analytics",
      description: "Customer analytics feature coming soon",
    });
  };

  const handleSendMessage = (customerId: string) => {
    toast({
      title: "Send Message",
      description: "Messaging feature coming soon",
    });
  };

  const handleCallCustomer = (customerId: string) => {
    const user = users.find(u => u.id === customerId);
    if (user?.phone) {
      window.open(`tel:${user.phone}`);
    }
  };

  const handleEmailCustomer = (customerId: string) => {
    const user = users.find(u => u.id === customerId);
    if (user?.email) {
      window.open(`mailto:${user.email}`);
    }
  };

  const handleToggleStatus = (customerId: string, active: boolean) => {
    toast({
      title: active ? "Activate Customer" : "Deactivate Customer",
      description: "Status management feature coming soon",
    });
  };

  const handleUpgradeLevel = (customerId: string) => {
    toast({
      title: "Upgrade Level",
      description: "Level management feature coming soon",
    });
  };

  const handleDowngradeLevel = (customerId: string) => {
    toast({
      title: "Downgrade Level", 
      description: "Level management feature coming soon",
    });
  };

  const handleArchive = (customerId: string) => {
    toast({
      title: "Archive Customer",
      description: "Archive feature coming soon",
    });
  };

  const handleDeleteCustomer = (customerId: string) => {
    const user = users.find(u => u.id === customerId);
    if (user) {
      setUserToDelete(user);
      setIsDeleteDialogOpen(true);
    }
  };

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Staff account deleted successfully",
      });
      setUserToDelete(null);
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      
      // Add to activity log
      const logEntry = {
        action: 'delete_user',
        targetUser: userToDelete?.username,
        timestamp: new Date().toISOString(),
      };
      apiRequest('POST', '/api/admin/activity-log', logEntry).catch(err => 
        console.error('Failed to log activity:', err)
      );
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete staff account",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    },
  });
  
  // Reset form function
  const resetForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setUsername('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setIsEmployee(true);
    setIsAdmin(false);
  };
  
  // Open form to create a new user
  const handleAddUser = () => {
    resetForm();
    setIsFormOpen(true);
  };
  
  // Open form to edit an existing user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setEmail(user.email || '');
    setIsEmployee(user.isEmployee || false);
    setIsAdmin(user.isAdmin || false);
    setPassword(''); // Don't populate password when editing
    setIsFormOpen(true);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const userData = {
      username,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: email || undefined,
      isEmployee,
      isAdmin,
      ...(password && { password }), // Only include password if it's provided
    };
    
    if (editingUser) {
      updateUserMutation.mutate(userData);
    } else {
      if (!password) {
        toast({
          title: "Error",
          description: "Password is required when creating a new account",
          variant: "destructive",
        });
        return;
      }
      createUserMutation.mutate(userData);
    }
  };
  
  // Handle password reset
  const handleResetPassword = (userId: string) => {
    const newPassword = prompt("Enter new password for this account:");
    if (newPassword) {
      resetPasswordMutation.mutate({ userId, newPassword });
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Staff Management</span>
            <Button onClick={handleAddUser} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </CardTitle>
          <CardDescription>
            Manage employee and admin access accounts for your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : staffMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No staff accounts found.</p>
              <p className="text-sm mt-2">Add staff members to help manage your business.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMembers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        {user.firstName || user.lastName 
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
                          : <span className="text-muted-foreground italic">Not provided</span>}
                      </TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge variant="default">Admin</Badge>
                        ) : user.isEmployee ? (
                          <Badge variant="secondary">Employee</Badge>
                        ) : (
                          <Badge variant="outline">Customer</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <CustomerActionsMenu
                          customer={{
                            id: user.id,
                            username: user.username,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            company: user.businessName,
                            customerLevel: user.customerLevel || 1,
                            email: user.email,
                            phone: user.phone,
                            isActive: true,
                            totalOrders: 0
                          }}
                          onViewDetails={handleViewDetails}
                          onEditCustomer={handleViewDetails}
                          onViewOrders={handleViewOrders}
                          onCreateOrder={handleCreateOrder}
                          onViewInvoices={handleViewInvoices}
                          onViewAddresses={handleViewAddresses}
                          onViewAnalytics={handleViewAnalytics}
                          onSendMessage={handleSendMessage}
                          onCallCustomer={handleCallCustomer}
                          onEmailCustomer={handleEmailCustomer}
                          onToggleStatus={handleToggleStatus}
                          onUpgradeLevel={handleUpgradeLevel}
                          onDowngradeLevel={handleDowngradeLevel}
                          onArchive={handleArchive}
                          onDelete={handleDeleteCustomer}
                          currentUserRole="admin"
                          canEdit={true}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Form Sheet for Creating/Editing Users */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingUser ? 'Edit Staff Account' : 'Create Staff Account'}</SheetTitle>
            <SheetDescription>
              {editingUser 
                ? 'Update staff member details and permissions'
                : 'Create a new staff account with specific access permissions'}
            </SheetDescription>
          </SheetHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!editingUser} // Can't change username of existing accounts
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingUser}
                  placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                />
              </div>
            )}
            
            <div className="space-y-4 pt-2">
              <Label>Permissions</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isEmployee"
                  checked={isEmployee}
                  onCheckedChange={(checked) => setIsEmployee(checked === true)}
                />
                <Label htmlFor="isEmployee" className="cursor-pointer">
                  Employee (manage products & orders)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isAdmin"
                  checked={isAdmin}
                  onCheckedChange={(checked) => setIsAdmin(checked === true)}
                />
                <Label htmlFor="isAdmin" className="cursor-pointer">
                  Administrator (full access)
                </Label>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
              >
                {createUserMutation.isPending || updateUserMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingUser ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>{editingUser ? 'Update Account' : 'Create Account'}</>
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
      
      {/* Confirmation Dialog for Deleting Users */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete the staff account for <strong>{userToDelete?.username}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (userToDelete) {
                  deleteUserMutation.mutate(userToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}