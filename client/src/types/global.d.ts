// Extend Window interface to include our custom functions
interface Window {
  refreshCart?: () => void;
  toggleCart?: () => void;
}

// Export nothing as this is a declaration file
export {};