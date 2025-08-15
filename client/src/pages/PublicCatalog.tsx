import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, 
  Package, 
  Grid3X3, 
  List, 
  Filter, 
  Eye,
  LogIn,
  ShoppingBag,
  Star,
  Heart,
  Home,
  ArrowLeft,
  Menu,
  X,
  Square,
  Grid2X2,
  Gift,
  Truck,
  Shield,
  UserPlus,
  Award
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AgeVerification from '@/components/AgeVerification';
import { ProductDetailModal } from "@/components/products/ProductDetailModal";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  categoryName: string;
  price: number;
  stock: number;
  isAvailable: boolean;
}

interface Category {
  id: number;
  name: string;
  description: string;
  isVisible?: boolean;
  isDraft?: boolean;
  visibleToLevels?: string[];
}

export default function PublicCatalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'name-desc' | 'newest'>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [mobileCardSize, setMobileCardSize] = useState<1 | 2 | 3 | 4>(2); // Mobile card size (1-4 columns)
  const [desktopCardSize, setDesktopCardSize] = useState<2 | 3 | 4 | 5>(4); // Desktop card size (2-5 columns)
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [hasScrolledHalfway, setHasScrolledHalfway] = useState(false);
  const [isModalDismissed, setIsModalDismissed] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const catalogRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const isLoggedIn = !!user;
  


  // Helper function to toggle category selection
  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(c => c !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  // Helper function to clear all category selections
  const clearCategories = () => {
    setSelectedCategories([]);
  };

  // Check age verification on component mount
  useEffect(() => {
    const verified = localStorage.getItem('ageVerified');
    const timestamp = localStorage.getItem('ageVerifiedTimestamp');
    
    if (verified && timestamp) {
      // Check if verification is still valid (24 hours)
      const verificationAge = Date.now() - parseInt(timestamp);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (verificationAge < twentyFourHours) {
        setIsAgeVerified(true);
      } else {
        // Clear expired verification
        localStorage.removeItem('ageVerified');
        localStorage.removeItem('ageVerifiedTimestamp');
      }
    }
  }, []);

  // Scroll detection for benefits modal - triggers at 35%
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrolledPercentage = scrollTop / (scrollHeight - clientHeight);
      
      console.log('Scroll percentage:', scrolledPercentage * 100);
      console.log('Trigger threshold reached:', scrolledPercentage >= 0.15);
      console.log('Modal dismissed:', isModalDismissed);
      console.log('Already scrolled halfway:', hasScrolledHalfway);
      
      if (scrolledPercentage >= 0.15 && !hasScrolledHalfway && !isModalDismissed) {
        console.log('Triggering benefits modal');
        setHasScrolledHalfway(true);
        setShowBenefitsModal(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);

    // TEMPORARILY DISABLE localStorage CHECK FOR TESTING
    // const dismissed = localStorage.getItem('benefitsModalDismissed');
    // if (!dismissed) {
    //   window.addEventListener('scroll', handleScroll, { passive: true });
    //   return () => window.removeEventListener('scroll', handleScroll);
    // } else {
    //   setIsModalDismissed(true);
    // }
  }, [hasScrolledHalfway, isModalDismissed]);

  const handleAgeVerified = () => {
    setIsAgeVerified(true);
  };

  const handleAgeDeclined = () => {
    setLocation('/');
  };

  // Handle product click to show details
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  // Navigate to account creation
  const handleCreateAccount = () => {
    setShowBenefitsModal(false);
    setLocation('/create-account');
  };

  // Dismiss benefits modal
  const dismissBenefitsModal = () => {
    setShowBenefitsModal(false);
    setIsModalDismissed(true);
    localStorage.setItem('benefitsModalDismissed', 'true');
  };

  // Fetch products for public viewing
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products/public'],
    staleTime: 300000, // Cache for 5 minutes
  });

  // Fetch categories (filter out Sexual Wellness category for public view)
  const { data: allCategories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    staleTime: 300000,
  });

  // Filter out Sexual Wellness category from public catalog
  const categories = allCategories.filter(category => 
    category.name !== 'Sexual Wellness' && 
    !category.name.toLowerCase().includes('sexual') &&
    !category.name.toLowerCase().includes('adult')
  );

  // Show age verification if not verified
  if (!isAgeVerified) {
    return <AgeVerification onVerified={handleAgeVerified} onDeclined={handleAgeDeclined} />;
  }

  // Filter and sort products (exclude Sexual Wellness category items)
  const filteredProducts = products
    .filter(product => {
      // Filter out Sexual Wellness category products
      const isNotSexualWellness = product.categoryName !== 'Sexual Wellness' && 
                                  !(product.categoryName && product.categoryName.toLowerCase().includes('sexual')) &&
                                  !(product.categoryName && product.categoryName.toLowerCase().includes('adult'));
      
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.categoryName && product.categoryName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.categoryName);
      
      return matchesSearch && matchesCategory && product.isAvailable && isNotSexualWellness;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      } else if (sortBy === 'newest') {
        // Assuming products with higher IDs are newer
        return b.id - a.id;
      }
      return 0;
    });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (productsLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <ShoppingBag className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Gokul Wholesale</span>
              </div>
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Store that user came from catalog for proper redirect after login
                    localStorage.setItem('redirectAfterLogin', '/catalog');
                    setLocation('/login');
                  }}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login for Prices
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading state */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm" className="md:hidden">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Link>
              </Button>
              <div className="flex items-center">
                <img 
                  src="/gokul-logo.png" 
                  alt="Gokul Wholesale Logo" 
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                />
                <div className="ml-2">
                  <div className="text-lg sm:text-xl font-bold text-gray-900 hidden sm:block">Gokul Wholesale</div>
                  <div className="text-sm font-bold text-gray-900 sm:hidden">Gokul</div>
                  <div className="text-xs text-blue-600 font-medium hidden md:block">Since 2009 • 16 Years</div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isLoggedIn ? (
                <Button asChild size="sm" className="hidden sm:flex">
                  <Link href="/dashboard">
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Catalog
                  </Link>
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                    <Link href="/">
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Store that user came from catalog for proper redirect after login
                      localStorage.setItem('redirectAfterLogin', '/catalog');
                      setLocation('/login');
                    }}
                  >
                    <LogIn className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Login for Prices</span>
                    <span className="sm:hidden">Login</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold mb-3 sm:mb-4">Wholesale Products Catalog</h1>
            <p className="text-base sm:text-xl text-blue-100 mb-6">
              Browse our extensive collection of wholesale products
            </p>
            {!isLoggedIn && (
              <div className="bg-blue-500/30 border border-blue-400 rounded-lg p-3 sm:p-4 max-w-md mx-auto">
                <p className="text-blue-100 text-sm sm:text-base">
                  <LogIn className="h-4 w-4 sm:h-5 sm:w-5 inline mr-2" />
                  Login to view pricing and place orders
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setShowFilters(false)}>
          <div className="bg-white max-w-sm w-full h-full p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Filters & Sort</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {/* Mobile Search */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
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
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((category) => (
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

              {/* Mobile Sort */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={(value: 'name' | 'name-desc' | 'newest') => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mobile View Mode */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">View</label>
                <div className="flex space-x-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="flex-1"
                  >
                    <Grid3X3 className="h-4 w-4 mr-1" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="flex-1"
                  >
                    <List className="h-4 w-4 mr-1" />
                    List
                  </Button>
                </div>
              </div>

              {/* Mobile Card Size */}
              {viewMode === 'grid' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Cards per row</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4].map((size) => (
                      <Button
                        key={size}
                        variant={mobileCardSize === size ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMobileCardSize(size as 1 | 2 | 3 | 4)}
                        className="flex-1 text-xs touch-manipulation h-9 min-w-[44px]"
                        aria-label={`${size} cards per row`}
                      >
                        {size} Col
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Layout with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 hidden md:block">
        {/* Search and Controls Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex gap-4 items-center">
            {/* Sidebar Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex items-center gap-2"
            >
              <Menu className="h-4 w-4" />
              Categories
            </Button>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: 'name' | 'name-desc' | 'newest') => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>

            {/* Desktop Card Size */}
            {viewMode === 'grid' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Cards per row:</span>
                <div className="flex space-x-1">
                  {[2, 3, 4, 5].map((size) => (
                    <Button
                      key={size}
                      variant={desktopCardSize === size ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDesktopCardSize(size as 2 | 3 | 4 | 5)}
                      className="w-9 h-9 p-0 text-xs touch-manipulation min-w-[36px]"
                      aria-label={`${size} cards per row`}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* View Mode */}
            <div className="flex space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex gap-6">
          {/* Category Sidebar */}
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
              
              {/* Selected Categories Summary */}
              {selectedCategories.length > 0 && (
                <div className="mb-4 p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium mb-2">
                    {selectedCategories.length} selected:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCategories.map((categoryName) => (
                      <Badge
                        key={categoryName}
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-red-100"
                        onClick={() => toggleCategory(categoryName)}
                      >
                        {categoryName}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Category List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {categories
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((category) => (
                    <label key={category.id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.name)}
                        onChange={() => toggleCategory(category.name)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 font-medium">{category.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {/* Products Grid/List Container */}
          <div className={`flex-1 ${!showSidebar ? 'w-full' : ''}`}>
            {/* Results Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
              <p className="text-gray-600 text-sm sm:text-base">
                {searchTerm || selectedCategories.length > 0 ? (
                  <>Showing {filteredProducts.length} of {products.length} products</>
                ) : (
                  <>Showing all {filteredProducts.length} products</>
                )}
                {selectedCategories.length > 0 && (
                  <span className="ml-2">
                    {selectedCategories.map((categoryName) => (
                      <Badge key={categoryName} variant="secondary" className="ml-1">
                        {categoryName}
                      </Badge>
                    ))}
                  </span>
                )}
              </p>
              {searchTerm && (
                <p className="text-xs sm:text-sm text-gray-500">
                  Search results for "{searchTerm}"
                </p>
              )}
            </div>

            {/* Products Grid/List */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                {selectedCategories.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={clearCategories} 
                    className="mt-4"
                  >
                    Clear Category Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 
                `grid gap-4 sm:gap-6 grid-cols-2 ${
                  // Desktop responsive classes for the main layout
                  desktopCardSize === 2 ? 'md:grid-cols-2' :
                  desktopCardSize === 3 ? 'md:grid-cols-3' :
                  desktopCardSize === 4 ? 'md:grid-cols-4' :
                  'md:grid-cols-5'
                }` :
                'space-y-4'
              }>
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="group hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="p-0">
                      <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-100">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge variant={product.stock > 0 ? 'default' : 'destructive'} className="text-xs">
                            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <CardTitle 
                            className="text-lg font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer"
                            onClick={() => handleProductClick(product)}
                          >
                            {product.name}
                          </CardTitle>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <Heart className="h-4 w-4" />
                          </Button>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {product.categoryName}
                        </Badge>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {product.description}
                        </p>
                        {isLoggedIn ? (
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-lg font-bold text-blue-600">
                              ${product.price.toFixed(2)}
                            </span>
                            <div className="flex gap-1">
                              <Button 
                                variant="outline"
                                size="sm" 
                                className="min-w-0 touch-manipulation h-8 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProductClick(product);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" disabled={product.stock === 0} className="min-w-0">
                                <ShoppingBag className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 space-y-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductClick(product);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="w-full"
                              onClick={() => {
                                localStorage.setItem('redirectAfterLogin', '/catalog');
                                setLocation('/login');
                              }}
                            >
                              <LogIn className="h-4 w-4 mr-2" />
                              Login to View Price
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-Only Card Size Filter */}
      <div className="md:hidden mt-4 pt-4 border-t border-gray-200 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Cards per row</span>
          <div className="flex gap-1">
            <Button
              variant={mobileCardSize === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setMobileCardSize(1)}
              className="px-2 py-1 h-9 touch-manipulation min-w-[44px]"
              title="1 card per row"
              aria-label="1 card per row"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant={mobileCardSize === 2 ? "default" : "outline"}
              size="sm"
              onClick={() => setMobileCardSize(2)}
              className="px-2 py-1 h-9 touch-manipulation min-w-[44px]"
              title="2 cards per row"
              aria-label="2 cards per row"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              variant={mobileCardSize === 3 ? "default" : "outline"}
              size="sm"
              onClick={() => setMobileCardSize(3)}
              className="px-2 py-1 h-9 touch-manipulation min-w-[44px]"
              title="3 cards per row"
              aria-label="3 cards per row"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={mobileCardSize === 4 ? "default" : "outline"}
              size="sm"
              onClick={() => setMobileCardSize(4)}
              className="px-2 py-1 h-9 touch-manipulation min-w-[44px]"
              title="4 cards per row"
              aria-label="4 cards per row"
            >
              <Package className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar with Filter Button */}
      <div className="md:hidden mb-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 flex-shrink-0 touch-manipulation h-10 min-w-[80px]"
            aria-label="Toggle filters"
          >
            <Filter className="h-4 w-4 mr-2" />
            <span>Filter</span>
          </Button>
        </div>
      </div>

      {/* Mobile Products */}
      <div className="md:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Results Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
          <p className="text-gray-600 text-sm sm:text-base">
            {searchTerm || selectedCategories.length > 0 ? (
              <>Showing {filteredProducts.length} of {products.length} products</>
            ) : (
              <>Showing all {filteredProducts.length} products</>
            )}
            {selectedCategories.length > 0 && (
              <span className="ml-2">
                {selectedCategories.map((categoryName) => (
                  <Badge key={categoryName} variant="secondary" className="ml-1">
                    {categoryName}
                  </Badge>
                ))}
              </span>
            )}
          </p>
          {searchTerm && (
            <p className="text-xs sm:text-sm text-gray-500">
              Search results for "{searchTerm}"
            </p>
          )}
        </div>

        {/* Products Grid/List */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            {selectedCategories.length > 0 && (
              <Button 
                variant="outline" 
                onClick={clearCategories} 
                className="mt-4"
              >
                Clear Category Filters
              </Button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 
            `grid gap-4 sm:gap-6 ${
              // Mobile responsive classes (up to md breakpoint)
              mobileCardSize === 1 ? 'grid-cols-1' :
              mobileCardSize === 2 ? 'grid-cols-2' :
              mobileCardSize === 3 ? 'grid-cols-3' :
              'grid-cols-4'
            } ${
              // Desktop classes (md breakpoint and above)
              desktopCardSize === 2 ? 'md:grid-cols-2' :
              desktopCardSize === 3 ? 'md:grid-cols-3' :
              desktopCardSize === 4 ? 'md:grid-cols-4' :
              'md:grid-cols-5'
            }` : 
            'space-y-4'
          }
          style={{ 
            // Force the grid layout with inline styles as backup
            display: viewMode === 'grid' ? 'grid' : 'block'
          }}>
            {filteredProducts.map((product) => (
              <Card key={product.id} className="group hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="p-0">
                  <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-100">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant={product.stock > 0 ? 'default' : 'destructive'} className="text-xs">
                        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <CardTitle 
                        className="text-lg font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer"
                        onClick={() => handleProductClick(product)}
                      >
                        {product.name}
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100 md:transition-opacity p-1 md:p-1 touch-manipulation"
                        aria-label="Add to wishlist"
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {product.categoryName}
                    </Badge>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {product.description}
                    </p>
                    {isLoggedIn ? (
                      product.price > 0 ? (
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-lg font-bold text-blue-600">
                            ${product.price.toFixed(2)}
                          </span>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline"
                              size="sm" 
                              className="min-w-0 touch-manipulation h-8 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductClick(product);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              disabled={product.stock === 0} 
                              className="min-w-0 touch-manipulation h-8 px-3 text-xs"
                            >
                              <ShoppingBag className="h-3 w-3 mr-1" />
                              <span className="hidden xs:inline">Add</span>
                              <span className="xs:hidden">+</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full touch-manipulation h-8 text-xs" 
                            disabled
                          >
                            <Package className="h-3 w-3 mr-1" />
                            <span className="hidden xs:inline">Price Not Available</span>
                            <span className="xs:hidden">No Price</span>
                          </Button>
                        </div>
                      )
                    ) : (
                      <div className="pt-2 space-y-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full touch-manipulation h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductClick(product);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          <span className="hidden xs:inline">View Details</span>
                          <span className="xs:hidden">View</span>
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="w-full touch-manipulation h-8 text-xs"
                          onClick={() => {
                            localStorage.setItem('redirectAfterLogin', '/catalog');
                            setLocation('/login');
                          }}
                        >
                          <LogIn className="h-3 w-3 mr-1" />
                          <span className="hidden xs:inline">Login to View Price</span>
                          <span className="xs:hidden">Login</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      {!isLoggedIn && (
        <div className="bg-blue-50 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Ready to See Pricing?</h2>
              <p className="text-gray-600 mb-2 text-sm sm:text-base">
                Login to view wholesale pricing and place orders
              </p>
              <p className="text-blue-600 mb-6 text-xs sm:text-sm font-medium">
                🏆 Serving businesses since 2009 • 16 years of trusted wholesale experience
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/login">
                    <LogIn className="h-5 w-5 mr-2" />
                    Login Now
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href="/create-account">Create Account</Link>
                </Button>
              </div>
              <div className="mt-4 text-center">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6">
                  <Link href="/privacy-policy" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/unsubscribe" className="text-sm text-red-600 hover:text-red-700 transition-colors font-medium">
                    ✉️ Unsubscribe from Emails
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Modal */}
      <Dialog open={showBenefitsModal} onOpenChange={setShowBenefitsModal}>
        <DialogContent className="max-w-md mx-auto p-6 rounded-xl shadow-2xl">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissBenefitsModal}
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0 hover:bg-gray-100"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl font-bold text-blue-700 mb-2">
                🎉 Join Our Wholesale Program!
              </DialogTitle>
              <p className="text-sm text-gray-600 font-medium">
                ✨ Trusted by businesses since 2009 • 16 years of excellence
              </p>
            </DialogHeader>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <Award className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-blue-900">Loyalty Rewards</span>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                  <Truck className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-900">Free Delivery</span>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                  <Gift className="h-5 w-5 text-purple-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-purple-900">Credit Accounts</span>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg">
                  <Star className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-orange-900">AI Recommendations</span>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
                  <Shield className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-red-900">24/7 Support</span>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-indigo-50 rounded-lg">
                  <ShoppingBag className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-indigo-900">Mobile App</span>
                </div>
              </div>
            </div>

            <div className="text-center mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 font-medium">
                ✓ 16 years in business since 2009 ✓ Thousands of satisfied customers ✓ Secure & reliable
              </p>
            </div>

            <div className="flex flex-col space-y-3">
              <Button 
                onClick={handleCreateAccount}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold rounded-lg transition-colors"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Create Account Now
              </Button>
              <Button 
                variant="outline" 
                onClick={dismissBenefitsModal}
                className="w-full py-2 text-gray-600 border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Detail Modal */}
      <ProductDetailModal 
        product={selectedProduct} 
        open={isProductModalOpen} 
        onOpenChange={setIsProductModalOpen} 
      />
    </div>
  );
}