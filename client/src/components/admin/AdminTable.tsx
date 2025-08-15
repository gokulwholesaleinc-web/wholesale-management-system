/**
 * Reusable Admin Table Component
 * Consistent styling and functionality for admin data tables
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Search,
  Filter,
  Download,
  Trash2
} from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T, value: any) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

interface AdminTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  exportable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onSelect?: (selectedItems: T[]) => void;
  onExport?: () => void;
  bulkActions?: Array<{
    label: string;
    action: (selectedItems: T[]) => void;
    icon?: React.ComponentType<{ className?: string }>;
    variant?: 'default' | 'destructive';
  }>;
  itemActions?: Array<{
    label: string;
    action: (item: T) => void;
    icon?: React.ComponentType<{ className?: string }>;
    variant?: 'default' | 'destructive';
  }>;
}

export function AdminTable<T extends { id: string | number }>({
  data,
  columns,
  title,
  loading = false,
  searchable = true,
  filterable = false,
  selectable = false,
  exportable = false,
  pagination = true,
  pageSize = 20,
  onSearch,
  onFilter,
  onSort,
  onSelect,
  onExport,
  bulkActions = [],
  itemActions = []
}: AdminTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Pagination logic
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = pagination ? data.slice(startIndex, startIndex + pageSize) : data;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    onSearch?.(query);
  };

  const handleSort = (key: string) => {
    const direction = sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    onSort?.(key, direction);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedData.map(item => item.id));
      setSelectedItems(allIds);
      onSelect?.(paginatedData);
    } else {
      setSelectedItems(new Set());
      onSelect?.([]);
    }
  };

  const handleSelectItem = (id: string | number, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
    
    const selectedData = data.filter(item => newSelected.has(item.id));
    onSelect?.(selectedData);
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      {(title || searchable || exportable || selectedItems.size > 0) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
            
            {/* Bulk actions */}
            {selectedItems.size > 0 && bulkActions.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedItems.size} selected
                </Badge>
                {bulkActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      size="sm"
                      variant={action.variant || 'default'}
                      onClick={() => {
                        const selectedData = data.filter(item => selectedItems.has(item.id));
                        action.action(selectedData);
                      }}
                    >
                      {Icon && <Icon className="h-4 w-4 mr-1" />}
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            )}

            {exportable && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {selectable && (
                  <th className="w-12 px-4 py-3">
                    <Checkbox
                      checked={selectedItems.size === paginatedData.length && paginatedData.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                )}
                
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={`px-4 py-3 text-left text-sm font-medium text-gray-900 ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key as string)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && sortConfig?.key === column.key && (
                        <span className="text-xs">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}

                {itemActions.length > 0 && (
                  <th className="w-32 px-4 py-3 text-right">Actions</th>
                )}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((item, rowIndex) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {selectable && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                    </td>
                  )}
                  
                  {columns.map((column, colIndex) => {
                    const value = column.key.includes('.') 
                      ? column.key.split('.').reduce((obj: any, key) => obj?.[key], item)
                      : (item as any)[column.key];

                    return (
                      <td key={colIndex} className="px-4 py-3 text-sm">
                        {column.render ? column.render(item, value) : String(value || '')}
                      </td>
                    );
                  })}

                  {itemActions.length > 0 && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {itemActions.map((action, actionIndex) => {
                          const Icon = action.icon;
                          return (
                            <Button
                              key={actionIndex}
                              size="sm"
                              variant={action.variant === 'destructive' ? 'destructive' : 'ghost'}
                              onClick={() => action.action(item)}
                            >
                              {Icon && <Icon className="h-4 w-4" />}
                            </Button>
                          );
                        })}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              
              {paginatedData.length === 0 && (
                <tr>
                  <td 
                    colSpan={columns.length + (selectable ? 1 : 0) + (itemActions.length > 0 ? 1 : 0)}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, data.length)} of {data.length} results
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}