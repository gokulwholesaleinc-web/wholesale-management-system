import { AppLayout } from "@/layout/AppLayout";
import { useQuery } from '@tanstack/react-query';
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ShoppingCart, Package, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  categoryId: number;
  sku?: string;
  priceLevel1: number;
  priceLevel2: number;
  priceLevel3: number;
  priceLevel4: number;
  priceLevel5: number;
  basePrice?: number;
}

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
    enabled: isAuthenticated,
  });

  // Fetch search results
  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/search/products", searchQuery],
    enabled: searchQuery.length > 0 && isAuthenticated,
  });

  const displayProducts = searchQuery ? searchResults : products;

  // Handle product click to open modal
  const handleProductClick = (productId: number) => {
    setSelectedProductId(productId);
    setIsProductModalOpen(true);
  };

  // Add to cart function
  const addToCart = async (productId: number, quantity: number = 1) => {
    try {
      await apiRequest('/api/cart/add', {
        method: 'POST',
        body: { productId, quantity }
      });
      toast({
        title: "Added to Cart",
        description: "Product added to your cart successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product to cart",
        variant: "destructive",
      });
    }
  };

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <AppLayout title="Login Required" description="Please login to view our products">
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-blue-700">Login Required</h1>
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

  // Loading state
  if (isLoading) {
    return (
      <AppLayout title="Products" description="Browse our wholesale product catalog">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Product Catalog</h1>
            <div className="animate-pulse h-10 bg-gray-200 rounded max-w-md"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="h-80">
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-40 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Products" description="Browse our wholesale product catalog">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Product Catalog</h1>
          
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayProducts.map((product: Product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="p-4" onClick={() => handleProductClick(product.id)}>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-40 object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="p-4 pt-0">
                <CardTitle className="text-lg mb-2 line-clamp-2" onClick={() => handleProductClick(product.id)}>
                  {product.name}
                </CardTitle>
                
                {product.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-green-600">
                    ${product.price.toFixed(2)}
                  </span>
                  
                  <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </Badge>
                </div>
                
                {product.sku && (
                  <p className="text-xs text-gray-500 mb-3">SKU: {product.sku}</p>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product.id);
                    }}
                    className="flex-1"
                  >
                    View Details
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product.id, 1);
                    }}
                    disabled={product.stock === 0}
                    size="sm"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {displayProducts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? "No products found" : "No products available"}
            </h3>
            <p className="text-gray-500">
              {searchQuery ? "Try adjusting your search terms" : "Products will appear here when available"}
            </p>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal 
        productId={selectedProductId}
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
      />
    </AppLayout>
  );
}