import React from 'react';

interface OfflineReceiptProps {
  sale: {
    ticketId?: string;
    invoice?: {
      invoice_no?: number;
      id?: string;
    };
    total: number;
    items: Array<{
      productName: string;
      quantity: number;
      price: number;
    }>;
    customerName?: string;
    paymentMethod?: string;
    createdAt?: Date;
  };
}

export function OfflineReceipt({ sale }: OfflineReceiptProps) {
  const displayNumber = sale.invoice?.invoice_no 
    ? `Invoice #${sale.invoice.invoice_no}` 
    : sale.ticketId 
    ? `Ticket ${sale.ticketId}` 
    : 'Ticket TBD';

  const isOfflineTicket = !sale.invoice?.invoice_no;

  return (
    <div className="max-w-sm mx-auto bg-white p-4 text-sm font-mono">
      {/* Header */}
      <div className="text-center border-b pb-2 mb-2">
        <h1 className="font-bold">GOKUL WHOLESALE</h1>
        <p className="text-xs">1141 W Bryn Mawr Ave</p>
        <p className="text-xs">Itasca, IL 60143</p>
        <p className="text-xs">Phone: (630) 540-9910</p>
      </div>

      {/* Transaction Info */}
      <div className="mb-2">
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{(sale.createdAt || new Date()).toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Receipt:</span>
          <span>{displayNumber}</span>
        </div>
        {sale.customerName && (
          <div className="flex justify-between">
            <span>Customer:</span>
            <span>{sale.customerName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Payment:</span>
          <span>{sale.paymentMethod || 'Cash'}</span>
        </div>
      </div>

      {/* Items */}
      <div className="border-t border-b py-2 mb-2">
        {sale.items.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between">
              <span className="truncate flex-1 mr-2">{item.productName}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-600 ml-2">
              {item.quantity} x ${item.price.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mb-2">
        <div className="flex justify-between font-bold text-lg">
          <span>TOTAL:</span>
          <span>${sale.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Offline Notice */}
      {isOfflineTicket && (
        <div className="border-t pt-2 text-center">
          <p className="text-xs text-orange-600 font-bold">
            ⚠️ PROVISIONAL TICKET
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Official invoice number will be assigned upon sync.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-4">
        <p>Thank you for your business!</p>
        <p>Return Policy: 30 Days with Receipt</p>
      </div>
    </div>
  );
}