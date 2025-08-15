import { AppLayout } from "@/layout/AppLayout";
import { ProductGrid } from "@/components/products/ProductGrid";
import { RecommendationCarousel } from "@/components/recommendations/RecommendationCarousel"; 
import { useQuery } from '@tanstack/react-query';
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, LogIn, Camera, X, SortAsc, SortDesc, ArrowUpDown, Grid3X3, Grid2X2, LayoutGrid, Square } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useBarcodeProductSearch } from "@/hooks/useBarcodeProductSearch";
import { offlineCartManager } from "@/lib/offlineCartManager";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [mobileCardSize, setMobileCardSize] = useState<1 | 2 | 3 | 4>(2); // Mobile-only card size filter
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
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Parse categories
  const categoryId = selectedCategory ? parseInt(selectedCategory) : null;

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setSortBy('name-asc');
    setPriceRange('all');
    setStockFilter('all');
    setBrandFilter('all');
  };

  // Count active filters
  const activeFiltersCount = [
    searchTerm,
    selectedCategory,
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
  
  return (
    <AppLayout title="Products" description="Browse our wholesale product catalog">
      <div className="container mx-auto px-4 py-6">
        <PageHeader 
          title="Product Catalog"
        />
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          {/* Search and Barcode Scanner Row */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex gap-2">
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
          </div>

          {/* Filter Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
            {/* Category Filter */}
            <Select
              value={selectedCategory || 'all'}
              onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-9">
                <div className="flex items-center">
                  <Filter className="mr-2 h-3 w-3 text-gray-500" />
                  <SelectValue placeholder="Category" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Array.isArray(categories) && categories.map((category: any) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="stock-desc">Stock: High to Low</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>

            {/* Price Range Filter */}
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-10">$0 - $10</SelectItem>
                <SelectItem value="10-25">$10 - $25</SelectItem>
                <SelectItem value="25-50">$25 - $50</SelectItem>
                <SelectItem value="50-100">$50 - $100</SelectItem>
                <SelectItem value="100+">$100+</SelectItem>
              </SelectContent>
            </Select>

            {/* Stock Filter */}
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock (≤10)</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="h-9"
              disabled={activeFiltersCount === 0}
            >
              <X className="mr-2 h-3 w-3" />
              Clear {activeFiltersCount > 0 && `(${activeFiltersCount})`}
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
              {selectedCategory && (
                <Badge variant="secondary" className="text-xs">
                  Category: {Array.isArray(categories) ? categories.find((c: any) => c.id.toString() === selectedCategory)?.name : 'Unknown'}
                  <button
                    onClick={() => setSelectedCategory(null)}
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
        
        {/* Show recommendations when not filtering */}
        {!searchTerm && !categoryId && (
          <div className="mb-6">
            <RecommendationCarousel 
              limit={10} 
              title="Recommended Items"
              subtitle="Products you might like based on your order history"
            />
          </div>
        )}
        
        <ProductGrid 
          searchTerm={searchTerm} 
          categoryId={categoryId}
          sortBy={sortBy}
          priceRange={priceRange}
          stockFilter={stockFilter}
          brandFilter={brandFilter}
          mobileCardSize={mobileCardSize}
        />
        
        {/* Barcode Scanner Modal */}
        {showBarcodeScanner && (
          <BarcodeScanner
            isOpen={showBarcodeScanner}
            onScanResult={handleBarcodeScanned}
            onClose={() => setShowBarcodeScanner(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}
