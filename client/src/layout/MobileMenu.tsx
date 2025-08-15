import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Store, 
  ShoppingCart, 
  Truck, 
  UserCog, 
  LogOut, 
  X,
  Settings,
  MapPin,
  Download
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSimpleCart } from "@/hooks/simpleCart";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Get cart data for the navigation badge
  const { totalItems } = useSimpleCart();
  
  // Install app state
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // PWA install functionality
  useEffect(() => {
    // Check if this is an iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOSDevice(isIOS);

    // Always show install button for mobile devices (iOS or Android) - don't hide based on standalone mode
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile || isIOS) {
      setIsInstallable(true);
      console.log('Mobile device detected, showing install button');
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOSDevice) {
      setShowIOSInstructions(true);
    } else if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setInstallPrompt(null);
      setIsInstallable(false);
    }
  };
  
  const isActive = (path: string) => {
    return location === path;
  };



  // Close the menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Close the menu when navigating to a different page
  const handleLinkClick = () => {
    onClose();
  };
  


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 z-20">
      <div 
        ref={menuRef}
        className="bg-white h-full w-3/4 max-w-xs flex flex-col transform transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold font-heading">Menu</h2>
          <button 
            className="p-1 rounded-lg hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="border-b border-slate-200 p-4">
          {isLoading ? (
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={user.profileImageUrl} alt={user.firstName || 'User'} />
                <AvatarFallback>
                  {user.firstName ? user.firstName[0] : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-500">{user.company || user.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>G</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">Guest User</p>
                <p className="text-xs text-slate-500">Not signed in</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-2">
            {/* Main Navigation */}
            <div className="w-full">
              <a 
                href="/"
                className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/') ? 'bg-primary text-white' : 'text-slate-900 hover:bg-slate-100'}`}
                onClick={handleLinkClick}
              >
                <LayoutDashboard className="mr-3 h-5 w-5" />
                <span className="font-medium">Dashboard</span>
              </a>
            </div>
          
            <div className="w-full">
              <a 
                href="/products"
                className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/products') ? 'bg-primary text-white' : 'text-slate-900 hover:bg-slate-100'}`}
                onClick={handleLinkClick}
              >
                <Store className="mr-3 h-5 w-5" />
                <span className="font-medium">Browse Products</span>
              </a>
            </div>
            
            <div className="w-full">
              <a 
                href="/orders"
                className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/orders') ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                onClick={handleLinkClick}
              >
                <Truck className="mr-3 h-5 w-5" />
                <span className="font-medium">My Orders</span>
              </a>
            </div>
            
            <div className="w-full">
              <a 
                href="/account-settings"
                className={`flex items-center p-3 rounded-lg transition-colors ${isActive('/account-settings') ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                onClick={handleLinkClick}
              >
                <Settings className="mr-3 h-5 w-5" />
                <span className="font-medium">Account Settings</span>
              </a>
            </div>

            {/* Quick Actions Section */}
            <div className="border-t border-slate-200 pt-4 mt-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h3>
              
              <div className="w-full">
                <a 
                  href="/account"
                  className={`flex items-center p-2 rounded-lg transition-colors ${isActive('/account') ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  onClick={handleLinkClick}
                >
                  <UserCog className="mr-3 h-4 w-4" />
                  <span className="text-sm">Account Settings</span>
                </a>
              </div>
              
              <div className="w-full">
                <a 
                  href="/account/addresses"
                  className={`flex items-center p-2 rounded-lg transition-colors ${isActive('/account/addresses') ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  onClick={handleLinkClick}
                >
                  <MapPin className="mr-3 h-4 w-4" />
                  <span className="text-sm">Delivery Addresses</span>
                </a>
              </div>
              
              <div className="w-full">
                <a 
                  href="/cart"
                  className={`flex items-center p-2 rounded-lg transition-colors ${isActive('/cart') ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  onClick={handleLinkClick}
                >
                  <ShoppingCart className="mr-3 h-4 w-4" />
                  <span className="flex items-center gap-2 text-sm">
                    Cart 
                    {totalItems > 0 && (
                      <span className="inline-flex items-center justify-center bg-primary text-white text-xs font-medium rounded-full w-4 h-4">
                        {totalItems}
                      </span>
                    )}
                  </span>
                </a>
              </div>

              {/* Install App Button */}
              {(isInstallable || isIOSDevice) && (
                <div className="w-full">
                  <button 
                    onClick={handleInstallClick}
                    className="flex items-center p-2 rounded-lg transition-colors text-slate-700 hover:bg-slate-100 w-full text-left"
                  >
                    <Download className="mr-3 h-4 w-4" />
                    <span className="text-sm">Install App</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Admin/Staff Dashboard */}
            {user?.isAdmin && (
              <div className="w-full mt-4">
                <a 
                  href="/admin/products"
                  className={`flex items-center p-2 rounded-lg ${isActive('/admin/products') ? 'bg-primary text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                  onClick={handleLinkClick}
                >
                  <Settings className="mr-3 h-4 w-4" />
                  <span className="text-sm font-medium">Admin Dashboard</span>
                </a>
              </div>
            )}
            
            {user?.isEmployee && !user?.isAdmin && (
              <div className="w-full mt-4">
                <a 
                  href="/staff"
                  className={`flex items-center p-2 rounded-lg ${isActive('/staff') ? 'bg-primary text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                  onClick={handleLinkClick}
                >
                  <Settings className="mr-3 h-4 w-4" />
                  <span className="text-sm font-medium">Staff Dashboard</span>
                </a>
              </div>
            )}
          </nav>
        </div>
        
        {/* Fixed bottom section */}
        <div className="border-t border-slate-200 p-4 bg-white shrink-0">
          {user && (
            <div className="mb-3 p-2 rounded-lg bg-slate-800 text-white">
              <div className="text-sm font-medium">Logged in as:</div>
              <div className="text-sm font-bold">{user.company || 'Customer'}</div>
              <div className="text-xs text-slate-300">{user.username}</div>
            </div>
          )}
          

          
          <a href={user ? "/api/logout" : "/login"}>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center p-3 text-sm rounded-lg"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{user ? "Sign Out" : "Sign In"}</span>
            </Button>
          </a>
        </div>
      </div>
      
      {/* Install Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Install Gokul Wholesale</h3>
            
            {/* iOS Instructions */}
            <div className="space-y-3 mb-6">
              <h4 className="font-semibold text-blue-600">📱 For iPhone/iPad (iOS):</h4>
              <p className="text-sm text-gray-600">
                To install this app on your iPhone or iPad:
              </p>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>Open this website in Safari browser</li>
                <li>Tap the share button <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">□↗</span> at the bottom</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" to install the app</li>
              </ol>
            </div>

            {/* Android Instructions */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-green-600">📱 For Android/Samsung:</h4>
              <p className="text-sm text-gray-600">
                To install this app on your Android device:
              </p>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>Open this website in Chrome browser</li>
                <li>Tap the menu button <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">⋮</span> (three dots)</li>
                <li>Tap "Add to Home Screen" or "Install App"</li>
                <li>Tap "Add" or "Install" to confirm</li>
              </ol>
              <p className="text-xs text-gray-500 mt-2">
                Note: Some Samsung browsers may show "Add to Home Screen" directly in the address bar
              </p>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                onClick={() => setShowIOSInstructions(false)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
