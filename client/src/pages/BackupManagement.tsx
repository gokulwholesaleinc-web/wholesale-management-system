import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Database, 
  Calendar,
  FileText,
  HardDrive,
  AlertTriangle
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { BreadcrumbNavigation } from "@/components/navigation/BreadcrumbNavigation";

interface BackupFile {
  name: string;
  size: number;
  created: string;
  modified: string;
  sizeFormatted: string;
}

export default function BackupManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

  // Fetch backup list
  const { data: backupData, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/backup'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Extract backups array from response
  const backups = Array.isArray(backupData?.backups) ? backupData.backups : [];

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/backup');
    },
    onSuccess: (data) => {
      toast({
        title: "Backup Created",
        description: "System backup has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backup'] });
    },
    onError: (error) => {
      console.error('Backup creation failed:', error);
      toast({
        title: "Backup Failed",
        description: "Failed to create backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      return await apiRequest('DELETE', `/api/admin/backup/${filename}`);
    },
    onSuccess: () => {
      toast({
        title: "Backup Deleted",
        description: "Backup file has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backup'] });
      setSelectedBackup(null);
    },
    onError: (error) => {
      console.error('Backup deletion failed:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateBackup = () => {
    createBackupMutation.mutate();
  };

  const handleDeleteBackup = (filename: string) => {
    if (confirm(`Are you sure you want to delete backup "${filename}"? This action cannot be undone.`)) {
      deleteBackupMutation.mutate(filename);
    }
  };

  const handleDownloadBackup = (filename: string) => {
    // Create download link
    const link = document.createElement('a');
    link.href = `/api/admin/backup/download/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalBackupSize = (): string => {
    const totalBytes = backups.reduce((sum: number, backup: BackupFile) => sum + backup.size, 0);
    return formatFileSize(totalBytes);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BreadcrumbNavigation />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Backup Management</h1>
          <p className="text-gray-600 mt-2">
            Create, manage, and restore system backups
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleCreateBackup}
            disabled={createBackupMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createBackupMutation.isPending ? 'Creating...' : 'Create Backup'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Backups</p>
                <p className="text-2xl font-bold text-gray-900">{backups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <HardDrive className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Size</p>
                <p className="text-2xl font-bold text-gray-900">{getTotalBackupSize()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Latest Backup</p>
                <p className="text-lg font-bold text-gray-900">
                  {backups.length > 0 
                    ? formatDistanceToNow(new Date(backups[0]?.created), { addSuffix: true })
                    : 'None'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Backup Type</p>
                <p className="text-lg font-bold text-gray-900">JSON Data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Available Backups
          </CardTitle>
          <CardDescription>
            Manage your system backups. Click on a backup to select it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading backups...
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No backups found</h3>
              <p className="text-gray-600 mb-4">Create your first backup to get started.</p>
              <Button onClick={handleCreateBackup} disabled={createBackupMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Backup
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup: BackupFile) => (
                <div
                  key={backup.name}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedBackup === backup.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedBackup(backup.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <div>
                          <h4 className="font-medium text-gray-900">{backup.name}</h4>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <span>Size: {backup.sizeFormatted}</span>
                            <span>Created: {formatDistanceToNow(new Date(backup.created), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">JSON</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadBackup(backup.name);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBackup(backup.name);
                        }}
                        disabled={deleteBackupMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Information */}
      {selectedBackup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Backup Contents</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Product inventory data</li>
                  <li>• User accounts and profiles</li>
                  <li>• Order history and details</li>
                  <li>• Category and system settings</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Backup Schedule</h4>
                <p className="text-sm text-blue-700">
                  Automatic backups are created daily and stored locally. 
                  Manual backups can be created at any time using the "Create Backup" button.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Restore Notice</h4>
                <p className="text-sm text-red-700">
                  Backup restoration is currently being implemented. 
                  For now, backups can be downloaded for manual data recovery.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}