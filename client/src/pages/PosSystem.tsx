import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calculator, Search, ShoppingCart, User, CreditCard, Receipt, Clock, History, Users, Pause, Play, Printer, ScanLine, AlertTriangle, DollarSign, Camera, Star, RefreshCw, Plus, Minus, X, Package, Edit, Truck } from 'lucide-react';
import PrinterControls from '@/components/pos/PrinterControls';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface CartItem {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  specialPrice?: number;
  hasPricingMemory?: boolean;
  originalPrice: number;
  discount: number;
  tax: number;
  total: number;
  barcode?: string;
  imageUrl?: string;
}

interface Customer {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  customerLevel: number;
  creditLine?: {
    creditLimit: number;
    currentBalance: number;
    availableCredit: number;
  };
  taxExemptions?: string[];
}

export default function PosSystem() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [barcode, setBarcode] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [isHoldDialogOpen, setIsHoldDialogOpen] = useState(false);
  const [isRecallDialogOpen, setIsRecallDialogOpen] = useState(false);
  const [holdName, setHoldName] = useState('');
  const [isCustomerHistoryOpen, setIsCustomerHistoryOpen] = useState(false);
  const [isBarcodeScanning, setIsBarcodeScanning] = useState(false);
  const [currentReceiptData, setCurrentReceiptData] = useState<any>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // Order management states
  const [orderType, setOrderType] = useState<'immediate' | 'delivery' | 'pickup'>('immediate');
  const [orderNotes, setOrderNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedDeliveryAddressId, setSelectedDeliveryAddressId] = useState<number | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  
  // Special logout function for POS that clears everything and redirects to in-store login
  const handlePosLogout = async () => {
    try {
      // Clear all authentication data
      localStorage.removeItem('authToken');
      localStorage.removeItem('tempAuthToken');
      sessionStorage.clear();
      
      // Clear query cache
      queryClient.clear();
      
      toast({
        title: "Logged Out",
        description: "Session ended. Please authenticate again for POS access.",
      });
      
      // Redirect to in-store login (not main login)
      setLocation('/instore');
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if there's an error
      setLocation('/instore');
    }
  };
  
  // Order management dialog states
  const [isOrderManagementOpen, setIsOrderManagementOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [editingOrderNotes, setEditingOrderNotes] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState('');
  
  // Product search states
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<any>(null);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  
  // Enhanced search states
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Fetch POS settings
  const { data: posSettings = {} } = useQuery({
    queryKey: ['/api/pos/settings'],
    enabled: !!user
  });

  // Fetch customers for selection
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/pos/customers'],
    enabled: !!user
  });

  // Fetch products for search
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
    enabled: !!user
  });

  // Fetch categories for quick filters
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    enabled: !!user
  });

  // Fetch held transactions
  const { data: heldTransactions = [], refetch: refetchHeldTransactions } = useQuery<any[]>({
    queryKey: ['/api/pos/held-transactions'],
    enabled: !!user
  });

  // Fetch customer history when customer is selected
  const { data: customerHistory = [] } = useQuery<any[]>({
    queryKey: ['/api/pos/customer-history', selectedCustomer?.id],
    enabled: !!selectedCustomer
  });

  // Fetch customer pricing memory
  const { data: pricingMemory = [] } = useQuery<any[]>({
    queryKey: ['/api/pos/pricing-memory', selectedCustomer?.id],
    enabled: !!selectedCustomer
  });

  // Fetch customer delivery addresses
  const { data: customerAddresses = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/customers', selectedCustomer?.id, 'addresses'],
    enabled: !!selectedCustomer
  });

  // Fetch orders for management
  const { data: orders = [], refetch: refetchOrders } = useQuery<any[]>({
    queryKey: ['/api/pos/orders', orderStatusFilter],
    enabled: !!user && (user.isAdmin || user.isEmployee)
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      return await apiRequest('POST', '/api/pos/transactions', transactionData);
    },
    onSuccess: (data) => {
      setCurrentReceiptData(data);
      clearCart();
      
      // Invalidate pricing memory cache to refresh with new data
      if (selectedCustomer) {
        queryClient.invalidateQueries({
          queryKey: ['/api/pos/pricing-memory', selectedCustomer.id]
        });
      }
      
      toast({
        title: "Success",
        description: `Transaction #${data.transactionNumber} completed successfully`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process transaction",
        variant: "destructive"
      });
    }
  });

  // Hold transaction mutation
  const holdTransactionMutation = useMutation({
    mutationFn: async (holdData: any) => {
      return await apiRequest('POST', '/api/pos/held-transactions', holdData);
    },
    onSuccess: () => {
      clearCart();
      setIsHoldDialogOpen(false);
      setHoldName('');
      refetchHeldTransactions();
      toast({
        title: "Success",
        description: "Transaction held successfully"
      });
    }
  });

  // Recall held transaction mutation
  const recallTransactionMutation = useMutation({
    mutationFn: async (heldTransactionId: number) => {
      return await apiRequest('POST', `/api/pos/held-transactions/${heldTransactionId}/recall`);
    },
    onSuccess: (data) => {
      // Clear current cart first
      setCart([]);
      setSelectedCustomer(null);
      
      // Set recalled data with a small delay to ensure state is updated
      setTimeout(() => {
        // Parse items if they come as a JSON string
        let items = data.items;
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch (e) {
            console.error('Failed to parse held transaction items:', e);
            items = [];
          }
        }
        
        if (items && Array.isArray(items)) {
          setCart(items);
        }
        if (data.customer) {
          setSelectedCustomer(data.customer);
        }
        
        // Update totals based on recalled items
        const newSubtotal = data.subtotal || 0;
        const newTax = data.tax || 0;
        const newTotal = data.total || 0;
        setSubtotal(newSubtotal);
        setTax(newTax);
        setTotal(newTotal);
      }, 100);
      
      refetchHeldTransactions();
      setIsRecallDialogOpen(false);
      toast({
        title: "Success",
        description: `Transaction recalled with ${Array.isArray(data.items) ? data.items.length : 0} items`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to recall transaction",
        variant: "destructive"
      });
    }
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: number; status: string; notes?: string }) => {
      return apiRequest(`/api/pos/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes })
      });
    },
    onSuccess: () => {
      refetchOrders();
      queryClient.invalidateQueries({ queryKey: ['/api/pos/orders'] });
      toast({ title: "Success", description: "Order status updated successfully" });
      setSelectedOrder(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update order status", variant: "destructive" });
    }
  });

  // Update order notes mutation
  const updateOrderNotesMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: number; notes: string }) => {
      return apiRequest(`/api/pos/orders/${orderId}/notes`, {
        method: 'PUT',
        body: JSON.stringify({ notes })
      });
    },
    onSuccess: () => {
      refetchOrders();
      queryClient.invalidateQueries({ queryKey: ['/api/pos/orders'] });
      toast({ title: "Success", description: "Order notes updated successfully" });
      setSelectedOrder(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update order notes", variant: "destructive" });
    }
  });

  // Calculate totals whenever cart changes
  useEffect(() => {
    const newSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const newTax = calculateTax(newSubtotal);
    setSubtotal(newSubtotal);
    setTax(newTax);
    setTotal(newSubtotal + newTax);
  }, [cart, selectedCustomer]);

  // Calculate tax based on customer exemptions and product assignments
  const calculateTax = (amount: number): number => {
    if (!selectedCustomer || selectedCustomer.taxExemptions?.includes('all')) {
      return 0;
    }
    
    // Apply customer level based tax exemptions
    const exemptionRate = getCustomerTaxExemptionRate(selectedCustomer.customerLevel);
    const effectiveTaxRate = ((posSettings as any)?.taxRate || 0.0875) * (1 - exemptionRate);
    
    return amount * effectiveTaxRate;
  };

  const getCustomerTaxExemptionRate = (customerLevel: number): number => {
    // Level 1: Full tax, Level 2+: Exemptions based on your business rules
    switch (customerLevel) {
      case 1: return 0; // No exemption
      case 2: return 0.5; // 50% exemption
      case 3: return 0.75; // 75% exemption
      case 4: return 1; // Full exemption
      case 5: return 1; // Full exemption
      default: return 0;
    }
  };

  // Handle barcode scanning
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    try {
      // Search for product by barcode
      try {
        const product = await apiRequest(`/api/pos/product-lookup?barcode=${barcode}`);
        addToCart(product);
        
        // Check for pricing memory
        if (selectedCustomer && pricingMemory) {
          const memoryPrice = (pricingMemory as any[]).find((pm: any) => pm.productId === product.id);
          const rememberedPrice = memoryPrice?.specialPrice || memoryPrice?.lastPrice;
          if (memoryPrice && rememberedPrice !== product.price) {
            toast({
              title: "Pricing Memory Found",
              description: `Customer previously paid $${rememberedPrice.toFixed(2)} for this item`,
            });
          }
        }
        
        setBarcode('');
      } else {
        toast({
          title: "Product Not Found",
          description: "No product found with this barcode",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to lookup product",
        variant: "destructive"
      });
    }
  };

  // Handle product search with live search functionality
  const handleProductSearch = async (searchTerm?: string) => {
    const term = searchTerm || productSearch.trim();
    if (!term) {
      setSearchResults([]);
      return;
    }
    
    try {
      // Check for quantity multiplier (e.g., "5*apple" for 5 apples)
      let quantity = 1;
      let cleanSearchTerm = term;
      
      const multiplierMatch = term.match(/^(\d+)\*(.+)$/);
      if (multiplierMatch) {
        quantity = parseInt(multiplierMatch[1]);
        cleanSearchTerm = multiplierMatch[2].trim();
      }
      
      try {
        const results = await apiRequest(`/api/products/search?q=${encodeURIComponent(cleanSearchTerm)}`);
        setSearchResults(results);
        
        // If there's a quantity multiplier and only one result, add it directly
        if (multiplierMatch && results.length === 1) {
          addToCartWithQuantity(results[0], quantity);
          setProductSearch('');
          setSearchResults([]);
        }
      } catch (error) {
        toast({
          title: "Search failed",
          description: "Failed to search products.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  const handleProductSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProductSearch();
    }
  };

  // Debounced live search effect
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (productSearch.trim() && isProductSearchOpen) {
        handleProductSearch();
      } else if (!productSearch.trim()) {
        setSearchResults([]);
      }
    }, 300); // 300ms delay for live search

    return () => clearTimeout(delayedSearch);
  }, [productSearch, isProductSearchOpen]);

  // Auto-load delivery addresses when delivery order type is selected and customer is chosen
  useEffect(() => {
    if (orderType === 'delivery' && selectedCustomer && customerAddresses.length > 0) {
      // Auto-select the first (or default) address
      const defaultAddress = customerAddresses.find((addr: any) => addr.isDefault) || customerAddresses[0];
      if (defaultAddress && !selectedDeliveryAddressId) {
        setSelectedDeliveryAddressId(defaultAddress.id);
        setDeliveryAddress(`${defaultAddress.name || defaultAddress.businessName || 'Address'}\n${defaultAddress.addressLine1}${defaultAddress.addressLine2 ? '\n' + defaultAddress.addressLine2 : ''}\n${defaultAddress.city}, ${defaultAddress.state} ${defaultAddress.postalCode}`);
      }
    } else if (orderType !== 'delivery') {
      // Clear delivery address selection when not delivery
      setSelectedDeliveryAddressId(null);
      setDeliveryAddress('');
    }
  }, [orderType, selectedCustomer, customerAddresses]);

  const handleSelectSearchResult = (product: any) => {
    // Check for quantity multiplier in the search term
    let quantity = 1;
    const multiplierMatch = productSearch.match(/^(\d+)\*/);
    if (multiplierMatch) {
      quantity = parseInt(multiplierMatch[1]);
    }
    
    addToCartWithQuantity(product, quantity);
    setProductSearch('');
    setSearchResults([]);
  };

  const addToCartWithQuantity = (product: any, quantity: number = 1) => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    
    if (quantity > 1) {
      toast({
        title: "Products Added",
        description: `Added ${quantity}x ${product.name} to cart.`,
      });
    }
  };

  const handleViewItemDetails = async (item: CartItem) => {
    try {
      // Fetch full product details including pricing history  
      const productDetails = await apiRequest(`/api/products/${item.productId}`);
      setSelectedProductForDetails({
        ...productDetails,
        ...item, // Merge cart item data
      });
      setIsProductDetailsOpen(true);
    } catch (error) {
      // Fallback to cart item data
      setSelectedProductForDetails(item);
      setIsProductDetailsOpen(true);
    }
  };

  const addToCart = (product: any, quantity: number = 1) => {
    const existingItemIndex = cart.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedCart = [...cart];
      const item = updatedCart[existingItemIndex];
      item.quantity += quantity;
      item.total = item.quantity * item.unitPrice;
      setCart(updatedCart);
    } else {
      // Start with customer level pricing
      let unitPrice = getCustomerPrice(product, selectedCustomer);
      let hasPricingMemory = false;
      let specialPrice = null;
      
      // Check for pricing memory and use it if available
      if (selectedCustomer && pricingMemory) {
        const memoryPrice = (pricingMemory as any[]).find((pm: any) => pm.productId === product.id);
        const rememberedPrice = memoryPrice?.specialPrice || memoryPrice?.lastPrice;
        if (memoryPrice && rememberedPrice !== null) {
          specialPrice = rememberedPrice;
          unitPrice = rememberedPrice; // Use the remembered price
          hasPricingMemory = true;
          
          toast({
            title: "Price Memory Applied",
            description: `Using remembered price $${rememberedPrice.toFixed(2)} for ${product.name}`,
          });
        }
      }
      
      const newItem: CartItem = {
        id: Date.now(),
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice,
        specialPrice,
        hasPricingMemory,
        originalPrice: product.price,
        discount: 0,
        tax: 0,
        total: unitPrice * quantity,
        barcode: product.upcCode,
        imageUrl: product.imageUrl
      };
      
      setCart([...cart, newItem]);
    }
  };

  const getCustomerPrice = (product: any, customer: Customer | null): number => {
    if (!customer) return product.price;
    
    // Apply customer level pricing
    const level = customer.customerLevel;
    if (level >= 2 && product.level2Price) return product.level2Price;
    if (level >= 3 && product.level3Price) return product.level3Price;
    if (level >= 4 && product.level4Price) return product.level4Price;
    if (level >= 5 && product.level5Price) return product.level5Price;
    
    return product.price;
  };

  const updateCartItemQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    const updatedCart = cart.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice }
        : item
    );
    setCart(updatedCart);
  };

  const updateCartItemPrice = (itemId: number, newPrice: number) => {
    if (newPrice < 0) return; // Prevent negative prices
    
    const updatedCart = cart.map(item => {
      if (item.id === itemId) {
        const updatedItem = { 
          ...item, 
          unitPrice: newPrice, 
          total: item.quantity * newPrice,
          // Mark that price was manually changed
          specialPrice: newPrice !== item.originalPrice ? newPrice : null,
          hasPricingMemory: newPrice !== item.originalPrice
        };
        return updatedItem;
      }
      return item;
    });
    setCart(updatedCart);
    
    // Show feedback for price change
    const item = cart.find(i => i.id === itemId);
    if (item && newPrice !== item.unitPrice) {
      toast({
        title: "Price Updated",
        description: `${item.name} price changed to $${newPrice.toFixed(2)}`,
      });
    }
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCashReceived('');
    setCheckNumber('');
    setOrderNotes('');
    setDeliveryAddress('');
    setPickupDate('');
    setOrderType('immediate');
  };

  const processTransaction = () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive"
      });
      return;
    }

    const transactionData = {
      customerId: selectedCustomer?.id,
      customerType: selectedCustomer ? 'existing' : 'walk-in',
      orderType,
      items: cart.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        barcode: item.barcode,
        // Include pricing memory information
        specialPrice: item.specialPrice,
        hasPricingMemory: item.hasPricingMemory,
        originalPrice: item.originalPrice
      })),
      subtotal,
      tax,
      total,
      paymentMethod,
      cashReceived: paymentMethod === 'cash' ? parseFloat(cashReceived) || 0 : null,
      checkNumber: paymentMethod === 'check' ? checkNumber : null,
      notes: orderNotes,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
      pickupDate: orderType === 'pickup' ? pickupDate : null,
      // Flag to save price memory
      savePriceMemory: true
    };

    createTransactionMutation.mutate(transactionData);
  };

  const holdTransaction = () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive"
      });
      return;
    }

    if (!holdName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for this held transaction",
        variant: "destructive"
      });
      return;
    }

    const holdData = {
      transactionName: holdName,
      customerId: selectedCustomer?.id,
      items: cart,
      subtotal,
      tax,
      total
    };

    holdTransactionMutation.mutate(holdData);
  };

  const printReceipt = (receiptData: any) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${receiptData.transactionNumber}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 20px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .line-item { display: flex; justify-content: space-between; margin: 2px 0; }
            .total { border-top: 1px dashed #000; padding-top: 5px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Gokul Wholesale</h2>
            <p>Transaction #${receiptData.transactionNumber}</p>
            <p>${new Date(receiptData.createdAt || new Date()).toLocaleString()}</p>
          </div>
          
          <div class="items">
            ${cart.map(item => `
              <div class="line-item">
                <span>${item.name} x${item.quantity}</span>
                <span>$${item.total.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="total">
            <div class="line-item">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="line-item">
              <span>Tax:</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="line-item">
              <span>Total:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
            <div class="line-item">
              <span>Payment:</span>
              <span>${paymentMethod.toUpperCase()}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Visit us at shopgokul.com</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
  };

  if (!user?.isAdmin && !user?.isEmployee) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-600">You need admin or employee privileges to access the POS system.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout customLogout={handlePosLogout}>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">POS System</h1>
            <p className="text-muted-foreground">Point of Sale with advanced features</p>
            {/* DEPRECATION NOTICE */}
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                <strong>Notice:</strong> This legacy POS interface is deprecated. 
                Please use the new modular POS system at <a href="/instore" className="text-blue-600 underline">/instore</a> for the latest features and improvements.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={clearCart} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Search & Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced Product Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Product Search & Add
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Inline Product Search with Autocomplete */}
                <div>
                  <Label htmlFor="product-search">Real-time Product Search</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="product-search"
                      placeholder="Start typing product name..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => setIsProductSearchOpen(true)}
                      variant="outline"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Quick search results */}
                  {productSearchQuery.length > 2 && (
                    <div className="mt-2 border rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto">
                      {(products || [])
                        .filter(product => 
                          product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                          product.barcode?.includes(productSearchQuery)
                        )
                        .slice(0, 5)
                        .map(product => (
                          <div 
                            key={product.id}
                            className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              addToCart(product, 1);
                              setProductSearchQuery('');
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-8 h-8 object-cover rounded" />
                              ) : (
                                <Package className="w-8 h-8 text-gray-400" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-gray-600">${product.price}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>

                {/* Barcode Scanner */}
                <div>
                  <Label htmlFor="barcode">Barcode Scanner</Label>
                  <form onSubmit={handleBarcodeSubmit} className="flex gap-2 mt-1">
                    <Input
                      id="barcode"
                      ref={barcodeInputRef}
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Scan or enter barcode..."
                      className="flex-1"
                    />
                    <Button type="submit">Add to Cart</Button>
                  </form>
                </div>

                {/* Category Quick Filters */}
                <div>
                  <Label>Quick Categories</Label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {(categories || []).slice(0, 4).map(category => (
                      <Button
                        key={category.id}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCategory(category.id);
                          // Filter products by category and show them
                          const categoryProducts = products.filter(product => product.categoryId === category.id);
                          setSearchResults(categoryProducts);
                          setIsProductSearchOpen(true);
                        }}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shopping Cart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Shopping Cart ({cart.length} items)
                  </div>
                  <Badge variant="secondary">${total.toFixed(2)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {cart.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Cart is empty</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                          onDoubleClick={() => handleViewItemDetails(item)}
                        >
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-md border"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded-md border flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Product Details */}
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {item.hasPricingMemory && (
                                <Badge variant="outline" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Price Memory
                                </Badge>
                              )}
                              {item.unitPrice !== item.originalPrice && (
                                <Badge variant="secondary" className="text-xs">
                                  Custom Price
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <div className="flex flex-col">
                                <Input
                                  type="text"
                                  value={item.unitPrice.toFixed(2)}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow partial input while typing
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      const newPrice = parseFloat(value) || 0;
                                      updateCartItemPrice(item.id, newPrice);
                                    }
                                  }}
                                  onFocus={(e) => {
                                    // Select all text on focus for easy editing
                                    e.target.select();
                                  }}
                                  onKeyDown={(e) => {
                                    // Allow common keys for editing
                                    if (e.key === 'Enter') {
                                      e.target.blur();
                                    }
                                  }}
                                  className="w-20 h-8 text-center"
                                  title="Click to edit price"
                                  placeholder="0.00"
                                />
                                {item.originalPrice !== item.unitPrice && (
                                  <span className="text-xs text-gray-500 text-center">
                                    Was: ${item.originalPrice.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Price and Remove */}
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold">${item.total.toFixed(2)}</p>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeFromCart(item.id)}
                              className="mt-1"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {cart.length > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Controls */}
          <div className="space-y-6">
            {/* Customer Selection - Moved here from top */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-search">Customer Search (Name, Phone, or Username)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="customer-search"
                      placeholder="Search customers..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => setIsCustomerDialogOpen(true)}
                      variant="outline"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Select
                  value={selectedCustomer?.id || "walk-in"}
                  onValueChange={(value) => {
                    if (value === "walk-in") {
                      setSelectedCustomer(null);
                    } else {
                      const customer = customers.find((c: any) => c.id === value);
                      setSelectedCustomer(customer || null);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Walk-in Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                    {customers
                      .filter((customer: any) => 
                        !customer.isAdmin && 
                        !customer.is_admin &&
                        (customerSearchQuery === '' || 
                         `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                         customer.username.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                         customer.phone?.includes(customerSearchQuery))
                      )
                      .map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.firstName} {customer.lastName} ({customer.username})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {selectedCustomer && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </span>
                      <Badge>Level {selectedCustomer.customerLevel}</Badge>
                    </div>
                    {selectedCustomer.creditLine && (
                      <div className="text-sm text-gray-600">
                        <p>Credit Limit: ${selectedCustomer.creditLine.creditLimit.toFixed(2)}</p>
                        <p>Available: ${selectedCustomer.creditLine.availableCredit.toFixed(2)}</p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => setIsCustomerHistoryOpen(true)}
                    >
                      <History className="h-4 w-4 mr-2" />
                      View History
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={orderType} onValueChange={(value: any) => setOrderType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate Sale</SelectItem>
                    <SelectItem value="delivery">Delivery Order</SelectItem>
                    <SelectItem value="pickup">Pickup Order</SelectItem>
                  </SelectContent>
                </Select>

                {orderType === 'delivery' && (
                  <div className="space-y-3">
                    <Label>Delivery Address</Label>
                    {selectedCustomer && customerAddresses.length > 0 ? (
                      <Select 
                        value={selectedDeliveryAddressId?.toString() || ""} 
                        onValueChange={(value) => {
                          const addressId = parseInt(value);
                          setSelectedDeliveryAddressId(addressId);
                          const address = customerAddresses.find(addr => addr.id === addressId);
                          if (address) {
                            setDeliveryAddress(`${address.name || address.businessName || 'Address'}\n${address.addressLine1}${address.addressLine2 ? '\n' + address.addressLine2 : ''}\n${address.city}, ${address.state} ${address.postalCode}`);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select delivery address" />
                        </SelectTrigger>
                        <SelectContent>
                          {customerAddresses.map((address: any) => (
                            <SelectItem key={address.id} value={address.id.toString()}>
                              <div className="flex flex-col text-left">
                                <div className="font-medium">{address.name || address.businessName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {address.addressLine1}
                                  {address.addressLine2 && `, ${address.addressLine2}`}
                                  {address.city && `, ${address.city}`}
                                  {address.state && ` ${address.state}`}
                                  {address.postalCode && ` ${address.postalCode}`}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Textarea
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder={selectedCustomer ? "No saved addresses found. Enter delivery address..." : "Select a customer first to see saved addresses..."}
                        rows={3}
                      />
                    )}
                    
                    {selectedDeliveryAddressId && customerAddresses.length > 0 && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm">
                          <div className="font-medium">Selected Address:</div>
                          <div className="text-gray-600 mt-1">
                            {(() => {
                              const addr = customerAddresses.find(a => a.id === selectedDeliveryAddressId);
                              return addr ? `${addr.name || addr.businessName} - ${addr.addressLine1}, ${addr.city}, ${addr.state} ${addr.postalCode}` : '';
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {orderType === 'pickup' && (
                  <div className="space-y-2">
                    <Label>Pickup Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                    />
                  </div>
                )}

                {(orderType === 'delivery' || orderType === 'pickup') && (
                  <div className="space-y-2">
                    <Label>Order Notes</Label>
                    <Textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Special instructions..."
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Section - Only show for immediate sales */}
            {orderType === 'immediate' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      {selectedCustomer?.creditLine && (
                        <SelectItem value="account_credit">Account Credit</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {paymentMethod === 'cash' && (
                    <div className="space-y-2">
                      <Label>Cash Received</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0.00"
                      />
                      {cashReceived && (
                        <p className="text-sm text-gray-600">
                          Change: ${Math.max(0, parseFloat(cashReceived) - total).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'check' && (
                    <div className="space-y-2">
                      <Label>Check Number</Label>
                      <Input
                        value={checkNumber}
                        onChange={(e) => setCheckNumber(e.target.value)}
                        placeholder="Check number"
                      />
                    </div>
                  )}

                  {paymentMethod === 'account_credit' && selectedCustomer?.creditLine && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm">
                        Available Credit: ${selectedCustomer.creditLine.availableCredit.toFixed(2)}
                      </p>
                      {total > selectedCustomer.creditLine.availableCredit && (
                        <p className="text-sm text-red-600 mt-1">
                          Insufficient credit limit
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={processTransaction}
                disabled={cart.length === 0 || createTransactionMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Receipt className="h-4 w-4 mr-2" />
                {orderType === 'immediate' ? 'Complete Sale' : 'Create Order'}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Dialog open={isHoldDialogOpen} onOpenChange={setIsHoldDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Pause className="h-4 w-4 mr-2" />
                      Hold
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Hold Transaction</DialogTitle>
                      <DialogDescription>
                        Save this transaction to recall later
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        value={holdName}
                        onChange={(e) => setHoldName(e.target.value)}
                        placeholder="Transaction name..."
                      />
                      <Button
                        onClick={holdTransaction}
                        disabled={holdTransactionMutation.isPending}
                        className="w-full"
                      >
                        Hold Transaction
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isRecallDialogOpen} onOpenChange={setIsRecallDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Recall
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Recall Held Transaction</DialogTitle>
                      <DialogDescription>
                        Select a held transaction to continue
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-64">
                      {heldTransactions.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">No held transactions</p>
                      ) : (
                        <div className="space-y-2">
                          {heldTransactions.map((held: any) => {
                            const transaction = held.transaction || held;
                            const customer = held.customer;
                            
                            return (
                              <div key={transaction.id} className="p-3 border rounded-lg">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium">{transaction.transactionName}</h4>
                                    <p className="text-sm text-gray-600">
                                      {transaction.items?.length || 0} items • ${transaction.total?.toFixed(2) || '0.00'}
                                    </p>
                                    {customer && (
                                      <p className="text-xs text-blue-600">
                                        Customer: {customer.firstName} {customer.lastName}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                      {new Date(transaction.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => recallTransactionMutation.mutate(transaction.id)}
                                    disabled={recallTransactionMutation.isPending}
                                  >
                                    Recall
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>

              {currentReceiptData && (
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => printReceipt(currentReceiptData)}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Browser Print
                  </Button>
                  
                  {/* Hardware Printer Controls */}
                  <PrinterControls 
                    orderData={currentReceiptData}
                    onPrintComplete={(success) => {
                      if (success) {
                        toast({
                          title: "Receipt Printed",
                          description: "Hardware receipt printed successfully",
                        });
                      }
                    }}
                  />
                </div>
              )}

              <Dialog open={isOrderManagementOpen} onOpenChange={setIsOrderManagementOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Truck className="h-4 w-4 mr-2" />
                    Manage Orders
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Order Management</DialogTitle>
                    <DialogDescription>
                      View and manage delivery and pickup orders
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Orders</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                          <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <ScrollArea className="h-96">
                      {orders?.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">No orders found</p>
                      ) : (
                        <div className="space-y-3">
                          {orders?.map((order: any) => (
                            <div key={order.id} className="p-4 border rounded-lg">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium">Order #{order.id}</h4>
                                    <Badge variant={order.orderType === 'delivery' ? 'default' : 'secondary'}>
                                      {order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}
                                    </Badge>
                                    <Badge variant={
                                      order.status === 'completed' ? 'default' :
                                      order.status === 'cancelled' ? 'destructive' :
                                      'outline'
                                    }>
                                      {order.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-1">
                                    Customer: {order.customerName}
                                  </p>
                                  <p className="text-sm text-gray-600 mb-1">
                                    Created: {new Date(order.createdAt).toLocaleString()}
                                  </p>
                                  {order.deliveryAddress && (
                                    <p className="text-sm text-gray-600 mb-1">
                                      Address: {order.deliveryAddress}
                                    </p>
                                  )}
                                  {order.pickupDate && (
                                    <p className="text-sm text-gray-600 mb-1">
                                      Pickup: {new Date(order.pickupDate).toLocaleString()}
                                    </p>
                                  )}
                                  {order.notes && (
                                    <p className="text-sm text-gray-600 mb-2">
                                      Notes: {order.notes}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold mb-2">${parseFloat(order.total).toFixed(2)}</p>
                                  <div className="flex gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedOrder(order);
                                            setNewOrderStatus(order.status);
                                          }}
                                        >
                                          <Edit className="h-4 w-4 mr-1" />
                                          Status
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Update Order Status</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <Select value={newOrderStatus} onValueChange={setNewOrderStatus}>
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="pending">Pending</SelectItem>
                                              <SelectItem value="confirmed">Confirmed</SelectItem>
                                              <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                                              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                                              <SelectItem value="delivered">Delivered</SelectItem>
                                              <SelectItem value="completed">Completed</SelectItem>
                                              <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Button
                                            onClick={() => updateOrderStatusMutation.mutate({
                                              orderId: selectedOrder.id,
                                              status: newOrderStatus
                                            })}
                                            className="w-full"
                                            disabled={updateOrderStatusMutation.isPending}
                                          >
                                            Update Status
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>

                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedOrder(order);
                                            setEditingOrderNotes(order.notes || '');
                                          }}
                                        >
                                          <Edit className="h-4 w-4 mr-1" />
                                          Notes
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Edit Order Notes</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <textarea
                                            value={editingOrderNotes}
                                            onChange={(e) => setEditingOrderNotes(e.target.value)}
                                            placeholder="Add order notes..."
                                            className="w-full min-h-[100px] p-2 border rounded-md resize-none"
                                          />
                                          <Button
                                            onClick={() => updateOrderNotesMutation.mutate({
                                              orderId: selectedOrder.id,
                                              notes: editingOrderNotes
                                            })}
                                            className="w-full"
                                            disabled={updateOrderNotesMutation.isPending}
                                          >
                                            Update Notes
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        window.open(`/order-details/${order.id}`, '_blank');
                                      }}
                                    >
                                      <Package className="h-4 w-4 mr-1" />
                                      Edit Items
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Customer History Dialog */}
        <Dialog open={isCustomerHistoryOpen} onOpenChange={setIsCustomerHistoryOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Customer Purchase History</DialogTitle>
              <DialogDescription>
                {selectedCustomer?.firstName} {selectedCustomer?.lastName} - Recent transactions
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-96">
              {customerHistory.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No purchase history found</p>
              ) : (
                <div className="space-y-3">
                  {customerHistory.map((transaction: any) => (
                    <div key={transaction.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">Transaction #{transaction.transactionNumber}</h4>
                          <p className="text-sm text-gray-600">
                            {transaction.items.length} items • ${transaction.total.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline">{transaction.paymentMethod}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Product Search Modal */}
        <Dialog open={isProductSearchOpen} onOpenChange={setIsProductSearchOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Search Products</DialogTitle>
              <DialogDescription>
                Search and add products to your cart. Use "5*product" for multiple quantities.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Start typing to search products... (5*product for 5x quantity)"
                  className="flex-1"
                  onKeyDown={handleProductSearchKeyDown}
                  autoFocus
                />
              </div>
              
              <ScrollArea className="h-96">
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((product: any) => (
                      <Card 
                        key={product.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleSelectSearchResult(product)}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {product.imageUrl && (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="font-medium">{product.name}</h3>
                              <p className="text-sm text-gray-500 mb-2">{product.category?.name}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold">${product.price}</span>
                                <Badge variant="outline">
                                  Stock: {product.quantity || 0}
                                </Badge>
                              </div>
                              {product.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : productSearch ? (
                  <div className="text-center py-8 text-gray-500">
                    No products found matching "{productSearch}"
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Start typing to search for products
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        {/* Product Details Modal */}
        <Dialog open={isProductDetailsOpen} onOpenChange={setIsProductDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>
            
            {selectedProductForDetails && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  {selectedProductForDetails.imageUrl && (
                    <img 
                      src={selectedProductForDetails.imageUrl} 
                      alt={selectedProductForDetails.name}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{selectedProductForDetails.name}</h3>
                    <p className="text-gray-600">{selectedProductForDetails.category?.name}</p>
                    <div className="flex gap-4 mt-2">
                      <Badge>Current Price: ${selectedProductForDetails.unitPrice}</Badge>
                      {selectedProductForDetails.specialPrice && (
                        <Badge variant="secondary">
                          Special Price: ${selectedProductForDetails.specialPrice}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedProductForDetails.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-gray-600">{selectedProductForDetails.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Product Information</h4>
                    <div className="space-y-1 text-sm">
                      <p>Quantity in Cart: {selectedProductForDetails.quantity}</p>
                      <p>Total: ${selectedProductForDetails.total?.toFixed(2)}</p>
                      {selectedProductForDetails.barcode && (
                        <p>Barcode: {selectedProductForDetails.barcode}</p>
                      )}
                    </div>
                  </div>
                  
                  {selectedProductForDetails.hasPricingMemory && (
                    <div>
                      <h4 className="font-medium mb-2">Pricing History</h4>
                      <Badge variant="outline" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Previous: ${selectedProductForDetails.specialPrice?.toFixed(2)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}