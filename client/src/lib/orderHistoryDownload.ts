// Utility functions for downloading order history

export interface OrderHistoryItem {
  id: number;
  createdAt: string;
  total: number;
  orderStatus: string;
  orderType: string;
  deliveryDate: string | null;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
}

export const downloadOrderHistoryCSV = (orders: OrderHistoryItem[], customerName: string) => {
  // Create CSV headers
  const headers = [
    'Order ID',
    'Date',
    'Status',
    'Type',
    'Delivery Date',
    'Total Amount',
    'Items',
    'Item Details'
  ];

  // Convert orders to CSV rows
  const csvRows = orders.map(order => {
    const orderDate = new Date(order.createdAt).toLocaleDateString();
    const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'N/A';
    const itemsList = order.items.map(item => `${item.productName} (${item.quantity})`).join('; ');
    const itemDetails = order.items.map(item => 
      `${item.productName}: ${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}`
    ).join('; ');

    return [
      order.id,
      orderDate,
      order.orderStatus,
      order.orderType,
      deliveryDate,
      `$${order.total.toFixed(2)}`,
      itemsList,
      itemDetails
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...csvRows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `order-history-${customerName}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadOrderHistoryPDF = async (orders: OrderHistoryItem[], customerName: string) => {
  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order History - ${customerName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-info { text-align: center; margin-bottom: 20px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .order-summary { margin-bottom: 30px; }
        .total-summary { margin-top: 20px; text-align: right; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Order History</h1>
        <h2>${customerName}</h2>
      </div>
      <div class="company-info">
        <p>Gokul Wholesale</p>
        <p>1141 W Bryn Mawr Ave, Itasca, IL 60143</p>
        <p>Phone: 630-540-9910</p>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
      </div>
      
      ${orders.map(order => `
        <div class="order-summary">
          <h3>Order #${order.id}</h3>
          <table>
            <tr>
              <td><strong>Date:</strong></td>
              <td>${new Date(order.createdAt).toLocaleDateString()}</td>
              <td><strong>Status:</strong></td>
              <td>${order.orderStatus}</td>
            </tr>
            <tr>
              <td><strong>Type:</strong></td>
              <td>${order.orderType}</td>
              <td><strong>Delivery Date:</strong></td>
              <td>${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'N/A'}</td>
            </tr>
          </table>
          
          <h4>Items:</h4>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-summary">
            <strong>Order Total: $${order.total.toFixed(2)}</strong>
          </div>
        </div>
      `).join('')}
      
      <div class="total-summary">
        <h3>Summary</h3>
        <p>Total Orders: ${orders.length}</p>
        <p>Total Amount: $${orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}</p>
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
};