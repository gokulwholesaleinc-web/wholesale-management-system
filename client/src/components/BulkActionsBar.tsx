import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Tag, Download, Trash2, X, Package } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkPriceUpdate?: () => void;
  onBulkCategoryChange?: () => void;
  onBulkExport?: () => void;
  onBulkDelete?: () => void;
  onBulkStatusUpdate?: () => void;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkPriceUpdate,
  onBulkCategoryChange,
  onBulkExport,
  onBulkDelete,
  onBulkStatusUpdate,
  className = '',
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;
  
  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 ${className}`}>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 flex items-center gap-3">
        <Badge variant="secondary" className="px-3 py-1">
          {selectedCount} selected
        </Badge>
        <div className="flex items-center gap-2">
          {onBulkPriceUpdate && (
            <Button size="sm" variant="outline" onClick={onBulkPriceUpdate}>
              <DollarSign className="h-4 w-4 mr-1" /> Update Prices
            </Button>
          )}
          {onBulkCategoryChange && (
            <Button size="sm" variant="outline" onClick={onBulkCategoryChange}>
              <Tag className="h-4 w-4 mr-1" /> Change Category
            </Button>
          )}
          {onBulkStatusUpdate && (
            <Button size="sm" variant="outline" onClick={onBulkStatusUpdate}>
              <Package className="h-4 w-4 mr-1" /> Update Status
            </Button>
          )}
          {onBulkExport && (
            <Button size="sm" variant="outline" onClick={onBulkExport}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          )}
          {onBulkDelete && (
            <Button size="sm" variant="destructive" onClick={onBulkDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}