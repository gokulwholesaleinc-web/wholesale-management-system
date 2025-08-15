import { Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Gokul Wholesale</h3>
            <div className="space-y-2 text-gray-300">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>1141 W Bryn Mawr Ave, Itasca, IL 60143</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>630-540-9910</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>sales@gokulwholesaleinc.com</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <a href="/catalog" className="block text-gray-300 hover:text-white transition-colors">
                Browse Products
              </a>
              <a href="/create-account" className="block text-gray-300 hover:text-white transition-colors">
                Create Account
              </a>
              <a href="/privacy-policy" className="block text-gray-300 hover:text-white transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>

          {/* Email Preferences */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Email Preferences</h3>
            <p className="text-gray-300 mb-3 text-sm">
              Don't want to receive marketing emails? You can unsubscribe anytime.
            </p>
            <a 
              href="/unsubscribe" 
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm"
            >
              <Mail className="h-4 w-4 mr-2" />
              Unsubscribe from Emails
            </a>
            <p className="text-xs text-gray-400 mt-2">
              No login required - just enter your email address
            </p>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Gokul Wholesale Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}