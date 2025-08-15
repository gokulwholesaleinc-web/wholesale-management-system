import { AppLayout } from "@/layout/AppLayout";
import { ProductGrid } from "@/components/products/ProductGrid";
import { RecommendationCarousel } from "@/components/recommendations/RecommendationCarousel"; 
import { useQuery } from '@tanstack/react-query';
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, LogIn, Camera, X, SortAsc, SortDesc, ArrowUpDown, Grid3X3, Grid2X2, LayoutGrid, Square, Eye, Package, Barcode, ShoppingCart, Minus, Plus, Loader2, Menu, List } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useBarcodeProductSearch } from "@/hooks/useBarcodeProductSearch";
import { offlineCartManager } from "@/lib/offlineCartManager";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [mobileCardSize, setMobileCardSize] = useState<1 | 2 | 3 | 4>(2); // Mobile-only card size filter
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupQuantity, setPopupQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { 
    searchByBarcode, 
    product: scannedProduct, 
    isLoading: isSearchingProduct,
    isProductFound,
    isProductNotFound,
    clearSearch 
  } = useBarcodeProductSearch();
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Show login required message
    return (
      <AppLayout title="Login Required" description="Please login to view our products">
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 text-center">
          <div className="bg-white p-4 sm:p-8 rounded-lg shadow-md max-w-md mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-blue-700">Login Required</h1>
            <p className="text-gray-600 mb-8">
              You need to log in to view our wholesale products. This catalog is exclusively 
              available to our registered customers.
            </p>
            <a 
              href="/login" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Login Now
            </a>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  // Fetch categories
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Helper functions for category management
  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(c => c !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  const clearCategories = () => {
    setSelectedCategories([]);
  };

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSortBy('name-asc');
    setPriceRange('all');
    setStockFilter('all');
    setBrandFilter('all');
  };

  // Count active filters
  const activeFiltersCount = [
    searchTerm,
    selectedCategories.length > 0 ? 'categories' : null,
    sortBy !== 'name-asc' ? sortBy : null,
    priceRange !== 'all' ? priceRange : null,
    stockFilter !== 'all' ? stockFilter : null,
    brandFilter !== 'all' ? brandFilter : null
  ].filter(Boolean).length;

  // Handle barcode scan result
  const handleBarcodeScanned = (barcode: string) => {
    setShowBarcodeScanner(false);
    searchByBarcode(barcode);
  };

  // Handle scanned product action
  const handleScannedProductAction = async (product: any, action: 'add' | 'view') => {
    if (action === 'add') {
      await addProductToCart(product.id, 1);
      clearSearch();
    } else {
      setSearchTerm(product.name);
      clearSearch();
    }
  };

  // Enhanced add to cart with offline support
  const addProductToCart = async (productId: number, quantity: number = 1) => {
    try {
      // Add to offline cart first for immediate response
      await offlineCartManager.saveCartItem(productId.toString(), quantity, {
        timestamp: Date.now()
      });

      // Try to add to server cart if online
      if (navigator.onLine) {
        try {
          const response = await apiRequest('POST', '/api/cart/add', {
            productId,
            quantity
          });
          
          if (response.ok) {
            queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
          }
        } catch (serverError) {
          console.log('Server cart update failed, using offline cart');
        }
      }

      toast({
        title: "Added to Cart",
        description: navigator.onLine ? 
          "Product added to cart" : 
          "Product added to offline cart - will sync when online",
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error adding product to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add product to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle popup add to cart
  const handleAddToCart = async (productId: number, quantity: number) => {
    setIsAddingToCart(true);
    try {
      await addProductToCart(productId, quantity);
      setIsPopupOpen(false);
      setPopupQuantity(1);
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Handle product card click to open popup
  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setPopupQuantity(1);
    setIsPopupOpen(true);
  };
  
  return (
    <AppLayout title="Products" description="Browse our wholesale product catalog">
      <div className="container mx-auto px-4 py-6">
        <PageHeader 
          title="Product Catalog"
        />
        
        {/* Mobile Search Bar - Always Visible */}
        <div className="md:hidden mb-4 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowBarcodeScanner(true)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 shrink-0"
              title="Scan Barcode"
            >
              <Camera className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(true)}
            className="w-full flex items-center justify-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters & Categories
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Mobile Filter Panel */}
        {showFilters && (
          <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setShowFilters(false)}>
            <div className="bg-white max-w-sm w-full h-full p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Filters & Categories</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">                
                {/* Mobile Category Filter */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Categories</label>
                    {selectedCategories.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCategories}
                        className="text-xs h-6 px-2"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {categories
                      .sort((a: any, b: any) => a.name.localeCompare(b.name))
                      .map((category: any) => (
                        <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.name)}
                            onChange={() => toggleCategory(category.name)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{category.name}</span>
                        </label>
                      ))}
                  </div>
                </div>

                {/* Other Mobile Filters */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Name A-Z</SelectItem>
                      <SelectItem value="name-desc">Name Z-A</SelectItem>
                      <SelectItem value="price-asc">Price Low to High</SelectItem>
                      <SelectItem value="price-desc">Price High to Low</SelectItem>
                      <SelectItem value="stock-asc">Stock Low to High</SelectItem>
                      <SelectItem value="stock-desc">Stock High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Price Range</label>
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Price range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="0-25">$0 - $25</SelectItem>
                      <SelectItem value="25-50">$25 - $50</SelectItem>
                      <SelectItem value="50-100">$50 - $100</SelectItem>
                      <SelectItem value="100+">$100+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Stock Status</label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Stock status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low-stock">Low Stock</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="w-full"
                  disabled={activeFiltersCount === 0}
                >
                  Clear All Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Layout with Sidebar */}
        <div className="hidden md:flex gap-6">
          {/* Desktop Sidebar */}
          {showSidebar && (
            <div className="w-64 bg-white rounded-lg shadow-sm border p-4 h-fit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Categories</h3>
                {selectedCategories.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCategories}
                    className="text-xs h-6 px-2"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {categories
                  .sort((a: any, b: any) => a.name.localeCompare(b.name))
                  .map((category: any) => (
                    <label key={category.id} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.name)}
                        onChange={() => toggleCategory(category.name)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
              {/* Search and Sidebar Toggle Row */}
              <div className="flex gap-4 items-center mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="flex items-center gap-2"
                >
                  <Menu className="h-4 w-4" />
                  {showSidebar ? 'Hide' : 'Show'} Categories
                </Button>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="h-10 w-10 shrink-0"
                  title="Scan Barcode"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {/* Sort By Filter */}
                <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9">
                <div className="flex items-center">
                  <ArrowUpDown className="mr-2 h-3 w-3 text-gray-500" />
                  <SelectValue placeholder="Sort By" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">
                  <div className="flex items-center">
                    <SortAsc className="mr-2 h-3 w-3" />
                    Name A-Z
                  </div>
                </SelectItem>
                <SelectItem value="name-desc">
                  <div className="flex items-center">
                    <SortDesc className="mr-2 h-3 w-3" />
                    Name Z-A
                  </div>
                </SelectItem>
                <SelectItem value="price-asc">Price Low to High</SelectItem>
                <SelectItem value="price-desc">Price High to Low</SelectItem>
                <SelectItem value="stock-asc">Stock Low to High</SelectItem>
                <SelectItem value="stock-desc">Stock High to Low</SelectItem>
              </SelectContent>
                </Select>

                {/* Price Range Filter */}
                <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-25">$0 - $25</SelectItem>
                <SelectItem value="25-50">$25 - $50</SelectItem>
                <SelectItem value="50-100">$50 - $100</SelectItem>
                <SelectItem value="100+">$100+</SelectItem>
              </SelectContent>
                </Select>

                {/* Stock Filter */}
                <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
                </Select>

                {/* Clear Filters Button */}
                <Button
              variant="outline"
              onClick={clearAllFilters}
              className="h-9 whitespace-nowrap"
              disabled={activeFiltersCount === 0}
            >
              Clear Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
                </Button>
              </div>

              {/* Mobile-Only Card Size Filter */}
              <div className="md:hidden mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Cards per row</span>
              <div className="flex gap-1">
                <Button
                  variant={mobileCardSize === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMobileCardSize(1)}
                  className="px-2 py-1 h-8"
                  title="1 card per row"
                >
                  <Square className="h-3 w-3" />
                </Button>
                <Button
                  variant={mobileCardSize === 2 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMobileCardSize(2)}
                  className="px-2 py-1 h-8"
                  title="2 cards per row"
                >
                  <Grid2X2 className="h-3 w-3" />
                </Button>
                <Button
                  variant={mobileCardSize === 3 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMobileCardSize(3)}
                  className="px-2 py-1 h-8"
                  title="3 cards per row"
                >
                  <Grid3X3 className="h-3 w-3" />
                </Button>
                <Button
                  variant={mobileCardSize === 4 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMobileCardSize(4)}
                  className="px-2 py-1 h-8"
                  title="4 cards per row"
                >
                  <LayoutGrid className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Categories: {selectedCategories.join(', ')}
                  <button
                    onClick={clearCategories}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {sortBy !== 'name-asc' && (
                <Badge variant="secondary" className="text-xs">
                  Sort: {sortBy.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  <button
                    onClick={() => setSortBy('name-asc')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {priceRange !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Price: {priceRange === '100+' ? '$100+' : `$${priceRange.replace('-', ' - $')}`}
                  <button
                    onClick={() => setPriceRange('all')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {stockFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Stock: {stockFilter.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  <button
                    onClick={() => setStockFilter('all')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
              )}
            </div>
            
            {/* Desktop Products Display */}
            <div className="hidden md:block">
              {/* Show recommendations when not filtering */}
              {!searchTerm && selectedCategories.length === 0 && (
                <div className="mb-6">
                  <RecommendationCarousel 
                    limit={10} 
                    title="Recommended Items"
                    subtitle="Products you might like based on your order history"
                    mobileCardSize={3}
                    onProductClick={handleProductClick}
                  />
                </div>
              )}
              
              <ProductGrid 
                searchTerm={searchTerm} 
                selectedCategories={selectedCategories}
                sortBy={sortBy}
                priceRange={priceRange}
                stockFilter={stockFilter}
                brandFilter={brandFilter}
                mobileCardSize={3}
                onProductClick={handleProductClick}
              />
            </div>
          </div>
        </div>

        {/* Mobile Layout (Products shown here for mobile) */}
        <div className="md:hidden">
          {/* Show recommendations when not filtering */}
          {!searchTerm && selectedCategories.length === 0 && (
            <div className="mb-6">
              <RecommendationCarousel 
                limit={10} 
                title="Recommended Items"
                subtitle="Products you might like based on your order history"
                mobileCardSize={mobileCardSize}
                onProductClick={handleProductClick}
              />
            </div>
          )}
          
          <ProductGrid 
            searchTerm={searchTerm} 
            selectedCategories={selectedCategories}
            sortBy={sortBy}
            priceRange={priceRange}
            stockFilter={stockFilter}
            brandFilter={brandFilter}
            mobileCardSize={mobileCardSize}
            onProductClick={handleProductClick}
          />
        </div>

        {/* Scanned Product Display */}
        {isSearchingProduct && (
          <div className="mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-600">Searching for scanned product...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {isProductFound && scannedProduct && (
          <div className="mb-6">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-800">{scannedProduct.name}</h3>
                    <p className="text-sm text-green-600 mb-2">${scannedProduct.price}</p>
                    <p className="text-xs text-green-600">Stock: {scannedProduct.stockQuantity}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleScannedProductAction(scannedProduct, 'add')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Add to Cart
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleScannedProductAction(scannedProduct, 'view')}
                    >
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={clearSearch}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {isProductNotFound && (
          <div className="mb-6">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-orange-800">Product Not Found</h3>
                    <p className="text-sm text-orange-600">No product found with that barcode</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        

        
        {/* Barcode Scanner Modal */}
        {showBarcodeScanner && (
          <BarcodeScanner
            isOpen={showBarcodeScanner}
            onScanResult={handleBarcodeScanned}
            onClose={() => setShowBarcodeScanner(false)}
          />
        )}

        {/* Product Detail Popup */}
        {selectedProduct && (
          <Dialog open={isPopupOpen} onOpenChange={(open) => {
            setIsPopupOpen(open);
            if (!open) {
              setSelectedProduct(null);
              setPopupQuantity(1);
            }
          }}>
            <DialogContent className="max-w-2xl w-[92vw] max-h-[88vh] overflow-y-auto p-0 mx-2 my-4 sm:mx-4">
              <DialogHeader className="p-4 pb-2 sm:p-6 sm:pb-4">
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  Product Details
                </DialogTitle>
              </DialogHeader>
              
              <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                <div className="flex flex-col space-y-4 sm:grid sm:grid-cols-1 md:grid-cols-2 md:gap-4 md:space-y-0">
                  {/* Product Image */}
                  <div className="space-y-4">
                    <div className="aspect-square max-h-64 bg-gray-100 rounded-lg overflow-hidden border">
                      {selectedProduct.imageUrl ? (
                        <img 
                          src={selectedProduct.imageUrl} 
                          alt={selectedProduct.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Package className="h-16 w-16 opacity-50" />
                        </div>
                      )}
                    </div>
                    
                    {/* Product Details */}
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Barcode className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-600">
                          SKU: {selectedProduct.sku || 'No SKU'}
                        </span>
                      </div>
                      
                      {selectedProduct.upcCode && (
                        <div className="flex items-center gap-2">
                          <Barcode className="h-4 w-4 text-gray-600" />
                          <span className="text-sm text-gray-600">UPC: {selectedProduct.upcCode}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-600">
                          Stock: {selectedProduct.stock} units
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Product Info & Actions */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-3">{selectedProduct.name}</h3>
                      {selectedProduct.description && (
                        <p className="text-gray-600 text-base leading-relaxed">{selectedProduct.description}</p>
                      )}
                    </div>
                    
                    {/* Price Display */}
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-700 mb-1">
                        ${selectedProduct.price?.toFixed(2)}
                      </div>
                      <div className="text-sm text-green-600">Per unit</div>
                    </div>
                    
                    {/* Quantity Selector */}
                    <div className="space-y-3">
                      <label className="text-base font-semibold">Quantity</label>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPopupQuantity(Math.max(1, popupQuantity - 1))}
                          disabled={popupQuantity <= 1}
                          className="h-10 w-10"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <Input
                          type="number"
                          min="1"
                          max={selectedProduct.stock}
                          value={popupQuantity}
                          onChange={(e) => setPopupQuantity(Math.max(1, Math.min(selectedProduct.stock, parseInt(e.target.value) || 1)))}
                          className="w-24 text-center h-10 text-lg"
                        />
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPopupQuantity(Math.min(selectedProduct.stock, popupQuantity + 1))}
                          disabled={popupQuantity >= selectedProduct.stock}
                          className="h-10 w-10"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Total Price */}
                      <div className="text-lg font-semibold text-gray-700">
                        Total: ${(selectedProduct.price * popupQuantity).toFixed(2)}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Button
                        onClick={() => handleAddToCart(selectedProduct.id, popupQuantity)}
                        disabled={selectedProduct.stock === 0 || isAddingToCart}
                        className="w-full h-12 text-lg"
                        size="lg"
                      >
                        {isAddingToCart ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Adding to Cart...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-5 w-5 mr-2" />
                            Add {popupQuantity} to Cart
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsPopupOpen(false);
                          setSelectedProduct(null);
                          setPopupQuantity(1);
                        }}
                        className="w-full h-10"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}