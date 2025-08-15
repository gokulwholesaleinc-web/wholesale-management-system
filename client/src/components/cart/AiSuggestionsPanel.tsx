import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Sparkles, 
  ShoppingCart, 
  TrendingUp, 
  Package2, 
  Star, 
  Zap,
  RefreshCw,
  Calendar,
  Heart
} from "lucide-react";

interface AiSuggestion {
  id: number;
  type: 'bundle' | 'upsell' | 'seasonal' | 'frequently_bought' | 'price_optimization';
  title: string;
  description: string;
  confidence: number;
  expectedSavings?: number;
  products: Array<{
    id: number;
    name: string;
    price: number;
    image?: string;
    reason: string;
  }>;
  metadata?: {
    bundleDiscount?: number;
    seasonalRelevance?: string;
    frequencyScore?: number;
  };
}

const SUGGESTION_TYPES = {
  bundle: { icon: Package2, label: "Bundle Deals", color: "bg-blue-500" },
  upsell: { icon: TrendingUp, label: "Upgrades", color: "bg-green-500" },
  seasonal: { icon: Calendar, label: "Seasonal", color: "bg-orange-500" },
  frequently_bought: { icon: Star, label: "Popular Together", color: "bg-purple-500" },
  price_optimization: { icon: Zap, label: "Better Deals", color: "bg-red-500" },
};

export function AiSuggestionsPanel() {
  const [activeTab, setActiveTab] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for AI suggestions based on current cart
  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/ai-suggestions'],
    queryFn: () => apiRequest('/api/ai-suggestions'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-refresh suggestions when cart changes
  useEffect(() => {
    const handleCartChange = () => {
      refetch();
    };

    // Listen for cart changes (in a real app, this would be a proper event system)
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-suggestions'] });
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [refetch, queryClient]);

  // Add product to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: number; quantity?: number }) => {
      const product = await apiRequest(`/api/products/${productId}`);
      return apiRequest('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          quantity,
          price: product.price1 || product.price
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-suggestions'] });
      toast({
        title: "Added to Cart",
        description: "Product has been added to your cart.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add product to cart",
        variant: "destructive",
      });
    }
  });

  // Add to wishlist mutation
  const addToWishlistMutation = useMutation({
    mutationFn: (productId: number) => 
      apiRequest('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({ productId })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      toast({
        title: "Added to Wishlist",
        description: "Product has been saved to your wishlist.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to wishlist",
        variant: "destructive",
      });
    }
  });

  const handleRefreshSuggestions = async () => {
    setIsRefreshing(true);
    try {
      await apiRequest('/api/ai-suggestions/refresh', { method: 'POST' });
      await refetch();
      toast({
        title: "Suggestions Refreshed",
        description: "AI suggestions have been updated based on your current cart.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh suggestions",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredSuggestions = activeTab === 'all' 
    ? suggestions 
    : suggestions.filter((s: AiSuggestion) => s.type === activeTab);

  const getTypeConfig = (type: string) => SUGGESTION_TYPES[type as keyof typeof SUGGESTION_TYPES];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Smart Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Analyzing your cart for smart suggestions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <CardTitle>AI Smart Suggestions</CardTitle>
            <Badge variant="secondary">{suggestions.length}</Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshSuggestions}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          AI-powered recommendations based on your cart, purchase history, and market trends.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No AI suggestions available yet.</p>
            <p className="text-sm">Add items to your cart to get personalized recommendations.</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="bundle">Bundles</TabsTrigger>
              <TabsTrigger value="upsell">Upgrades</TabsTrigger>
              <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
              <TabsTrigger value="frequently_bought">Popular</TabsTrigger>
              <TabsTrigger value="price_optimization">Deals</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-4">
                {filteredSuggestions.map((suggestion: AiSuggestion) => {
                  const typeConfig = getTypeConfig(suggestion.type);
                  const IconComponent = typeConfig?.icon || Sparkles;
                  
                  return (
                    <Card key={suggestion.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${typeConfig?.color || 'bg-gray-500'} text-white`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium">{suggestion.title}</h4>
                                <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(suggestion.confidence * 100)}% match
                                </Badge>
                                {suggestion.expectedSavings && (
                                  <Badge variant="destructive" className="text-xs">
                                    Save ${suggestion.expectedSavings.toFixed(2)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Products in suggestion */}
                            <div className="space-y-2">
                              {suggestion.products.map((product) => (
                                <div key={product.id} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    {product.image && (
                                      <img 
                                        src={product.image} 
                                        alt={product.name}
                                        className="w-8 h-8 object-cover rounded"
                                      />
                                    )}
                                    <div>
                                      <p className="text-sm font-medium">{product.name}</p>
                                      <p className="text-xs text-muted-foreground">{product.reason}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">${product.price.toFixed(2)}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => addToWishlistMutation.mutate(product.id)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Heart className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => addToCartMutation.mutate({ productId: product.id })}
                                      disabled={addToCartMutation.isPending}
                                      className="h-8"
                                    >
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Bundle action button */}
                            {suggestion.type === 'bundle' && suggestion.products.length > 1 && (
                              <div className="mt-3 pt-3 border-t">
                                <Button 
                                  className="w-full" 
                                  onClick={() => {
                                    suggestion.products.forEach(product => {
                                      addToCartMutation.mutate({ productId: product.id });
                                    });
                                  }}
                                  disabled={addToCartMutation.isPending}
                                >
                                  <Package2 className="h-4 w-4 mr-2" />
                                  Add All to Cart
                                  {suggestion.metadata?.bundleDiscount && (
                                    <Badge variant="secondary" className="ml-2">
                                      {suggestion.metadata.bundleDiscount}% off
                                    </Badge>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}