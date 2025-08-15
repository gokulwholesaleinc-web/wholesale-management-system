import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  AlertTriangle,
  Save,
  X,
  ArrowLeft
} from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { AppLayout } from '@/layout/AppLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiRequest } from '@/lib/queryClient';
import { BreadcrumbNavigation } from "@/components/navigation/BreadcrumbNavigation";
import { CategoryActionsMenu } from '@/components/ui/category-actions-menu';
import { Checkbox } from '@/components/ui/checkbox';

interface Category {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  productCount?: number;
  visibleToLevels?: string[]; // Array of customer levels (1-5) that can see this category
  isVisible?: boolean;
  isDraft?: boolean;
  excludeFromLoyalty?: boolean;
}

export default function CategoryManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [sourceCategory, setSourceCategory] = useState<Category | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');

  // Check if user has admin permissions
  const isAdmin = user?.isAdmin || user?.is_admin;

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['/api/admin/categories'],
    enabled: isAdmin,
  });

  // Fetch products for each category to show product counts
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    enabled: isAdmin,
  });

  // Add product counts to categories
  const categoriesWithCounts = categories.map(category => ({
    ...category,
    productCount: Array.isArray(products) ? products.filter((product: any) => product.categoryId === category.id).length : 0
  }));

  // Category Actions Menu handlers
  const handleViewProducts = (categoryId: number) => {
    navigate(`/admin/products?category=${categoryId}`);
  };

  const handleViewAnalytics = (categoryId: number) => {
    toast({
      title: "Category Analytics",
      description: "Analytics feature coming soon",
    });
  };

  const handleAddProduct = (categoryId: number) => {
    toast({
      title: "Add Product",
      description: "Add product feature coming soon",
    });
  };

  const handleDuplicate = (category: Category) => {
    createCategoryMutation.mutate({
      name: `${category.name} (Copy)`,
      description: category.description
    });
  };

  const handleMergeCategory = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setSourceCategory(category);
      setShowMergeDialog(true);
    }
  };

  const handleArchive = (categoryId: number) => {
    toast({
      title: "Archive Category",
      description: "Archive feature coming soon",
    });
  };

  const handleDeleteCategory = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setDeletingCategory(category);
    }
  };

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: { 
      name: string; 
      description?: string;
      visibleToLevels?: string[];
      isVisible?: boolean;
      isDraft?: boolean;
      excludeFromLoyalty?: boolean;
    }) => {
      return apiRequest('POST', '/api/admin/categories', categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      setShowCreateDialog(false);
      toast({
        title: 'Category Created',
        description: 'Category has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create category',
        variant: 'destructive',
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { 
      id: number; 
      data: { 
        name: string; 
        description?: string;
        visibleToLevels?: string[];
        isVisible?: boolean;
        isDraft?: boolean;
        excludeFromLoyalty?: boolean;
      } 
    }) => {
      return apiRequest('PUT', `/api/admin/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      setEditingCategory(null);
      toast({
        title: 'Category Updated',
        description: 'Category has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update category',
        variant: 'destructive',
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/admin/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setDeletingCategory(null);
      toast({
        title: 'Category Deleted',
        description: 'Category has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete category',
        variant: 'destructive',
      });
    },
  });

  // Merge categories mutation
  const mergeCategoriesMutation = useMutation({
    mutationFn: async () => {
      if (!sourceCategory || !targetCategoryId) {
        throw new Error('Source and target categories are required');
      }
      
      return apiRequest('POST', '/api/admin/categories/merge', {
        sourceId: sourceCategory.id,
        targetId: parseInt(targetCategoryId)
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setShowMergeDialog(false);
      setSourceCategory(null);
      setTargetCategoryId('');
      toast({
        title: 'Categories Merged',
        description: `Successfully merged categories. ${data.updatedProducts} products moved.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Merge Failed',
        description: error instanceof Error ? error.message : 'Failed to merge categories',
        variant: 'destructive',
      });
    },
  });

  // Filter categories based on search
  const filteredCategories = categoriesWithCounts.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Redirect if not admin
  if (!isAdmin && !isLoading) {
    navigate('/');
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout title="Category Management">
        <div className="container mx-auto py-6">
          <h1 className="text-2xl font-bold mb-6">Category Management</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="w-full">
                <CardHeader>
                  <div className="h-6 bg-gray-200 animate-pulse rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-16 bg-gray-200 animate-pulse rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Category Management">
      <div className="container mx-auto py-6">
        {/* Breadcrumb Navigation */}
        <BreadcrumbNavigation />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Category Management</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowMergeDialog(true)}
              className="mt-4 md:mt-0"
            >
              <Package className="mr-2 h-4 w-4" />
              Merge Categories
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="mt-4 md:mt-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new product category to organize your inventory.
                </DialogDescription>
              </DialogHeader>
              <CategoryForm
                onSubmit={(data) => createCategoryMutation.mutate(data)}
                onCancel={() => setShowCreateDialog(false)}
                isLoading={createCategoryMutation.isPending}
              />
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No categories found' : 'No categories yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms.' 
                : 'Get started by creating your first product category.'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Category
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onEdit={setEditingCategory}
                onDelete={setDeletingCategory}
                onViewProducts={handleViewProducts}
                onViewAnalytics={handleViewAnalytics}
                onAddProduct={handleAddProduct}
                onDuplicate={handleDuplicate}
                onMergeCategory={handleMergeCategory}
                onArchive={handleArchive}
                onDeleteCategory={handleDeleteCategory}
              />
            ))}
          </div>
        )}

        {/* Edit Category Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update the category information.
              </DialogDescription>
            </DialogHeader>
            <CategoryForm
              category={editingCategory}
              onSubmit={(data) => 
                editingCategory && updateCategoryMutation.mutate({ id: editingCategory.id, data })
              }
              onCancel={() => setEditingCategory(null)}
              isLoading={updateCategoryMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Category Dialog */}
        <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                Delete Category
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingCategory?.name}"? 
                {deletingCategory?.productCount && deletingCategory.productCount > 0 && (
                  <span className="block mt-2 font-medium text-red-600">
                    This category contains {deletingCategory.productCount} product(s). 
                    Deleting it will remove the category assignment from these products.
                  </span>
                )}
                <span className="block mt-2">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingCategory && deleteCategoryMutation.mutate(deletingCategory.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Category
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Merge Categories Dialog */}
        <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge Categories</DialogTitle>
              <DialogDescription>
                Move all products from one category to another. The source category will be deleted after merging.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="source-category">Source Category (will be deleted)</Label>
                <Select
                  value={sourceCategory?.id.toString() || ''}
                  onValueChange={(value) => {
                    const category = categories.find(c => c.id.toString() === value);
                    setSourceCategory(category || null);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select source category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name} ({categoriesWithCounts.find(c => c.id === category.id)?.productCount || 0} products)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target-category">Target Category (products will move here)</Label>
                <Select
                  value={targetCategoryId}
                  onValueChange={setTargetCategoryId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select target category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(c => c.id !== sourceCategory?.id)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowMergeDialog(false);
                  setSourceCategory(null);
                  setTargetCategoryId('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => mergeCategoriesMutation.mutate()}
                disabled={!sourceCategory || !targetCategoryId || mergeCategoriesMutation.isPending}
              >
                {mergeCategoriesMutation.isPending ? 'Merging...' : 'Merge Categories'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

// Category Card Component
function CategoryCard({ 
  category, 
  onEdit, 
  onDelete,
  onViewProducts,
  onViewAnalytics,
  onAddProduct,
  onDuplicate,
  onMergeCategory,
  onArchive,
  onDeleteCategory
}: { 
  category: Category; 
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onViewProducts: (categoryId: number) => void;
  onViewAnalytics: (categoryId: number) => void;
  onAddProduct: (categoryId: number) => void;
  onDuplicate: (category: Category) => void;
  onMergeCategory: (categoryId: number) => void;
  onArchive: (categoryId: number) => void;
  onDeleteCategory: (categoryId: number) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{category.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {category.productCount || 0} products
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="py-3">
        {category.description ? (
          <p className="text-sm text-gray-600 line-clamp-3">{category.description}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">No description</p>
        )}
        
        <div className="mt-3 text-xs text-gray-400">
          Created {new Date(category.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end pt-3">
        <CategoryActionsMenu
          category={category}
          onEdit={onEdit}
          onViewProducts={onViewProducts}
          onViewAnalytics={onViewAnalytics}
          onAddProduct={onAddProduct}
          onDuplicate={onDuplicate}
          onMergeCategory={onMergeCategory}
          onArchive={onArchive}
          onDelete={onDeleteCategory}
          currentUserRole="admin"
          canEdit={true}
        />
      </CardFooter>
    </Card>
  );
}

// Category Form Component
function CategoryForm({ 
  category, 
  onSubmit, 
  onCancel, 
  isLoading 
}: { 
  category?: Category | null; 
  onSubmit: (data: { 
    name: string; 
    description?: string; 
    visibleToLevels?: string[];
    isVisible?: boolean;
    isDraft?: boolean;
    excludeFromLoyalty?: boolean;
  }) => void; 
  onCancel: () => void; 
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    visibleToLevels: category?.visibleToLevels || [],
    isVisible: category?.isVisible ?? true,
    isDraft: category?.isDraft ?? false,
    excludeFromLoyalty: category?.excludeFromLoyalty ?? false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      visibleToLevels: formData.visibleToLevels,
      isVisible: formData.isVisible,
      isDraft: formData.isDraft,
      excludeFromLoyalty: formData.excludeFromLoyalty
    });
  };

  const handleReset = () => {
    setFormData({
      name: category?.name || '',
      description: category?.description || '',
      visibleToLevels: category?.visibleToLevels || [],
      isVisible: category?.isVisible ?? true,
      isDraft: category?.isDraft ?? false,
      excludeFromLoyalty: category?.excludeFromLoyalty ?? false
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Category Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          placeholder="Enter category name"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter category description (optional)"
          rows={3}
          className="mt-1"
        />
      </div>

      {/* Visibility Controls */}
      <div className="space-y-4 border-t pt-4">
        <Label className="text-base font-medium">Visibility Settings</Label>
        
        {/* Basic visibility toggles */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isVisible"
              checked={formData.isVisible}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isVisible: checked === true }))
              }
            />
            <Label htmlFor="isVisible" className="text-sm">
              Visible to customers
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDraft"
              checked={formData.isDraft}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isDraft: checked === true }))
              }
            />
            <Label htmlFor="isDraft" className="text-sm">
              Draft mode (not live)
            </Label>
          </div>
        </div>

        {/* Customer Level Visibility */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Visible to Customer Levels (Leave empty for all levels)
          </Label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <div key={level} className="flex items-center space-x-2">
                <Checkbox
                  id={`level-${level}`}
                  checked={formData.visibleToLevels.includes(level.toString())}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData(prev => ({
                        ...prev,
                        visibleToLevels: [...prev.visibleToLevels, level.toString()].sort()
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        visibleToLevels: prev.visibleToLevels.filter(l => l !== level.toString())
                      }));
                    }
                  }}
                />
                <Label htmlFor={`level-${level}`} className="text-sm">
                  Level {level}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            If no levels are selected, the category will be visible to all customer levels
          </p>
        </div>

        {/* Loyalty exclusion */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="excludeFromLoyalty"
            checked={formData.excludeFromLoyalty}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, excludeFromLoyalty: checked === true }))
            }
          />
          <Label htmlFor="excludeFromLoyalty" className="text-sm">
            Exclude from loyalty points program
          </Label>
        </div>
      </div>

      <DialogFooter className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        {category && (
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        )}
        <Button type="submit" disabled={isLoading || !formData.name.trim()}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? 'Saving...' : (category ? 'Update' : 'Create')}
        </Button>
      </DialogFooter>
    </form>
  );
}