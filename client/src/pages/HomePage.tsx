import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ShoppingBag, 
  Eye, 
  LogIn, 
  Package, 
  Users, 
  Award,
  ArrowRight,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Store,
  Info
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-0 sm:h-16">
            {/* Logo and Business Name */}
            <div className="flex items-center justify-center sm:justify-start mb-3 sm:mb-0">
              <img 
                src="/gokul-logo.png" 
                alt="Gokul Wholesale Logo" 
                className="h-10 w-10 object-contain"
              />
              <div className="ml-2">
                <div className="text-xl font-bold text-gray-900">Gokul Wholesale</div>
                <div className="text-xs text-blue-600 font-medium">Since 2009 • 16 Years in Business</div>
              </div>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex items-center justify-center space-x-2 sm:space-x-4">
              {isLoggedIn ? (
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard">
                    <Eye className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial">
                    <Link href="/catalog">
                      <Package className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">View Our </span>Catalog
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 sm:flex-initial">
                    <Link href="/login">
                      <LogIn className="h-4 w-4 mr-1 sm:mr-2" />
                      Login
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">Welcome to Gokul Wholesale</h1>
            <p className="text-xl text-blue-100 mb-4 max-w-3xl mx-auto">
              Your trusted partner for quality wholesale products. We provide businesses with 
              reliable supply chains, competitive pricing, and exceptional service.
            </p>
            <div className="text-lg text-blue-200 mb-8 font-medium">
              Proudly serving businesses since 2009 • 16 years of wholesale expertise
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                <Link href="/catalog">
                  <Package className="h-5 w-5 mr-2" />
                  View Our Catalog
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              {!isLoggedIn && (
                <>
                  <Button asChild size="lg" variant="outline" className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-blue-600 transition-colors">
                    <Link href="/login">
                      <LogIn className="h-5 w-5 mr-2" />
                      Login for Pricing
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-blue-600 transition-colors">
                    <Link href="/create-account">
                      <Users className="h-5 w-5 mr-2" />
                      Create Account
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Gokul Wholesale?</h2>
            <p className="text-lg text-gray-600">We're committed to providing the best wholesale experience</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader className="text-center">
                <Package className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Quality Products</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Carefully curated selection of high-quality wholesale products from trusted suppliers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Dedicated Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Our experienced team is here to help you find the right products for your business needs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Award className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Competitive Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  Tier-based pricing system that rewards loyal customers with better rates and exclusive deals.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">What We Offer</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Extensive Product Range</h3>
                    <p className="text-gray-600">Browse thousands of products across multiple categories</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Flexible Ordering</h3>
                    <p className="text-gray-600">Order management system with delivery scheduling</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Account Management</h3>
                    <p className="text-gray-600">Track orders, manage addresses, and view order history</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Credit Terms Available</h3>
                    <p className="text-gray-600">Flexible payment options for qualified business customers</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:text-center">
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-center text-blue-900">Ready to Get Started?</CardTitle>
                  <CardDescription className="text-center">
                    Explore our product catalog and discover wholesale opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Button asChild className="w-full" size="lg">
                      <Link href="/catalog">
                        <Package className="h-5 w-5 mr-2" />
                        Browse Products
                      </Link>
                    </Button>
                    {!isLoggedIn && (
                      <Button asChild variant="outline" className="w-full" size="lg">
                        <Link href="/login">
                          <LogIn className="h-5 w-5 mr-2" />
                          Login for Pricing
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-lg text-gray-600">Have questions? We're here to help</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Phone className="h-8 w-8 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600">Call us for immediate assistance</p>
              <p className="text-blue-600 font-medium">630-540-9910</p>
            </div>
            
            <div className="text-center">
              <Mail className="h-8 w-8 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">Send us your questions anytime</p>
              <p className="text-blue-600 font-medium">sales@gokulwholesaleinc.com</p>
            </div>
            
            <div className="text-center">
              <MapPin className="h-8 w-8 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
              <p className="text-gray-600">Visit our warehouse</p>
              <p className="text-blue-600 font-medium">1141 W Bryn Mawr Ave<br />Itasca, IL 60143</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img 
                src="/gokul-logo.png" 
                alt="Gokul Wholesale Logo" 
                className="h-8 w-8 object-contain"
              />
              <span className="ml-2 text-lg font-bold">Gokul Wholesale</span>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
              <Link href="/catalog" className="text-gray-300 hover:text-white transition-colors">
                Product Catalog
              </Link>
              <Link href="/login" className="text-gray-300 hover:text-white transition-colors">
                Customer Login
              </Link>
              <Link href="/instore" className="text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center justify-center sm:justify-start">
                <Store className="h-4 w-4 mr-1" />
                Staff Login
              </Link>
              <a href="https://www.gokulwholesale.com/about-us" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors flex items-center justify-center sm:justify-start">
                <Info className="h-4 w-4 mr-1" />
                About Us
              </a>
              <Link href="/privacy-policy" className="text-gray-300 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/unsubscribe" className="text-red-400 hover:text-red-300 transition-colors font-medium">
                ✉️ Unsubscribe from Emails
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 pt-6 text-center text-gray-400">
            <p>&copy; 2024 Gokul Wholesale. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}