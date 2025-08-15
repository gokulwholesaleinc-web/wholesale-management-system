import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if this is an iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOSDevice(isIOS);

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setInstallPrompt(e);
      // Update UI to show the install button
      setIsInstallable(true);
    });

    // Listen for the appinstalled event
    window.addEventListener('appinstalled', () => {
      // Log app install to analytics
      console.log('App was installed');
      // Hide the install button
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

  const handleInstallClick = () => {
    if (isIOSDevice) {
      // Show iOS-specific instructions
      setShowIOSInstructions(true);
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

  // Show install button if installable or iOS device
  if (!isInstallable && !isIOSDevice) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleInstallClick}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        size="sm"
      >
        <Download className="h-4 w-4 mr-2" />
        Install App
      </Button>
      
      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Install Gokul Wholesale</h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                To install this app on your iPhone or iPad:
              </p>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>Tap the share button <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">□↗</span> in Safari</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" to install the app</li>
              </ol>
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