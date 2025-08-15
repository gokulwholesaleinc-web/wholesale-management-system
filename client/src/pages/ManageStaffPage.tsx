import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'wouter';
import { AlertCircle, ArrowLeft, Check, Lock, Plus, ShieldAlert, Trash2, UserCog, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

// Form schema for creating/editing users
const userFormSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  isAdmin: z.boolean().default(false),
  isEmployee: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function ManageStaffPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('employees');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Only admins can access this page
  if (!isLoading && (!user || !user.isAdmin)) {
    return (
      <AppLayout title="Unauthorized">
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-center mb-2">Admin Access Required</h1>
          <p className="text-gray-600 text-center mb-6">Staff management requires administrator privileges.</p>
          <Button asChild>
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }
  
  // Form for adding a new staff member
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      company: '',
      isAdmin: false,
      isEmployee: true,
    },
  });
  
  // Define interface for staff members
  interface StaffMember {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    isAdmin: boolean | null;
    isEmployee: boolean | null;
  }
  
  // Query to fetch employees with proper typing
  const { data: staffMembers = [] as StaffMember[], isLoading: isLoadingStaff } = useQuery<StaffMember[]>({
    queryKey: ['/api/users/staff'],
    enabled: !!user?.isAdmin,
  });
  
  // Mutation to create a new staff member
  const createUserMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      return await apiRequest('POST', '/api/users', values);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Staff member created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/staff'] });
      setIsAddUserOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating staff member",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete a staff member
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/staff'] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting staff member",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: UserFormValues) => {
    createUserMutation.mutate(values);
  };
  
  // Handle user deletion confirmation
  const confirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };
  
  // Prepare to delete a user
  const handleDeleteClick = (staffMember: any) => {
    setSelectedUser(staffMember);
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <AppLayout title="Staff Management">
      <div className="container py-6 mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Staff Management</h1>
            <p className="text-gray-600 mt-1">
              Create and manage employee accounts
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Link>
            </Button>
            
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Staff Member</DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter username" {...field} />
                          </FormControl>
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
                            <Input type="password" placeholder="Enter password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="First name" {...field} value={field.value || ''} />
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
                              <Input placeholder="Last name" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input placeholder="Company name (optional)" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex flex-col space-y-2">
                      <FormField
                        control={form.control}
                        name="isEmployee"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Employee Role</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="isAdmin"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Administrator Role</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <DialogFooter className="mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddUserOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? "Creating..." : "Create Staff Member"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Staff List */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStaff ? (
              <div className="py-8 text-center">
                <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                <p className="mt-2 text-sm text-gray-500">Loading staff members...</p>
              </div>
            ) : staffMembers && staffMembers.length > 0 ? (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffMembers.map((staffMember) => (
                      <TableRow key={staffMember.id}>
                        <TableCell className="font-medium">{staffMember.username}</TableCell>
                        <TableCell>
                          {staffMember.firstName || staffMember.lastName ? 
                            `${staffMember.firstName || ''} ${staffMember.lastName || ''}`.trim() : 
                            <span className="text-gray-400">Not set</span>
                          }
                        </TableCell>
                        <TableCell>
                          {staffMember.isAdmin ? (
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                              <ShieldAlert className="mr-1 h-3 w-3" />
                              Admin
                            </Badge>
                          ) : staffMember.isEmployee ? (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                              <UserCog className="mr-1 h-3 w-3" />
                              Employee
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Lock className="mr-1 h-3 w-3" />
                              Unknown
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(staffMember)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500">No staff members found.</p>
                <Button 
                  onClick={() => setIsAddUserOpen(true)}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first staff member
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.username}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}