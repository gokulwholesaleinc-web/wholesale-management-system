import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, ChevronLeft, ChevronRight, Tag, ThumbsUp, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface RecommendationCarouselProps {
  limit?: number;
  title?: string;
  subtitle?: string;
  defaultMinimized?: boolean;
  mobileCardSize?: 1 | 2 | 3 | 4;
  onProductClick?: (product: any) => void;
}

export function RecommendationCarousel({
  limit = 10,
  title = "AI-Powered Recommendations",
  subtitle = "Smart suggestions based on seasonal trends, market analysis, and customer preferences",
  defaultMinimized = false,
  mobileCardSize = 2,
  onProductClick
}: RecommendationCarouselProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isAdding, setIsAdding] = useState<number | null>(null);
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);

  // Generate grid classes based on mobile card size
  const getGridClasses = () => {
    const mobileClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-2', 
      3: 'grid-cols-3',
      4: 'grid-cols-4'
    };
    return `grid ${mobileClasses[mobileCardSize]} sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-4`;
  };

  // Fetch AI-powered recommendations (works for all users)  
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['/api/recommendations', limit],
    queryFn: async () => {
      const response = await fetch(`/api/recommendations?limit=${limit}`);
      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (AI recommendations refresh every 3 days)
    gcTime: 15 * 60 * 1000, // 15 minutes cache (renamed from cacheTime in v5)
  });
  
  // Check if we can scroll in each direction
  const checkScrollability = () => {
    if (!carouselRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5); // 5px buffer
  };
  
  // Add event listener for scroll
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    
    carousel.addEventListener('scroll', checkScrollability);
    window.addEventListener('resize', checkScrollability);
    
    // Initial check
    checkScrollability();
    
    return () => {
      carousel.removeEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
    };
  }, [recommendations]);
  
  // Scroll handlers
  const scrollLeft = () => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: -250, behavior: 'smooth' });
  };
  
  const scrollRight = () => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: 250, behavior: 'smooth' });
  };
  
  // Cart handlers - Optimized unified cart system
  const handleAddToCart = async (event: React.MouseEvent, productId: number) => {
    // Prevent event bubbling to avoid opening the product modal
    event.preventDefault();
    event.stopPropagation();
    
    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = "/login";
      return;
    }
    
    setIsAdding(productId);
    try {
      // Use unified cart API directly
      const response = await apiRequest('POST', '/api/cart', { productId, quantity: 1 });
      
      // Optimized cache invalidation - only invalidate necessary queries
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      
      toast({
        title: "Added to cart",
        description: "Product has been added to your cart",
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Failed to add product",
        description: "There was an error adding this product to your cart",
        variant: "destructive",
      });
    } finally {
      setIsAdding(null);
    }
  };
  
  // Render skeletons while loading
  if (isLoading) {
    return (
      <div className="my-8">
        <div className="mb-4">
          <Skeleton className="h-7 w-[250px] mb-2" />
          <Skeleton className="h-5 w-[350px]" />
        </div>
        <div className="flex space-x-4 overflow-x-hidden py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[200px] shrink-0">
              <Skeleton className="h-[200px] w-full mb-3 rounded-md" />
              <Skeleton className="h-5 w-[180px] mb-2" />
              <Skeleton className="h-4 w-[80px] mb-4" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Don't render if no recommendations
  if (recommendations.length === 0) {
    return null;
  }
  
  return (
    <div className="my-8 relative">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-gray-500">{subtitle}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(!isMinimized)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
        >
          {isMinimized ? 'Show' : 'Hide'}
          {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Product Grid */}
      {!isMinimized && (
        <div className={getGridClasses()}>
        {recommendations.map((product: any) => (
          <Card 
            key={product.id} 
            className="border bg-card overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer flex flex-col h-full"
            onClick={() => onProductClick?.(product)}
          >
            <div className="relative h-[180px] bg-gray-100 overflow-hidden">
              {product.imageUrl && (
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-contain object-center"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // Apply gradient based on category
                    const gradientColors: Record<number, string> = {
                      18: "from-amber-400 to-amber-600", // TOBACCO
                      19: "from-blue-400 to-blue-700",   // FOOD & BEVERAGE
                      20: "from-green-400 to-green-700", // MEDS/DAILY CARE
                      21: "from-gray-300 to-gray-500",   // PLASTIC/PAPER GOODS
                      22: "from-purple-400 to-purple-700", // LIQUOR SUPPLIES
                      23: "from-red-400 to-red-700",     // AUTOMOTIVE
                      25: "from-yellow-400 to-yellow-600", // ENERGY DRINK 
                      27: "from-amber-500 to-amber-800", // SMOKE TOBACCO
                      28: "from-amber-300 to-amber-500", // SMOKELESS
                      29: "from-blue-300 to-blue-600",   // SODA (merged into FOOD & BEVERAGE)
                    };
                    
                    const defaultGradient = "from-slate-300 to-slate-500";
                    const gradient = gradientColors[product.categoryId] || defaultGradient;
                    
                    target.classList.add("bg-gradient-to-br", ...gradient.split(" "));
                    target.src = "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='200' height='180' viewBox='0 0 200 180'%3e%3crect width='200' height='180' fill='%23f3f4f6'/%3e%3ctext x='50%25' y='50%25' font-size='16' text-anchor='middle' alignment-baseline='middle' font-family='system-ui, sans-serif' fill='%23a3a3a3'%3e%3c/text%3e%3c/svg%3e";
                  }}
                />
              )}
              
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.recommendationReason && (
                  <Badge 
                    variant="secondary"
                    className="px-2 py-1 font-normal text-xs bg-blue-100 text-blue-800 border-blue-200"
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    {product.recommendationReason}
                  </Badge>
                )}
                {product.confidenceScore && (
                  <Badge 
                    variant="outline"
                    className="px-2 py-1 font-normal text-xs bg-green-50 text-green-700 border-green-200"
                  >
                    {product.confidenceScore}% AI Match
                  </Badge>
                )}
              </div>
            </div>
            
            <CardContent className="p-3 flex flex-col flex-grow">
              <h3 className="font-medium truncate mb-1" title={product.name}>
                {product.name}
              </h3>
              
              {/* AI Insights - Better positioned and spaced */}
              {(product.recommendationReason || product.seasonalRelevance) && (
                <div className="text-xs text-blue-600 mb-3 p-2 bg-blue-50 rounded border border-blue-100">
                  {product.recommendationReason && (
                    <div className="flex items-start gap-1 mb-1">
                      <ThumbsUp className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="font-medium text-xs leading-tight">AI: {product.recommendationReason}</span>
                    </div>
                  )}
                  {product.seasonalRelevance && (
                    <div className="text-green-600 text-xs">
                      🌟 {product.seasonalRelevance}% seasonal relevance
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-auto">
                <p className="font-semibold text-lg">
                  ${product.price.toFixed(2)}
                </p>
              </div>
            </CardContent>
            
            <CardFooter className="p-3 pt-0">
              <Button 
                className="w-full" 
                size="sm"
                variant="default"
                onClick={(e) => handleAddToCart(e, product.id)}
                disabled={isAdding === product.id}
              >
                {isAdding === product.id ? (
                  <span className="animate-pulse">Adding...</span>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 mr-1" /> Add to Cart
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
        </div>
      )}
    </div>
  );
}