import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 'medium', className = '', showText = true }: LogoProps) {
  const sizes = {
    small: {
      container: 'h-8',
      image: 'h-8 w-8',
      text: 'text-base'
    },
    medium: {
      container: 'h-10',
      image: 'h-10 w-10',
      text: 'text-lg'
    },
    large: {
      container: 'h-12',
      image: 'h-12 w-12',
      text: 'text-xl'
    }
  };

  const selectedSize = sizes[size];

  return (
    <div className={`flex items-center ${selectedSize.container} ${className}`}>
      <div className="bg-white text-slate-900 px-3 py-1 rounded-md flex items-center space-x-2">
        <img 
          src="/images/gokul-header-logo.png" 
          alt="Gokul Wholesale Logo" 
          className={`${selectedSize.image} object-contain`}
        />
        {showText && (
          <h1 className={`${selectedSize.text} font-bold`}>Gokul Wholesale</h1>
        )}
      </div>
    </div>
  );
}