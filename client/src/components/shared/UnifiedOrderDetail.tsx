import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import {
  ArrowLeft,
  Download,
  Package,
  MapPin,
  Calendar,
  User,
  Building2,
  Phone,
  DollarSign,
  Mail,
  FileText,
  Store,
  Truck,
  MessageSquare,
  Send,
  Trash2,
  Edit,
  Check,
  X,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product?: {
    id: number;
    name: string;
    sku?: string;
    imageUrl?: string;
    description?: string;
  };
}

interface DeliveryAddress {
  label?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  instructions?: string;
}

interface OrderUser {
  id: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
}

interface Order {
  id: number;
  userId: string;
  total: number;
  subtotal?: number;
  taxAmount?: number;
  orderType: "delivery" | "pickup";
  status: string;
  createdAt: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  pickupDate?: string;  // Added pickup fields
  pickupTime?: string;  // Added pickup fields
  deliveryFee?: number;
  notes?: string;
  items?: OrderItem[];
  user?: OrderUser;
  deliveryAddress?: DeliveryAddress;
  loyaltyPointsEarned?: number;
  flatTaxAmount?: number;
  flatTaxBreakdown?: Array<{
    name: string;
    amount: number;
    description?: string;
  }>;
  taxBreakdown?: Array<{
    name: string;
    amount: number;
    rate?: number;
  }>;
}

interface OrderNote {
  id: number;
  note: string;
  addedBy: string;
  createdAt: string;
  notifyCustomer?: boolean;
  isStaff?: boolean;
  isAdmin?: boolean;
  isEmployee?: boolean;
  displayName?: string;
  userName?: string;
  userLastName?: string;
  userUsername?: string;
  userCompany?: string;
}

interface UnifiedOrderDetailProps {
  orderId?: string;
  backUrl?: string;
  showAdminFeatures?: boolean;
}

export function UnifiedOrderDetail({
  orderId: propOrderId,
  backUrl = "/orders",
  showAdminFeatures = false,
}: UnifiedOrderDetailProps) {
  const params = useParams();
  const orderId = propOrderId || params.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State for order notes
  const [newNote, setNewNote] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);

  // State for admin order management
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Debug logging removed to prevent stray output

  const {
    data: order,
    isLoading,
    error,
  } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
    retry: false,
    select: (data: any) => {
      return data;
    },
  });

  // Fetch order notes
  const { data: orderNotes = [], isLoading: notesLoading } = useQuery<
    OrderNote[]
  >({
    queryKey: [`/api/orders/${orderId}/notes`],
    enabled: !!orderId,
    retry: false,
  });

  // Add order note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteData: {
      note: string;
      notifyCustomer?: boolean;
    }) => {
      // Note submission
      return apiRequest(`/api/orders/${orderId}/notes`, {
        method: "POST",
        body: noteData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/orders/${orderId}/notes`],
      });
      setNewNote("");
      setNotifyCustomer(false);
      toast({
        title: "Note Added",
        description: "Your note has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    },
  });

  // Delete order note mutation (admin/staff only)
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      // Note deletion
      return apiRequest(`/api/orders/${orderId}/notes/${noteId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/orders/${orderId}/notes`],
      });
      toast({
        title: "Note Deleted",
        description: "The note has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
    },
  });

  // Update order status mutation (admin/staff only)
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        body: { status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/orders/${orderId}`],
      });
      setIsEditingStatus(false);
      setNewStatus("");
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Update order item mutation (admin/staff only)
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity, price }: { itemId: number, quantity: number, price: number }) => {
      return apiRequest(`/api/orders/${orderId}/items/${itemId}`, {
        method: "PUT",
        body: { quantity, price },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/orders/${orderId}`],
      });
      setEditingItemId(null);
      setEditQuantity("");
      setEditPrice("");
      toast({
        title: "Item Updated",
        description: "Order item has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  // Delete order item mutation (admin/staff only)
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest(`/api/orders/${orderId}/items/${itemId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/orders/${orderId}`],
      });
      toast({
        title: "Item Deleted",
        description: "Order item has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  // Complete order mutation (admin/staff only)
  const completeOrderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/orders/${orderId}/complete`, {
        method: "POST",
        body: { 
          paymentMethod: paymentMethod || "cash",
          checkNumber: checkNumber || undefined,
          paymentNotes: paymentNotes || undefined
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/orders/${orderId}`],
      });
      setPaymentMethod("");
      setCheckNumber("");
      setPaymentNotes("");
      toast({
        title: "Order Completed",
        description: "Order has been marked as completed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete order",
        variant: "destructive",
      });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate({
      note: newNote.trim(),
      notifyCustomer:
        user?.isAdmin || user?.isEmployee ? notifyCustomer : false,
    });
  };

  const handleDeleteNote = (noteId: number) => {
    if (confirm("Are you sure you want to delete this note?")) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  // Admin handlers
  const handleUpdateStatus = () => {
    if (!newStatus.trim()) return;
    updateStatusMutation.mutate(newStatus);
  };

  const handleStartEditItem = (item: OrderItem) => {
    setEditingItemId(item.id);
    setEditQuantity(item.quantity.toString());
    setEditPrice(item.price.toString());
  };

  const handleUpdateItem = () => {
    if (!editingItemId || !editQuantity || !editPrice) return;
    const quantity = parseInt(editQuantity);
    const price = parseFloat(editPrice);
    if (isNaN(quantity) || isNaN(price) || quantity <= 0 || price < 0) return;
    
    updateItemMutation.mutate({ itemId: editingItemId, quantity, price });
  };

  const handleDeleteItem = (itemId: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const handleCompleteOrder = () => {
    if (confirm("Are you sure you want to complete this order?")) {
      completeOrderMutation.mutate();
    }
  };

  const isAdmin = user?.isAdmin || user?.isEmployee;
  const canManageOrders = showAdminFeatures && isAdmin;

  const downloadPDF = async () => {
    if (!orderId) return;

    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      const response = await fetch(`/api/orders/${orderId}/receipt`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `order-${orderId}-receipt.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("PDF download failed:", error);
    }
  };

  const emailPDF = async () => {
    if (!orderId) return;

    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      const response = await fetch(`/api/orders/${orderId}/send-receipt`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Email sent successfully
        // Add visual feedback that email was sent
        const emailButton = document.querySelector("[data-email-button]");
        if (emailButton) {
          const originalText = emailButton.textContent;
          emailButton.textContent = "Email Sent!";
          setTimeout(() => {
            emailButton.textContent = originalText;
          }, 2000);
        }
      } else {
        console.error("Email failed:", response.statusText);
      }
    } catch (error) {
      console.error("Email failed:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
        <p className="text-gray-600 mb-4">
          The order you're looking for doesn't exist or you don't have
          permission to view it.
        </p>
        <Link href={backUrl}>
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={backUrl}>
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.id}</h1>
            <p className="text-gray-600">
              Placed on{" "}
              {(() => {
                try {
                  if (!order.createdAt) return "Date unavailable";

                  // Handle various date formats
                  let date;
                  if (typeof order.createdAt === "string") {
                    // Try parsing as ISO string first
                    date = new Date(order.createdAt);

                    // If that fails, try parsing as timestamp
                    if (isNaN(date.getTime())) {
                      const timestamp = parseInt(order.createdAt);
                      if (!isNaN(timestamp)) {
                        date = new Date(timestamp);
                      }
                    }
                  } else if (typeof order.createdAt === "number") {
                    date = new Date(order.createdAt);
                  } else {
                    date = new Date(order.createdAt);
                  }

                  // Final validation
                  if (!date || isNaN(date.getTime())) {
                    return "Date unavailable";
                  }

                  // Additional validation before formatting
                  if (!date || isNaN(date.getTime()) || date.getTime() === 0) {
                    return "Date unavailable";
                  }
                  return format(date, "PPP");
                } catch (error) {
                  console.warn(
                    "Date formatting error:",
                    error,
                    "for createdAt:",
                    order.createdAt,
                  );
                  return "Date unavailable";
                }
              })()}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={downloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={emailPDF} data-email-button>
            <Mail className="mr-2 h-4 w-4" />
            Email PDF
          </Button>
        </div>
      </div>

      {/* Combined Order & Customer Information - Moved to top */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Order & Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Order Status Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 border-b pb-2">
                Order Status
              </h4>
              
              {canManageOrders && isEditingStatus ? (
                <div className="flex items-center space-x-2">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    onClick={handleUpdateStatus}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setIsEditingStatus(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Badge className={`${getStatusColor(order.status)} border-0`}>
                    {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                  </Badge>
                  {canManageOrders && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setIsEditingStatus(true);
                        setNewStatus(order.status || "");
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              {/* Enhanced Order Type Information */}
              {order.orderType === "pickup" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Store className="h-4 w-4" />
                    <span className="font-medium">Store Pickup</span>
                  </div>

                  {/* Pickup Date and Time Section - FIXED to use pickupDate/pickupTime */}
                  <div className="ml-6 space-y-2">
                    {order.pickupDate && (
                      <div className="text-sm text-gray-700">
                        <strong>📅 Pickup Date:</strong>{" "}
                        {(() => {
                          try {
                            if (!order.pickupDate) return "Not specified";
                            const date = new Date(order.pickupDate);
                            if (isNaN(date.getTime())) return "Invalid date";
                            return date.toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            });
                          } catch (error) {
                            return "Date unavailable";
                          }
                        })()}
                      </div>
                    )}
                    {order.pickupTime && (
                      <div className="text-sm text-gray-700">
                        <strong>🕐 Time Slot:</strong> {order.pickupTime}
                      </div>
                    )}
                    {!order.pickupDate && !order.pickupTime && (
                      <div className="text-sm text-gray-500 italic">
                        Pickup date/time not specified
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-blue-700 ml-6 bg-blue-50 p-3 rounded">
                    <strong>📍 Gokul Wholesale, Inc</strong>
                    <br />
                    <span className="text-sm text-gray-600">
                      1141 W Bryn Mawr Ave
                      <br />
                      Itasca, IL 60143
                      <br />
                      (630) 540-9910
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <Truck className="h-4 w-4" />
                    <span className="font-medium">Delivery Service</span>
                  </div>
                  {order.deliveryDate && (
                    <div className="text-sm text-gray-700 ml-6">
                      <strong>Delivery Date:</strong>{" "}
                      {(() => {
                        try {
                          if (!order.deliveryDate) return "Not specified";
                          const date = new Date(order.deliveryDate);
                          if (isNaN(date.getTime())) return "Invalid date";
                          return date.toLocaleDateString();
                        } catch (error) {
                          return "Date unavailable";
                        }
                      })()}
                    </div>
                  )}
                  {order.deliveryTimeSlot && (
                    <div className="text-sm text-gray-700 ml-6">
                      <strong>Time Slot:</strong> {order.deliveryTimeSlot}
                    </div>
                  )}
                  {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
                    <div className="text-sm text-gray-700 ml-6">
                      <strong>Delivery Fee:</strong> $
                      {order.deliveryFee.toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              <div className="text-sm text-gray-600 mt-2">
                <strong>Created:</strong>{" "}
                {(() => {
                  try {
                    if (!order.createdAt) return "Date unavailable";
                    const date = new Date(order.createdAt);
                    if (!date || isNaN(date.getTime()))
                      return "Date unavailable";
                    return format(date, "MMM d, yyyy");
                  } catch (error) {
                    return "Date unavailable";
                  }
                })()}
              </div>
            </div>

            {/* Customer Information Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 border-b pb-2">
                Customer Information
              </h4>
              {order.user ? (
                <>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {order.user.firstName} {order.user.lastName}
                    </span>
                  </div>
                  {order.user.company && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {order.user.company}
                      </span>
                    </div>
                  )}
                  {order.user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {order.user.phone}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  Customer information not available
                </div>
              )}
            </div>

            {/* Loyalty Points Section - Moved here from sidebar */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 border-b pb-2">
                Loyalty Points
              </h4>
              <div className="text-center bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  +{order.loyaltyPointsEarned || 0}
                </div>
                <div className="text-sm text-gray-600">Points Earned</div>
                <div className="text-xs text-gray-500 mt-1">
                  2% of non-tobacco items
                  {order.loyaltyPointsEarned === 0 && (
                    <div className="text-xs text-orange-600 mt-1 font-medium">
                      No points: Order contains tobacco items only
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Address Section - Only show for delivery orders */}
            {order.orderType === "delivery" && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 border-b pb-2">
                  Delivery Address
                </h4>
                {order.deliveryAddress ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="font-medium">
                        {(() => {
                          // Handle different delivery address formats
                          if (typeof order.deliveryAddress === 'string') {
                            return order.deliveryAddress;
                          }
                          if (order.deliveryAddress.label) {
                            return order.deliveryAddress.label;
                          }
                          return "Delivery Address";
                        })()}
                      </span>
                    </div>
                    <div className="ml-6 text-sm text-gray-600 space-y-1">
                      {(() => {
                        // Handle different delivery address data structures
                        if (typeof order.deliveryAddress === 'string') {
                          return <div>{order.deliveryAddress}</div>;
                        }
                        
                        if (order.deliveryAddress.streetAddress) {
                          return (
                            <>
                              <div>{order.deliveryAddress.streetAddress}</div>
                              <div>
                                {order.deliveryAddress.city},{" "}
                                {order.deliveryAddress.state}{" "}
                                {order.deliveryAddress.zipCode}
                              </div>
                            </>
                          );
                        }
                        
                        // Fallback for other formats
                        return <div>{JSON.stringify(order.deliveryAddress)}</div>;
                      })()}
                    </div>
                    {order.deliveryAddress?.instructions && (
                      <div className="ml-6 bg-yellow-50 p-2 rounded text-sm">
                        <strong className="text-yellow-800">
                          Instructions:
                        </strong>
                        <p className="text-yellow-700 mt-1">
                          {order.deliveryAddress.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Delivery address not specified
                  </div>
                )}
              </div>
            )}
          </div>

          {order.notes && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-gray-600 text-sm font-medium">
                Order Notes:
              </span>
              <p className="text-sm bg-gray-50 p-3 rounded mt-2">
                {order.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items ({order.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {item.product?.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name || "Product"}
                          className="w-16 h-16 object-cover rounded-md border"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yOCAyNkMyOCAyNC44OTU0IDI4Ljg5NTQgMjQgMzAgMjRINDJDNDMuMTA0NiAyNCA0NCAyNC44OTU0IDQ0IDI2VjM4QzQ0IDM5LjEwNDYgNDMuMTA0NiA0MCA0MiA0MEgzMEMyOC44OTU0IDQwIDI4IDM5LjEwNDYgMjggMzhWMjZaIiBzdHJva2U9IiM5Q0E0QUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIzNCIgY3k9IjMwIiByPSIyIiBmaWxsPSIjOUNBNEFGIi8+CjxwYXRoIGQ9Ik0zNiAzNkwzOSAzM0w0MiAzNlYzOEg0MlYzOEMzOS44IDM4IDM3LjEgMzggMzQgMzhIMzBWMzZMMzMgMzNMMzYgMzZaIiBmaWxsPSIjOUNBNEFGIi8+Cjwvc3ZnPgo=";
                          }}
                        />
                      ) : (
                        // Placeholder image
                        <div className="w-16 h-16 bg-gray-200 rounded-md border flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Information */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {item.product?.name || "Unknown Item"}
                      </h4>

                      {/* Product Description */}
                      {item.product?.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {item.product.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Qty: {item.quantity}</span>
                        {item.product?.sku && (
                          <span>SKU: {item.product.sku}</span>
                        )}
                      </div>
                    </div>

                    {/* Price Information and Admin Controls */}
                    <div className="text-right flex-shrink-0">
                      {canManageOrders && editingItemId === item.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-1">
                            <Input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              className="w-20"
                              min="1"
                              step="1"
                            />
                            <span className="text-xs">qty</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">$</span>
                            <Input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-24"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              onClick={handleUpdateItem}
                              disabled={updateItemMutation.isPending}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setEditingItemId(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-lg text-gray-900">
                            ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600">
                            ${(item.price || 0).toFixed(2)} each
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-gray-500">
                              {item.quantity} × ${(item.price || 0).toFixed(2)}
                            </p>
                          )}
                          {canManageOrders && (
                            <div className="flex space-x-1 mt-2">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleStartEditItem(item)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary - New Calculation System */}
              <Separator className="my-4" />
              <div className="space-y-2">
                {/* Show detailed calculation breakdown if available */}
                {order.calculationBreakdown ? (
                  <>
                    {/* Items Subtotal */}
                    <div className="flex justify-between text-sm">
                      <span>Items Subtotal:</span>
                      <span>
                        ${order.calculationBreakdown.itemsSubtotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Flat Tax Lines */}
                    {order.calculationBreakdown.lines
                      ?.filter((line) => line.kind === "flatTax")
                      .map((line, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-sm text-purple-700"
                        >
                          <span>{line.label}</span>
                          <span>${line.amount.toFixed(2)}</span>
                        </div>
                      ))}

                    {/* Subtotal Before Delivery */}
                    {order.calculationBreakdown.flatTaxTotal > 0 && (
                      <div className="flex justify-between text-sm font-medium border-t pt-1">
                        <span>Subtotal (Items + Taxes):</span>
                        <span>
                          $
                          {order.calculationBreakdown.subtotalBeforeDelivery.toFixed(
                            2,
                          )}
                        </span>
                      </div>
                    )}

                    {/* Delivery Fee */}
                    {order.calculationBreakdown.deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Delivery Fee:</span>
                        <span>
                          ${order.calculationBreakdown.deliveryFee.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Loyalty Redemption */}
                    {order.calculationBreakdown.loyaltyRedeemValue > 0 && (
                      <div className="flex justify-between text-sm text-green-700">
                        <span>Loyalty Points Redeemed:</span>
                        <span>
                          -$
                          {order.calculationBreakdown.loyaltyRedeemValue.toFixed(
                            2,
                          )}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  // Fallback to legacy calculation display
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${(order.subtotal || 0).toFixed(2)}</span>
                    </div>

                    {/* Legacy flat tax breakdown */}
                    {order.flatTaxBreakdown
                      ?.filter((flatTax) => flatTax.amount > 0)
                      .map((flatTax, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-sm text-purple-700"
                        >
                          <span>{flatTax.name}</span>
                          <span>${(flatTax.amount || 0).toFixed(2)}</span>
                        </div>
                      ))}

                    {/* Delivery Fee */}
                    {order.deliveryFee && order.deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Delivery Fee:</span>
                        <span>${order.deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}

                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${(order.total || 0).toFixed(2)}</span>
                </div>

                {/* Loyalty Points Earned */}
                <div className="flex justify-between text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Loyalty Points Earned:
                  </span>
                  <span className="font-semibold">
                    {order.loyaltyPointsEarned || 0} points
                    {order.loyaltyPointsEarned === 0 && (
                      <span className="text-xs text-orange-600 ml-2 font-normal">
                        (tobacco items excluded)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Order Completion Section */}
        {canManageOrders && order.status !== "completed" && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  Complete Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="account_credit">Account Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {paymentMethod === "check" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Check Number</label>
                      <Input
                        value={checkNumber}
                        onChange={(e) => setCheckNumber(e.target.value)}
                        placeholder="Enter check number"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Notes</label>
                    <Input
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Optional payment notes"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleCompleteOrder}
                  disabled={completeOrderMutation.isPending || !paymentMethod}
                  className="w-full"
                >
                  {completeOrderMutation.isPending ? "Completing..." : "Complete Order"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Order Notes Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Order Communication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Notes */}
              {notesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : orderNotes.length > 0 ? (
                <div className="space-y-3">
                  {orderNotes.map((note) => (
                    <div
                      key={note.id}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm">{note.note}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              by{" "}
                              {note.displayName ||
                                note.userUsername ||
                                note.addedBy}{" "}
                              on{" "}
                              {(() => {
                                try {
                                  if (!note.createdAt)
                                    return "Date unavailable";
                                  const date = new Date(note.createdAt);
                                  if (isNaN(date.getTime()))
                                    return "Date unavailable";
                                  return format(date, "MMM d, yyyy h:mm a");
                                } catch (error) {
                                  return "Date unavailable";
                                }
                              })()}
                            </span>
                            {(note.isAdmin || note.isEmployee) && (
                              <Badge variant="secondary" className="text-xs">
                                {note.isAdmin ? "Admin" : "Staff"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {(user?.isAdmin || user?.isEmployee) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deleteNoteMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No notes yet. Add a note to communicate about this order.
                </p>
              )}

              {/* Add New Note */}
              <div className="border-t pt-4 space-y-3">
                <Textarea
                  placeholder="Add a note about this order..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  disabled={addNoteMutation.isPending}
                  className="min-h-[80px]"
                />

                {/* Notify Customer Checkbox (Admin/Staff only) */}
                {(user?.isAdmin || user?.isEmployee) && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notify-customer"
                      checked={notifyCustomer}
                      onCheckedChange={(checked) =>
                        setNotifyCustomer(!!checked)
                      }
                    />
                    <label
                      htmlFor="notify-customer"
                      className="text-sm text-gray-600"
                    >
                      Send notification to customer
                    </label>
                  </div>
                )}

                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {addNoteMutation.isPending ? "Adding Note..." : "Add Note"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Simplified for payment and additional info */}
        <div className="space-y-6">
          {/* Payment Information */}
          {order.paymentMethod && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Method:</span>
                    <span className="font-medium">{order.paymentMethod}</span>
                  </div>
                  {order.checkNumber && (
                    <div className="flex justify-between">
                      <span>Check #:</span>
                      <span className="font-medium">{order.checkNumber}</span>
                    </div>
                  )}
                  {order.paymentDate && (
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span className="font-medium">
                        {(() => {
                          try {
                            if (!order.paymentDate) return "Not specified";
                            const date = new Date(order.paymentDate);
                            if (isNaN(date.getTime())) return "Invalid date";
                            return date.toLocaleDateString();
                          } catch (error) {
                            return "Date unavailable";
                          }
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
