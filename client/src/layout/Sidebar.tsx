import { useAuth } from "@/hooks/useAuth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Store, 
  ShoppingCart, 
  Truck, 
  UserCog, 
  LogOut,
  Settings,
  Download,
  SmartphoneIcon,
  MapPin
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUnifiedCart } from "@shared/function-registry";
// In-app notifications removed
import { MultiStepCheckoutPopup } from "@/components/cart/MultiStepCheckoutPopup";
import { useState, useEffect } from "react";

interface SidebarProps {
  customLogout?: () => void;
}

export function Sidebar({ customLogout }: SidebarProps = {}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  
  const { 
    cartItems, 
    itemCount: totalItems, 
    addToCart, 
    removeFromCart, 
    updateQuantity 
  } = useUnifiedCart();
  
  // Cart popup state (local to this component)
  const [isCartOpen, setIsCartOpen] = useState(false);
  const openCart = () => setIsCartOpen(true);
  
  // Check if the app can be installed
  useEffect(() => {
    // Check if this is an iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOSDevice(isIOS);

    // Check if the app is already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      // If already installed, don't show the install button
      return;
    }

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome from automatically showing the prompt
      e.preventDefault();
      // Save the event so it can be triggered later
      setInstallPrompt(e);
      // Update UI to show the install button
      setIsInstallable(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
    };
  }, []);
  
  // Handle install button click
  const handleInstallClick = () => {
    if (isIOSDevice) {
      // Show iOS-specific instructions
      setShowIOSInstructions(!showIOSInstructions);
    } else if (installPrompt) {
      // Show the install prompt
      installPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        // Clear the saved prompt since it can't be used again
        setInstallPrompt(null);
        setIsInstallable(false);
      });
    }
  };
  
  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 bg-white border-r border-slate-200 text-slate-900">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-center p-2">
          <div className="bg-primary text-white px-4 py-2 rounded-md flex items-center space-x-2">
            <img 
              src="/images/gokul-header-logo.png" 
              alt="Gokul Wholesale Logo" 
              className="h-10 w-10 object-contain"
            />
            <h1 className="text-lg font-bold">Gokul Wholesale</h1>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Main Navigation Section */}
        <div className="space-y-1 mb-4">
          <div className="w-full">
            <a href="/" className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/') ? 'text-white bg-primary' : 'text-slate-800 hover:bg-slate-100 hover:text-slate-900'}`}>
              <LayoutDashboard className="mr-3 h-5 w-5" />
              <span className="font-medium">Dashboard</span>
            </a>
          </div>
          
          <div className="w-full">
            <a href="/products" className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/products') ? 'text-white bg-primary' : 'text-slate-800 hover:bg-slate-100 hover:text-slate-900'}`}>
              <Store className="mr-3 h-5 w-5" />
              <span className="font-medium">Browse Products</span>
            </a>
          </div>
          
          <div className="w-full">
            <a href="/orders" className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/orders') ? 'text-white bg-primary' : 'text-slate-800 hover:bg-slate-100 hover:text-slate-900'}`}>
              <Truck className="mr-3 h-5 w-5" />
              <span className="font-medium">My Orders</span>
            </a>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="border-t border-slate-200 pt-4 mb-4">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 px-2">Quick Actions</h3>
          <div className="space-y-1">
            <div className="w-full">
              <a href="/account" className={`flex items-center p-2 rounded-lg transition-colors ${isActive('/account') ? 'text-white bg-primary' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}>
                <UserCog className="mr-3 h-4 w-4" />
                <span className="text-sm">Account Settings</span>
              </a>
            </div>
            
            <div className="w-full">
              <a href="/account/addresses" className={`flex items-center p-2 rounded-lg transition-colors ${isActive('/account/addresses') ? 'text-white bg-primary' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}>
                <MapPin className="mr-3 h-4 w-4" />
                <span className="text-sm">Delivery Addresses</span>
              </a>
            </div>
          </div>
        </div>
        
        {/* Enhanced Cart Button - Desktop */}
        <div className="w-full mt-3">
          <MultiStepCheckoutPopup />
        </div>
        
        {/* Admin link only visible for admin users */}
        {user?.isAdmin && (
          <div className="w-full mt-4">
            <a 
              href="/admin" 
              className={`flex items-center p-3 rounded-lg border-2 ${
                location.startsWith('/admin') 
                  ? 'text-white bg-red-600 border-red-400' 
                  : 'text-slate-800 bg-yellow-400 border-yellow-500 hover:bg-yellow-300 font-semibold'
              }`}
            >
              <Settings className="mr-3 h-5 w-5" />
              <span>Admin Dashboard</span>
            </a>
          </div>
        )}
        
        {/* Staff Dashboard links only visible for employee accounts */}
        {user?.isEmployee && (
          <div className="w-full mt-4">
            <a 
              href="/staff" 
              className={`flex items-center p-3 rounded-lg border-2 ${
                location === '/staff' 
                  ? 'text-white bg-green-700 border-green-500' 
                  : 'text-slate-800 bg-green-400 border-green-500 hover:bg-green-300 font-semibold'
              }`}
            >
              <LayoutDashboard className="mr-3 h-5 w-5" />
              <span>Staff Dashboard</span>
            </a>
          </div>
        )}
        
        {/* Install App Button - Always show */}
        <div className="w-full mt-5">
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center p-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <Download className="mr-3 h-5 w-5" />
            <span>Install App</span>
          </button>
          
          {showIOSInstructions && isIOSDevice && (
            <div className="mt-2 p-3 bg-slate-700 rounded-lg text-sm">
              <p className="font-medium mb-1 text-white">How to install:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Tap the share button <span className="px-1 py-0.5 bg-slate-600 rounded">⎙</span></li>
                <li>Scroll down to "Add to Home Screen"</li>
                <li>Tap "Add" in the top right</li>
              </ol>
            </div>
          )}
        </div>
      </nav>
      
      <div className="p-4 border-t border-slate-200">
        {isLoading ? (
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : user ? (
          <div className="bg-slate-100 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={user.profileImageUrl} alt={user.firstName || 'User'} />
                  <AvatarFallback>
                    {user.firstName ? user.firstName[0] : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm text-slate-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-slate-600 truncate max-w-[120px]" title={user.company || user.email}>{user.company || user.email}</p>
                  <p className="text-xs font-bold text-primary">{user.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Notification bell removed */}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>G</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">Guest User</p>
              <p className="text-xs text-slate-400">Not signed in</p>
            </div>
          </div>
        )}
        
        {user ? (
          <Button 
            variant="outline"
            className="mt-4 w-full flex items-center justify-center p-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
            onClick={() => {
              if (customLogout) {
                customLogout();
              } else {
                // Import the logout function from auth.ts
                import("@/lib/auth").then(({ logout }) => {
                  logout();
                });
              }
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        ) : (
          <a href="/login">
            <Button 
              variant="outline"
              className="mt-4 w-full flex items-center justify-center p-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign In</span>
            </Button>
          </a>
        )}
      </div>
    </aside>
  );
}