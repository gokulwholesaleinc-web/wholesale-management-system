import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink } from 'lucide-react';

export function DownloadAppBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  useEffect(() => {
    // Check if this is an iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOSDevice(isIOS);

    // Check if the app is already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check if the user has previously dismissed the banner
    const dismissedPWA = localStorage.getItem('pwa-banner-dismissed');
    
    // Only show the banner if:
    // 1. Not in standalone mode (not already installed)
    // 2. Not previously dismissed
    if (!isStandalone && !dismissedPWA) {
      // Show banner after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setInstallPrompt(e);
      
      // Show the banner if it's not already displayed
      if (!hasDismissed) {
        setIsVisible(true);
      }
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
    };
  }, [hasDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setHasDismissed(true);
    // Save dismissal in local storage
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  const handleInstall = () => {
    if (isIOSDevice) {
      // We can't automatically install on iOS, so just keep the banner open
      // with instructions
    } else if (installPrompt) {
      // Show the install prompt
      installPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          // Hide the banner after installing
          setIsVisible(false);
        } else {
          console.log('User dismissed the install prompt');
        }
        // Clear the saved prompt since it can't be used again
        setInstallPrompt(null);
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-3 bg-primary text-white shadow-lg z-50 animate-slideUp">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block p-2 bg-white bg-opacity-20 rounded-full">
            <Download className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold">Download Our App</h3>
            <p className="text-sm text-white text-opacity-90">
              {isIOSDevice 
                ? 'Install this app on your home screen for quick access'
                : 'Install for a better experience and offline access'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={handleInstall}
            className="whitespace-nowrap"
          >
            {isIOSDevice ? (
              <>
                <ExternalLink className="mr-1 h-4 w-4" />
                Add to Home Screen
              </>
            ) : (
              <>
                <Download className="mr-1 h-4 w-4" />
                Install App
              </>
            )}
          </Button>
          
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleDismiss}
            className="text-white hover:bg-white hover:bg-opacity-20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {isIOSDevice && (
        <div className="mt-2 p-2 bg-white bg-opacity-10 rounded text-sm">
          <p className="font-medium">How to install:</p>
          <ol className="list-decimal list-inside">
            <li>Tap the share button <span className="inline-block px-1">⎙</span> in your browser</li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" in the top right corner</li>
          </ol>
        </div>
      )}
    </div>
  );
}