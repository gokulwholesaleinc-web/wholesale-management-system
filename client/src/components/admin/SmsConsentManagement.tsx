import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  User, 
  Search,
  Filter,
  AlertTriangle,
  Globe,
  UserCheck,
  UserX,
  Settings
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  businessName: string;
  phone: string;
  smsNotifications: boolean;
  smsConsentGiven: boolean;
  smsConsentDate: string | null;
  smsConsentMethod: string | null;
  smsConsentIpAddress: string | null;
  smsOptOutDate: string | null;
  smsOptOutMethod: string | null;
  marketingSmsConsent: boolean;
  transactionalSmsConsent: boolean;
  privacyPolicyAccepted: boolean;
  privacyPolicyVersion: string | null;
  privacyPolicyAcceptedDate: string | null;
  notificationTypes: Record<string, boolean>;
  customerLevel: number;
  createdAt: string;
  updatedAt: string;
}

interface SmsConsentStats {
  totalCustomers: number;
  smsConsentGiven: number;
  marketingConsent: number;
  transactionalConsent: number;
  optedOut: number;
  consentRate: string;
}

interface SmsConsentData {
  success: boolean;
  users: User[];
  stats: SmsConsentStats;
}

export function SmsConsentManagement() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'consented' | 'not_consented' | 'opted_out'>('all');

  // Fetch SMS consent data
  const { data: consentData, isLoading } = useQuery({
    queryKey: ['/api/admin/sms-consent'],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data: SmsConsentData | undefined; isLoading: boolean };

  // Update user SMS consent mutation
  const updateConsentMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const response = await fetch(`/api/admin/sms-consent/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update SMS consent');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sms-consent'] });
      toast({
        title: "SMS Consent Updated",
        description: "User's SMS consent preferences have been updated successfully.",
      });
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update SMS consent preferences.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConsentStatusBadge = (user: User) => {
    if (user.smsOptOutDate) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <UserX className="h-3 w-3" />
        Opted Out
      </Badge>;
    }
    if (user.smsConsentGiven) {
      return <Badge variant="default" className="flex items-center gap-1 bg-green-600">
        <UserCheck className="h-3 w-3" />
        Consented
      </Badge>;
    }
    return <Badge variant="outline" className="flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" />
      No Consent
    </Badge>;
  };

  // Filter users based on search and status
  const filteredUsers = consentData?.users.filter(user => {
    const matchesSearch = 
      user.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);

    const matchesFilter = () => {
      switch (filterStatus) {
        case 'consented': return user.smsConsentGiven && !user.smsOptOutDate;
        case 'not_consented': return !user.smsConsentGiven && !user.smsOptOutDate;
        case 'opted_out': return !!user.smsOptOutDate;
        default: return true;
      }
    };

    return matchesSearch && matchesFilter();
  }) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            SMS Consent Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4 p-3 border rounded">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Customers</p>
                <p className="text-2xl font-bold">{consentData?.stats.totalCustomers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">SMS Consent</p>
                <p className="text-2xl font-bold">{consentData?.stats.smsConsentGiven || 0}</p>
                <p className="text-xs text-gray-500">{consentData?.stats.consentRate || '0'}% rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Marketing SMS</p>
                <p className="text-2xl font-bold">{consentData?.stats.marketingConsent || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Transactional</p>
                <p className="text-2xl font-bold">{consentData?.stats.transactionalConsent || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Opted Out</p>
                <p className="text-2xl font-bold">{consentData?.stats.optedOut || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main SMS Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            SMS Consent Management
          </CardTitle>
          <CardDescription>
            View and manage customer SMS consent preferences for TCPA compliance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by business name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Users</option>
                <option value="consented">Consented</option>
                <option value="not_consented">No Consent</option>
                <option value="opted_out">Opted Out</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Consent Date</TableHead>
                  <TableHead>Marketing</TableHead>
                  <TableHead>Transactional</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.businessName || `${user.firstName} ${user.lastName}`}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{user.phone || 'Not provided'}</TableCell>
                    <TableCell>{getConsentStatusBadge(user)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.smsConsentDate ? (
                          <>
                            <p>{formatDate(user.smsConsentDate)}</p>
                            <p className="text-xs text-gray-500">via {user.smsConsentMethod}</p>
                          </>
                        ) : (
                          'No consent given'
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.marketingSmsConsent ? (
                        <Badge variant="default" className="bg-green-600">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.transactionalSmsConsent ? (
                        <Badge variant="default" className="bg-blue-600">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Settings className="h-4 w-4" />
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>SMS Consent Management</DialogTitle>
                            <DialogDescription>
                              Update SMS consent preferences for {user.businessName || `${user.firstName} ${user.lastName}`}
                            </DialogDescription>
                          </DialogHeader>
                          <SmsConsentEditDialog 
                            user={user} 
                            onUpdate={updateConsentMutation.mutate}
                            isLoading={updateConsentMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No customers found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// SMS Consent Edit Dialog Component
function SmsConsentEditDialog({ 
  user, 
  onUpdate, 
  isLoading 
}: { 
  user: User; 
  onUpdate: (data: any) => void; 
  isLoading: boolean;
}) {
  const [smsConsentGiven, setSmsConsentGiven] = useState(user.smsConsentGiven);
  const [marketingSmsConsent, setMarketingSmsConsent] = useState(user.marketingSmsConsent);
  const [transactionalSmsConsent, setTransactionalSmsConsent] = useState(user.transactionalSmsConsent);
  const [adminNotes, setAdminNotes] = useState('');

  const handleSubmit = () => {
    onUpdate({
      userId: user.id,
      updates: {
        smsConsentGiven,
        marketingSmsConsent,
        transactionalSmsConsent,
        adminNotes: adminNotes || `Admin update by system on ${new Date().toISOString()}`
      }
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Current Consent Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>SMS Consent:</strong> {user.smsConsentGiven ? 'Yes' : 'No'}</p>
              <p><strong>Marketing SMS:</strong> {user.marketingSmsConsent ? 'Yes' : 'No'}</p>
              <p><strong>Transactional SMS:</strong> {user.transactionalSmsConsent ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p><strong>Consent Date:</strong> {formatDate(user.smsConsentDate)}</p>
              <p><strong>Method:</strong> {user.smsConsentMethod || 'Not set'}</p>
              <p><strong>Opt-out Date:</strong> {formatDate(user.smsOptOutDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Consent */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="sms-consent"
            checked={smsConsentGiven}
            onCheckedChange={setSmsConsentGiven}
          />
          <Label htmlFor="sms-consent" className="font-medium">
            SMS Notifications Consent
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="marketing-consent"
            checked={marketingSmsConsent}
            onCheckedChange={setMarketingSmsConsent}
            disabled={!smsConsentGiven}
          />
          <Label htmlFor="marketing-consent">
            Marketing SMS Consent
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="transactional-consent"
            checked={transactionalSmsConsent}
            onCheckedChange={setTransactionalSmsConsent}
            disabled={!smsConsentGiven}
          />
          <Label htmlFor="transactional-consent">
            Transactional SMS Consent
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-notes">Admin Notes</Label>
          <Textarea
            id="admin-notes"
            placeholder="Enter reason for consent status change..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="h-20"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Updating...' : 'Update Consent'}
          </Button>
        </div>
      </div>
    </div>
  );
}