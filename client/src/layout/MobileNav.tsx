import { Menu, LogIn, LogOut, UserCog, ShoppingCart, Briefcase, Download, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { MobileMenu } from "./MobileMenu";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";
import { useUnifiedCart } from "@shared/function-registry";
// In-app notifications removed
import { BreadcrumbNavigation } from "@/components/navigation/BreadcrumbNavigation";
import { MultiStepCheckoutPopup } from "@/components/cart/MultiStepCheckoutPopup";

interface MobileNavProps {
  title?: string;
  customLogout?: () => void;
}

export function MobileNav({ title = "Gokul Wholesale", customLogout }: MobileNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  
  // Check if user is authenticated and check roles
  const { user } = useAuth();
  const { itemCount: totalCartItems } = useUnifiedCart();
  const isAuthenticated = !!user;
  const isAdmin = user?.isAdmin === true;
  const isEmployee = user?.isEmployee === true;
  const isStaff = isAdmin || isEmployee;
  
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
  
  const openMobileMenu = () => setIsMobileMenuOpen(true);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  
  // Enhanced cart popup is now handled by the MultiStepCheckoutPopup component

  return (
    <>
      <header className="md:hidden bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-500 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between p-3">
          <button 
            className="p-2 rounded-lg hover:bg-blue-500 text-white transition-colors"
            onClick={openMobileMenu}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex items-center flex-1 justify-center px-2">
            <a href="/" className="flex items-center space-x-2">
              <img 
                src="/images/gokul-header-logo.png" 
                alt="Gokul Wholesale Logo" 
                className="h-10 w-10 object-contain"
              />
              <h1 className="text-white font-bold text-base sm:text-lg truncate">Gokul Wholesale</h1>
            </a>
          </div>
          
          <div className="flex items-center space-x-1">
            {isAuthenticated && (
              <div className="enhanced-cart-header">
                <MultiStepCheckoutPopup />
              </div>
            )}
            {/* Notification bell removed */}
            
            {!isAuthenticated ? (
              <a href="/login" className="inline-block">
                <Button size="sm" className="bg-white text-blue-600 hover:bg-blue-50 border-0 font-medium">
                  <LogIn className="h-4 w-4 mr-1" />
                  Login
                </Button>
              </a>
            ) : (
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-white hover:bg-blue-500 border-white/20 ml-2" 
                onClick={() => customLogout ? customLogout() : logout()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Show dashboard shortcuts for admin and staff */}
        {isAuthenticated && (isAdmin || isEmployee) && (
          <div className="px-3 pb-3 bg-blue-50 border-t border-blue-200">
            <div className="flex flex-wrap gap-2 justify-center">
              {isAdmin && (
                <a 
                  href="/admin" 
                  className="inline-flex items-center px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 text-sm font-medium rounded-lg shadow-sm transition-colors"
                >
                  <UserCog className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </a>
              )}
              {isEmployee && (
                <a 
                  href="/staff" 
                  className="inline-flex items-center px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Staff Dashboard
                </a>
              )}
            </div>
          </div>
        )}
      </header>
      
      <MobileMenu isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Enhanced Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-gray-200 shadow-lg">
        <div className="grid h-full max-w-lg grid-cols-5 mx-auto">
          <a href="/" className={`inline-flex flex-col items-center justify-center px-2 transition-colors ${location === '/' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>
            <LayoutDashboardIcon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </a>
          
          <a href="/products" className={`inline-flex flex-col items-center justify-center px-2 transition-colors ${location === '/products' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>
            <StoreIcon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Shop</span>
          </a>
          
          {/* Enhanced Cart Button */}
          {isAuthenticated ? (
            <div className="inline-flex flex-col items-center justify-center px-2 hover:bg-amber-50 relative transition-colors">
              <MultiStepCheckoutPopup />
            </div>
          ) : (
            <div className="inline-flex flex-col items-center justify-center px-3 opacity-50">
              <ShoppingCart className="w-5 h-5 mb-1 text-gray-300" />
              <span className="text-xs text-gray-300">Cart</span>
            </div>
          )}
          
          {isAuthenticated ? (
            <a href="/orders" className={`inline-flex flex-col items-center justify-center px-2 transition-colors ${location === '/orders' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>
              <TruckIcon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Orders</span>
            </a>
          ) : (
            <div className="inline-flex flex-col items-center justify-center px-2 opacity-50">
              <TruckIcon className="w-5 h-5 mb-1 text-gray-300" />
              <span className="text-xs text-gray-300">Orders</span>
            </div>
          )}
          
          {/* Install App Button if available, otherwise Account/Login */}
          {(isInstallable || isIOSDevice) ? (
            <button 
              onClick={handleInstallClick}
              className="inline-flex flex-col items-center justify-center px-3 hover:bg-gray-50"
            >
              <Download className="w-5 h-5 mb-1 text-blue-500" />
              <span className="text-xs text-blue-500 font-medium">Install</span>
            </button>
          ) : isAuthenticated ? (
            <button 
              onClick={() => logout()}
              className="inline-flex flex-col items-center justify-center px-3 hover:bg-gray-50"
            >
              <LogOutIcon className="w-5 h-5 mb-1 text-red-500" />
              <span className="text-xs text-red-500 font-medium">Logout</span>
            </button>
          ) : (
            <a href="/login" className="inline-flex flex-col items-center justify-center px-3 hover:bg-gray-50">
              <LoginIcon className="w-5 h-5 mb-1 text-blue-500" />
              <span className="text-xs text-blue-500 font-medium">Login</span>
            </a>
          )}
        </div>
      </div>
      
      {/* iOS Installation Instructions */}
      {showIOSInstructions && isIOSDevice && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200 z-50">
          <div className="bg-blue-50 p-3 rounded-lg shadow-md">
            <h4 className="font-bold text-blue-900 mb-2">How to Install:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Tap the share button <span className="px-1 py-0.5 bg-gray-200 rounded">⎙</span> in Safari</li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" in the top right corner</li>
            </ol>
            <button 
              onClick={() => setShowIOSInstructions(false)}
              className="mt-3 w-full py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Define simplified icons for the mobile nav to reduce bundle size
function LayoutDashboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function StoreIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 3h19.5" />
      <path d="M5.75 3v16.5c0 .83.67 1.5 1.5 1.5h9.5c.83 0 1.5-.67 1.5-1.5V3" />
      <path d="M9.75 14h4.5" />
      <path d="M9.75 3v5.17c0 .53.21 1.04.59 1.42l.82.82c.38.38.59.89.59 1.42V14" />
      <path d="M14.25 3v5.17c0 .53-.21 1.04-.59 1.42l-.82.82c-.38.38-.59.89-.59 1.42V14" />
    </svg>
  );
}

/* ShoppingCart icon already imported at the top */

function TruckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 17h4V5H2v12h3" />
      <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
      <path d="M14 17h1" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function UserCogIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <circle cx="19" cy="11" r="2" />
      <path d="M19 8v1" />
      <path d="M19 13v1" />
      <path d="M16.6 9.5l.9.5" />
      <path d="M16.6 12.5l.9-.5" />
      <path d="M21.4 9.5l-.9.5" />
      <path d="M21.4 12.5l-.9-.5" />
    </svg>
  );
}

function LoginIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function LogOutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
