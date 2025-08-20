import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, Search, Filter, Download, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityEvent {
  id: string;
  at: string;
  request_id?: string;
  actor_id?: string;
  actor_role?: string;
  action: string;
  subject_type: string;
  subject_id: string;
  target_type?: string;
  target_id?: string;
  severity: number;
  ip?: string;
  user_agent?: string;
  meta?: any;
  diff?: any;
  hash_prev?: string;
  hash_self: string;
}

export default function AdminActivityLog() {
  const [filters, setFilters] = useState({
    action: '',
    subject_type: '',
    severity: 'all',
    limit: 100
  });
  const [streaming, setStreaming] = useState(false);
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);

  const { data: activities, isLoading, refetch, error } = useQuery({
    queryKey: ['/api/activity', filters],
    enabled: !streaming, // Only fetch when not streaming
    retry: 3,
    refetchInterval: streaming ? false : 10000, // Auto-refresh when not streaming
  });

  // SSE streaming for real-time events
  useEffect(() => {
    if (!streaming) return;

    // Get auth token for SSE (EventSource doesn't support headers)
    const token = localStorage.getItem('auth-token');
    console.log('[SSE] Retrieved token from localStorage:', token ? token.substring(0, 20) + '...' : 'null');
    const params = new URLSearchParams();
    if (token) {
      params.set('token', token);
      console.log('[SSE] Added token to params, final query string:', params.toString());
    }
    
    let eventSource: EventSource | null = null;
    let backoff = 1000;

    function startStream() {
      if (eventSource) return;
      console.log('[SSE] Starting activity stream with token:', token ? 'present' : 'missing');
      console.log('[SSE] URL:', `/activity/stream?${params.toString()}`);
      eventSource = new EventSource(`/activity/stream?${params.toString()}`);
      
      eventSource.onmessage = (ev) => {
        const row = JSON.parse(ev.data);
        setLiveEvents(prev => [row, ...prev].slice(0, 500));
        backoff = 1000; // reset backoff on success
      };
      
      eventSource.onerror = () => {
        console.log('[SSE] Connection error, reconnecting...');
        eventSource?.close();
        eventSource = null;
        setTimeout(() => startStream(), Math.min(backoff, 15000));
        backoff = Math.min(backoff * 2, 15000);
      };
    }

    function stopStream() {
      eventSource?.close();
      eventSource = null;
    }

    startStream();

    return () => {
      stopStream();
    };
  }, [streaming]);

  const getSeverityBadge = (severity: number) => {
    if (severity >= 40) return <Badge variant="destructive">Error</Badge>;
    if (severity >= 30) return <Badge variant="secondary">Warning</Badge>;
    if (severity >= 20) return <Badge variant="outline">Notice</Badge>;
    return <Badge variant="default">Info</Badge>;
  };

  const getActionBadge = (action: string) => {
    if (action.startsWith('pos.')) return <Badge className="bg-green-100 text-green-800">POS</Badge>;
    if (action.startsWith('credit.')) return <Badge className="bg-blue-100 text-blue-800">Credit</Badge>;
    if (action.startsWith('auth.')) return <Badge className="bg-purple-100 text-purple-800">Auth</Badge>;
    if (action.startsWith('admin.')) return <Badge className="bg-orange-100 text-orange-800">Admin</Badge>;
    return <Badge variant="outline">{action.split('.')[0]}</Badge>;
  };

  const allEvents = streaming ? liveEvents : (activities?.rows || []);
  
  // Debug logging
  console.log('[Activity Log] Debug Info:', {
    streaming,
    isLoading,
    error: error?.message,
    activitiesData: activities,
    eventsCount: allEvents.length,
    liveEventsCount: liveEvents.length
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Activity Log</h1>
          <p className="text-muted-foreground">Real-time audit trail with tamper-evident hash chains</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={streaming ? "destructive" : "default"}
            onClick={() => {
              setStreaming(!streaming);
              if (streaming) setLiveEvents([]);
            }}
          >
            {streaming ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {streaming ? 'Stop Stream' : 'Live Stream'}
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <Search className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Input
          placeholder="Filter by action..."
          value={filters.action}
          onChange={(e) => setFilters({...filters, action: e.target.value})}
        />
        <Input
          placeholder="Filter by subject type..."
          value={filters.subject_type}
          onChange={(e) => setFilters({...filters, subject_type: e.target.value})}
        />
        <Select value={filters.severity} onValueChange={(value) => setFilters({...filters, severity: value})}>
          <SelectTrigger>
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="10">Info</SelectItem>
            <SelectItem value="20">Notice</SelectItem>
            <SelectItem value="30">Warning</SelectItem>
            <SelectItem value="40">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.limit.toString()} onValueChange={(value) => setFilters({...filters, limit: parseInt(value)})}>
          <SelectTrigger>
            <SelectValue placeholder="Limit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="50">50 events</SelectItem>
            <SelectItem value="100">100 events</SelectItem>
            <SelectItem value="250">250 events</SelectItem>
            <SelectItem value="500">500 events</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {streaming && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-800">
                Live streaming active • {liveEvents.length} events received
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">Loading activity log...</CardContent>
          </Card>
        ) : allEvents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No activity events found
            </CardContent>
          </Card>
        ) : (
          allEvents.map((event: ActivityEvent) => (
            <Card key={`${event.id}-${event.at}`} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getActionBadge(event.action)}
                      {getSeverityBadge(event.severity)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{event.action}</h3>
                      <p className="text-sm text-muted-foreground">
                        {event.subject_type} • {event.subject_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{format(new Date(event.at), 'MMM dd, yyyy • HH:mm:ss')}</p>
                    {event.ip && <p>IP: {event.ip}</p>}
                  </div>
                </div>

                {event.meta && Object.keys(event.meta).length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-1">Metadata</h4>
                    <div className="bg-gray-50 rounded p-3 text-sm font-mono">
                      <pre>{JSON.stringify(event.meta, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {event.diff && Object.keys(event.diff).length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-1">Changes</h4>
                    <div className="bg-yellow-50 rounded p-3 text-sm font-mono">
                      <pre>{JSON.stringify(event.diff, null, 2)}</pre>
                    </div>
                  </div>
                )}

                <Separator className="my-3" />
                
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    {event.request_id && <span>Request: {event.request_id.slice(0, 8)}...</span>}
                    {event.actor_role && <span>Role: {event.actor_role}</span>}
                    {event.target_type && event.target_id && (
                      <span>Target: {event.target_type}#{event.target_id ? event.target_id.slice(0, 8) + '...' : 'N/A'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">Hash: {event.hash_self ? event.hash_self.slice(0, 12) + '...' : 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}