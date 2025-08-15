import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, LogIn, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900">Page Not Found</h1>
          </div>

          <p className="mt-4 text-gray-600">
            Sorry, the page you are looking for could not be found. Please use the links below to navigate to a valid page.
          </p>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <Button variant="default" className="w-full flex items-center" asChild>
            <a href="/">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </a>
          </Button>
          
          <Button variant="outline" className="w-full flex items-center" asChild>
            <a href="/products">
              <Store className="mr-2 h-4 w-4" />
              Browse Products
            </a>
          </Button>
          
          {!isAuthenticated && (
            <Button variant="outline" className="w-full flex items-center" asChild>
              <a href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </a>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
