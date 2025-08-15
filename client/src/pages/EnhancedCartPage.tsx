import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ShoppingCart, 
  Save, 
  Heart, 
  BookOpen, 
  Sparkles,
  Clock,
  ArrowRight,
  Plus,
  Minus,
  Trash2
} from "lucide-react";
// Cart management components removed - using simplified unified system
import { PageHeader } from "@/components/ui/page-header";
import { BreadcrumbNavigation } from "@/components/ui/breadcrumb-navigation";

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  productName: string;
  productImage?: string;
  createdAt: string;
}

export function EnhancedCartPage() {
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for cart items
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['/api/cart'],
    queryFn: () => apiRequest('/api/cart'),
  });

  // Auto-save draft order every 30 seconds
  useEffect(() => {
    if (!autoSaveEnabled || cartItems.length === 0) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        await apiRequest('/api/draft-orders/auto-save', {
          method: 'POST',
          body: JSON.stringify({
            name: `Auto-saved Cart ${new Date().toLocaleString()}`,
            items: cartItems.map((item: CartItem) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          })
        });
        setLastAutoSave(new Date());
      } catch (error) {
        // Silent auto-save failure
        console.log('Auto-save failed:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [cartItems, autoSaveEnabled]);

  // Update cart quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      apiRequest('/api/cart/update', {
        method: 'PUT',
        body: JSON.stringify({ productId, quantity })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  });

  // Remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: (productId: number) =>
      apiRequest('/api/cart/remove', {
        method: 'DELETE',
        body: JSON.stringify({ productId })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Removed",
        description: "Item has been removed from your cart.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  });

  const cartTotal = cartItems.reduce((sum: number, item: CartItem) => 
    sum + (item.price * item.quantity), 0
  );

  return (
    <div className="space-y-6">
      <BreadcrumbNavigation />
      <PageHeader 
        title="Enhanced Shopping Cart" 
        description="Advanced cart management with AI-powered suggestions, drafts, and templates"
      />

      {/* Auto-save status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Auto-save</span>
              <Badge variant={autoSaveEnabled ? "default" : "secondary"}>
                {autoSaveEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              {lastAutoSave && (
                <span className="text-xs text-muted-foreground">
                  Last saved: {lastAutoSave.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              >
                {autoSaveEnabled ? "Disable" : "Enable"} Auto-save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Cart */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <CardTitle>Your Cart</CardTitle>
                  <Badge variant="secondary">{cartItems.length}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">${cartTotal.toFixed(2)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading cart...</div>
              ) : cartItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Your cart is empty.</p>
                  <p className="text-sm">Add some products to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item: CartItem) => (
                    <Card key={item.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {item.productImage && (
                            <img 
                              src={item.productImage} 
                              alt={item.productName}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{item.productName}</h4>
                            <p className="text-sm text-muted-foreground">
                              ${item.price.toFixed(2)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantityMutation.mutate({
                                productId: item.productId,
                                quantity: Math.max(0, item.quantity - 1)
                              })}
                              disabled={updateQuantityMutation.isPending}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantityMutation.mutate({
                                productId: item.productId,
                                quantity: item.quantity + 1
                              })}
                              disabled={updateQuantityMutation.isPending}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromCartMutation.mutate(item.productId)}
                              disabled={removeFromCartMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Checkout section */}
                  <Card className="border-2 border-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Ready to checkout?</p>
                          <p className="text-sm text-muted-foreground">
                            {cartItems.length} items • Total: ${cartTotal.toFixed(2)}
                          </p>
                        </div>
                        <Button size="lg">
                          Proceed to Checkout
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Suggestions */}
        </div>

        {/* Enhanced Cart Features */}
        <div className="space-y-6">
          <Tabs defaultValue="drafts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="drafts" className="text-xs">
                <Save className="h-3 w-3 mr-1" />
                Drafts
              </TabsTrigger>
              <TabsTrigger value="wishlist" className="text-xs">
                <Heart className="h-3 w-3 mr-1" />
                Wishlist
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                Templates
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="drafts" className="mt-4">
              
            </TabsContent>
            
            <TabsContent value="wishlist" className="mt-4">
              
            </TabsContent>
            
            <TabsContent value="templates" className="mt-4">
              
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}