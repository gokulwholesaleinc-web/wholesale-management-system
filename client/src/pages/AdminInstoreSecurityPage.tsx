import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, Wifi, Plus, RefreshCw } from "lucide-react";
import { AppLayout } from "@/layout/AppLayout";

export default function AdminInstoreSecurityPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newIP, setNewIP] = useState('');

  // Fetch in-store security status
  const { data: securityStatus, isLoading: loadingStatus, refetch } = useQuery({
    queryKey: ['/api/admin/instore/status'],
  });

  // Mutation to authorize new IP
  const authorizeIPMutation = useMutation({
    mutationFn: async (ipAddress: string) => {
      const response = await apiRequest('/api/admin/instore/authorize-ip', {
        method: 'POST',
        body: JSON.stringify({ ipAddress })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to authorize IP');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "IP Authorized",
        description: "IP address has been temporarily authorized for in-store access."
      });
      setNewIP('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/instore/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Authorization Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleAuthorizeIP = () => {
    if (!newIP) return;
    
    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newIP)) {
      toast({
        title: "Invalid IP Address",
        description: "Please enter a valid IPv4 address.",
        variant: "destructive"
      });
      return;
    }
    
    authorizeIPMutation.mutate(newIP);
  };

  if (loadingStatus) {
    return (
      <AppLayout title="In-Store Security Management">
        <div className="flex justify-center items-center min-h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="In-Store Security Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">In-Store POS Security</h1>
            <p className="text-gray-600 mt-1">Manage IP restrictions and access control</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Status
              </CardTitle>
              <CardDescription>
                Current security configuration and active sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Access Code Status</Label>
                <p className="text-lg font-mono mt-1">
                  {securityStatus?.accessCode || '***'} 
                  <Badge variant="outline" className="ml-2">Active</Badge>
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Active POS Sessions</Label>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {securityStatus?.activeSessions?.length || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Authorize New IP */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Authorize New IP
              </CardTitle>
              <CardDescription>
                Temporarily authorize an IP address for emergency access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="newIP">IP Address</Label>
                <Input
                  id="newIP"
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  placeholder="192.168.1.100"
                />
              </div>
              <Button 
                onClick={handleAuthorizeIP}
                disabled={authorizeIPMutation.isPending || !newIP}
                className="w-full"
              >
                {authorizeIPMutation.isPending ? "Authorizing..." : "Authorize IP"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Allowed IP Ranges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wifi className="w-5 h-5 mr-2" />
              Allowed IP Ranges (Environment)
            </CardTitle>
            <CardDescription>
              Configured in ALLOWED_STORE_IPS environment variable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {securityStatus?.allowedIPs?.map((ip: string, index: number) => (
                <Badge key={index} variant="secondary" className="justify-center py-2">
                  {ip}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Currently Authorized IPs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Temporarily Authorized IPs
            </CardTitle>
            <CardDescription>
              IPs authorized during this session (resets on server restart)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {securityStatus?.currentlyAuthorized?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityStatus.currentlyAuthorized.map((ip: string, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{ip}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-green-600">
                          Authorized
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No temporary IP authorizations active
              </p>
            )}
          </CardContent>
        </Card>

        {/* Security Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Security Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">IP Restrictions</h4>
                <p className="text-sm text-gray-600">
                  Only IPs in the allowed ranges can access the in-store POS system.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Emergency Override</h4>
                <p className="text-sm text-gray-600">
                  Admin users can override IP restrictions in emergencies. All overrides are logged.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Wifi className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Environment Configuration</h4>
                <p className="text-sm text-gray-600">
                  Set ALLOWED_STORE_IPS environment variable with comma-separated IP ranges.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}