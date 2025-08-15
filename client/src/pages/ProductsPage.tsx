import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Package, Eye, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";
import { fmtUSD } from "@/lib/money";
import { useOptimizedCart } from "@/hooks/useOptimizedCart";

type Product = {
  id: number;
  name: string;
  description?: string;
  price: number;     // dollars (consider migrating to cents later)
  stock: number;
  imageUrl?: string;
  categoryId: number;
  sku?: string;
};

// Query keys
const PRODUCTS_KEY = ["/api/products"] as const;
const SEARCH_KEY = (q: string) => ["/api/search/products", q] as const;
const CART_KEY = ["/api/cart"] as const;

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const { toast } = useToast();
  const catalogRef = useRef<HTMLDivElement | null>(null);
  
  // Use optimized cart with instant feedback
  const { addToCart, isAddingToCart, cartItems } = useOptimizedCart();

  // Debounce search input ~250ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Products
  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery<Product[]>({
    queryKey: PRODUCTS_KEY,
    queryFn: () => apiRequest("/api/products"),
    staleTime: 60_000,
  });

  // Search (enabled only when there's a query)
  const {
    data: searchResults = [],
    isLoading: searchLoading,
  } = useQuery<Product[]>({
    queryKey: SEARCH_KEY(debouncedQuery),
    queryFn: () =>
      apiRequest(`/api/search/products?query=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length > 0,
    staleTime: 30_000,
  });

  // Which list to show
  const displayProducts: Product[] = useMemo(
    () => (debouncedQuery ? searchResults : products),
    [debouncedQuery, searchResults, products]
  );

  // Helper function to check if product is in cart
  const isInCart = (productId: number) => 
    cartItems.some(item => item.productId === productId);
  
  const getCartQuantity = (productId: number) => 
    cartItems.find(item => item.productId === productId)?.quantity || 0;

  // Open details modal
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  // Loading skeletons (products list)
  if (productsLoading && !debouncedQuery) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-80">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-40 bg-gray-200 rounded mb-4" />
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-6 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Product Catalog</h1>
        
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search products"
          />
        </div>
      </div>

      {/* Grid */}
      <div
        ref={catalogRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
      >
        {(searchLoading ? Array.from({ length: 8 }) : displayProducts).map(
          (p, idx) =>
            searchLoading ? (
              <Card key={`skeleton-${idx}`} className="h-80">
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-40 bg-gray-200 rounded mb-4" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-6 bg-gray-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card key={(p as Product).id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="p-4">
                  {(p as Product).imageUrl ? (
                    <img
                      src={(p as Product).imageUrl}
                      alt={(p as Product).name}
                      className="w-full h-40 object-cover rounded"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" aria-hidden="true" />
                    </div>
                  )}
                </CardHeader>
            
                <CardContent className="p-4 pt-0">
                  <CardTitle
                    className="text-lg mb-2 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleProductClick(p as Product)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleProductClick(p as Product);
                    }}
                  >
                    {(p as Product).name}
                  </CardTitle>
              
                  {(p as Product).description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {(p as Product).description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-green-600">
                      {fmtUSD((p as Product).price)}
                    </span>

                    <Badge variant={(p as Product).stock > 0 ? "default" : "destructive"}>
                      {(p as Product).stock > 0
                        ? `${(p as Product).stock} in stock`
                        : "Out of stock"}
                    </Badge>
                  </div>

                  {(p as Product).sku && (
                    <p className="text-xs text-gray-500 mb-3">SKU: {(p as Product).sku}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(p as Product);
                      }}
                      className="flex-1 touch-manipulation"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        const product = p as Product;
                        addToCart(product.id, 1, product);
                      }}
                      disabled={(p as Product).stock === 0 || isAddingToCart}
                      size="sm"
                      className="flex-1 touch-manipulation"
                      aria-label={`Add ${(p as Product).name} to cart`}
                    >
                      {isInCart((p as Product).id) ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          In Cart ({getCartQuantity((p as Product).id)})
                        </>
                      ) : isAddingToCart ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
        )}
      </div>

      {/* Empty states */}
      {displayProducts.length === 0 && !productsLoading && !searchLoading && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {debouncedQuery ? "No products found" : "No products available"}
          </h3>
          <p className="text-gray-500">
            {debouncedQuery
              ? "Try adjusting your search terms"
              : "Products will appear here when available"}
          </p>
        </div>
      )}

      {/* Product details modal */}
      {selectedProduct && (
        <ProductDetailModal
          open={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
          productId={selectedProduct.id}
          // optionally pass initial product snapshot to avoid refetch flash:
          initialProduct={selectedProduct}
          onAddToCart={() => addToCartMutation.mutate(selectedProduct.id)}
        />
      )}
    </div>
  );
}