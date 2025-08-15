import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface CartNoticeProps {
  type: 'payment';
  onClose: () => void;
}

export const CartNotice: React.FC<CartNoticeProps> = ({ type, onClose }) => {
  // Payment notice styling
  const bgColor = 'bg-blue-50';
  const borderColor = 'border-blue-200';
  const textColor = 'text-blue-800';
  const hoverColor = 'hover:bg-blue-100';
  const buttonColor = 'text-blue-700';
  
  // Payment notice content
  const title = 'Payment Information';
  const message = 'This is only for order estimation. All payments will be made in person.';
  
  // Handle close with logging
  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`Closing ${type} notice`);
    onClose();
  };
  
  return (
    <div className={`relative mb-3 p-3 ${bgColor} border ${borderColor} rounded-md ${textColor} text-xs`}>
      <div className="pr-6">
        <p className="font-medium flex items-center gap-1 mb-1">
          <AlertTriangle size={14} />
          {title}
        </p>
        <p className="text-xs">{message}</p>
      </div>
      <button 
        type="button"
        onClick={handleClose}
        className={`absolute top-2 right-2 p-1 rounded-md ${hoverColor} ${buttonColor}`}
        aria-label={`Dismiss ${type} notice`}
      >
        <X size={14} />
      </button>
    </div>
  );
};