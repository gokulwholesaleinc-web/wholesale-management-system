import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { DatabaseStorage } from '../storage';
import { ExcelExport } from '../..../../../shared/schema';

export class ExcelExportService {
  private openai: OpenAI;
  private exportsDir: string;

  constructor(private storage: DatabaseStorage) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.exportsDir = path.join(process.cwd(), 'exports');
    
    // Ensure exports directory exists
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  async createSalesExport(dateRange: { start: string; end: string }): Promise<string> {
    try {
      console.log('[Excel Export] Creating sales export for date range:', dateRange);
      
      // Get filtered orders data
      const allOrders = await this.storage.getAllOrders();
      const filteredOrders = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= new Date(dateRange.start) && orderDate <= new Date(dateRange.end);
      });

      console.log(`[Excel Export] Found ${filteredOrders.length} orders in date range`);

      // Generate AI insights if OpenAI is available
      let aiInsights = {};
      if (process.env.OPENAI_API_KEY) {
        const salesPrompt = `Analyze the following sales data and provide insights:
        - Total Orders: ${filteredOrders.length}
        - Date Range: ${dateRange.start} to ${dateRange.end}
        - Total Revenue: $${filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(2)}
        
        Provide insights in JSON format with keys: trends, recommendations, keyMetrics, customerInsights`;
        
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a sales analytics specialist." },
            { role: "user", content: salesPrompt }
          ],
          response_format: { type: "json_object" }
        });
        aiInsights = JSON.parse(response.choices[0].message.content || '{}');
      }

      // Create Excel workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      
      // Sales Summary Sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRows([
        ['Sales Report Summary'],
        ['Generated On:', new Date().toISOString()],
        ['Date Range:', `${dateRange.start} to ${dateRange.end}`],
        ['Total Orders:', filteredOrders.length],
        ['Total Revenue:', `$${filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(2)}`],
        ['Average Order Value:', `$${filteredOrders.length > 0 ? (filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0) / filteredOrders.length).toFixed(2) : '0.00'}`],
        [],
        ['AI Insights:'],
        [JSON.stringify(aiInsights, null, 2)]
      ]);

      // Detailed Orders Sheet
      const ordersSheet = workbook.addWorksheet('Orders');
      const orderData = [['Order ID', 'Customer', 'Date', 'Status', 'Total Amount', 'Delivery Fee', 'Items Count']];
      
      filteredOrders.forEach(order => {
        orderData.push([
          order.id || '',
          order.customerName || '',
          new Date(order.createdAt || '').toLocaleDateString(),
          order.status || '',
          `$${(order.total || 0).toFixed(2)}`,
          `$${(order.deliveryFee || 0).toFixed(2)}`,
          order.items?.length || 0
        ]);
      });
      ordersSheet.addRows(orderData);

      // Save file
      const fileName = `sales_export_${Date.now()}.xlsx`;
      const filePath = path.join(this.exportsDir, fileName);
      await workbook.xlsx.writeFile(filePath);

      // Create export record
      const exportRecord = await this.storage.createExcelExport({
        exportType: 'sales',
        fileName,
        filePath,
        parameters: dateRange,
        generatedBy: 'system',
        downloadCount: 0,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      console.log('[Excel Export] Sales export created successfully:', fileName);
      return exportRecord.id.toString();
    } catch (error) {
      console.error('[Excel Export] Error creating sales export:', error);
      throw error;
    }
  }

  async createCustomerExport(): Promise<string> {
    try {
      console.log('[Excel Export] Creating customer export');
      
      const customerData = await this.storage.getAllCustomers();
      console.log(`[Excel Export] Found ${customerData.length} customers`);

      // Generate AI insights
      let aiInsights = {};
      if (process.env.OPENAI_API_KEY) {
        const customerPrompt = `Analyze customer data for ${customerData.length} customers. Provide insights in JSON format with keys: customerSegmentation, growthOpportunities, retentionStrategies, marketingRecommendations`;
        
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a customer analytics specialist." },
            { role: "user", content: customerPrompt }
          ],
          response_format: { type: "json_object" }
        });
        aiInsights = JSON.parse(response.choices[0].message.content || '{}');
      }

      // Create Excel workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      
      // Customer Data Sheet
      const customerSheet = workbook.addWorksheet('Customers');
      const customerData_rows = [['Customer ID', 'Name', 'Company', 'Level', 'Phone', 'Address', 'Registration Date']];
      
      customerData.forEach(customer => {
        customerData_rows.push([
          customer.id || '',
          `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
          customer.company || '',
          (customer.customerLevel || 1).toString(),
          customer.phone || '',
          customer.address || '',
          new Date(customer.createdAt || '').toLocaleDateString()
        ]);
      });
      customerSheet.addRows(customerData_rows);

      // AI Insights Sheet
      const insightsSheet = workbook.addWorksheet('Insights');
      insightsSheet.addRows([
        ['Customer Analytics Report'],
        ['Generated On:', new Date().toISOString()],
        ['Total Customers:', customerData.length],
        [],
        ['AI Analysis:'],
        [JSON.stringify(aiInsights, null, 2)]
      ]);

      // Save file
      const fileName = `customers_export_${Date.now()}.xlsx`;
      const filePath = path.join(this.exportsDir, fileName);
      await workbook.xlsx.writeFile(filePath);

      // Create export record
      const exportRecord = await this.storage.createExcelExport({
        exportType: 'customers',
        fileName,
        filePath,
        generatedBy: 'system',
        downloadCount: 0,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      console.log('[Excel Export] Customer export created successfully:', fileName);
      return exportRecord.id.toString();
    } catch (error) {
      console.error('[Excel Export] Error creating customer export:', error);
      throw error;
    }
  }

  async createInventoryExport(): Promise<string> {
    try {
      console.log('[Excel Export] Creating inventory export');
      
      const products = await this.storage.getProducts();
      console.log(`[Excel Export] Found ${products.length} products`);

      // Generate AI insights
      let aiInsights = {};
      if (process.env.OPENAI_API_KEY) {
        const inventoryPrompt = `Analyze inventory data for ${products.length} products. Include low stock analysis, pricing optimization, and category performance. Provide insights in JSON format with keys: stockAlerts, pricingRecommendations, categoryAnalysis, reorderSuggestions`;
        
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are an inventory management specialist." },
            { role: "user", content: inventoryPrompt }
          ],
          response_format: { type: "json_object" }
        });
        aiInsights = JSON.parse(response.choices[0].message.content || '{}');
      }

      // Create Excel workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      
      // Inventory Data Sheet
      const inventorySheet = workbook.addWorksheet('Inventory');
      const inventoryData = [['Product ID', 'Name', 'Brand', 'Category', 'Stock', 'Price', 'Cost', 'Margin %', 'Status']];
      
      products.forEach(product => {
        const margin = product.cost && product.price ? 
          (((product.price - product.cost) / product.price) * 100).toFixed(1) : 'N/A';
        const status = (product.stock || 0) === 0 ? 'Out of Stock' : 
                     (product.stock || 0) < 10 ? 'Low Stock' : 'In Stock';

        inventoryData.push([
          (product.id || '').toString(),
          product.name || '',
          product.brand || '',
          (product.categoryId || '').toString(),
          (product.stock || 0).toString(),
          `$${(product.price || 0).toFixed(2)}`,
          `$${(product.cost || 0).toFixed(2)}`,
          margin,
          status
        ]);
      });
      inventorySheet.addRows(inventoryData);

      // AI Analysis Sheet
      const analysisSheet = workbook.addWorksheet('Analysis');
      analysisSheet.addRows([
        ['Inventory Analysis Report'],
        ['Generated On:', new Date().toISOString()],
        ['Total Products:', products.length],
        ['Low Stock Items:', products.filter(p => (p.stock || 0) < 10).length],
        ['Out of Stock Items:', products.filter(p => (p.stock || 0) === 0).length],
        [],
        ['AI Insights:'],
        [JSON.stringify(aiInsights, null, 2)]
      ]);

      // Save file
      const fileName = `inventory_export_${Date.now()}.xlsx`;
      const filePath = path.join(this.exportsDir, fileName);
      await workbook.xlsx.writeFile(filePath);

      // Create export record
      const exportRecord = await this.storage.createExcelExport({
        fileName,
        filePath,
        exportType: 'inventory',
        downloadCount: 0,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      console.log('[Excel Export] Inventory export created successfully:', fileName);
      return exportRecord.id.toString();
    } catch (error) {
      console.error('[Excel Export] Error creating inventory export:', error);
      throw error;
    }
  }

  async createTrendsExport(): Promise<string> {
    try {
      console.log('[Excel Export] Creating trends export');
      
      // Get comprehensive business data
      const orders = await this.storage.getAllOrders();
      const products = await this.storage.getProducts();
      
      // Generate AI business insights
      let aiInsights = {};
      if (process.env.OPENAI_API_KEY) {
        const trendsPrompt = `Analyze business trends from ${orders.length} orders and ${products.length} products. Provide comprehensive business intelligence in JSON format with keys: salesTrends, productPerformance, marketOpportunities, businessRecommendations, forecastInsights`;
        
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a business intelligence analyst." },
            { role: "user", content: trendsPrompt }
          ],
          response_format: { type: "json_object" }
        });
        aiInsights = JSON.parse(response.choices[0].message.content || '{}');
      }

      // Create Excel workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      
      const summarySheet = workbook.addWorksheet('Executive Summary');
      summarySheet.addRows([
        ['Business Trends Analysis'],
        ['Generated On:', new Date().toISOString()],
        ['Analysis Period:', 'Last 90 Days'],
        ['Total Orders Analyzed:', orders.length],
        ['Total Products Analyzed:', products.length],
        ['Total Revenue:', `$${orders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(2)}`],
        [],
        ['AI Business Intelligence:'],
        [JSON.stringify(aiInsights, null, 2)]
      ]);

      // Save file
      const fileName = `trends_export_${Date.now()}.xlsx`;
      const filePath = path.join(this.exportsDir, fileName);
      await workbook.xlsx.writeFile(filePath);

      // Create export record
      const exportRecord = await this.storage.createExcelExport({
        fileName,
        filePath,
        exportType: 'trends',
        downloadCount: 0,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      console.log('[Excel Export] Trends export created successfully:', fileName);
      return exportRecord.id.toString();
    } catch (error) {
      console.error('[Excel Export] Error creating trends export:', error);
      throw error;
    }
  }

  async getExport(exportId: string): Promise<ExcelExport | null> {
    const result = await this.storage.getExcelExportById(parseInt(exportId));
    return result || null;
  }

  async getAllExports(): Promise<ExcelExport[]> {
    return await this.storage.getExcelExports();
  }

  async getExportHistory(limit: number = 50): Promise<ExcelExport[]> {
    return await this.storage.getExcelExports(limit);
  }

  async downloadExport(exportId: string): Promise<{ filePath: string; fileName: string } | null> {
    const exportRecord = await this.storage.getExcelExportById(parseInt(exportId));
    
    if (!exportRecord || !exportRecord.filePath || !fs.existsSync(exportRecord.filePath)) {
      return null;
    }

    // Increment download count
    await this.storage.incrementExportDownloadCount(parseInt(exportId));

    return {
      filePath: exportRecord.filePath,
      fileName: exportRecord.fileName
    };
  }

  async deleteExport(exportId: string): Promise<boolean> {
    try {
      const exportRecord = await this.storage.getExcelExportById(parseInt(exportId));
      
      if (exportRecord) {
        // Delete file from filesystem
        if (exportRecord.filePath && fs.existsSync(exportRecord.filePath)) {
          fs.unlinkSync(exportRecord.filePath);
        }
        
        // Delete from database
        await this.storage.deleteExcelExport(parseInt(exportId));
      }
      
      return true;
    } catch (error) {
      console.error('[Excel Export] Error deleting export:', error);
      return false;
    }
  }

  async deleteExpiredExports(): Promise<void> {
    const expiredExports = await this.storage.getExpiredExcelExports();
    
    for (const exportRecord of expiredExports) {
      try {
        // Delete file from filesystem
        if (exportRecord.filePath && fs.existsSync(exportRecord.filePath)) {
          fs.unlinkSync(exportRecord.filePath);
        }
        
        // Delete from database
        await this.storage.deleteExcelExport(exportRecord.id);
        
        console.log('[Excel Export] Deleted expired export:', exportRecord.fileName);
      } catch (error) {
        console.error('[Excel Export] Error deleting expired export:', error);
      }
    }
  }
}