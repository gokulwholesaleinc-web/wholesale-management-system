import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Search, ArrowLeft, User, Clock, Activity } from 'lucide-react';
import { Link } from 'wouter';
import { BreadcrumbNavigation } from '@/components/navigation/BreadcrumbNavigation';

interface ActivityLogEntry {
  id: number;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
  targetId?: string;
  targetType?: string;
  username?: string;
  displayName?: string;
}

export default function StaffActivityMonitor() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Staff Activity Monitor Component - Fresh Version
  const queryClient = useQueryClient();

  const { 
    data: response, 
    isLoading, 
    isError, 
    refetch,
    error 
  } = useQuery<{success: boolean, logs: ActivityLogEntry[], pagination: any}>({
    queryKey: ['/api/activity-logs'],
    retry: 1,
    staleTime: 0,
    refetchInterval: false,
  });

  const activityLogs = response?.logs || [];

  // Map logs to show real usernames
  const logs = activityLogs.map((log: ActivityLogEntry) => {
    // Convert user IDs to readable usernames with proper highlighting
    let displayName = log.username || log.userId;
    
    return {
      ...log,
      displayName
    };
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/activity-logs'] });
    refetch();
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      // Ensure valid date and use device's local timezone
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // Use browser's automatic timezone detection with explicit locale formatting
      return new Intl.DateTimeFormat('default', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }).format(date);
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'delete':
      case 'deleted':
        return 'destructive';
      case 'update':
      case 'updated':
      case 'edit':
        return 'default';
      case 'create':
      case 'created':
      case 'add':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const filteredLogs = logs.filter(log =>
    searchTerm === '' ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 md:p-4 space-y-4 max-w-7xl">
      <BreadcrumbNavigation />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="w-fit">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Staff Activity Monitor</h1>
            <p className="text-sm md:text-base text-muted-foreground">Real-time tracking of all staff actions</p>
          </div>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isLoading}
          className="w-fit self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
          <span className="sm:hidden">Sync</span>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by staff member, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Activity Feed ({filteredLogs.length} entries)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading activity logs...</span>
            </div>
          )}

          {isError && (
            <div className="text-center p-8">
              <p className="text-destructive mb-4">Failed to load activity logs</p>
              <Button onClick={handleRefresh} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {!isLoading && !isError && filteredLogs.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No activity logs found</p>
              {searchTerm && <p className="text-sm">Try adjusting your search terms</p>}
            </div>
          )}

          {!isLoading && !isError && filteredLogs.length > 0 && (
            <div className="space-y-4">
              {filteredLogs.map((log, index) => (
                <div key={log.id || index}>
                  <div className="flex items-start space-x-2 sm:space-x-4 p-3 sm:p-4 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="font-semibold text-blue-600 text-sm sm:text-base truncate">
                            {log.displayName}
                          </span>
                          <Badge variant={getActionBadgeVariant(log.action)} className="text-xs w-fit">
                            {log.action}
                          </Badge>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          <span className="truncate">{formatTimestamp(log.timestamp)}</span>
                        </div>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        {log.details}
                      </p>
                      
                      {log.targetType && log.targetId && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {log.targetType} ID: {log.targetId}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {index < filteredLogs.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}