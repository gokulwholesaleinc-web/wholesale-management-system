import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useUnifiedCart, useUnifiedWishlist } from "@/lib/unified-api-registry";
import { Heart, ShoppingCart, Trash2, TrendingDown, Edit3, Share2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface WishlistItem {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  priceWhenAdded: number;
  currentPrice: number;
  isOnSale: boolean;
  notes?: string;
  createdAt: string;
}

interface WishlistItemCardProps {
  item: WishlistItem;
  onAddToCart: (productId: number) => void;
  onRemove: (productId: number) => void;
  onUpdateNotes: (productId: number, notes: string) => void;
}

function WishlistItemCard({ item, onAddToCart, onRemove, onUpdateNotes }: WishlistItemCardProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(item.notes || '');

  const priceDrop = item.priceWhenAdded - item.currentPrice;
  const priceDropPercentage = ((priceDrop / item.priceWhenAdded) * 100);

  const handleSaveNotes = () => {
    onUpdateNotes(item.productId, notesText);
    setIsEditingNotes(false);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {item.productImage && (
          <div className="w-24 h-24 flex-shrink-0">
            <img 
              src={item.productImage} 
              alt={item.productName}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-1">{item.productName}</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-semibold">${item.currentPrice.toFixed(2)}</span>
                {item.isOnSale && priceDrop > 0 && (
                  <div className="flex items-center gap-1">
                    <Badge variant="destructive" className="text-xs">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      -{priceDropPercentage.toFixed(0)}%
                    </Badge>
                    <span className="text-xs text-muted-foreground line-through">
                      ${item.priceWhenAdded.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Added {formatDistanceToNow(new Date(item.createdAt))} ago
              </p>
              
              {/* Notes section */}
              {isEditingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Add notes about this item..."
                    className="text-xs h-16"
                  />
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={handleSaveNotes}>
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setIsEditingNotes(false);
                        setNotesText(item.notes || '');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  {item.notes && (
                    <p className="text-xs bg-muted p-2 rounded flex-1">{item.notes}</p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingNotes(true)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-1 ml-2">
              <Button
                size="sm"
                onClick={() => onAddToCart(item.productId)}
                className="h-8"
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRemove(item.productId)}
                className="h-8"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function WishlistManager() {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for wishlist items
  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ['/api/wishlist'],
    queryFn: () => apiRequest('/api/wishlist'),
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (productId: number) => {
      // Get product details first
      const product = await apiRequest(`/api/products/${productId}`);
      return apiRequest('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          quantity: 1,
          price: product.price1 || product.price
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Added to Cart",
        description: "Item has been added to your cart.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  });

  // Remove from wishlist mutation
  const removeFromWishlistMutation = useMutation({
    mutationFn: (productId: number) => 
      apiRequest(`/api/wishlist/${productId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      toast({
        title: "Removed",
        description: "Item has been removed from your wishlist.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item from wishlist",
        variant: "destructive",
      });
    }
  });

  // Update wishlist notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: ({ productId, notes }: { productId: number; notes: string }) =>
      apiRequest(`/api/wishlist/${productId}/notes`, {
        method: 'PUT',
        body: JSON.stringify({ notes })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      toast({
        title: "Notes Updated",
        description: "Your notes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive",
      });
    }
  });

  const handleAddToCart = (productId: number) => {
    addToCartMutation.mutate(productId);
  };

  const handleRemoveFromWishlist = (productId: number) => {
    removeFromWishlistMutation.mutate(productId);
  };

  const handleUpdateNotes = (productId: number, notes: string) => {
    updateNotesMutation.mutate({ productId, notes });
  };

  const handleShareWishlist = () => {
    // Generate shareable link (in a real app, this would create a public share token)
    const url = `${window.location.origin}/shared-wishlist/${Date.now()}`;
    setShareUrl(url);
    setShareDialogOpen(true);
    
    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link Copied",
        description: "Wishlist share link has been copied to clipboard.",
      });
    });
  };

  const onSaleItems = wishlistItems.filter((item: WishlistItem) => item.isOnSale);
  const totalSavings = onSaleItems.reduce((sum: number, item: WishlistItem) => 
    sum + (item.priceWhenAdded - item.currentPrice), 0
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            My Wishlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading wishlist...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            <CardTitle>My Wishlist</CardTitle>
            <Badge variant="secondary">{wishlistItems.length}</Badge>
          </div>
          <div className="flex gap-2">
            {wishlistItems.length > 0 && (
              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleShareWishlist}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Your Wishlist</DialogTitle>
                    <DialogDescription>
                      Share this link with others to let them see your wishlist items.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Shareable Link</Label>
                      <div className="flex gap-2">
                        <Input value={shareUrl} readOnly />
                        <Button 
                          variant="outline" 
                          onClick={() => window.open(shareUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This link allows others to view your wishlist and see current prices.
                      They can use it to place bulk orders on your behalf.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <CardDescription>
          Save products you're interested in and get notified of price drops.
          {onSaleItems.length > 0 && (
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <Badge variant="destructive" className="mr-2">
                <TrendingDown className="h-3 w-3 mr-1" />
                {onSaleItems.length} items on sale
              </Badge>
              Save ${totalSavings.toFixed(2)} on sale items!
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {wishlistItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Your wishlist is empty.</p>
            <p className="text-sm">Click the heart icon on products to add them here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {wishlistItems.map((item: WishlistItem) => (
              <WishlistItemCard
                key={item.id}
                item={item}
                onAddToCart={handleAddToCart}
                onRemove={handleRemoveFromWishlist}
                onUpdateNotes={handleUpdateNotes}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}