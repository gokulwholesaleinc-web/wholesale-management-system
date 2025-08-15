import React, { useState } from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Check, Lock, Plus, ShieldAlert, Trash2, UserCog, X } from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Form schema
const userFormSchema = z.object({
  username: z.string().min(4, "Username must be at least 4 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["employee", "admin"]),
  phone: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

function StaffManagementPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  
  // Fetch all staff users (employees and admins)
  const { data: staff = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['/api/admin/staff'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/staff');
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        return [];
      }
    },
  });
  
  // Create user form
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "employee",
      phone: "",
    },
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const response = await apiRequest('POST', '/api/admin/staff', values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/staff'] });
      setIsAddUserOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Staff member created successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create staff member",
        variant: "destructive",
      });
      console.error(error);
    },
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('DELETE', `/api/admin/staff/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/staff'] });
      setDeleteUserId(null);
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      });
      console.error(error);
    },
  });
  
  // Handle form submission
  const onSubmit = (values: UserFormValues) => {
    createUserMutation.mutate(values);
  };
  
  // Redirect if not an admin
  if (!isLoading && (!user || !user.isAdmin)) {
    return (
      <AppLayout title="Unauthorized">
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-center mb-2">Admin Access Required</h1>
          <p className="text-gray-600 text-center mb-6">You need administrator privileges to access this page.</p>
          <Button asChild>
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Sample dummy data for demonstration
  const dummyStaff = [
    {
      id: "admin",
      username: "admin",
      firstName: "Admin",
      lastName: "User",
      isAdmin: true,
      isEmployee: false,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    },
    {
      id: "employee-test",
      username: "etest",
      firstName: "Employee",
      lastName: "Test",
      isAdmin: false,
      isEmployee: true,
      createdAt: new Date("2025-04-01T00:00:00.000Z"),
    }
  ];

  // Use real data if available, otherwise fall back to dummy data
  const staffData = staff.length > 0 ? staff : dummyStaff;

  return (
    <AppLayout title="Staff Management">
      <div className="container px-4 py-6 mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <Button variant="outline" size="icon" asChild className="mr-4">
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <UserCog className="mr-2 h-6 w-6" /> Staff Management
              </h1>
              <p className="text-gray-500 text-sm">Manage employee and admin accounts</p>
            </div>
          </div>
          
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="mr-2 h-4 w-4" /> Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Staff Member</DialogTitle>
                <DialogDescription>
                  Add a new employee or admin user to the system.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="username" {...field} />
                        </FormControl>
                        <FormDescription>
                          This will be used for login
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="******" {...field} />
                        </FormControl>
                        <FormDescription>
                          Minimum 6 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Last Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Employee: Can manage products and orders. Admin: Has full access.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddUserOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? "Creating..." : "Create Staff Member"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <Tabs defaultValue="current">
          <TabsList className="mb-6">
            <TabsTrigger value="current">Current Staff</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current">
            <Card>
              <CardHeader>
                <CardTitle>Staff Members</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStaff ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : staffData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffData.map((staffMember) => (
                          <TableRow key={staffMember.id}>
                            <TableCell className="font-medium">{staffMember.username}</TableCell>
                            <TableCell>
                              {staffMember.firstName} {staffMember.lastName}
                            </TableCell>
                            <TableCell>
                              {staffMember.isAdmin ? (
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                  <ShieldAlert className="w-3 h-3 mr-1" /> Admin
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                  <UserCog className="w-3 h-3 mr-1" /> Employee
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(staffMember.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={staffMember.id === 'admin'} // Prevent deleting main admin
                                  onClick={() => setDeleteUserId(staffMember.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Lock className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <UserCog className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-600 mb-2">No Staff Members Found</h3>
                    <p className="text-gray-500 text-center">
                      You haven't added any staff members yet. Click "Add Staff Member" to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Delete confirmation dialog */}
            <Dialog
              open={deleteUserId !== null}
              onOpenChange={(open) => !open && setDeleteUserId(null)}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Staff Member</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this staff member? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex justify-between sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteUserId(null)}
                  >
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)}
                    disabled={deleteUserMutation.isPending}
                  >
                    {deleteUserMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Deleting...
                      </div>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Staff Member
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
          
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Staff Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <Check className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-xl font-medium text-gray-600 mb-2">Coming Soon</h3>
                  <p className="text-gray-500 text-center">
                    Staff activity logging is coming in the next update. You will be able to view a detailed log of all staff actions.
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/admin/activity-log">View Activity Log</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6">
          <p className="text-sm text-gray-500">
            <strong>Note:</strong> Employee accounts can manage products and orders, but cannot access user management or system settings. Admin accounts have full access to all features.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default StaffManagementPage;