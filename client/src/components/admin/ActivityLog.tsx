import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, RefreshCw, Search, Filter } from 'lucide-react';

// Interface for activity log entry from our database
interface ActivityLogEntry {
  id: number;
  userId: string;
  action: string;
  details: string;
  timestamp: Date;
  ipAddress?: string;
  targetId?: string;
  targetType?: string;
  username?: string; // Added by the API
  fullName?: string; // Added by the API
}

export function ActivityLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  
  // Fetch activity log entries with proper authentication
  const { 
    data: response, 
    isLoading, 
    isError,
    refetch,
    isFetching
  } = useQuery<{success: boolean, logs: ActivityLogEntry[], pagination: any}>({
    queryKey: ['/api/activity-logs', Date.now()], // Add timestamp to force fresh data
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    staleTime: 0, // Data is always considered stale
    gcTime: 0, // Don't cache data
    retry: false, // Don't retry on auth failures
  });

  const logEntries = response?.logs || [];
  
  // Format timestamp correctly handling timezone-aware timestamps from database
  const formatDate = (timestamp: string) => {
    try {
      // Create date object from the timezone-aware timestamp
      const date = new Date(timestamp);
      
      // Ensure valid date
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // Use browser's local timezone for display
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Filter log entries based on search term and action filter
  const filteredEntries = logEntries.filter((entry) => {
    const matchesSearch = 
      (entry.username && entry.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.details && entry.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.targetId && entry.targetId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterAction === 'all' || entry.action === filterAction;
    
    return matchesSearch && matchesFilter;
  });
  
  // Sort entries by timestamp (newest first)
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  
  // Get unique action types for filtering
  const actionTypes = ['all', ...Array.from(new Set(logEntries.map(entry => entry.action)))];
  
  // Render action badge with appropriate color based on action type
  const renderActionBadge = (action: string) => {
    const variants: Record<string, string> = {
      create_user: 'bg-green-100 text-green-800 border-green-200',
      update_user: 'bg-blue-100 text-blue-800 border-blue-200',
      delete_user: 'bg-red-100 text-red-800 border-red-200',
      reset_password: 'bg-orange-100 text-orange-800 border-orange-200',
      update_product: 'bg-purple-100 text-purple-800 border-purple-200',
      create_product: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      delete_product: 'bg-rose-100 text-rose-800 border-rose-200',
      update_order: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      login: 'bg-green-100 text-green-800 border-green-200',
      failed_login: 'bg-red-100 text-red-800 border-red-200',
      logout: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    const badgeClass = variants[action] || 'bg-gray-100 text-gray-800 border-gray-200';
    const displayAction = action.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    return (
      <span 
        className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass} border`}
      >
        {displayAction}
      </span>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Staff Activity Log</CardTitle>
            <CardDescription>
              Track changes made by staff members
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and filter */}
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by username or action details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="p-2 border rounded-md text-sm bg-white"
            >
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {action === 'all' 
                    ? 'All Actions' 
                    : action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-red-500">
            <p>Failed to load activity log. Please try again.</p>
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No activity logs found</p>
            <p className="text-sm">Staff actions will be recorded here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(entry.timestamp.toString())}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.username || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {renderActionBadge(entry.action)}
                    </TableCell>
                    <TableCell>
                      {entry.details}
                      {entry.targetId && (
                        <span className="block text-sm text-gray-500">
                          Target ID: {entry.targetId}
                        </span>
                      )}
                      {entry.targetType && (
                        <span className="block text-sm text-gray-500">
                          Type: {entry.targetType}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}