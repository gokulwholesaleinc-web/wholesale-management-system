import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface HotkeyHandlerProps {
  onNewSale: () => void;
  onVoidTransaction: () => void;
  onOpenDrawer: () => void;
  onManagerOverride: () => void;
  onCustomerLookup: () => void;
  onProductLookup: () => void;
  onPayment: (method: 'cash' | 'credit' | 'debit') => void;
  enabled: boolean;
}

export default function HotkeyHandler({
  onNewSale,
  onVoidTransaction,
  onOpenDrawer,
  onManagerOverride,
  onCustomerLookup,
  onProductLookup,
  onPayment,
  enabled
}: HotkeyHandlerProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const { key, ctrlKey, altKey, shiftKey } = event;

      // Function keys (F1-F12)
      if (key.startsWith('F') && key.length >= 2) {
        event.preventDefault();
        
        switch (key) {
          case 'F1':
            onNewSale();
            showHotkeyToast('New Sale Started', 'F1');
            break;
          case 'F2':
            onVoidTransaction();
            showHotkeyToast('Void Transaction', 'F2');
            break;
          case 'F3':
            onCustomerLookup();
            showHotkeyToast('Customer Lookup', 'F3');
            break;
          case 'F4':
            onProductLookup();
            showHotkeyToast('Product Lookup', 'F4');
            break;
          case 'F5':
            onOpenDrawer();
            showHotkeyToast('Opening Cash Drawer', 'F5');
            break;
          case 'F9':
            onManagerOverride();
            showHotkeyToast('Manager Override', 'F9');
            break;
        }
        return;
      }

      // Ctrl + key combinations
      if (ctrlKey && !altKey && !shiftKey) {
        event.preventDefault();
        
        switch (key.toLowerCase()) {
          case 'n':
            onNewSale();
            showHotkeyToast('New Sale Started', 'Ctrl+N');
            break;
          case 'p':
            onPayment('cash');
            showHotkeyToast('Cash Payment', 'Ctrl+P');
            break;
          case 'c':
            onPayment('credit');
            showHotkeyToast('Credit Payment', 'Ctrl+C');
            break;
          case 'd':
            onPayment('debit');
            showHotkeyToast('Debit Payment', 'Ctrl+D');
            break;
        }
        return;
      }

      // Alt + key combinations
      if (altKey && !ctrlKey && !shiftKey) {
        event.preventDefault();
        
        switch (key.toLowerCase()) {
          case 'v':
            onVoidTransaction();
            showHotkeyToast('Void Transaction', 'Alt+V');
            break;
          case 'o':
            onOpenDrawer();
            showHotkeyToast('Opening Cash Drawer', 'Alt+O');
            break;
          case 'm':
            onManagerOverride();
            showHotkeyToast('Manager Override', 'Alt+M');
            break;
        }
        return;
      }

      // Number keys for quick actions
      if (!ctrlKey && !altKey && !shiftKey) {
        switch (key) {
          case 'Enter':
            // Focus on next input or complete current action
            break;
          case 'Escape':
            // Cancel current action
            showHotkeyToast('Action Cancelled', 'ESC');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onNewSale, onVoidTransaction, onOpenDrawer, onManagerOverride, onCustomerLookup, onProductLookup, onPayment]);

  const showHotkeyToast = (action: string, hotkey: string) => {
    toast({
      title: action,
      description: `Hotkey: ${hotkey}`,
      duration: 2000,
    });
  };

  // Show hotkey help on mount
  useEffect(() => {
    if (enabled) {
      toast({
        title: "Hotkeys Enabled",
        description: "Press F1 for help, F5 for cash drawer, F9 for manager override",
        duration: 4000,
      });
    }
  }, [enabled]);

  return null; // This component doesn't render anything
}

// Hotkey reference for display
export const HOTKEY_REFERENCE = {
  'F1': 'New Sale',
  'F2': 'Void Transaction',
  'F3': 'Customer Lookup',
  'F4': 'Product Lookup',
  'F5': 'Open Cash Drawer',
  'F9': 'Manager Override',
  'Ctrl+N': 'New Sale',
  'Ctrl+P': 'Cash Payment',
  'Ctrl+C': 'Credit Payment',
  'Ctrl+D': 'Debit Payment',
  'Alt+V': 'Void Transaction',
  'Alt+O': 'Open Cash Drawer',
  'Alt+M': 'Manager Override',
  'Enter': 'Confirm / Next',
  'ESC': 'Cancel'
};