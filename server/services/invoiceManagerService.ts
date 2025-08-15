import * as fs from 'fs';
import * as path from 'path';
import { DatabaseStorage } from '../storage';
import { Order, User } from '@shared/schema';

interface InvoiceSearchResult {
  orderId: number;
  invoiceNumber: string;
  customerName: string;
  customerCompany: string;
  totalAmount: number;
  orderDate: string;
  status: string;
  pdfPath: string;
  exists: boolean;
}

export class InvoiceManagerService {
  private invoicesDir: string;

  constructor(private storage: DatabaseStorage) {
    this.invoicesDir = path.join(process.cwd(), 'invoices');
    
    // Create invoices directory if it doesn't exist
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  // Calculate customer's previous balance for credit account orders
  async calculateCustomerBalance(customerId: string, currentOrderId: number): Promise<{
    previousBalance: number;
    currentBalance: number;
    creditLimit: number;
  }> {
    try {
      // Get customer's credit account
      const creditAccount = await this.storage.getCustomerCreditAccount(customerId);
      const creditLimit = creditAccount?.creditLimit || 0;
      const currentBalance = creditAccount?.currentBalance || 0;

      // Get all completed orders before this one for the customer
      const allOrders = await this.storage.getOrdersByUserId(customerId);
      const completedOrders = allOrders
        .filter(order => order.status === 'completed' && order.id !== currentOrderId)
        .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());

      // Calculate previous balance by summing "on account" orders
      let previousBalance = 0;
      for (const order of completedOrders) {
        if (order.paymentMethod === 'on_account' || order.paymentMethod === 'credit') {
          previousBalance += order.total || 0;
        }
      }

      return {
        previousBalance,
        currentBalance,
        creditLimit
      };
    } catch (error) {
      console.error('Error calculating customer balance:', error);
      return {
        previousBalance: 0,
        currentBalance: 0,
        creditLimit: 0
      };
    }
  }

  // Format customer address for PDF display
  private formatCustomerAddress(customer: any): string {
    if (!customer) return '';
    
    const addressParts = [];
    
    // Add address line 1
    if (customer.addressLine1) {
      addressParts.push(customer.addressLine1);
    }
    
    // Add address line 2 if exists
    if (customer.addressLine2) {
      addressParts.push(customer.addressLine2);
    }
    
    // Add city, state, postal code
    const cityStateZip = [customer.city, customer.state, customer.postalCode]
      .filter(Boolean)
      .join(' ');
    
    if (cityStateZip) {
      addressParts.push(cityStateZip);
    }
    
    return addressParts.join('\n');
  }

  async getAllInvoices(page: number = 1, limit: number = 50): Promise<{
    invoices: InvoiceSearchResult[];
    total: number;
    totalPages: number;
  }> {
    try {
      console.log('[Invoice Manager] Fetching all invoices, page:', page);
      
      const orders = await this.storage.getAllOrders();
      console.log('[Invoice Manager] Found orders:', orders.length, orders.map(o => ({ id: o.id, userId: o.userId, total: o.total })));
      
      const customers = await this.storage.getAllUsers();
      console.log('[Invoice Manager] Found customers:', customers.length, customers.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })));
      
      // Create customer lookup map
      const customerMap = new Map<string, User>();
      customers.forEach(customer => customerMap.set(customer.id, customer));

      // Process orders into invoice results
      const invoices: InvoiceSearchResult[] = orders.map(order => {
        const customer = customerMap.get(order.userId || '');
        const invoiceFileName = `invoice_${order.id}.pdf`;
        const pdfPath = path.join(this.invoicesDir, invoiceFileName);
        
        return {
          orderId: order.id || 0,
          invoiceNumber: `INV-${String(order.id).padStart(6, '0')}`,
          customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown Customer',
          customerCompany: customer?.company || customer?.businessName || '',
          totalAmount: order.total || 0,
          orderDate: new Date(order.createdAt || '').toISOString(),
          status: order.status || 'pending',
          pdfPath: `/api/admin/invoices/download/${order.id}`,
          exists: fs.existsSync(pdfPath)
        };
      });

      // Sort by order date (newest first)
      invoices.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

      console.log('[Invoice Manager] Processed invoices:', invoices.length, invoices);

      // Pagination
      const total = invoices.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedInvoices = invoices.slice(startIndex, startIndex + limit);

      console.log('[Invoice Manager] Final result:', { total, totalPages, paginatedCount: paginatedInvoices.length });

      return {
        invoices: paginatedInvoices,
        total,
        totalPages
      };
    } catch (error) {
      console.error('[Invoice Manager] Error fetching invoices:', error);
      throw new Error('Failed to fetch invoices');
    }
  }

  async searchInvoices(query: string): Promise<InvoiceSearchResult[]> {
    try {
      console.log('[Invoice Manager] Searching invoices with query:', query);
      
      const { invoices } = await this.getAllInvoices(1, 1000); // Get all for search
      
      // Search logic
      const searchTerm = query.toLowerCase().trim();
      const filteredInvoices = invoices.filter(invoice => {
        return (
          invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
          invoice.customerName.toLowerCase().includes(searchTerm) ||
          invoice.customerCompany.toLowerCase().includes(searchTerm) ||
          invoice.orderId.toString().includes(searchTerm) ||
          invoice.status.toLowerCase().includes(searchTerm) ||
          new Date(invoice.orderDate).toLocaleDateString().includes(searchTerm)
        );
      });

      console.log('[Invoice Manager] Found', filteredInvoices.length, 'matching invoices');
      return filteredInvoices;
    } catch (error) {
      console.error('[Invoice Manager] Error searching invoices:', error);
      throw new Error('Failed to search invoices');
    }
  }

  async getInvoicesByCustomer(customerId: string): Promise<InvoiceSearchResult[]> {
    try {
      console.log('[Invoice Manager] Fetching invoices for customer:', customerId);
      
      const orders = await this.storage.getOrdersByUserId(customerId);
      const customer = await this.storage.getUserById(customerId);
      
      const invoices: InvoiceSearchResult[] = orders.map(order => {
        const invoiceFileName = `invoice_${order.id}.pdf`;
        const pdfPath = path.join(this.invoicesDir, invoiceFileName);
        
        return {
          orderId: order.id || 0,
          invoiceNumber: `INV-${String(order.id).padStart(6, '0')}`,
          customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown Customer',
          customerCompany: customer?.company || customer?.businessName || '',
          totalAmount: order.totalAmount || order.total || 0,
          orderDate: new Date(order.createdAt || '').toISOString(),
          status: order.status || 'pending',
          pdfPath: `/api/admin/invoices/download/${order.id}`,
          exists: fs.existsSync(pdfPath)
        };
      });

      // Sort by order date (newest first)
      invoices.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

      return invoices;
    } catch (error) {
      console.error('[Invoice Manager] Error fetching customer invoices:', error);
      throw new Error('Failed to fetch customer invoices');
    }
  }

  async generateInvoicePDF(orderId: number): Promise<string> {
    try {
      console.log('[Invoice Manager] Generating PDF for order:', orderId);
      
      const order = await this.storage.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const customer = await this.storage.getUserById(order.userId || '');
      const orderItems = await this.storage.getOrderItems(orderId);

      // Calculate credit account balance for credit orders
      let creditAccountInfo = null;
      if (customer && (order.paymentMethod === 'on_account' || order.paymentMethod === 'credit')) {
        creditAccountInfo = await this.calculateCustomerBalance(customer.id, orderId);
      }

      // Calculate flat tax total (only flat taxes shown to users, not percentage taxes)
      const totalFlatTax = orderItems.reduce((sum, item) => sum + ((item.flatTaxAmount || 0) * item.quantity), 0);
      const itemsSubtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Generate PDF content with proper flat tax structure
      const invoiceContent = {
        invoiceNumber: `INV-${String(orderId).padStart(6, '0')}`,
        orderDate: new Date(order.createdAt || '').toLocaleDateString(),
        customer: {
          name: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : order.customerName,
          company: customer?.company || customer?.businessName || '',
          address: customer?.address || ''
        },
        items: orderItems.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price, // Base price (no percentage tax shown)
          total: item.quantity * item.price,
          flatTaxAmount: item.flatTaxAmount || 0, // Only flat tax shown to users
          flatTaxTotal: (item.flatTaxAmount || 0) * item.quantity
        })),
        subtotal: itemsSubtotal,
        totalFlatTax: totalFlatTax,
        deliveryFee: order.deliveryFee || 0,
        total: itemsSubtotal + totalFlatTax + (order.deliveryFee || 0),
        tobaccoTaxNotice: "45% IL Tobacco Tax Paid", // Percentage tax notice (backend calculation)
        creditAccountInfo: creditAccountInfo
      };

      // Use the consolidated receipt generator for all PDF generation
      const { receiptGenerator } = await import('./receiptGenerator');
      
      // Use the receipt generator's generateReceiptOnly method for consistency
      const result = await receiptGenerator.generateReceiptOnly(orderId);
      
      if (!result.success || !result.pdfBuffer) {
        throw new Error(result.message || 'Failed to generate PDF');
      }
      
      const pdfBuffer = result.pdfBuffer;
      
      // Save PDF file
      const invoiceFileName = `invoice_${orderId}.pdf`;
      const invoicePath = path.join(this.invoicesDir, invoiceFileName);
      fs.writeFileSync(invoicePath, pdfBuffer);
      
      // Also save JSON for reference
      fs.writeFileSync(invoicePath.replace('.pdf', '.json'), JSON.stringify(invoiceContent, null, 2));

      console.log(`✅ [Invoice Manager] PDF generated: ${invoicePath}`);
      return invoicePath;
    } catch (error) {
      console.error('[Invoice Manager] Error generating invoice PDF:', error);
      throw new Error('Failed to generate invoice PDF');
    }
  }

  async getInvoiceFilePath(orderId: number, forceRegenerate: boolean = false): Promise<string | null> {
    try {
      const invoiceFileName = `invoice_${orderId}.pdf`;
      const invoicePath = path.join(this.invoicesDir, invoiceFileName);
      
      // If force regenerate is true, delete existing file
      if (forceRegenerate && fs.existsSync(invoicePath)) {
        fs.unlinkSync(invoicePath);
        console.log(`[Invoice Manager] Force deleted cached invoice for order ${orderId}`);
      }
      
      if (fs.existsSync(invoicePath)) {
        return invoicePath;
      }

      // Check for JSON version (temporary)
      const jsonPath = invoicePath.replace('.pdf', '.json');
      if (fs.existsSync(jsonPath)) {
        return jsonPath;
      }

      return null;
    } catch (error) {
      console.error('[Invoice Manager] Error getting invoice file path:', error);
      return null;
    }
  }

  async getInvoiceStats(): Promise<{
    totalInvoices: number;
    generatedToday: number;
    pendingInvoices: number;
    completedInvoices: number;
    totalRevenue: number;
  }> {
    try {
      const orders = await this.storage.getAllOrders();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt || '');
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });

      const pendingOrders = orders.filter(order => 
        order.status === 'pending' || order.status === 'processing'
      );

      const completedOrders = orders.filter(order => 
        order.status === 'completed' || order.status === 'delivered'
      );

      const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

      return {
        totalInvoices: orders.length,
        generatedToday: todayOrders.length,
        pendingInvoices: pendingOrders.length,
        completedInvoices: completedOrders.length,
        totalRevenue
      };
    } catch (error) {
      console.error('[Invoice Manager] Error getting invoice stats:', error);
      throw new Error('Failed to get invoice stats');
    }
  }

  async bulkGenerateInvoices(orderIds: number[]): Promise<string[]> {
    try {
      console.log('[Invoice Manager] Bulk generating invoices for orders:', orderIds);
      
      const generatedPaths: string[] = [];
      
      for (const orderId of orderIds) {
        try {
          const invoicePath = await this.generateInvoicePDF(orderId);
          generatedPaths.push(invoicePath);
        } catch (error) {
          console.error(`[Invoice Manager] Failed to generate invoice for order ${orderId}:`, error);
        }
      }

      return generatedPaths;
    } catch (error) {
      console.error('[Invoice Manager] Error in bulk invoice generation:', error);
      throw new Error('Failed to bulk generate invoices');
    }
  }

  async deleteInvoice(orderId: number): Promise<boolean> {
    try {
      const invoicePath = await this.getInvoiceFilePath(orderId);
      
      if (invoicePath && fs.existsSync(invoicePath)) {
        fs.unlinkSync(invoicePath);
        console.log('[Invoice Manager] Deleted invoice for order:', orderId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Invoice Manager] Error deleting invoice:', error);
      return false;
    }
  }
}