import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

interface AgeVerificationProps {
  onVerified: () => void;
  onDeclined: () => void;
}

export default function AgeVerification({ onVerified, onDeclined }: AgeVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerification = (isOver21: boolean) => {
    setIsVerifying(true);
    
    // Add a small delay for better UX
    setTimeout(() => {
      if (isOver21) {
        // Store verification in localStorage for session
        localStorage.setItem('ageVerified', 'true');
        localStorage.setItem('ageVerifiedTimestamp', Date.now().toString());
        onVerified();
      } else {
        onDeclined();
      }
      setIsVerifying(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-bold">Age Verification Required</CardTitle>
          <CardDescription className="text-sm text-gray-600">
            You must be 21 years or older to view our product catalog
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 mb-1">Important Notice</p>
                <p className="text-amber-700">
                  By continuing, you confirm that you are at least 21 years of age and legally 
                  able to view wholesale product information in your jurisdiction.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-center">
              <Calendar className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-4">
                Are you 21 years of age or older?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => handleVerification(true)}
                disabled={isVerifying}
                className="w-full h-12 text-base font-medium"
                size="lg"
              >
                {isVerifying ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Yes, I am 21 or older</span>
                  </div>
                )}
              </Button>

              <Button
                onClick={() => handleVerification(false)}
                disabled={isVerifying}
                variant="outline"
                className="w-full h-12 text-base font-medium border-red-200 text-red-700 hover:bg-red-50"
                size="lg"
              >
                <div className="flex items-center space-x-2">
                  <X className="h-5 w-5" />
                  <span>No, I am under 21</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <Badge variant="secondary" className="text-xs">
                Privacy Protected
              </Badge>
              <span>•</span>
              <span>Your age is not stored or tracked</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}