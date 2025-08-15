import React from 'react';

interface FloatingCartButtonProps {
  toggleCart: () => void;
  showAnimatedGuide?: boolean;
}

// This component has been disabled as requested
export function FloatingCartButton({ toggleCart, showAnimatedGuide = false }: FloatingCartButtonProps) {
  // Always return null to completely remove the floating cart button from the UI
  return null;
}

export default FloatingCartButton;