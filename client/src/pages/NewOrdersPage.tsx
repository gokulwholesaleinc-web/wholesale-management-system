import React, { useState } from 'react';
import { NewOrderList } from '../components/orders/NewOrderList';
import { NewOrderDetail } from '../components/orders/NewOrderDetail';
import { NewOrdersNavigation } from '../components/orders/NewOrdersNavigation';

export default function NewOrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-6">
      <NewOrdersNavigation />
      
      {selectedOrderId ? (
        <NewOrderDetail 
          orderId={selectedOrderId}
          onBack={() => setSelectedOrderId(null)}
        />
      ) : (
        <NewOrderList />
      )}
    </div>
  );
}