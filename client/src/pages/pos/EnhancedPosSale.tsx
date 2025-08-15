import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Minus, Trash2, Calculator, CreditCard, User, Star, Search, ShoppingCart, ScanLine, Clock, History, Package, Edit, Pause, Play, Receipt, Printer, AlertTriangle, DollarSign, Grid3X3, RefreshCw, Camera, CheckCircle, Sparkles, Mic, MicOff, Brain, Lightbulb, Target, BarChart3, Zap, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { printerService } from '@/services/printerService';

// RMS/RMH-style Professional POS Interface
const POS_LAYOUT = {
  sidebar: 'w-80 bg-slate-800 text-white',
  main: 'flex-1 bg-gray-50',
  toolbar: 'h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between',
  quickButtons: 'grid grid-cols-4 gap-2 p-4',
  transaction: 'bg-white rounded-lg shadow-sm border',
  statusBar: 'h-8 bg-blue-600 text-white text-xs px-4 flex items-center'
};

interface CartItem {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  specialPrice?: number | null;
  hasPricingMemory?: boolean;
  originalPrice: number;
  discount: number;
  tax: number;
  total: number;
  barcode?: string;
  imageUrl?: string;
  inventory?: number;
  category?: string;
}

interface Customer {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  customerLevel: number;
  loyaltyPoints?: number;
  creditLine?: {
    creditLimit: number;
    currentBalance: number;
    availableCredit: number;
  };
  taxExemptions?: string[];
}

interface Product {
  id: number;
  name: string;
  price: number;
  level2Price?: number;
  level3Price?: number;
  level4Price?: number;
  level5Price?: number;
  upcCode?: string;
  inventory: number;
  imageUrl?: string;
  categoryId?: number;
  category?: any;
  description?: string;
}

export const EnhancedPosSale: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Core POS states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  
  // Professional search states
  const [itemSearch, setItemSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [pendingQuantity, setPendingQuantity] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerLookupOpen, setIsCustomerLookupOpen] = useState(false);
  const [selectedItemInfo, setSelectedItemInfo] = useState<Product | null>(null);
  const [isItemInfoOpen, setIsItemInfoOpen] = useState(false);
  const [isOrdersViewOpen, setIsOrdersViewOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [priceMemory, setPriceMemory] = useState<Record<string, Record<string, number>>>({});
  
  // Advanced POS features state
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [isLoyaltyRedemptionOpen, setIsLoyaltyRedemptionOpen] = useState(false);
  
  // AI-powered features state
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [customerRecommendations, setCustomerRecommendations] = useState<any[]>([]);
  const [pricingInsights, setPricingInsights] = useState<any>(null);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  
  // Utility feature states
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('0');
  const [calculatorHistory, setCalculatorHistory] = useState<string[]>([]);
  
  // Transaction control states
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);
  const [isHoldDialogOpen, setIsHoldDialogOpen] = useState(false);
  const [isRecallDialogOpen, setIsRecallDialogOpen] = useState(false);
  const [holdName, setHoldName] = useState('');
  const [transactionNotes, setTransactionNotes] = useState('');
  
  // Payment states
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'check' | 'account'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const itemSearchRef = useRef<HTMLInputElement>(null);

  // Fetch real data from main application
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/pos/products'],
    select: (data: any) => data || []
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['/api/users'],
    select: (data: any) => {
      // Handle both direct array and wrapped response formats
      const users = Array.isArray(data) ? data : (data?.users || data || []);
      // Filter to only customers (exclude admin/employee accounts) 
      const customers = users.filter((user: any) => 
        user.customerLevel >= 1 || (!user.role || user.role === 'customer')
      );
      return customers;
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/pos/categories'],
    select: (data: any) => data || []
  });

  const { data: heldTransactions = [], refetch: refetchHeldTransactions } = useQuery({
    queryKey: ['/api/pos/held-transactions']
  });

  const { orders: allOrdersRaw = [] } = useUnifiedOrders();
  const allOrders = allOrdersRaw.slice(0, 20); // Show recent 20 orders for POS performance

  // Auto-focus item search on component mount (RMS-style)
  useEffect(() => {
    if (itemSearchRef.current) {
      itemSearchRef.current.focus();
    }
    // Load price memory from localStorage
    const savedPriceMemory = localStorage.getItem('posPriceMemory');
    if (savedPriceMemory) {
      setPriceMemory(JSON.parse(savedPriceMemory));
    }
  }, []);

  // Real-time search as user types (RMH-style)
  useEffect(() => {
    if (itemSearch.trim().length > 0) {
      const filtered = products.filter((product: Product) =>
        product.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        product.upcCode?.includes(itemSearch) ||
        product.id.toString() === itemSearch
      ).slice(0, 12); // Limit to 12 results like RMS
      
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [itemSearch, products]);

  // Calculate totals with professional precision
  useEffect(() => {
    const newSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const newTax = calculateTax(newSubtotal);
    const pointsDiscount = pointsToUse * 0.01;
    const loyaltyDiscount = loyaltyPointsToRedeem * 0.01;
    const totalDiscount = pointsDiscount + loyaltyDiscount;
    const newTotal = Math.max(0, newSubtotal + newTax - totalDiscount);
    
    setSubtotal(Number(newSubtotal.toFixed(2)));
    setTax(Number(newTax.toFixed(2)));
    setTotal(Number(newTotal.toFixed(2)));
  }, [cart, selectedCustomer, pointsToUse, loyaltyPointsToRedeem]);

  const calculateTax = (amount: number): number => {
    if (!selectedCustomer || selectedCustomer.taxExemptions?.includes('all')) {
      return 0;
    }
    const taxRate = 0.0875; // 8.75% standard rate
    return amount * taxRate;
  };

  const getCustomerPrice = (product: Product, customer: Customer | null): number => {
    // Check price memory first for customer-specific pricing
    if (customer && priceMemory[customer.id] && priceMemory[customer.id][product.id]) {
      return priceMemory[customer.id][product.id];
    }
    
    if (!customer) return product.price;
    
    const level = customer.customerLevel;
    if (level >= 5 && product.level5Price) return product.level5Price;
    if (level >= 4 && product.level4Price) return product.level4Price;
    if (level >= 3 && product.level3Price) return product.level3Price;
    if (level >= 2 && product.level2Price) return product.level2Price;
    
    return product.price;
  };

  const savePriceMemory = (customerId: string, productId: string, price: number) => {
    const newPriceMemory = {
      ...priceMemory,
      [customerId]: {
        ...priceMemory[customerId],
        [productId]: price
      }
    };
    setPriceMemory(newPriceMemory);
    localStorage.setItem('posPriceMemory', JSON.stringify(newPriceMemory));
  };

  const addItemToCart = (product: Product, quantity: number = 1) => {
    const existingItemIndex = cart.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      updateItemQuantity(cart[existingItemIndex].id, cart[existingItemIndex].quantity + quantity);
    } else {
      const unitPrice = getCustomerPrice(product, selectedCustomer);
      
      const newItem: CartItem = {
        id: Date.now() + Math.random(),
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice,
        originalPrice: product.price,
        discount: 0,
        tax: 0,
        total: unitPrice * quantity,
        barcode: product.upcCode,
        imageUrl: product.imageUrl,
        inventory: product.stock || product.inventory || 0, // Normalize to stock field
        category: product.category?.name || 'N/A'
      };
      
      setCart([...cart, newItem]);
      
      // Clear search after adding item (RMS behavior)
      setItemSearch('');
      setSearchResults([]);
      
      // Refocus search for next item
      if (itemSearchRef.current) {
        itemSearchRef.current.focus();
      }
    }
  };

  const updateItemQuantity = (itemId: number, newQuantity: number) => {
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

  const updateItemPrice = (itemId: number, newPrice: number) => {
    if (newPrice < 0) return;
    
    const updatedCart = cart.map(item => {
      if (item.id === itemId) {
        // Save to price memory if customer is selected and price is different from standard
        if (selectedCustomer && newPrice !== item.originalPrice) {
          savePriceMemory(selectedCustomer.id, item.productId.toString(), newPrice);
        }
        
        return { 
          ...item, 
          unitPrice: newPrice, 
          total: item.quantity * newPrice,
          specialPrice: newPrice !== item.originalPrice ? newPrice : null
        };
      }
      return item;
    });
    setCart(updatedCart);
  };

  const loadOrderForEditing = (order: any) => {
    // Clear current cart
    setCart([]);
    
    // Set customer if available
    if (order.customer) {
      setSelectedCustomer(order.customer);
    }
    
    // Load order items into cart
    const orderItems = order.items?.map((item: any, index: number) => ({
      id: Date.now() + index,
      productId: item.productId || item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice || item.price,
      originalPrice: item.originalPrice || item.price,
      discount: item.discount || 0,
      tax: item.tax || 0,
      total: (item.unitPrice || item.price) * item.quantity,
      barcode: item.barcode,
      imageUrl: item.imageUrl,
      inventory: item.stock || item.inventory || 0, // Normalize to stock field
      category: item.category || 'N/A',
      specialPrice: item.specialPrice
    })) || [];
    
    setCart(orderItems);
    setIsOrdersViewOpen(false);
    
    toast({
      title: "Order Loaded",
      description: `Order #${order.id} loaded for editing with ${orderItems.length} items`,
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // AI-powered functions
  const generateAiSuggestions = async () => {
    if (!selectedCustomer) return;
    
    try {
      const response = await apiRequest('/api/pos/ai-suggestions', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          cartItems: cart,
          currentTotal: total
        })
      });
      setCustomerRecommendations(response.suggestions || []);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    }
  };

  const analyzeInventoryWithAI = async () => {
    try {
      const response = await apiRequest('/api/pos/ai-inventory-analysis', {
        method: 'POST',
        body: JSON.stringify({
          products: products.slice(0, 50),
          salesData: allOrders.slice(0, 100)
        })
      });
      setInventoryAlerts(response.alerts || []);
    } catch (error) {
      console.error('Failed to analyze inventory:', error);
    }
  };

  const getPricingInsights = async (product: Product) => {
    if (!selectedCustomer) return;
    
    try {
      const response = await apiRequest('/api/pos/ai-pricing-insights', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          customerId: selectedCustomer.id,
          customerLevel: selectedCustomer.customerLevel,
          recentOrders: allOrders.filter(o => o.customerId === selectedCustomer.id).slice(0, 10)
        })
      });
      setPricingInsights(response.insights);
    } catch (error) {
      console.error('Failed to get pricing insights:', error);
    }
  };

  const performVoiceSearch = async () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsVoiceSearchActive(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setItemSearch(transcript);
        setIsVoiceSearchActive(false);
        processVoiceCommand(transcript);
      };
      
      recognition.onerror = () => {
        setIsVoiceSearchActive(false);
      };
      
      recognition.start();
    } else {
      toast({
        title: "Voice Search Unavailable",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive"
      });
    }
  };

  const processVoiceCommand = (command: string) => {
    const lowercaseCommand = command.toLowerCase();
    const addPattern = /add (\d+) (.+)/;
    const match = lowercaseCommand.match(addPattern);
    
    if (match) {
      const quantity = parseInt(match[1]);
      const productName = match[2];
      
      const foundProduct = products.find(p => 
        p.name.toLowerCase().includes(productName) ||
        productName.includes(p.name.toLowerCase().substring(0, 5))
      );
      
      if (foundProduct) {
        addItemToCart(foundProduct, quantity);
        toast({
          title: "Voice Command Processed",
          description: `Added ${quantity} ${foundProduct.name} to cart`,
        });
      } else {
        toast({
          title: "Product Not Found",
          description: `Could not find product: ${productName}`,
          variant: "destructive"
        });
      }
    }
  };

  const clearTransaction = () => {
    setCart([]);
    setSelectedCustomer(null);
    setPointsToUse(0);
    setTransactionNotes('');
    setCurrentTransactionId(null);
    setCashReceived('');
    setPaymentMode('cash');
    
    // Refocus search for next transaction
    if (itemSearchRef.current) {
      itemSearchRef.current.focus();
    }
  };

  const handleQuickItemAdd = (searchTerm: string) => {
    // Check if search term has quantity multiplier (e.g., "5*12345" or "5*")
    let quantity = 1;
    let actualSearchTerm = searchTerm;
    
    if (searchTerm.includes('*')) {
      const parts = searchTerm.split('*');
      const quantityPart = parts[0];
      const productPart = parts[1] || '';
      
      // Parse quantity
      const parsedQuantity = parseInt(quantityPart);
      if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
        quantity = parsedQuantity;
        actualSearchTerm = productPart;
        
        // If only quantity specified (e.g., "5*"), store for next scan
        if (!productPart) {
          setPendingQuantity(quantity);
          setItemSearch('');
          toast({
            title: "Quantity Set",
            description: `Next scanned item will be added ${quantity} times`,
          });
          return;
        }
      }
    }
    
    // Use pending quantity if set and no quantity specified in current search
    if (pendingQuantity && !searchTerm.includes('*')) {
      quantity = pendingQuantity;
      setPendingQuantity(null);
    }
    
    const product = products.find((p: Product) => 
      p.upcCode === actualSearchTerm || 
      p.name.toLowerCase().includes(actualSearchTerm.toLowerCase()) ||
      p.id.toString() === actualSearchTerm
    );
    
    if (product) {
      addItemToCart(product, quantity);
      const quantityText = quantity > 1 ? ` (${quantity}x)` : '';
      toast({
        title: "Item Added",
        description: `${product.name}${quantityText} added to transaction`,
      });
      // Clear pending quantity after use
      setPendingQuantity(null);
    } else {
      toast({
        title: "Item Not Found",
        description: "No product found matching your search",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && itemSearch.trim()) {
      if (searchResults.length > 0) {
        // Check for pending quantity
        const quantity = pendingQuantity || 1;
        addItemToCart(searchResults[0], quantity);
        if (pendingQuantity) {
          toast({
            title: "Item Added",
            description: `${searchResults[0].name} (${quantity}x) added to transaction`,
          });
          setPendingQuantity(null);
        }
      } else {
        handleQuickItemAdd(itemSearch);
      }
    }
    
    // Function keys for quick actions (RMS-style)
    if (e.key === 'F1') {
      e.preventDefault();
      setIsCustomerLookupOpen(true);
    }
    if (e.key === 'F2') {
      e.preventDefault();
      setIsOrdersViewOpen(true);
    }
    if (e.key === 'F9') {
      e.preventDefault();
      setIsHoldDialogOpen(true);
    }
    if (e.key === 'F10') {
      e.preventDefault();
      setIsRecallDialogOpen(true);
    }
  };

  const processTransaction = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Transaction",
        description: "Add items to complete the sale",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Prepare transaction data for server
      const transactionData = {
        customerId: selectedCustomer?.id || null,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice || item.price,
          lineSubtotal: (item.unitPrice || item.price) * item.quantity,
          lineTax: 0, // TODO: Calculate line tax based on product tax settings
          lineTotal: (item.unitPrice || item.price) * item.quantity,
          originalPrice: item.price, // Original catalog price
          specialPrice: item.specialPrice || null
        })),
        paymentMethod: paymentMode === 'cash' ? 'cash' : 
                       paymentMode === 'card' ? 'card' : 
                       paymentMode === 'check' ? 'check' : 'account_credit',
        cashReceived: paymentMode === 'cash' ? parseFloat(cashReceived) || 0 : null,
        cashChange: paymentMode === 'cash' ? Math.max(0, (parseFloat(cashReceived) || 0) - total) : null,
        checkNumber: paymentMode === 'check' ? 'CHK001' : null, // TODO: Capture check number
        subtotal: subtotal,
        tax: tax,
        total: total,
        notes: '',
        savePriceMemory: true // Save special pricing to memory
      };

      // Create transaction via API
      const response = await apiRequest('POST', '/api/pos/transactions', transactionData);
      
      if (response.success) {
        // Use server transaction data for receipt
        const { transactionNumber, transaction } = response;
        
        toast({
          title: "Transaction Complete",
          description: `Transaction #${transactionNumber} - $${total.toFixed(2)}`,
        });

        // TODO: Print receipt using server transaction data
        console.log('Transaction completed:', { transactionNumber, transaction });
        
        clearTransaction();
      } else {
        throw new Error(response.message || 'Transaction failed');
      }
      
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const holdTransaction = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Transaction",
        description: "Add items before holding transaction",
        variant: "destructive"
      });
      return;
    }

    try {
      const holdData = {
        holdName: holdName || `Hold-${Date.now()}`,
        customer: selectedCustomer,
        items: cart,
        subtotal,
        tax,
        total,
        notes: transactionNotes,
        createdAt: new Date().toISOString()
      };

      // In production, this would save to database
      // For now, store in localStorage as demonstration
      const existingHolds = JSON.parse(localStorage.getItem('posHeldTransactions') || '[]');
      existingHolds.push(holdData);
      localStorage.setItem('posHeldTransactions', JSON.stringify(existingHolds));

      toast({
        title: "Transaction Held",
        description: `Transaction saved as "${holdData.holdName}"`,
      });

      clearTransaction();
      setIsHoldDialogOpen(false);
      setHoldName('');
      setTransactionNotes('');
    } catch (error) {
      toast({
        title: "Hold Failed",
        description: "Failed to hold transaction",
        variant: "destructive"
      });
    }
  };

  const recallTransaction = (heldTransaction: any) => {
    // Restore the held transaction
    setCart(heldTransaction.items || []);
    setSelectedCustomer(heldTransaction.customer || null);
    setSubtotal(heldTransaction.subtotal || 0);
    setTax(heldTransaction.tax || 0);
    setTotal(heldTransaction.total || 0);
    setTransactionNotes(heldTransaction.notes || '');

    // Remove from held transactions
    const existingHolds = JSON.parse(localStorage.getItem('posHeldTransactions') || '[]');
    const updatedHolds = existingHolds.filter((hold: any) => hold.holdName !== heldTransaction.holdName);
    localStorage.setItem('posHeldTransactions', JSON.stringify(updatedHolds));

    setIsRecallDialogOpen(false);
    
    toast({
      title: "Transaction Recalled",
      description: `Restored "${heldTransaction.holdName}" with ${heldTransaction.items?.length || 0} items`,
    });
  };

  // Get held transactions
  const getHeldTransactions = () => {
    try {
      return JSON.parse(localStorage.getItem('posHeldTransactions') || '[]');
    } catch {
      return [];
    }
  };

  const handleCalculatorInput = (input: string) => {
    switch (input) {
      case 'C':
        setCalculatorValue('0');
        break;
      case '=':
        try {
          // Simple evaluation (replace display symbols with JS operators)
          const expression = calculatorValue
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/−/g, '-');
          
          const result = Function('"use strict"; return (' + expression + ')')();
          const calculation = `${calculatorValue} = ${result}`;
          
          setCalculatorValue(result.toString());
          setCalculatorHistory(prev => [...prev, calculation]);
        } catch (error) {
          setCalculatorValue('Error');
        }
        break;
      case '±':
        if (calculatorValue !== '0') {
          const num = parseFloat(calculatorValue);
          setCalculatorValue((-num).toString());
        }
        break;
      case '%':
        const percentage = parseFloat(calculatorValue) / 100;
        setCalculatorValue(percentage.toString());
        break;
      default:
        if (calculatorValue === '0' && input !== '.') {
          setCalculatorValue(input);
        } else {
          setCalculatorValue(prev => prev + input);
        }
    }
  };

  const handleBack = () => {
    setLocation('/instore/dashboard');
  };

  // Cash drawer functionality
  const handleOpenCashDrawer = async () => {
    try {
      const result = await printerService.openCashDrawer();
      toast({
        title: result.success ? "✅ Cash Drawer Command Sent" : "❌ Cash Drawer Failed",
        description: result.success 
          ? `Drawer opened via ${result.method}` 
          : `Error: ${result.error}`,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "❌ Cash Drawer Error",
        description: "Could not communicate with printer",
        variant: "destructive"
      });
    }
  };

  // Bridge status monitoring
  const [bridgeStatus, setBridgeStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  
  // Check bridge status on component mount and periodically
  useEffect(() => {
    const checkBridgeStatus = async () => {
      try {
        const response = await fetch('http://localhost:8080/health');
        if (response.ok) {
          setBridgeStatus('connected');
        } else {
          setBridgeStatus('disconnected');
        }
      } catch (error) {
        setBridgeStatus('disconnected');
      }
    };

    // Check immediately
    checkBridgeStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkBridgeStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // F8 key handler for cash drawer with enhanced feedback
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'F8') {
        event.preventDefault();
        
        // Show bridge status before attempting to open drawer
        if (bridgeStatus === 'disconnected') {
          toast({
            title: "⚠️ Hardware Bridge Offline",
            description: "Start TM-T88V-MMF-Bridge.js on your Windows PC first",
            variant: "destructive"
          });
          return;
        }
        
        handleOpenCashDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [bridgeStatus]);

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Professional Status Bar (RMS-style) */}
      <div className="h-8 bg-blue-600 text-white text-xs px-4 flex items-center justify-between shrink-0">
        <span>Gokul Wholesale POS - Store Operations Transaction {currentTransactionId || 'New'} • Items: {cart.length} • Total: ${total.toFixed(2)}</span>
        <div className="flex space-x-4">
          <span>Time: {new Date().toLocaleTimeString()}</span>
          <span>Terminal: 001</span>
          <span>User: Admin</span>
        </div>
      </div>

      {/* Main POS Interface */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div className="text-xl font-semibold">Sale Terminal</div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setIsHoldDialogOpen(true)}>
              <Pause className="h-4 w-4 mr-2" />
              Hold (F2)
            </Button>
            <Button variant="outline" onClick={() => setIsRecallDialogOpen(true)}>
              <Play className="h-4 w-4 mr-2" />
              Recall (F3)
            </Button>
            <Button variant="outline" onClick={clearTransaction}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Item Search & Cart */}
          <div className="flex-1 flex flex-col p-4 min-h-0">
            {/* Professional Item Search (RMH-style) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Item Lookup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Input
                    ref={itemSearchRef}
                    placeholder={pendingQuantity ? `Ready to add ${pendingQuantity}x - Scan item now...` : "Scan barcode, try 5*sku for 5x quantity, or search by name..."}
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    className={`text-lg h-12 pl-12 ${pendingQuantity ? 'border-orange-500 bg-orange-50' : ''}`}
                    autoComplete="off"
                  />
                  <ScanLine className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  
                  {/* Quantity Multiplier Indicator */}
                  {pendingQuantity && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Badge variant="secondary" className="bg-orange-500 text-white font-bold">
                        {pendingQuantity}x
                      </Badge>
                    </div>
                  )}
                  
                  {/* Real-time Search Results */}
                  {isSearchFocused && searchResults.length > 0 && (
                    <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-hidden">
                      <ScrollArea className="max-h-96">
                        {searchResults.map((product) => (
                          <div
                            key={product.id}
                            className="p-3 hover:bg-blue-50 border-b flex items-center gap-3"
                          >
                            {/* Product Image */}
                            <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center shrink-0">
                              {product.imageUrl ? (
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <Package className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                            
                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{product.name}</div>
                              <div className="text-sm text-gray-500 flex flex-wrap gap-3">
                                <span>SKU: {product.id}</span>
                                <span className={`${(product.stock || product.inventory || 0) <= 10 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                  Stock: {product.stock || product.inventory || 0}
                                </span>
                                {product.upcCode && <span>UPC: {product.upcCode}</span>}
                              </div>
                            </div>
                            
                            {/* Price and Actions */}
                            <div className="text-right flex flex-col gap-1">
                              <div className="font-semibold">
                                ${getCustomerPrice(product, selectedCustomer).toFixed(2)}
                              </div>
                              {selectedCustomer && selectedCustomer.customerLevel > 1 && (
                                <div className="text-xs text-green-600">
                                  Level {selectedCustomer.customerLevel} Price
                                </div>
                              )}
                              {selectedCustomer && priceMemory[selectedCustomer.id]?.[product.id] && (
                                <div className="text-xs text-blue-600">
                                  ★ Price Memory
                                </div>
                              )}
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const quantity = pendingQuantity || 1;
                                    addItemToCart(product, quantity);
                                    if (pendingQuantity) {
                                      setPendingQuantity(null);
                                    }
                                  }}
                                  className="bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  {pendingQuantity ? `Add ${pendingQuantity}x` : 'Add'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItemInfo(product);
                                    setIsItemInfoOpen(true);
                                  }}
                                  className="h-6 px-2 text-xs"
                                >
                                  Info
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addItemToCart(product);
                                  }}
                                  className="h-6 px-2 text-xs"
                                  disabled={(product.stock || product.inventory || 0) <= 0}
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    </Card>
                  )}
                </div>
                
                {/* Quick Access Buttons (RMS-style) */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setIsCustomerLookupOpen(true)}>
                    <User className="h-4 w-4 mr-1" />
                    Customer (F1)
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsOrdersViewOpen(true)}>
                    <Receipt className="h-4 w-4 mr-1" />
                    View Orders (F2)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsLoyaltyRedemptionOpen(true)}
                    disabled={!selectedCustomer}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Redeem Points
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsAiPanelOpen(true)}
                    className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
                  >
                    <Sparkles className="h-4 w-4 mr-1 text-purple-600" />
                    AI Assistant
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsCalculatorOpen(true)}>
                    <Calculator className="h-4 w-4 mr-1" />
                    Calculator
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsInventoryOpen(true)}>
                    <Package className="h-4 w-4 mr-1" />
                    Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Cart */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Transaction Items ({cart.length})
                  </span>
                  {cart.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearTransaction}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No items in transaction</p>
                    <p className="text-sm">Search and scan items above</p>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      {cart.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                          <div className="text-sm font-mono text-gray-500 w-8">
                            {index + 1}
                          </div>
                          
                          {/* Item Image */}
                          <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center shrink-0">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>SKU: {item.productId}</span>
                              <span className={`${item.inventory && item.inventory <= 10 ? 'text-red-600 font-medium' : ''}`}>
                                Stock: {item.inventory || item.stock || 0}
                              </span>
                              {item.specialPrice && (
                                <Badge variant="secondary" className="text-xs">
                                  Special Price
                                </Badge>
                              )}
                              {selectedCustomer && priceMemory[selectedCustomer.id]?.[item.productId] && (
                                <Badge variant="outline" className="text-xs text-blue-600">
                                  ★ Memory
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-12 text-center font-mono">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="text-right w-24">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                              className="w-20 text-right text-sm h-8"
                            />
                            <div className="text-sm font-semibold mt-1">
                              ${item.total.toFixed(2)}
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Customer & Payment */}
          <div className="w-96 p-4 space-y-4 bg-white border-l border-gray-200 overflow-y-auto">
            {/* Customer Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCustomer ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold">{selectedCustomer.firstName || selectedCustomer.username}</h4>
                      <p className="text-sm text-gray-600">Level {selectedCustomer.customerLevel} Customer</p>
                      <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                      {selectedCustomer.loyaltyPoints && (
                        <p className="text-sm text-green-600 font-medium">
                          {selectedCustomer.loyaltyPoints} loyalty points available
                        </p>
                      )}
                    </div>
                    
                    {/* Loyalty Points Usage */}
                    {selectedCustomer.loyaltyPoints && selectedCustomer.loyaltyPoints > 0 && total > 0 && (
                      <div>
                        <Label htmlFor="pointsToUse">Use Loyalty Points</Label>
                        <Input
                          type="number"
                          id="pointsToUse"
                          min="0"
                          max={Math.min(selectedCustomer.loyaltyPoints, Math.floor(total * 100))}
                          value={pointsToUse}
                          onChange={(e) => setPointsToUse(parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Discount: ${(pointsToUse * 0.01).toFixed(2)}
                        </p>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedCustomer(null)}
                      className="w-full"
                    >
                      Clear Customer
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={() => setIsCustomerLookupOpen(true)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Select Customer (F1)
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Transaction Totals */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Transaction Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-mono">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span className="font-mono">${tax.toFixed(2)}</span>
                  </div>
                  {pointsToUse > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Points Discount:</span>
                      <span className="font-mono">-${(pointsToUse * 0.01).toFixed(2)}</span>
                    </div>
                  )}
                  {loyaltyPointsToRedeem > 0 && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Loyalty Discount:</span>
                      <span className="font-mono">-${(loyaltyPointsToRedeem * 0.01).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="font-mono text-blue-600">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Processing */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMode} onValueChange={(value: any) => setPaymentMode(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="account">Store Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMode === 'cash' && (
                  <div>
                    <Label htmlFor="cashReceived">Cash Received</Label>
                    <Input
                      type="number"
                      step="0.01"
                      id="cashReceived"
                      placeholder="0.00"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="mt-1 text-lg font-mono"
                    />
                    {cashReceived && (
                      <p className="text-sm text-gray-600 mt-1">
                        Change: ${Math.max(0, parseFloat(cashReceived) - total).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                {/* Cash Drawer Button with Bridge Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Hardware Bridge:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bridgeStatus === 'connected' ? 'bg-green-100 text-green-800' :
                      bridgeStatus === 'disconnected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {bridgeStatus === 'connected' ? '🟢 Connected' :
                       bridgeStatus === 'disconnected' ? '🔴 Offline' :
                       '🟡 Checking...'}
                    </span>
                  </div>
                  <Button 
                    onClick={handleOpenCashDrawer}
                    variant={bridgeStatus === 'connected' ? "outline" : "secondary"}
                    className="w-full h-12 text-lg"
                    size="lg"
                    disabled={bridgeStatus === 'disconnected'}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Open Drawer (F8)
                    {bridgeStatus === 'disconnected' && <span className="ml-2 text-xs">(Bridge Offline)</span>}
                  </Button>
                </div>

                <Button 
                  onClick={processTransaction}
                  disabled={cart.length === 0 || isProcessingPayment}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Sale
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Hold Transaction Dialog */}
      <Dialog open={isHoldDialogOpen} onOpenChange={setIsHoldDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hold Transaction</DialogTitle>
            <DialogDescription>
              Save current transaction to recall later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="holdName">Hold Name</Label>
              <Input
                id="holdName"
                placeholder="Enter hold name (optional)"
                value={holdName}
                onChange={(e) => setHoldName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="transactionNotes">Notes</Label>
              <Textarea
                id="transactionNotes"
                placeholder="Add notes about this transaction..."
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsHoldDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={holdTransaction}>
                <Pause className="h-4 w-4 mr-2" />
                Hold Transaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recall Transaction Dialog */}
      <Dialog open={isRecallDialogOpen} onOpenChange={setIsRecallDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Recall Transaction</DialogTitle>
            <DialogDescription>
              Select a held transaction to continue
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {getHeldTransactions().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No held transactions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {getHeldTransactions().map((held: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{held.holdName}</h4>
                        <p className="text-sm text-gray-500">
                          {held.items?.length || 0} items • ${held.total?.toFixed(2) || '0.00'}
                        </p>
                        {held.customer && (
                          <p className="text-sm text-blue-600">
                            Customer: {held.customer.firstName || held.customer.username}
                          </p>
                        )}
                        {held.notes && (
                          <p className="text-xs text-gray-400 mt-1">{held.notes}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(held.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => recallTransaction(held)}
                        className="ml-3"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Recall
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Info Dialog */}
      <Dialog open={isItemInfoOpen} onOpenChange={setIsItemInfoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Item Information</DialogTitle>
            <DialogDescription>
              Detailed product information and pricing history
            </DialogDescription>
          </DialogHeader>
          {selectedItemInfo && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center shrink-0">
                  {selectedItemInfo.imageUrl ? (
                    <img 
                      src={selectedItemInfo.imageUrl} 
                      alt={selectedItemInfo.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <Package className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedItemInfo.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div>
                      <span className="text-gray-500">SKU:</span> {selectedItemInfo.id}
                    </div>
                    <div>
                      <span className="text-gray-500">Stock:</span> 
                      <span className={(selectedItemInfo.stock || selectedItemInfo.inventory || 0) <= 10 ? 'text-red-600 font-medium ml-1' : 'ml-1'}>
                        {selectedItemInfo.stock || selectedItemInfo.inventory || 0}
                      </span>
                    </div>
                    {selectedItemInfo.upcCode && (
                      <div className="col-span-2">
                        <span className="text-gray-500">UPC:</span> {selectedItemInfo.upcCode}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="border rounded-lg p-3">
                <h4 className="font-medium mb-2">Pricing</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <span className="font-mono">${selectedItemInfo.price.toFixed(2)}</span>
                  </div>
                  {selectedItemInfo.level2Price && (
                    <div className="flex justify-between">
                      <span>Level 2 Price:</span>
                      <span className="font-mono">${selectedItemInfo.level2Price.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedItemInfo.level3Price && (
                    <div className="flex justify-between">
                      <span>Level 3 Price:</span>
                      <span className="font-mono">${selectedItemInfo.level3Price.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedItemInfo.level4Price && (
                    <div className="flex justify-between">
                      <span>Level 4 Price:</span>
                      <span className="font-mono">${selectedItemInfo.level4Price.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedItemInfo.level5Price && (
                    <div className="flex justify-between">
                      <span>Level 5 Price:</span>
                      <span className="font-mono">${selectedItemInfo.level5Price.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedCustomer && (
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <span>Customer Price:</span>
                      <span className="font-mono text-blue-600">
                        ${getCustomerPrice(selectedItemInfo, selectedCustomer).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Description */}
              {selectedItemInfo.description && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{selectedItemInfo.description}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsItemInfoOpen(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    addItemToCart(selectedItemInfo);
                    setIsItemInfoOpen(false);
                  }}
                  disabled={(selectedItemInfo.stock || selectedItemInfo.inventory || 0) <= 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Orders View Dialog */}
      <Dialog open={isOrdersViewOpen} onOpenChange={setIsOrdersViewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>All Orders - View & Edit</DialogTitle>
            <DialogDescription>
              View all orders and load open orders for editing
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh]">
            {allOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No orders found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allOrders.map((order: any) => (
                  <Card key={order.id} className="hover:bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">Order #{order.id}</h4>
                            <Badge 
                              variant={order.status === 'completed' ? 'default' : 'secondary'}
                              className={order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                            >
                              {order.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Customer:</span>
                              <p className="font-medium">
                                {order.customer ? 
                                  `${order.customer.firstName || order.customer.username} (Level ${order.customer.customerLevel})` : 
                                  'Guest'
                                }
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Items:</span>
                              <p className="font-medium">{order.items?.length || 0} items</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Total:</span>
                              <p className="font-medium">${(order.total || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Payment:</span>
                              <p className="font-medium">{order.paymentMethod || 'N/A'}</p>
                            </div>
                          </div>
                          
                          {order.items && order.items.length > 0 && (
                            <div className="mt-3">
                              <details className="text-sm">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                  View Items ({order.items.length})
                                </summary>
                                <div className="mt-2 bg-gray-50 rounded p-2 max-h-40 overflow-y-auto">
                                  {order.items.map((item: any, index: number) => {
                                    // Access product details from nested structure
                                    const productName = item.product?.name || item.productName || item.name || `Product #${item.productId || 'Unknown'}`;
                                    const productImage = item.product?.imageUrl || item.productImage;
                                    const unitPrice = item.unitPrice || item.price || item.product?.price || 0;
                                    
                                    return (
                                      <div key={index} className="flex items-center gap-3 py-2 border-b last:border-0">
                                        {/* Product Image */}
                                        {productImage && (
                                          <img 
                                            src={productImage} 
                                            alt={productName}
                                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        )}
                                        
                                        {/* Product Details */}
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-sm truncate" title={productName}>
                                            {productName}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Qty: {item.quantity} × ${unitPrice.toFixed(2)}
                                          </div>
                                        </div>
                                        
                                        {/* Total Price */}
                                        <div className="font-mono text-sm font-medium">
                                          ${(unitPrice * item.quantity).toFixed(2)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          {order.status !== 'completed' && (
                            <Button
                              size="sm"
                              onClick={() => loadOrderForEditing(order)}
                              className="whitespace-nowrap"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit Order
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Copy order details to clipboard or show details
                              toast({
                                title: "Order Details",
                                description: `Order #${order.id} - ${order.items?.length || 0} items, $${(order.total || 0).toFixed(2)}`,
                              });
                            }}
                          >
                            <Receipt className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {allOrders.length} total orders • {allOrders.filter((o: any) => o.status !== 'completed').length} open orders
            </div>
            <Button variant="outline" onClick={() => setIsOrdersViewOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loyalty Points Redemption Dialog */}
      <Dialog open={isLoyaltyRedemptionOpen} onOpenChange={setIsLoyaltyRedemptionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Redeem Loyalty Points</DialogTitle>
            <DialogDescription>
              Apply loyalty points as discount to this transaction
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCustomer && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Customer</div>
                <div className="font-semibold">{selectedCustomer.firstName || selectedCustomer.username}</div>
                <div className="text-sm text-gray-600 mt-2">Available Points</div>
                <div className="text-2xl font-bold text-blue-600">{selectedCustomer.loyaltyPoints || 0}</div>
                <div className="text-xs text-gray-500">
                  {selectedCustomer.loyaltyPoints || 0} points = ${((selectedCustomer.loyaltyPoints || 0) * 0.01).toFixed(2)} credit
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="points-redeem">Points to Redeem</Label>
              <Input
                id="points-redeem"
                type="number"
                min="0"
                max={selectedCustomer?.loyaltyPoints || 0}
                value={loyaltyPointsToRedeem}
                onChange={(e) => setLoyaltyPointsToRedeem(Math.min(Number(e.target.value), selectedCustomer?.loyaltyPoints || 0))}
                placeholder="Enter points to redeem"
              />
              <div className="text-sm text-gray-600">
                Discount: ${(loyaltyPointsToRedeem * 0.01).toFixed(2)}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setLoyaltyPointsToRedeem(Math.min(100, selectedCustomer?.loyaltyPoints || 0))}
                disabled={(selectedCustomer?.loyaltyPoints || 0) < 100}
                className="flex-1"
              >
                Use 100 ($1.00)
              </Button>
              <Button
                variant="outline"
                onClick={() => setLoyaltyPointsToRedeem(Math.min(500, selectedCustomer?.loyaltyPoints || 0))}
                disabled={(selectedCustomer?.loyaltyPoints || 0) < 500}
                className="flex-1"
              >
                Use 500 ($5.00)
              </Button>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setLoyaltyPointsToRedeem(0);
                  setIsLoyaltyRedemptionOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIsLoyaltyRedemptionOpen(false);
                  toast({
                    title: "Points Applied",
                    description: `${loyaltyPointsToRedeem} points redeemed for $${(loyaltyPointsToRedeem * 0.01).toFixed(2)} discount`,
                  });
                }}
                disabled={loyaltyPointsToRedeem === 0}
              >
                Apply Discount
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Assistant Dialog */}
      <Dialog open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-600" />
              AI Assistant - Intelligent POS Features
            </DialogTitle>
            <DialogDescription>
              AI-powered recommendations, insights, and automation for your retail operations
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="recommendations" className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="recommendations">Smart Recommendations</TabsTrigger>
              <TabsTrigger value="pricing">Pricing Intelligence</TabsTrigger>
              <TabsTrigger value="inventory">Inventory Insights</TabsTrigger>
              <TabsTrigger value="voice">Voice Commands</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recommendations" className="mt-4 h-full overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Customer Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCustomer ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold">{selectedCustomer.firstName || selectedCustomer.username}</h4>
                        <p className="text-sm text-gray-600">Level {selectedCustomer.customerLevel} Customer</p>
                      </div>
                      
                      {customerRecommendations.length > 0 ? (
                        <div className="grid gap-3">
                          {customerRecommendations.map((rec, index) => (
                            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-semibold">{rec.product?.name}</h5>
                                  <p className="text-sm text-gray-600">{rec.reason}</p>
                                  <p className="text-sm text-green-600">Confidence: {rec.confidence}%</p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => rec.product && addItemToCart(rec.product, 1)}
                                >
                                  Add to Cart
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Lightbulb className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500">Add items to cart to get AI recommendations</p>
                          <Button
                            onClick={generateAiSuggestions}
                            className="mt-4"
                            disabled={cart.length === 0}
                          >
                            Generate Recommendations
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Select a customer to get personalized recommendations</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="pricing" className="mt-4 h-full overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Pricing Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pricingInsights ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-green-800">Optimal Price</h4>
                          <p className="text-2xl font-bold text-green-600">${pricingInsights.suggestedPrice}</p>
                          <p className="text-sm text-green-600">{pricingInsights.priceReason}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-800">Historical Average</h4>
                          <p className="text-2xl font-bold text-blue-600">${pricingInsights.averagePrice}</p>
                          <p className="text-sm text-blue-600">Based on {pricingInsights.transactionCount} transactions</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="font-semibold">AI Insights:</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {pricingInsights.insights?.map((insight: string, index: number) => (
                            <li key={index} className="text-gray-600">{insight}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Select a product from search results to get pricing insights</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="inventory" className="mt-4 h-full overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Inventory Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {inventoryAlerts.length > 0 ? (
                    <div className="space-y-4">
                      {inventoryAlerts.map((alert, index) => (
                        <div key={index} className={`border rounded-lg p-4 ${
                          alert.priority === 'high' ? 'border-red-200 bg-red-50' :
                          alert.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                          'border-blue-200 bg-blue-50'
                        }`}>
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                              alert.priority === 'high' ? 'text-red-500' :
                              alert.priority === 'medium' ? 'text-yellow-500' :
                              'text-blue-500'
                            }`} />
                            <div className="flex-1">
                              <h5 className="font-semibold">{alert.title}</h5>
                              <p className="text-sm text-gray-600">{alert.description}</p>
                              {alert.recommendation && (
                                <p className="text-sm font-medium mt-2">Recommendation: {alert.recommendation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Zap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No inventory alerts at this time</p>
                      <Button
                        onClick={analyzeInventoryWithAI}
                        className="mt-4"
                      >
                        Analyze Inventory
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="voice" className="mt-4 h-full overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isVoiceSearchActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    Voice Commands
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <Button
                        onClick={performVoiceSearch}
                        size="lg"
                        className={`h-20 w-20 rounded-full ${
                          isVoiceSearchActive 
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {isVoiceSearchActive ? (
                          <MicOff className="h-8 w-8" />
                        ) : (
                          <Mic className="h-8 w-8" />
                        )}
                      </Button>
                      <p className="mt-4 text-sm text-gray-600">
                        {isVoiceSearchActive ? 'Listening...' : 'Click to start voice search'}
                      </p>
                    </div>
                    
                    <div className="border-t pt-6">
                      <h4 className="font-semibold mb-4">Available Commands:</h4>
                      <div className="grid gap-3">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium">Add Products</p>
                          <p className="text-sm text-gray-600">"Add 2 Marlboro Gold" - Adds quantity and product</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium">Search Products</p>
                          <p className="text-sm text-gray-600">Say any product name to search and find items</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium">Customer Actions</p>
                          <p className="text-sm text-gray-600">"Find customer John" - Search for customers</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Customer Lookup Dialog */}
      <Dialog open={isCustomerLookupOpen} onOpenChange={setIsCustomerLookupOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Lookup</DialogTitle>
            <DialogDescription>Search and select a customer for this transaction</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by name, username, or email..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              autoFocus
            />
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {isLoadingCustomers ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Loading customers...</p>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No customers found</p>
                    <p className="text-sm">Try adjusting your search or add customers in admin panel</p>

                  </div>
                ) : (
                  customers
                    .filter((customer: any) => {
                      if (!customerSearch) return true;
                      const search = customerSearch.toLowerCase();
                      return (
                        customer.username?.toLowerCase().includes(search) ||
                        (customer.email && customer.email.toLowerCase().includes(search)) ||
                        (customer.firstName && customer.firstName.toLowerCase().includes(search)) ||
                        (customer.lastName && customer.lastName.toLowerCase().includes(search)) ||
                        (customer.businessName && customer.businessName.toLowerCase().includes(search))
                      );
                    })
                    .map((customer: any) => (
                    <Card 
                      key={customer.id} 
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsCustomerLookupOpen(false);
                        setCustomerSearch('');
                        toast({
                          title: "Customer Selected",
                          description: `${customer.firstName || customer.username} - Level ${customer.customerLevel}`,
                        });
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">
                              {customer.firstName && customer.lastName 
                                ? `${customer.firstName} ${customer.lastName}` 
                                : customer.firstName || customer.businessName || customer.username}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Level {customer.customerLevel} • {customer.email || 'No email'}
                            </p>
                            <p className="text-xs text-gray-400">
                              Username: {customer.username}
                            </p>
                            {customer.loyaltyPoints && (
                              <p className="text-sm text-green-600">
                                {customer.loyaltyPoints} loyalty points
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">
                            Customer
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                    ))
                )}
              </div>
              <div className="text-center text-xs text-gray-500 mt-4">
                {customers.length} customers available
                {customers.length > 0 && (
                  <div className="mt-2">
                    <p>Showing customer data successfully</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calculator Dialog */}
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>POS Calculator</DialogTitle>
            <DialogDescription>
              Quick calculations for your transactions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg text-right text-2xl font-mono">
              {calculatorValue}
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {/* Calculator buttons */}
              {['C', '±', '%', '÷'].map((btn) => (
                <Button key={btn} variant="outline" className="h-12" onClick={() => handleCalculatorInput(btn)}>
                  {btn}
                </Button>
              ))}
              {['7', '8', '9', '×'].map((btn) => (
                <Button key={btn} variant="outline" className="h-12" onClick={() => handleCalculatorInput(btn)}>
                  {btn}
                </Button>
              ))}
              {['4', '5', '6', '−'].map((btn) => (
                <Button key={btn} variant="outline" className="h-12" onClick={() => handleCalculatorInput(btn)}>
                  {btn}
                </Button>
              ))}
              {['1', '2', '3', '+'].map((btn) => (
                <Button key={btn} variant="outline" className="h-12" onClick={() => handleCalculatorInput(btn)}>
                  {btn}
                </Button>
              ))}
              <Button variant="outline" className="h-12 col-span-2" onClick={() => handleCalculatorInput('0')}>
                0
              </Button>
              <Button variant="outline" className="h-12" onClick={() => handleCalculatorInput('.')}>
                .
              </Button>
              <Button variant="default" className="h-12" onClick={() => handleCalculatorInput('=')}>
                =
              </Button>
            </div>

            {calculatorHistory.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Recent Calculations</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  {calculatorHistory.slice(-3).map((calc, index) => (
                    <div key={index}>{calc}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Dialog */}
      <Dialog open={isInventoryOpen} onOpenChange={setIsInventoryOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Inventory Overview</DialogTitle>
            <DialogDescription>
              Current stock levels and product information
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            {isLoadingProducts ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Loading inventory...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product: Product) => (
                  <div key={product.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-gray-500">SKU: {product.id}</p>
                      {product.upcCode && (
                        <p className="text-xs text-gray-400">UPC: {product.upcCode}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                        (product.stock || product.inventory || 0) <= 10 ? 'text-red-600' : 
                        (product.stock || product.inventory || 0) <= 25 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {product.stock || product.inventory || 0}
                      </div>
                      <div className="text-sm text-gray-500">in stock</div>
                      <div className="text-sm font-medium">${product.price}</div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        addItemToCart(product);
                        toast({
                          title: "Item Added",
                          description: `${product.name} added to transaction`,
                        });
                      }}
                    >
                      Add to Cart
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};