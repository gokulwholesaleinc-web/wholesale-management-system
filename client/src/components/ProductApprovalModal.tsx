import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CheckCircle, AlertCircle, Package, DollarSign, Tag, Hash, Search, Check, ChevronsUpDown, Image as ImageIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface ProductApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: any;
  suggestions: any[];
  onApprove: (decisions: any[]) => void;
  isApproving: boolean;
}

interface UserDecision {
  suggestionId: number;
  action: 'map_existing' | 'create_new' | 'skip';
  productId?: number;
  productName?: string;
  description?: string;
  sku?: string;
  unitCost: number;
  salePrice: number;
  categoryId?: number;
  quantity: number;
  updateProductCost?: boolean;
}

export default function ProductApprovalModal({ 
  isOpen, 
  onClose, 
  invoiceData, 
  suggestions, 
  onApprove,
  isApproving 
}: ProductApprovalModalProps) {
  const [userDecisions, setUserDecisions] = useState<UserDecision[]>([]);
  const [searchTerms, setSearchTerms] = useState<{[key: number]: string}>({});
  const [openComboboxes, setOpenComboboxes] = useState<{[key: number]: boolean}>({});

  // Get categories for dropdown
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    enabled: isOpen
  });

  // Get products for mapping
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
    enabled: isOpen
  });

  // Initialize decisions when modal opens
  React.useEffect(() => {
    if (suggestions && Array.isArray(suggestions) && suggestions.length > 0 && userDecisions.length === 0) {
      const initialDecisions: UserDecision[] = (suggestions || []).map(suggestion => ({
        suggestionId: suggestion.id,
        action: (suggestion.matchConfidence >= 70 ? 'map_existing' : 'create_new') as 'map_existing' | 'create_new' | 'skip',
        productId: suggestion.suggestedProductId,
        productName: suggestion.extractedProductName,
        description: suggestion.extractedDescription || '',
        sku: suggestion.extractedSku || '',
        unitCost: parseFloat(suggestion.extractedUnitCost),
        salePrice: parseFloat(suggestion.extractedUnitCost) * 1.3, // 30% markup default
        categoryId: suggestion.suggestedCategoryId,
        quantity: suggestion.extractedQuantity,
        updateProductCost: false
      }));
      setUserDecisions(initialDecisions);
    }
  }, [suggestions, userDecisions.length]);

  const updateDecision = (index: number, updates: Partial<UserDecision>) => {
    setUserDecisions(prev => prev.map((decision, i) => 
      i === index ? { ...decision, ...updates } : decision
    ));
  };

  const calculateProfitMargin = (cost: number, salePrice: number): number => {
    if (!cost || !salePrice || cost === 0 || salePrice === 0) return 0;
    return ((salePrice - cost) / salePrice) * 100;
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge className="bg-green-100 text-green-800 border-green-300">🎯 High Confidence ({confidence}%)</Badge>;
    if (confidence >= 60) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">⚡ Medium Confidence ({confidence}%)</Badge>;
    return <Badge className="bg-red-100 text-red-800 border-red-300">⚠️ Low Confidence ({confidence}%)</Badge>;
  };

  const handleApprove = () => {
    onApprove(userDecisions);
  };

  const getSuggestedProduct = (productId: number) => {
    return (products as any[]).find((p: any) => p.id === productId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review AI Product Suggestions</DialogTitle>
          <DialogDescription>
            Review and approve the AI-suggested product mappings for {invoiceData?.supplierName || 'invoice'}.
            You have full control over each product creation and mapping decision.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium">Supplier</Label>
                  <p className="text-sm">{invoiceData?.supplierName || invoiceData?.vendorName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Invoice #</Label>
                  <p className="text-sm">{invoiceData?.invoiceNumber || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p className="text-sm">{invoiceData?.invoiceDate || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total</Label>
                  <p className="text-sm font-bold">${invoiceData?.totalAmount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Suggestions */}
          <div className="space-y-4">
            {(suggestions || []).map((suggestion, index) => {
              const decision = userDecisions[index];
              if (!decision) return null;

              const suggestedProduct = getSuggestedProduct(suggestion.suggestedProductId);

              return (
                <Card key={suggestion.id} className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {suggestion.extractedProductName}
                      </span>
                      {getConfidenceBadge(suggestion.matchConfidence)}
                    </CardTitle>
                    <CardDescription>
                      Qty: {suggestion.extractedQuantity} | 
                      Unit Cost: ${suggestion.extractedUnitCost} | 
                      SKU: {suggestion.extractedSku || 'N/A'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Action Selection */}
                    <div>
                      <Label className="text-sm font-medium">Action</Label>
                      <Select
                        value={decision.action}
                        onValueChange={(value: 'map_existing' | 'create_new' | 'skip') => 
                          updateDecision(index, { action: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="map_existing">
                            Map to Existing Product
                          </SelectItem>
                          <SelectItem value="create_new">
                            Create New Product
                          </SelectItem>
                          <SelectItem value="skip">
                            Skip This Item
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Suggested Match (if exists) */}
                    {suggestion.suggestedProductId && suggestedProduct && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium text-blue-800">🤖 AI Suggested Match</Label>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                            {suggestion.matchConfidence}% Match
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-md border flex items-center justify-center">
                              {suggestedProduct.imageUrl ? (
                                <img 
                                  src={suggestedProduct.imageUrl} 
                                  alt={suggestedProduct.name}
                                  className="w-full h-full object-cover rounded-md"
                                />
                              ) : (
                                <ImageIcon className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-blue-900">{suggestedProduct.name}</p>
                              <div className="grid grid-cols-2 gap-2 text-sm text-blue-700 mt-1">
                                <span>SKU: {suggestedProduct.sku}</span>
                                <span>Cost: ${suggestedProduct.cost}</span>
                                <span>Price: ${suggestedProduct.price}</span>
                                <span>Stock: {suggestedProduct.stock}</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border border-blue-200">
                            <p className="text-xs text-blue-600 font-medium">AI Reasoning:</p>
                            <p className="text-sm text-blue-800 mt-1">{suggestion.matchReasoning}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Product Details Form */}
                    {decision.action !== 'skip' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {decision.action === 'map_existing' && (
                          <div className="md:col-span-2">
                            <Label htmlFor={`product-select-${index}`}>Search & Select Product</Label>
                            <Popover open={openComboboxes[index] || false} onOpenChange={(open) => 
                              setOpenComboboxes(prev => ({ ...prev, [index]: open }))
                            }>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openComboboxes[index] || false}
                                  className="w-full justify-between"
                                >
                                  {decision.productId 
                                    ? (products as any[]).find((product: any) => product.id === decision.productId)?.name || "Select product..."
                                    : "Search for a product..."
                                  }
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0">
                                <Command>
                                  <CommandInput 
                                    placeholder="Search products by name, SKU, or description..." 
                                    value={searchTerms[index] || ''}
                                    onValueChange={(value) => {
                                      setSearchTerms(prev => ({ ...prev, [index]: value }));
                                      console.log('Search term:', value, 'Products available:', products.length);
                                      const filtered = (products as any[]).filter((product: any) => {
                                        const searchTerm = value?.toLowerCase() || '';
                                        if (!searchTerm) return true;
                                        return (
                                          product.name.toLowerCase().includes(searchTerm) ||
                                          (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
                                          (product.description && product.description.toLowerCase().includes(searchTerm)) ||
                                          (product.brand && product.brand.toLowerCase().includes(searchTerm)) ||
                                          (product.barcode && product.barcode.toLowerCase().includes(searchTerm))
                                        );
                                      });
                                      console.log('Filtered results count:', filtered.length);
                                    }}
                                  />
                                  <CommandEmpty>No products found.</CommandEmpty>
                                  <CommandList className="max-h-[300px]">
                                    <CommandGroup>
                                      {(products as any[])
                                        .filter((product: any) => {
                                          const searchTerm = searchTerms[index]?.toLowerCase() || '';
                                          if (!searchTerm) return true; // Show all when no search term
                                          return (
                                            product.name.toLowerCase().includes(searchTerm) ||
                                            (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
                                            (product.description && product.description.toLowerCase().includes(searchTerm)) ||
                                            (product.brand && product.brand.toLowerCase().includes(searchTerm)) ||
                                            (product.barcode && product.barcode.toLowerCase().includes(searchTerm))
                                          );
                                        })
                                        .map((product: any) => (
                                          <CommandItem
                                            key={product.id}
                                            value={product.id.toString()}
                                            onSelect={() => {
                                              updateDecision(index, { productId: product.id });
                                              setOpenComboboxes(prev => ({ ...prev, [index]: false }));
                                            }}
                                            className="flex items-start gap-3 p-3"
                                          >
                                            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                                              {product.imageUrl ? (
                                                <img 
                                                  src={product.imageUrl} 
                                                  alt={product.name}
                                                  className="w-full h-full object-cover rounded-md"
                                                />
                                              ) : (
                                                <ImageIcon className="h-6 w-6 text-gray-400" />
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between">
                                                <p className="font-medium text-sm truncate">{product.name}</p>
                                                <Check
                                                  className={cn(
                                                    "ml-2 h-4 w-4",
                                                    decision.productId === product.id ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                <span>SKU: {product.sku || 'N/A'}</span>
                                                <span>•</span>
                                                <span>Cost: ${product.cost || 0}</span>
                                                <span>•</span>
                                                <span>Price: ${product.price || 0}</span>
                                              </div>
                                              {product.description && (
                                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                  {product.description}
                                                </p>
                                              )}
                                              <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="secondary" className="text-xs">
                                                  Stock: {product.stock || 0}
                                                </Badge>
                                                {product.categoryName && (
                                                  <Badge variant="outline" className="text-xs">
                                                    {product.categoryName}
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            
                            {/* Selected Product Details */}
                            {decision.productId && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                {(() => {
                                  const selectedProduct = (products as any[]).find((p: any) => p.id === decision.productId);
                                  return selectedProduct ? (
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0 w-16 h-16 bg-white rounded-md border flex items-center justify-center">
                                        {selectedProduct.imageUrl ? (
                                          <img 
                                            src={selectedProduct.imageUrl} 
                                            alt={selectedProduct.name}
                                            className="w-full h-full object-cover rounded-md"
                                          />
                                        ) : (
                                          <ImageIcon className="h-8 w-8 text-gray-400" />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-medium text-green-800">{selectedProduct.name}</h4>
                                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-green-700">
                                          <div>SKU: {selectedProduct.sku || 'N/A'}</div>
                                          <div>Current Cost: ${selectedProduct.cost || 0}</div>
                                          <div>Sale Price: ${selectedProduct.price || 0}</div>
                                          <div>Stock: {selectedProduct.stock || 0}</div>
                                        </div>
                                        {selectedProduct.description && (
                                          <p className="text-sm text-green-600 mt-2">{selectedProduct.description}</p>
                                        )}
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            )}
                          </div>
                        )}

                        {decision.action === 'create_new' && (
                          <>
                            <div>
                              <Label htmlFor={`product-name-${index}`}>Product Name</Label>
                              <Input
                                id={`product-name-${index}`}
                                value={decision.productName || ''}
                                onChange={(e) => updateDecision(index, { productName: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`sku-${index}`}>SKU</Label>
                              <Input
                                id={`sku-${index}`}
                                value={decision.sku || ''}
                                onChange={(e) => updateDecision(index, { sku: e.target.value })}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label htmlFor={`description-${index}`}>Description</Label>
                              <Textarea
                                id={`description-${index}`}
                                value={decision.description || ''}
                                onChange={(e) => updateDecision(index, { description: e.target.value })}
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`category-${index}`}>Category</Label>
                              <Select
                                value={decision.categoryId?.toString() || ''}
                                onValueChange={(value) => updateDecision(index, { categoryId: parseInt(value) })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(categories as any[])
                                    .sort((a: any, b: any) => a.name.localeCompare(b.name))
                                    .map((category: any) => (
                                      <SelectItem key={category.id} value={category.id.toString()}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        <div>
                          <Label htmlFor={`unit-cost-${index}`}>Unit Cost</Label>
                          <Input
                            id={`unit-cost-${index}`}
                            type="number"
                            step="0.01"
                            value={decision.unitCost}
                            onChange={(e) => updateDecision(index, { unitCost: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`sale-price-${index}`}>Sale Price</Label>
                          <Input
                            id={`sale-price-${index}`}
                            type="number"
                            step="0.01"
                            value={decision.salePrice}
                            onChange={(e) => updateDecision(index, { salePrice: parseFloat(e.target.value) })}
                          />
                          {decision.unitCost > 0 && decision.salePrice > 0 && (
                            <div className="mt-1 text-sm">
                              <span className={`font-medium ${
                                calculateProfitMargin(decision.unitCost, decision.salePrice) >= 20 
                                  ? 'text-green-600' 
                                  : calculateProfitMargin(decision.unitCost, decision.salePrice) >= 10
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}>
                                Profit Margin: {calculateProfitMargin(decision.unitCost, decision.salePrice).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isApproving}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={isApproving}>
            {isApproving ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 animate-spin" />
                Creating Purchase Order...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Create Purchase Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}