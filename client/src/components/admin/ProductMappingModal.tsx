import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
interface ProductMappingCandidate {
  productId: number;
  name: string;
  sku?: string;
  description?: string;
  brand?: string;
  matchPercentage: number;
  matchReasons: string[];
}

interface ProductCreationResult {
  productId: number | null;
  created: boolean;
  productName: string;
  needsApproval?: boolean;
  requiresMapping?: boolean;
  mappingCandidates?: ProductMappingCandidate[];
  recommendCreateNew?: boolean;
  confidenceAnalysis?: {
    hasHighConfidence: boolean;
    hasLowConfidence: boolean;
    bestMatchPercentage: number;
    recommendation: 'create_new' | 'map_existing' | 'review_carefully';
  };
  productData?: {
    name: string;
    description?: string;
    unitPrice: number;
    sku?: string;
    upcCode?: string;
    brand?: string;
    size?: string;
    weight?: string;
    supplier?: string;
  };
  suggestedCategoryId?: number | null;
  suggestedCategoryName?: string | null;
  availableCategories?: Array<{ id: number; name: string; description?: string }>;
}
import { CheckCircle, AlertCircle, Search, Package, ArrowRight, X, Plus } from 'lucide-react';

interface ProductMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductCreationResult[];
  onMapping: (productIndex: number, mappingChoice: { type: 'map', candidateId: number } | { type: 'create' } | { type: 'skip' }) => void;
  isLoading: boolean;
}

export function ProductMappingModal({ 
  isOpen, 
  onClose, 
  products, 
  onMapping, 
  isLoading 
}: ProductMappingModalProps) {
  const [selectedMappings, setSelectedMappings] = useState<Map<number, number | null>>(new Map());
  const [createNewProducts, setCreateNewProducts] = useState<Set<number>>(new Set());

  const productsRequiringMapping = products.filter(p => p.requiresMapping && p.mappingCandidates);

  const handleMappingSelect = (productIndex: number, candidateId: number | null) => {
    const newMappings = new Map(selectedMappings);
    if (candidateId === null) {
      newMappings.delete(productIndex);
    } else {
      newMappings.set(productIndex, candidateId);
    }
    setSelectedMappings(newMappings);

    // Remove from create new products if mapping is selected
    if (candidateId !== null) {
      const newCreateSet = new Set(createNewProducts);
      newCreateSet.delete(productIndex);
      setCreateNewProducts(newCreateSet);
    }
  };

  const handleCreateNewProduct = (productIndex: number, shouldCreate: boolean) => {
    const newCreateSet = new Set(createNewProducts);
    if (shouldCreate) {
      newCreateSet.add(productIndex);
      // Remove any mapping selection
      const newMappings = new Map(selectedMappings);
      newMappings.delete(productIndex);
      setSelectedMappings(newMappings);
    } else {
      newCreateSet.delete(productIndex);
    }
    setCreateNewProducts(newCreateSet);
  };

  const handleConfirmMappings = () => {
    productsRequiringMapping.forEach((product, index) => {
      const productIndex = products.indexOf(product);
      const selectedMapping = selectedMappings.get(productIndex);
      const shouldCreateNew = createNewProducts.has(productIndex);

      if (selectedMapping) {
        onMapping(productIndex, { type: 'map', candidateId: selectedMapping });
      } else if (shouldCreateNew) {
        onMapping(productIndex, { type: 'create' });
      } else {
        onMapping(productIndex, { type: 'skip' });
      }
    });
  };

  const canConfirm = productsRequiringMapping.every((product, index) => {
    const productIndex = products.indexOf(product);
    return selectedMappings.has(productIndex) || createNewProducts.has(productIndex);
  });

  if (productsRequiringMapping.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Smart Product Mapping
            <Badge variant="secondary" className="ml-2">
              {productsRequiringMapping.length} products need mapping
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-6">
            {productsRequiringMapping.map((product, index) => {
              const productIndex = products.indexOf(product);
              const selectedMapping = selectedMappings.get(productIndex);
              const willCreateNew = createNewProducts.has(productIndex);

              return (
                <Card key={productIndex} className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        <span className="text-lg">{product.productName}</span>
                        {product.productData?.brand && (
                          <Badge variant="outline">{product.productData.brand}</Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-sm">
                        ${product.productData?.unitPrice?.toFixed(2)}
                      </Badge>
                    </CardTitle>
                    
                    {product.productData && (
                      <div className="text-sm text-muted-foreground space-y-1">
                        {product.productData.description && (
                          <p><strong>Description:</strong> {product.productData.description}</p>
                        )}
                        {product.productData.sku && (
                          <p><strong>Supplier SKU:</strong> {product.productData.sku}</p>
                        )}
                        {product.productData.upcCode && (
                          <p><strong>UPC:</strong> {product.productData.upcCode}</p>
                        )}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      {/* AI Confidence Analysis */}
                      {product.confidenceAnalysis && (
                        <div className="mb-4 p-3 rounded-lg border bg-gray-50">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-semibold">AI Recommendation</span>
                          </div>
                          <div className="text-sm text-gray-700">
                            {product.confidenceAnalysis.recommendation === 'create_new' ? (
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-green-700">
                                  Suggest creating new product - No high-confidence matches found ({product.confidenceAnalysis.bestMatchPercentage}% best match)
                                </span>
                              </div>
                            ) : product.confidenceAnalysis.recommendation === 'map_existing' ? (
                              <div className="flex items-center gap-2">
                                <ArrowRight className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-blue-700">
                                  High-confidence match found ({product.confidenceAnalysis.bestMatchPercentage}%) - Consider mapping to existing product
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <span className="font-medium text-amber-700">
                                  Review carefully - Mixed confidence levels ({product.confidenceAnalysis.bestMatchPercentage}% best match)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-4">
                        <Search className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">
                          Found {product.mappingCandidates?.length || 0} potential matches in your inventory
                        </span>
                      </div>

                      {/* Mapping Options */}
                      <div className="grid gap-3">
                        {product.mappingCandidates?.map((candidate) => (
                          <div
                            key={candidate.productId}
                            className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                              selectedMapping === candidate.productId
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200'
                            }`}
                            onClick={() => handleMappingSelect(productIndex, candidate.productId)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium">{candidate.name}</h4>
                                  <Badge 
                                    variant={candidate.matchPercentage >= 80 ? "default" : 
                                            candidate.matchPercentage >= 60 ? "secondary" : "outline"}
                                    className="text-xs"
                                  >
                                    {candidate.matchPercentage}% match
                                  </Badge>
                                  {candidate.brand && (
                                    <Badge variant="outline" className="text-xs">
                                      {candidate.brand}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="text-sm text-muted-foreground space-y-1">
                                  {candidate.sku && (
                                    <p><strong>Your SKU:</strong> {candidate.sku}</p>
                                  )}
                                  {candidate.description && (
                                    <p><strong>Description:</strong> {candidate.description}</p>
                                  )}
                                </div>

                                <div className="mt-2">
                                  <div className="text-sm">
                                    <strong>Why this matches:</strong>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                      {candidate.matchReasons.map((reason, idx) => (
                                        <li key={idx} className="text-muted-foreground">{reason}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>

                              <div className="ml-4">
                                {selectedMapping === candidate.productId ? (
                                  <CheckCircle className="h-5 w-5 text-blue-500" />
                                ) : (
                                  <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        <Separator className="my-4" />

                        {/* Create New Product Option - Enhanced with AI Recommendation */}
                        <div
                          className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                            willCreateNew
                              ? 'border-green-500 bg-green-50'
                              : product.recommendCreateNew
                                ? 'border-green-400 bg-green-25'
                                : 'border-gray-200'
                          }`}
                          onClick={() => handleCreateNewProduct(productIndex, !willCreateNew)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              <span className="font-medium">Create as new product</span>
                              {product.recommendCreateNew ? (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  AI Recommended
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  No suitable match found
                                </Badge>
                              )}
                            </div>
                            <div className="ml-4">
                              {willCreateNew ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                              )}
                            </div>
                          </div>
                          
                          {product.recommendCreateNew && !willCreateNew && (
                            <div className="mt-2 text-xs text-green-700 bg-green-100 p-2 rounded">
                              <strong>AI Analysis:</strong> Low match confidence ({product.confidenceAnalysis?.bestMatchPercentage}%) suggests this is a unique product that should be created new.
                            </div>
                          )}
                          
                          {willCreateNew && product.productData && (
                            <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              <div className="grid grid-cols-2 gap-2">
                                <div><strong>Name:</strong> {product.productData.name}</div>
                                <div><strong>Price:</strong> ${product.productData.unitPrice?.toFixed(2)}</div>
                                {product.productData.brand && (
                                  <div><strong>Brand:</strong> {product.productData.brand}</div>
                                )}
                                {product.productData.sku && (
                                  <div><strong>SKU:</strong> {product.productData.sku}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Select how to handle each product. You can map to existing inventory or create new products.
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmMappings}
              disabled={!canConfirm || isLoading}
              className="min-w-32"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Apply Mappings
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}