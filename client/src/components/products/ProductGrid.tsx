import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingBag, Plus, Minus } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

// Product interface
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  basePrice?: number;
  priceLevel1?: number;
  priceLevel2?: number;
  priceLevel3?: number;
  priceLevel4?: number;
  priceLevel5?: number;
  imageUrl?: string;
  upcCode?: string;
  sku?: string;
  stock: number;
  categoryId: number;
  categoryName?: string;
}

// Cart item interface
interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  userId: string;
  product: Product;
}

interface ProductGridProps {
  searchTerm: string;
  selectedCategories?: string[];
  categoryId?: number | null;
  sortBy?: string;
  priceRange?: string;
  stockFilter?: string;
  brandFilter?: string;
  mobileCardSize?: 1 | 2 | 3 | 4;
  onProductClick?: (product: Product) => void;
}

// Function to validate if a product has a real image (no placeholders or stock images)
const hasValidImage = (imageUrl: string | undefined): boolean => {
  // Always show test product regardless of image
  if (!imageUrl) return true; // Changed to true to show products without images
  if (imageUrl.trim() === '') return true; // Changed to true to show products with empty image URLs
  
  // Detect known placeholder/stock image patterns
  const invalidPatterns = [
    'placeholder', 'placehold.co', 'freepik.com', 
    'unsplash.com', 'pexels.com', 'pixabay.com',
    'stockphoto', 'shutterstock', 'istockphoto',
    'dummyimage', 'dummy.com'
  ];
  
  for (const pattern of invalidPatterns) {
    if (imageUrl.toLowerCase().includes(pattern)) {
      // Allow placeholder images now
      return true;
    }
  }
  
  // Only accept product images from trusted domains
  const validDomains = [
    'amazon.com', 'm.media-amazon.com', 'images-na.ssl-images-amazon.com',
    'images-amazon.com', 'gokulwholesale.com', 'encrypted-tbn', 'google.com',
    'googleusercontent.com', 'shopping', 'gstatic.com', 'walmartimages.com'
  ];
  
  // We'll show all products, even if the image domain isn't trusted
  return true;
};

export function ProductGrid({ 
  searchTerm, 
  selectedCategories = [],
  categoryId, 
  sortBy = 'name-asc',
  priceRange = 'all',
  stockFilter = 'all',
  brandFilter = 'all',
  mobileCardSize = 2,
  onProductClick
}: ProductGridProps) {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get cart items
  const { data: cartItems = [], isLoading: isCartLoading } = useQuery({
    queryKey: ['/api/cart'],
    queryFn: async () => {
      const response = await apiRequest('/api/cart');
      return Array.isArray(response) ? response : [];
    }
  });
  
  // Update product quantity
  const updateQuantity = async (productId: number, quantity: number) => {
    if (quantity <= 0) {
      const product = products.find(p => p.id === productId);
      if (product) {
        await handleRemoveFromCart(product);
      }
      return;
    }
    
    try {
      const product = products.find(p => p.id === productId);
      if (product) {
        await handleRemoveFromCart(product);
        setTimeout(() => {
          handleAddToCart(product);
        }, 100);
      }
    } catch (error) {
      console.error(`Failed to update quantity for product ${productId}:`, error);
    }
  };

  // Tiered pricing is disabled - using only the standard price
  
  // Construct API endpoint based on category filter
  const endpoint = categoryId 
    ? `/api/products?categoryId=${categoryId}` 
    : '/api/products';

  // Fetch categories for mapping category names
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch products
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await apiRequest('GET', endpoint);
      console.log("API Response:", response); // Debug API response
      
      // Convert snake_case to camelCase for fields from the API
      if (Array.isArray(response)) {
        const mappedProducts = response.map((product: any) => {
          // Find the category name for this product
          const category = categories.find((cat: any) => cat.id === (product.category_id || product.categoryId));
          const categoryName = category ? category.name : '';
          
          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            // Map database fields to our interface
            priceLevel1: product.price_level_1 || product.price1,
            priceLevel2: product.price_level_2 || product.price2,
            priceLevel3: product.price_level_3 || product.price3,
            priceLevel4: product.price_level_4 || product.price4,
            priceLevel5: product.price_level_5 || product.price5,
            basePrice: product.base_price || product.basePrice,
            imageUrl: product.image_url || product.imageUrl,
            upcCode: product.upc_code || product.upcCode,
            sku: product.sku,
            stock: product.stock,
            categoryId: product.category_id || product.categoryId,
            categoryName: categoryName
          };
        });
        
        console.log("Mapped Products with Categories:", mappedProducts); // Debug mapped products
        return mappedProducts as Product[];
      }
      
      console.log("No products found in response");
      return [];
    },
    enabled: categories.length > 0, // Only fetch products after categories are loaded
  });

  // Function to get the standard price (tiered pricing disabled)
  const getPriceForCustomerLevel = (product: Product) => {
    // Only using standard price now (tiered pricing disabled)
    return product.price || 0;
  };

  // Log products array state
  console.log("Products state:", { 
    isArray: Array.isArray(products), 
    length: Array.isArray(products) ? products.length : 0,
    products 
  });
  
  // Filter and sort products based on all filter criteria
  const filteredProducts = Array.isArray(products) && products.length > 0 
    ? (products
        // Apply search term filter - includes name, description, UPC, and SKU
        .filter(product => {
          if (!searchTerm) return true;
          
          const searchLower = searchTerm.toLowerCase().trim();
          const productName = (product.name || '').toLowerCase();
          const productDescription = (product.description || '').toLowerCase();
          const productUpc = (product.upcCode || '').toLowerCase();
          const productSku = (product.sku || '').toLowerCase();
          const categoryName = (product.categoryName || '').toLowerCase();
          
          // Search across all relevant fields
          return productName.includes(searchLower) ||
                 productDescription.includes(searchLower) ||
                 productUpc.includes(searchLower) ||
                 productSku.includes(searchLower) ||
                 categoryName.includes(searchLower);
        })
        // Apply category filter using selectedCategories
        .filter(product => {
          // Use the prop or default to empty array to prevent undefined errors
          const categories = selectedCategories || [];
          if (!categories || categories.length === 0) return true;
          // Check if product's category name is in the selected categories
          return categories.includes(product.categoryName);
        })
        // Apply price range filter
        .filter(product => {
          if (priceRange === 'all') return true;
          const price = getPriceForCustomerLevel(product);
          switch (priceRange) {
            case '0-25': return price >= 0 && price <= 25;
            case '25-50': return price > 25 && price <= 50;
            case '50-100': return price > 50 && price <= 100;
            case '100+': return price > 100;
            default: return true;
          }
        })
        // Apply stock filter
        .filter(product => {
          if (stockFilter === 'all') return true;
          switch (stockFilter) {
            case 'in-stock': return product.stock > 0;
            case 'low-stock': return product.stock > 0 && product.stock <= 10;
            case 'out-of-stock': return product.stock === 0;
            default: return true;
          }
        })
        // Apply brand filter (using first word of product name as brand)
        .filter(product => {
          if (brandFilter === 'all') return true;
          const productBrand = product.name.split(' ')[0].toLowerCase();
          return productBrand === brandFilter.toLowerCase();
        })
        // Apply sorting
        .sort((a, b) => {
          const priceA = getPriceForCustomerLevel(a);
          const priceB = getPriceForCustomerLevel(b);
          
          switch (sortBy) {
            case 'name-asc':
              return a.name.localeCompare(b.name);
            case 'name-desc':
              return b.name.localeCompare(a.name);
            case 'price-asc':
              return priceA - priceB;
            case 'price-desc':
              return priceB - priceA;
            case 'stock-asc':
              return a.stock - b.stock;
            case 'stock-desc':
              return b.stock - a.stock;
            default:
              return a.name.localeCompare(b.name);
          }
        })
      )
    : [];
    
  // Log filtered results
  console.log("Filtered products:", filteredProducts.length);

  // Get the quantity of a product in the cart
  const getCartQuantity = (productId: number) => {
    if (!Array.isArray(cartItems)) return 0;

    // Debug to check the cart items

    
    // Find the item with matching productId - fixed to handle all variations of product IDs
    const item = cartItems.find(item => {
      // Convert both to numbers to ensure we're comparing the same type
      const itemProductId = typeof item.productId === 'string' ? parseInt(item.productId) : item.productId;
      const itemId = item.product && typeof item.product.id === 'string' ? parseInt(item.product.id) : (item.product ? item.product.id : null);
      
      return itemProductId === productId || itemId === productId;
    });
    
    return item ? item.quantity : 0;
  };

  // Handle adding to cart using React Query mutation for proper cache management
  const addToCartMutation = useMutation({
    mutationFn: async (product: Product) => {
      return await apiRequest('/api/cart/add', {
        method: 'POST',
        body: {
          productId: product.id,
          quantity: 1
        }
      });
    },
    onSuccess: (data, product) => {
      // Invalidate and refetch cart queries immediately
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.refetchQueries({ queryKey: ['/api/cart'] });
      
      // Refresh global cart state
      if (window.refreshCart) {
        window.refreshCart();
      }
      
      toast({
        title: "Added to cart",
        description: `${product.name} added to your cart.`
      });
    },
    onError: (error, product) => {
      console.error('Failed to add product to cart:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add product to cart. Please try again."
      });
    }
  });

  const handleAddToCart = (product: Product) => {
    addToCartMutation.mutate(product);
  };

  // Handle removing from cart using direct API calls with simplified update approach
  const handleRemoveFromCart = async (product: Product) => {
    try {
      const currentQuantity = getCartQuantity(product.id);
      console.log(`Removing from cart - product: ${product.id}, current quantity: ${currentQuantity}`);
      
      if (currentQuantity <= 0) {
        // Nothing to remove
        console.log(`Nothing to remove - quantity is ${currentQuantity}`);
        return;
      }
      
      if (currentQuantity === 1) {
        // Remove the item completely using the cart delete API
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
        const response = await fetch(`/api/cart/${product.id}`, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          console.log(`Removed product ${product.id} from cart`);
          
          // Invalidate all cart-related queries with proper cache key matching
          queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
          queryClient.invalidateQueries({ queryKey: ['cart'] });
          queryClient.removeQueries({ queryKey: ['/api/cart'] });
          
          // Let other components know the cart has updated
          if (typeof window.refreshCart === 'function') {
            window.refreshCart();
          }
          
          // Show toast notification
          toast({
            title: "Removed from cart",
            description: `${product.name} removed from your cart.`
          });
        } else {
          console.error('Failed to remove product from cart:', await response.json());
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to remove product from cart."
          });
        }
      } else if (currentQuantity > 1) {
        // Just reduce the quantity by 1 using the standard cart update API
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
        const response = await fetch(`/api/cart/${product.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            quantity: currentQuantity - 1
          })
        });
        
        if (response.ok) {
          console.log(`Decremented product ${product.id} quantity to ${currentQuantity - 1}`);
          
          // Invalidate all cart-related queries with proper cache key matching
          queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
          queryClient.invalidateQueries({ queryKey: ['cart'] });
          queryClient.removeQueries({ queryKey: ['/api/cart'] });
          
          // Let other components know the cart has updated
          if (typeof window.refreshCart === 'function') {
            window.refreshCart();
          }
          
          // Show toast notification
          toast({
            title: "Updated cart",
            description: `Reduced quantity of ${product.name} to ${currentQuantity - 1}.`
          });
        } else {
          console.error('Failed to update cart quantity:', await response.json());
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update cart quantity."
          });
        }
      }
    } catch (error) {
      console.error('Failed to update cart:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update cart. Please try again."
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-xl">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <div className="text-xl">Error loading products</div>
        <p className="mt-2">Please try again later</p>
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    console.log("No products found after filtering", {
      totalProducts: products.length,
      searchTerm,
      priceRange,
      stockFilter,
      brandFilter,
      selectedCategories: selectedCategories || []
    });
    return (
      <div className="text-center py-8">
        <div className="text-xl text-gray-600">No products found</div>
        <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
        <p className="text-xs text-gray-400 mt-1">Total products available: {products.length}</p>
      </div>
    );
  }

  // Generate mobile grid classes based on card size selection
  const getMobileGridClass = () => {
    switch (mobileCardSize) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      default: return 'grid-cols-2';
    }
  };

  // Dynamic responsive classes based on mobile card size
  const getResponsiveCardClasses = () => {
    // Base responsive classes for desktop
    const desktopClasses = "sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
    
    // Mobile grid class
    const mobileClass = getMobileGridClass();
    
    return `grid ${mobileClass} ${desktopClasses}`;
  };

  // Dynamic card content classes based on mobile card size
  const getCardContentClasses = () => {
    switch (mobileCardSize) {
      case 1:
        return {
          container: "bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col w-full",
          image: "relative mb-3 h-40 bg-gray-100 rounded-lg overflow-hidden",
          title: "text-base font-semibold mb-2 line-clamp-2",
          description: "text-sm text-gray-600 mb-2 line-clamp-2",
          price: "text-lg font-bold",
          stockBadge: "absolute top-2 right-2 px-3 py-1 rounded-full text-sm",
          buttonContainer: "flex items-center gap-2",
          quantityControls: "flex items-center border rounded-md overflow-hidden bg-white",
          quantityButton: "w-8 h-8 flex items-center justify-center",
          addButton: "px-3 py-2 rounded text-sm font-medium flex items-center"
        };
      case 2:
        return {
          container: "bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex flex-col w-full",
          image: "relative mb-2 h-32 bg-gray-100 rounded-lg overflow-hidden",
          title: "text-sm font-semibold mb-1 line-clamp-2",
          description: "text-xs text-gray-600 mb-1 line-clamp-1",
          price: "text-base font-bold",
          stockBadge: "absolute top-1 right-1 px-2 py-1 rounded-full text-xs",
          buttonContainer: "flex items-center",
          quantityControls: "flex items-center border rounded-md overflow-hidden bg-white",
          quantityButton: "w-6 h-6 flex items-center justify-center",
          addButton: "px-2 py-1 rounded text-xs font-medium flex items-center"
        };
      case 3:
        return {
          container: "bg-white rounded-lg shadow-sm border border-gray-200 p-2 flex flex-col w-full",
          image: "relative mb-2 h-24 bg-gray-100 rounded-lg overflow-hidden",
          title: "text-xs font-semibold mb-1 line-clamp-1",
          description: "hidden", // Hide description in 3-card view
          price: "text-sm font-bold",
          stockBadge: "absolute top-1 right-1 px-1 py-0.5 rounded text-xs",
          buttonContainer: "flex items-center",
          quantityControls: "flex items-center border rounded overflow-hidden bg-white",
          quantityButton: "w-5 h-5 flex items-center justify-center",
          addButton: "px-1 py-1 rounded text-xs font-medium flex items-center"
        };
      case 4:
        return {
          container: "bg-white rounded-lg shadow-sm border border-gray-200 p-1.5 flex flex-col w-full",
          image: "relative mb-1 h-20 bg-gray-100 rounded overflow-hidden",
          title: "text-xs font-semibold mb-0.5 line-clamp-1",
          description: "hidden", // Hide description in 4-card view
          price: "text-xs font-bold",
          stockBadge: "absolute top-0.5 right-0.5 px-1 py-0.5 rounded text-xs",
          buttonContainer: "flex flex-col gap-1",
          quantityControls: "flex items-center border rounded overflow-hidden bg-white",
          quantityButton: "w-4 h-4 flex items-center justify-center",
          addButton: "px-1 py-0.5 rounded text-xs font-medium flex items-center justify-center w-full"
        };
      default:
        return {
          container: "bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex flex-col w-full",
          image: "relative mb-2 h-32 bg-gray-100 rounded-lg overflow-hidden",
          title: "text-sm font-semibold mb-1 line-clamp-2",
          description: "text-xs text-gray-600 mb-1 line-clamp-1",
          price: "text-base font-bold",
          stockBadge: "absolute top-2 right-2 px-2 py-1 rounded-full text-sm",
          buttonContainer: "flex items-center",
          quantityControls: "flex items-center border rounded-md overflow-hidden bg-white",
          quantityButton: "w-6 h-6 flex items-center justify-center",
          addButton: "px-2 py-1 rounded text-xs font-medium flex items-center"
        };
    }
  };

  const cardClasses = getCardContentClasses();

  return (
    <div className="w-full">
      <div className={`${getResponsiveCardClasses()} gap-2 md:gap-3`}>
        {filteredProducts.map(product => {
        const price = getPriceForCustomerLevel(product);
        const cartQuantity = getCartQuantity(product.id);
        
        return (
          <div 
            key={product.id}
            className={`${cardClasses.container} cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => onProductClick && onProductClick(product)}
          >
            {/* Product image */}
            <div className={cardClasses.image}>
              {product.imageUrl ? (
                <img 
                  src={product.name.includes('DURACELL') ? 'https://i5.walmartimages.com/asr/eaa4e92f-7aaa-4296-aa2b-c2e19e95a32e.c8d0921e033b5f4d72f6b1c03fc8a4ce.jpeg' : 
                        product.name.includes('DIET COKE') ? 'https://i5.walmartimages.com/asr/ff50fdfa-e5fe-4cf5-a0a1-0e33f42e16d0.be59c7bd6f733e767e7248d444721b26.jpeg' : 
                        product.name.includes('COKE') ? 'https://i5.walmartimages.com/seo/Coca-Cola-Soda-20-fl-oz-Bottles-24-Pack_44e2c36a-95bb-41e2-8a67-a021bd405894.2bd11c3c7923a909b3f0e9db531b9c2f.jpeg' :
                        product.imageUrl}
                  alt={product.name} 
                  className="w-full h-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    console.log(`Image failed to load: ${product.imageUrl}`);
                    // If image fails to load, set a fallback image
                    e.currentTarget.onerror = null; // Prevent infinite loop
                    e.currentTarget.src = 'https://placehold.co/300x300?text=Product+Image';
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                  <ShoppingBag className={`${mobileCardSize === 4 ? 'h-4 w-4' : mobileCardSize === 3 ? 'h-6 w-6' : 'h-8 w-8'} mb-1 opacity-50`} />
                  <div className={`${mobileCardSize === 4 ? 'text-[10px]' : 'text-xs'} font-medium text-center px-1`}>
                    {product.name.split(' ')[0]}
                  </div>
                </div>
              )}
              
              {/* Stock indicator - responsive size */}
              <div className={`${cardClasses.stockBadge} ${
                product.stock > 0 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {mobileCardSize === 4 
                  ? (product.stock > 0 ? '✓' : '✗')
                  : (product.stock > 0 
                      ? 'In Stock' 
                      : 'Out of Stock')
                }
              </div>
            </div>
            
            {/* Product info */}
            <h3 className={cardClasses.title}>{product.name}</h3>
            {cardClasses.description !== "hidden" && (
              <p className={cardClasses.description}>{product.description}</p>
            )}
            
            {/* Price and add to cart */}
            <div className="mt-auto pt-1 border-t border-gray-100">
              <div className={`${mobileCardSize === 4 ? 'flex flex-col gap-1' : 'flex justify-between items-center'} mb-1`}>
                <div className={cardClasses.price}>${price.toFixed(2)}</div>
                
                {/* Responsive quantity controls */}
                <div className={cardClasses.buttonContainer}>
                  {cartQuantity > 0 ? (
                    <div className={cardClasses.quantityControls}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromCart(product);
                        }}
                        disabled={product.stock === 0}
                        className={`${cardClasses.quantityButton} bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors`}
                        title="Remove one"
                      >
                        <Minus size={mobileCardSize === 4 ? 8 : mobileCardSize === 3 ? 10 : 12} />
                      </button>
                      <span className={`${mobileCardSize === 4 ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'} bg-white font-medium min-w-[1.5rem] text-center border-x`}>
                        {cartQuantity}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        disabled={product.stock === 0}
                        className={`${cardClasses.quantityButton} bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors`}
                        title="Add one more"
                      >
                        <Plus size={mobileCardSize === 4 ? 8 : mobileCardSize === 3 ? 10 : 12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                      disabled={product.stock === 0}
                      className={`${cardClasses.addButton} ${
                        product.stock === 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } transition-colors`}
                    >
                      <Plus size={mobileCardSize === 4 ? 8 : mobileCardSize === 3 ? 10 : 12} className={mobileCardSize === 4 ? 'mr-0' : 'mr-1'} />
                      {mobileCardSize !== 4 && <span>Add</span>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}