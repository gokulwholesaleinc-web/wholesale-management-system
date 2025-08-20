import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Minus, Search, Pause, Receipt, CreditCard, DollarSign } from 'lucide-react';

interface CartItem {
  id: string;
  sku?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  taxCents?: number;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  category: number;
  barcode?: string;
  uom: string;
}

export default function InstorePOS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<string | null>(null);
  const [cashGiven, setCashGiven] = useState('');
  const { toast } = useToast();

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPriceCents), 0);
  const tax = cart.reduce((sum, item) => sum + (item.taxCents || 0), 0);
  const total = subtotal + tax;

  // Search products
  const searchProducts = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await apiRequest(`/api/pos/search?q=${encodeURIComponent(query)}`);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search products",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Add item to cart
  const addToCart = (product: Product, quantity = 1) => {
    const priceCents = Math.round(product.price * 100);
    const newItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      sku: product.sku,
      description: product.name,
      quantity,
      unitPriceCents: priceCents,
      taxCents: 0 // Tax calculation can be added later
    };

    setCart(prev => [...prev, newItem]);
    setSearchQuery('');
    setSearchResults([]);
    
    toast({
      title: "Added to Cart",
      description: `${product.name} x${quantity}`,
    });
  };

  // Update cart item quantity
  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  // Remove item from cart
  const removeItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  // Process sale
  const processSale = async (tender: 'cash' | 'card' | 'terms') => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to the cart first",
        variant: "destructive"
      });
      return;
    }

    try {
      const saleData = {
        customerId: currentCustomer,
        lines: cart.map(item => ({
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          taxCents: item.taxCents || 0
        })),
        tender,
        cashGivenCents: tender === 'cash' ? Math.round(parseFloat(cashGiven || '0') * 100) : undefined
      };

      const result = await apiRequest('/api/pos/sale', 'POST', saleData);
      
      toast({
        title: "Sale Complete",
        description: `Invoice #${result.invoice.invoice_no || result.invoice.id.substring(0, 8)} - $${(total / 100).toFixed(2)}`,
      });

      // Clear cart
      setCart([]);
      setCashGiven('');
      setCurrentCustomer(null);

    } catch (error) {
      console.error('Sale error:', error);
      toast({
        title: "Sale Failed",
        description: "Failed to process sale",
        variant: "destructive"
      });
    }
  };

  // Auto-search on input change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchProducts(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Product Search & Cart */}
        <div className="space-y-6">
          {/* Product Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Product Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Search products by name, SKU, or UPC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-lg"
                />
                
                {isSearching && (
                  <div className="text-center py-4 text-gray-500">
                    Searching...
                  </div>
                )}
                
                {searchResults.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 bg-white rounded border hover:bg-gray-50 cursor-pointer"
                        onClick={() => addToCart(product)}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            SKU: {product.sku} • ${product.price.toFixed(2)}
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shopping Cart */}
          <Card>
            <CardHeader>
              <CardTitle>Shopping Cart ({cart.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Cart is empty
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{item.description}</div>
                        <div className="text-sm text-gray-500">
                          ${(item.unitPriceCents / 100).toFixed(2)} each
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <Badge variant="secondary" className="min-w-[2rem] text-center">
                          {item.quantity}
                        </Badge>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        
                        <div className="w-16 text-right font-medium">
                          ${((item.quantity * item.unitPriceCents) / 100).toFixed(2)}
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Checkout & Actions */}
        <div className="space-y-6">
          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${(subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${(tax / 100).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Input
                  placeholder="Search customer or leave blank for cash sale"
                  value={currentCustomer || ''}
                  onChange={(e) => setCurrentCustomer(e.target.value || null)}
                />
                {currentCustomer && (
                  <Badge variant="secondary">Customer: {currentCustomer}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Options */}
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => processSale('cash')}
                    disabled={cart.length === 0}
                    className="h-16"
                  >
                    <DollarSign className="mr-2 h-5 w-5" />
                    Cash
                  </Button>
                  
                  <Button
                    onClick={() => processSale('card')}
                    disabled={cart.length === 0}
                    variant="outline"
                    className="h-16"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Card
                  </Button>
                </div>
                
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Cash given (for change calculation)"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                />
                
                {cashGiven && total > 0 && (
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="font-medium">Change Due:</div>
                    <div className="text-2xl font-bold text-green-700">
                      ${Math.max(0, (parseFloat(cashGiven) * 100 - total) / 100).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" disabled>
                  <Pause className="mr-2 h-4 w-4" />
                  Hold
                </Button>
                
                <Button variant="outline" disabled>
                  <Receipt className="mr-2 h-4 w-4" />
                  Recall
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}