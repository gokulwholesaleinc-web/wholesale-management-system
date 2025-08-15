import { ReactNode, useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Helmet } from "react-helmet";

// Import cart sidebar only on client-side
const CartSidebarWrapper = () => {
  const [CartSidebar, setCartSidebar] = useState<any>(null);

  useEffect(() => {
    // Import the cart sidebar component dynamically to avoid SSR issues
    import("@/components/cart/CartSidebar").then((module) => {
      setCartSidebar(() => module.CartSidebar);
    }).catch((err) => {
      console.error("Failed to load CartSidebar:", err);
    });
  }, []);

  if (!CartSidebar) {
    return null;
  }

  try {
    return <CartSidebar />;
  } catch (error) {
    console.error("Error rendering CartSidebar:", error);
    return null;
  }
};

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  customLogout?: () => void;
}

export function AppLayout({
  children,
  title = "Wholesale Products",
  description = "Wholesale products for your business",
  customLogout,
}: AppLayoutProps) {
  const fullTitle = title === "Wholesale Products" ? "Gokul Wholesale" : `${title} | Gokul Wholesale`;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Helmet>
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
      </Helmet>
      
      {/* Sidebar - Desktop */}
      <Sidebar customLogout={customLogout} />
      
      {/* Mobile Header */}
      <MobileNav title={title} customLogout={customLogout} />
      
      {/* Main Content - Extra padding added for mobile */}
      <main className="flex-1 md:ml-64 min-h-screen pb-32 md:pb-0 pt-32 md:pt-0">
        <div className="container mx-auto p-4 md:p-6">
          {children}
        </div>
        
        {/* Footer with contact information */}
        <footer className="bg-gray-100 border-t mt-10">
          <div className="container mx-auto p-6">
            <div className="md:flex md:justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-lg font-bold text-gray-900">Gokul Wholesale</h2>
                <p className="text-gray-700 mt-2 max-w-md">Your trusted wholesale supplier for convenience stores, gas stations, and small business needs.</p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase">Contact Us</h3>
                <ul className="mt-2">
                  <li className="text-gray-600 mb-2">
                    <span className="font-medium">Address:</span> 1141 W Bryn Mawr Ave, Itasca, IL 60143
                  </li>
                  <li className="text-gray-600 mb-2">
                    <span className="font-medium">Phone:</span> (630) 540-9910
                  </li>
                  <li className="text-gray-600 mb-2">
                    <span className="font-medium">Hours:</span> Monday-Friday: 9am-6pm, Saturday: 10am-4pm
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-6 border-t border-gray-200 pt-4 text-center text-sm text-gray-500">
              © {new Date().getFullYear()} Gokul Wholesale. All rights reserved.
            </div>
          </div>
        </footer>
        
        {/* Extra spacer only visible on mobile */}
        <div className="h-20 md:hidden"></div>
      </main>

      {/* Cart Sidebar with error handling */}
      <CartSidebarWrapper />
    </div>
  );
}
