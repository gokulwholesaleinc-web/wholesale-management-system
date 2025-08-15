import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import pdf2pic from 'pdf2pic';
import sharp from 'sharp';

const unlink = promisify(fs.unlink);

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

export class InvoiceProcessor {
  private openai: OpenAI;
  private storage: any;

  constructor(storage: any) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.storage = storage;
  }

  async processInvoiceFile(filePath: string, originalName: string, userId: string): Promise<number> {
    try {
      console.log(`🚀 Starting AI invoice processing for ${originalName}`);
      
      // Create initial processing record
      const processingRecord = await this.storage.createAiInvoiceProcessing({
        originalFileName: originalName,
        fileType: path.extname(originalName),
        filePath: filePath,
        uploadedBy: userId,
        userId: userId, // Add this field to satisfy database constraint
        processingStatus: 'processing'
      });

      // Process the file asynchronously
      this.processFileAsync(filePath, processingRecord.id);

      return processingRecord.id;
    } catch (error) {
      console.error('Error starting invoice processing:', error);
      throw error;
    }
  }

  private async processFileAsync(filePath: string, invoiceId: number) {
    try {
      console.log(`📄 Processing file: ${filePath}`);
      
      const fileExtension = path.extname(filePath).toLowerCase();
      let extractedData;

      if (fileExtension === '.pdf') {
        // Enhanced PDF processing with fallback options
        extractedData = await this.processPdfFile(filePath);
      } else {
        // Standard image processing
        const fileBuffer = await readFile(filePath);
        const optimizedBuffer = await this.optimizeImage(fileBuffer, fileExtension);
        const base64File = optimizedBuffer.toString('base64');
        
        let mimeType = 'image/jpeg';
        if (fileExtension === '.png') mimeType = 'image/png';
        
        extractedData = await this.extractInvoiceData(base64File, mimeType);
      }
      
      // Update processing record with extracted data
      await this.storage.updateAiInvoiceProcessing(invoiceId, {
        processingStatus: 'completed',
        extractedData
      });

      // Create product suggestions based on extracted data
      await this.createProductSuggestions(invoiceId, extractedData);

      console.log(`✅ AI invoice processing completed for invoice ${invoiceId}`);
      
      // Clean up the uploaded file after processing
      await this.cleanupFile(filePath);
    } catch (error: any) {
      console.error(`❌ Critical error in async processing for invoice ${invoiceId}:`, error);
      console.error(`❌ Error stack:`, error?.stack);
      
      // Determine specific error context
      let errorContext = 'Unknown processing error';
      if (error?.message?.includes('OpenAI') || error?.message?.includes('API')) {
        errorContext = 'AI analysis failed - please check OpenAI API key or try again';
      } else if (error?.message?.includes('pdf2pic') || error?.message?.includes('PDF') || error?.message?.includes('Ghostscript')) {
        errorContext = 'PDF processing failed - please try converting to image first';
      } else if (error?.message?.includes('file') || error?.message?.includes('ENOENT')) {
        errorContext = 'File processing failed - please check file format and size';
      } else if (error?.message?.includes('database') || error?.message?.includes('storage')) {
        errorContext = 'Database error during processing - please try again';
      } else if (error?.message?.includes('product')) {
        errorContext = 'Product suggestion generation failed - manual processing may be required';
      } else if (error?.message?.includes('ECONNREFUSED') || error?.message?.includes('network')) {
        errorContext = 'Network error - please check internet connection and try again';
      }

      // Create detailed error message
      const detailedError = `${errorContext}: ${error?.message || 'Unknown error'}`;
      console.error(`❌ Storing error message: ${detailedError}`);

      try {
        await this.storage.updateAiInvoiceProcessing(invoiceId, {
          processingStatus: 'failed',
          errorMessage: detailedError
        });
        console.log(`✅ Error message stored for invoice ${invoiceId}`);
      } catch (updateError: any) {
        console.error(`❌ Failed to update error message:`, updateError);
      }
      
      // Clean up the uploaded file even on error
      await this.cleanupFile(filePath);
    }
  }

  private async processPdfFile(filePath: string): Promise<any> {
    try {
      console.log(`📄 Processing PDF file with enhanced capabilities`);
      
      // Try direct PDF processing with OpenAI first
      try {
        const fileBuffer = await readFile(filePath);
        const base64File = fileBuffer.toString('base64');
        const extractedData = await this.extractInvoiceData(base64File, 'application/pdf');
        console.log(`✅ Direct PDF processing successful`);
        return extractedData;
      } catch (directError: any) {
        console.log(`⚠️ Direct PDF processing failed, trying PDF-to-image conversion:`, directError?.message || 'Unknown error');
        
        // Fallback: Convert PDF to images
        return await this.processPdfWithConversion(filePath);
      }
    } catch (error: any) {
      console.error('PDF processing failed:', error);
      throw new Error(`PDF processing failed: ${error?.message || 'Unknown error'}`);
    }
  }

  private async processPdfWithConversion(filePath: string): Promise<any> {
    const tempDir = path.join(path.dirname(filePath), 'temp_pdf_conversion');
    
    try {
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Convert PDF to images
      const convert = pdf2pic.fromPath(filePath, {
        density: 300,           // Higher DPI for better text recognition
        saveFilename: "page",
        savePath: tempDir,
        format: "png",
        width: 2000,           // High resolution for better OCR
        height: 2000
      });

      console.log(`🔄 Converting PDF to images for better processing...`);
      const results = await convert.bulk(-1); // Convert all pages
      
      console.log(`📸 Converted ${results.length} pages to images`);
      
      // Process each page and combine results
      const allExtractedData = [];
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        console.log(`🔍 Processing page ${i + 1}/${results.length}`);
        
        try {
          // Optimize the converted image
          if (!result.path) {
            console.error(`No path found for page ${i + 1}`);
            continue;
          }
          const imageBuffer = await readFile(result.path);
          const optimizedBuffer = await this.optimizeImage(imageBuffer, '.png');
          const base64Image = optimizedBuffer.toString('base64');
          
          // Extract data from this page
          const pageData = await this.extractInvoiceData(base64Image, 'image/png');
          
          if (pageData && pageData.items && pageData.items.length > 0) {
            allExtractedData.push({
              ...pageData,
              pageNumber: i + 1
            });
          }
        } catch (pageError: any) {
          console.error(`Error processing page ${i + 1}:`, pageError?.message || 'Unknown error');
        }
      }
      
      // Combine data from all pages
      const combinedData = this.combineMultiPageData(allExtractedData);
      
      // Clean up temporary files
      await this.cleanupTempDirectory(tempDir);
      
      console.log(`✅ PDF conversion processing completed with ${combinedData.items?.length || 0} total items`);
      return combinedData;
      
    } catch (error) {
      // Clean up on error
      await this.cleanupTempDirectory(tempDir);
      throw error;
    }
  }

  private async optimizeImage(imageBuffer: Buffer, fileExtension: string): Promise<Buffer> {
    try {
      // Optimize image for better AI processing
      let optimized = sharp(imageBuffer)
        .resize(2000, 2000, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .sharpen()
        .normalize();

      // Convert to appropriate format
      if (fileExtension === '.png' || fileExtension === '.pdf') {
        optimized = optimized.png({ quality: 90 });
      } else {
        optimized = optimized.jpeg({ quality: 90 });
      }

      return await optimized.toBuffer();
    } catch (error: any) {
      console.log(`Image optimization failed, using original:`, error?.message || 'Unknown error');
      return imageBuffer;
    }
  }

  private combineMultiPageData(allPageData: any[]): any {
    if (allPageData.length === 0) {
      throw new Error('No valid data extracted from any page');
    }

    if (allPageData.length === 1) {
      return allPageData[0];
    }

    // Use the first page for header info (supplier, invoice number, etc.)
    const firstPage = allPageData[0];
    
    // Combine all items from all pages
    const allItems = [];
    for (const pageData of allPageData) {
      if (pageData.items && Array.isArray(pageData.items)) {
        allItems.push(...pageData.items);
      }
    }

    // Calculate total from all items
    const totalAmount = allItems.reduce((sum, item) => {
      return sum + (parseFloat(item.totalPrice) || 0);
    }, 0);

    return {
      ...firstPage,
      items: allItems,
      totalAmount: totalAmount,
      pageCount: allPageData.length,
      processingMethod: 'multi-page-conversion'
    };
  }

  private async cleanupTempDirectory(tempDir: string): Promise<void> {
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          await unlink(path.join(tempDir, file));
        }
        fs.rmdirSync(tempDir);
      }
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  }

  private async extractInvoiceData(base64File: string, mimeType: string) {
    try {
      console.log(`🤖 Using OpenAI to extract invoice data (${mimeType})`);
      
      const prompt = `
        Analyze this invoice/purchase order document and extract the following information in JSON format:
        
        {
          "supplierName": "vendor/supplier company name (NOT the receiving company)",
          "invoiceNumber": "invoice/PO number",
          "date": "date in YYYY-MM-DD format",
          "totalAmount": "total amount as number",
          "items": [
            {
              "productName": "product name",
              "sku": "product SKU if available",
              "quantity": "quantity as number",
              "unitPrice": "unit price as number",
              "totalPrice": "line total as number",
              "description": "product description"
            }
          ]
        }
        
        IMPORTANT INSTRUCTIONS:
        1. For "supplierName", identify the VENDOR/SUPPLIER company that is SELLING the products (usually at the top of the invoice), NOT the receiving/buyer company. If you see "Gokul Wholesale" mentioned anywhere, that is likely the BUYER, not the supplier.
        2. Extract ALL line items from the document, even if they span multiple sections or pages.
        3. Be very accurate with quantities and prices - these are critical for inventory management.
        4. If you see terms like "From:", "Vendor:", "Supplier:", or company letterheads, those typically indicate the seller.
        5. Look carefully for product codes, SKUs, or item numbers.
        6. If text is unclear due to image quality, indicate uncertainty in the description field.
        
        Extract all line items from the invoice with maximum accuracy.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64File}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('OpenAI returned empty response');
      }
      
      const extractedData = JSON.parse(content);
      
      // Validate extracted data structure
      if (!extractedData.items || !Array.isArray(extractedData.items)) {
        throw new Error('Invalid extracted data: missing or invalid items array');
      }
      
      console.log(`📊 Extracted ${extractedData.items.length} items from invoice`);
      return extractedData;
    } catch (error: any) {
      console.error('Error extracting invoice data with enhanced context:', {
        error: error?.message || 'Unknown error',
        mimeType,
        fileSize: base64File.length,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to extract invoice data: ${error?.message || 'Unknown error'}`);
    }
  }

  private async createProductSuggestions(invoiceId: number, extractedData: any) {
    try {
      if (!extractedData.items || !Array.isArray(extractedData.items)) {
        console.log('No items found in extracted data');
        return;
      }

      // Get existing products and categories for matching
      const [products, categories] = await Promise.all([
        this.storage.getAllProducts(),
        this.storage.getAllCategories()
      ]);

      console.log(`🔍 Matching against ${products.length} products and ${categories.length} categories`);

      for (const item of extractedData.items) {
        try {
          // Find potential product matches
          const matchingProduct = await this.findBestProductMatch(item, products);
          const suggestedCategory = await this.suggestCategory(item, categories);

          // Create suggestion record
          await this.storage.createAiProductSuggestion({
            invoiceId,
            extractedProductName: item.productName || 'Unknown Product',
            extractedSku: item.sku || '',
            extractedQuantity: parseInt(item.quantity) || 1,
            extractedUnitCost: parseFloat(item.unitPrice) || 0,
            extractedTotalCost: parseFloat(item.totalPrice) || 0,
            extractedDescription: item.description || '',
            suggestedProductId: matchingProduct?.id || null,
            matchConfidence: matchingProduct?.confidence || 0,
            matchReasoning: matchingProduct?.reasoning || 'No matching product found',
            suggestedCategoryId: suggestedCategory?.id || null,
            suggestedCategoryName: suggestedCategory?.name || 'General',
            userAction: null,
            finalProductId: null,
            userSetUnitCost: null,
            userSetSalePrice: null,
            approved: false
          });
        } catch (itemError) {
          console.error('Error processing item:', item, itemError);
        }
      }

      console.log(`✅ Created suggestions for ${extractedData.items.length} items`);
    } catch (error) {
      console.error('Error creating product suggestions:', error);
      throw error;
    }
  }

  private async findBestProductMatch(item: any, products: any[]): Promise<{id: number, confidence: number, reasoning: string} | null> {
    try {
      // Normalize brand names for better matching
      const itemName = (item.productName || '').toLowerCase().replace(/twangerz/g, 'twang');
      const itemSku = (item.sku || '').toLowerCase();
      const itemDescription = (item.description || '').toLowerCase();
      
      console.log(`🔍 Matching item: "${item.productName}" with SKU: "${itemSku}" (original: "${item.sku}")`);
      
      let bestMatch = null;
      let bestScore = 0;
      let bestReason = '';

      for (const product of products) {
        const productName = (product.name || '').toLowerCase().replace(/twangerz/g, 'twang');
        const productSku = (product.sku || '').toLowerCase();
        const productDescription = (product.description || '').toLowerCase();
        
        // Debug specific Twang products
        if (product.name.toLowerCase().includes('lime salt') && product.name.toLowerCase().includes('twang')) {
          console.log(`🔍 Checking Twang product: "${product.name}" with SKU: "${productSku}" vs item SKU: "${itemSku}"`);
        }
        
        let totalScore = 0;
        let reasons = [];

        // 1. Exact SKU match (highest priority - 100% confidence)
        if (itemSku && productSku && itemSku === productSku) {
          console.log(`🎯 EXACT SKU MATCH FOUND: "${itemSku}" === "${productSku}" for product: ${product.name}`);
          totalScore = 1.0;
          reasons.push('Exact SKU match');
        }
        // 1.5. Exact name match after normalization (100% confidence)
        else if (itemName && productName && itemName === productName) {
          totalScore = 1.0;
          reasons.push('Exact name match');
        }
        // 2. Fuzzy SKU match for OCR errors (very high priority - 95% confidence)
        else if (itemSku && productSku && this.calculateSKUSimilarity(itemSku, productSku) >= 0.9) {
          totalScore = 0.95;
          reasons.push('High SKU similarity (likely OCR variant)');
        }
        // 3. Partial SKU match (high priority - 90% confidence)
        else if (itemSku && productSku && (itemSku.includes(productSku) || productSku.includes(itemSku))) {
          totalScore = 0.9;
          reasons.push('Partial SKU match');
        }
        // 3. Comprehensive product matching analysis
        else {
          const nameScore = this.calculateSimilarity(itemName, productName);
          const wordMatchScore = this.calculateWordMatchScore(itemName, productName);
          const descriptionScore = itemDescription && productDescription 
            ? this.calculateSimilarity(itemDescription, productDescription) * 0.7 
            : 0;
          
          // Additional matching strategies
          const brandScore = this.calculateBrandSimilarity(itemName, product.brand || '');
          const fuzzyNameScore = this.calculateFuzzyMatch(itemName, productName);
          const keywordScore = this.calculateKeywordMatch(itemName, productName);
          
          // Special enhanced matching for Twang products
          const twangScore = this.calculateTwangProductMatch(itemName, productName);
          
          // Enhanced combined scoring with multiple factors
          totalScore = Math.max(
            (nameScore * 0.5) + (wordMatchScore * 0.25) + (descriptionScore * 0.15) + (brandScore * 0.1),
            fuzzyNameScore * 0.8,
            keywordScore * 0.7,
            twangScore  // Twang-specific matching gets full weight
          );
          
          if (nameScore >= 0.8) reasons.push(`High name similarity (${Math.round(nameScore * 100)}%)`);
          if (wordMatchScore >= 0.5) reasons.push(`Key words match (${Math.round(wordMatchScore * 100)}%)`);
          if (descriptionScore >= 0.3) reasons.push(`Description similarity (${Math.round(descriptionScore * 100)}%)`);
          if (brandScore >= 0.5) reasons.push(`Brand match (${Math.round(brandScore * 100)}%)`);
          if (fuzzyNameScore >= 0.6) reasons.push(`Fuzzy name match (${Math.round(fuzzyNameScore * 100)}%)`);
          if (keywordScore >= 0.6) reasons.push(`Keyword match (${Math.round(keywordScore * 100)}%)`);
          if (twangScore >= 0.8) reasons.push(`Twang product match (${Math.round(twangScore * 100)}%)`);
        }
        
        if (totalScore > bestScore && totalScore >= 0.5) { // 50% minimum threshold
          bestScore = totalScore;
          bestMatch = {
            id: product.id,
            confidence: Math.round(totalScore * 100),
            reasoning: reasons.length > 0 ? reasons.join(', ') : `${Math.round(totalScore * 100)}% similarity match`
          };
          bestReason = reasons.join(', ');
        }
      }

      if (bestMatch) {
        console.log(`🎯 Found product match: ${bestMatch.confidence}% confidence - ${bestReason}`);
      }

      return bestMatch;
    } catch (error) {
      console.error('Error finding product match:', error);
      return null;
    }
  }

  private calculateWordMatchScore(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          matches++;
          break;
        }
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
  }

  private calculateBrandSimilarity(itemName: string, productBrand: string): number {
    if (!productBrand) return 0;
    const brandLower = productBrand.toLowerCase();
    const itemLower = itemName.toLowerCase();
    
    // Check if brand name appears in item name
    if (itemLower.includes(brandLower) || brandLower.includes(itemLower)) {
      return 1.0;
    }
    
    // Check for partial brand matches
    const brandWords = brandLower.split(/\s+/);
    for (const word of brandWords) {
      if (word.length > 2 && itemLower.includes(word)) {
        return 0.7;
      }
    }
    
    return 0;
  }

  private calculateSKUSimilarity(sku1: string, sku2: string): number {
    // Special handling for SKUs to catch OCR errors
    if (!sku1 || !sku2) return 0;
    
    // Remove any non-alphanumeric characters and normalize
    const cleanSku1 = sku1.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanSku2 = sku2.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    if (cleanSku1 === cleanSku2) return 1.0;
    
    // Calculate character-by-character similarity for OCR errors
    if (cleanSku1.length === cleanSku2.length) {
      let matches = 0;
      for (let i = 0; i < cleanSku1.length; i++) {
        if (cleanSku1[i] === cleanSku2[i]) {
          matches++;
        }
      }
      const similarity = matches / cleanSku1.length;
      // If 90%+ characters match, likely OCR error
      return similarity;
    }
    
    // Use Levenshtein for different lengths
    return this.calculateFuzzyMatch(cleanSku1, cleanSku2);
  }

  private calculateFuzzyMatch(str1: string, str2: string): number {
    // Implement Levenshtein distance for fuzzy matching
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1.charAt(i - 1) === str2.charAt(j - 1) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return maxLen > 0 ? (maxLen - distance) / maxLen : 0;
  }

  private calculateKeywordMatch(itemName: string, productName: string): number {
    // Extract meaningful keywords (excluding common words)
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'pk', 'ct', 'pack', 'bottle', 'can', 'box'];
    
    const extractKeywords = (str: string) => 
      str.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !commonWords.includes(word));
    
    const itemKeywords = extractKeywords(itemName);
    const productKeywords = extractKeywords(productName);
    
    if (itemKeywords.length === 0 || productKeywords.length === 0) return 0;
    
    let keywordMatches = 0;
    for (const itemKeyword of itemKeywords) {
      for (const productKeyword of productKeywords) {
        if (itemKeyword === productKeyword || 
            itemKeyword.includes(productKeyword) || 
            productKeyword.includes(itemKeyword)) {
          keywordMatches++;
          break;
        }
      }
    }
    
    return keywordMatches / Math.max(itemKeywords.length, productKeywords.length);
  }

  private calculateTwangProductMatch(itemName: string, productName: string): number {
    // Special matching logic for Twang products
    const item = itemName.toLowerCase();
    const product = productName.toLowerCase();
    
    // Normalize brand variations: "twangerz" → "twang"
    const normalizeItem = item.replace(/twangerz/g, 'twang');
    const normalizeProduct = product.replace(/twangerz/g, 'twang');
    
    // Must contain "twang" in both (after normalization)
    if (!normalizeItem.includes('twang') || !normalizeProduct.includes('twang')) {
      return 0;
    }
    
    // Extract product-specific identifiers after "twang"
    const extractTwangVariant = (name: string) => {
      // Common Twang product patterns
      const patterns = [
        'clamato', 'lime', 'chili', 'salt', 'beer', 'pickle', 'chamoy', 
        'tamarind', 'sriracha', 'mango', 'michelada', 'margarita', 'tangy'
      ];
      
      const found = [];
      for (const pattern of patterns) {
        if (name.includes(pattern)) {
          found.push(pattern);
        }
      }
      return found;
    };
    
    const itemVariants = extractTwangVariant(normalizeItem);
    const productVariants = extractTwangVariant(normalizeProduct);
    
    if (itemVariants.length === 0 || productVariants.length === 0) {
      return 0.5; // Basic Twang match
    }
    
    // Calculate variant match percentage
    let matches = 0;
    for (const itemVariant of itemVariants) {
      if (productVariants.includes(itemVariant)) {
        matches++;
      }
    }
    
    // High score for exact variant matches
    if (matches >= 2) return 0.95; // Clamato + Chili-Lime = very strong match
    if (matches === 1) return 0.85; // One key variant matches
    
    // Check for partial matches (e.g., "chili-lime" vs "chili" + "lime")
    const itemText = itemVariants.join(' ');
    const productText = productVariants.join(' ');
    const similarity = this.calculateFuzzyMatch(itemText, productText);
    
    return Math.max(0.7, similarity * 0.9); // Minimum 70% for Twang products
  }

  private async suggestCategory(item: any, categories: any[]) {
    try {
      const itemName = (item.productName || '').toLowerCase();
      const itemDescription = (item.description || '').toLowerCase();
      
      let bestMatch = null;
      let bestScore = 0;
      
      // Enhanced category matching with multiple strategies
      for (const category of categories) {
        const categoryName = (category.name || '').toLowerCase();
        let score = 0;
        
        // Direct name inclusion
        if (itemName.includes(categoryName) || categoryName.includes(itemName)) {
          score = 0.8;
        }
        // Description inclusion
        else if (itemDescription.includes(categoryName) || categoryName.includes(itemDescription)) {
          score = 0.6;
        }
        // Word similarity
        else {
          score = this.calculateWordMatchScore(itemName + ' ' + itemDescription, categoryName);
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }

      // Return best match or default
      if (bestMatch && bestScore >= 0.3) {
        console.log(`📂 Category suggestion: ${bestMatch.name} (${Math.round(bestScore * 100)}% confidence)`);
        return bestMatch;
      }
      
      return categories[0] || { id: null, name: 'General' };
    } catch (error) {
      console.error('Error suggesting category:', error);
      return { id: null, name: 'General' };
    }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  async getProcessingResults(invoiceId: number) {
    try {
      const [processingRecord, suggestions] = await Promise.all([
        this.storage.getAiInvoiceProcessing(invoiceId),
        this.storage.getAiProductSuggestions(invoiceId)
      ]);

      return {
        processing: processingRecord,
        suggestions
      };
    } catch (error) {
      console.error('Error getting processing results:', error);
      throw error;
    }
  }

  async approveAndCreatePurchaseOrder(invoiceId: number, userDecisions: any[]) {
    try {
      console.log(`🔨 Creating purchase order from approved decisions for invoice ${invoiceId}`);
      
      const processingRecord = await this.storage.getAiInvoiceProcessing(invoiceId);
      if (!processingRecord) {
        throw new Error(`AI invoice processing record not found for invoice ID: ${invoiceId}`);
      }

      if (!userDecisions || userDecisions.length === 0) {
        throw new Error('No user decisions provided for purchase order creation');
      }

      // Create purchase order with correct field mapping
      const purchaseOrder = await this.storage.createPurchaseOrder({
        orderNumber: `AI-PO-${Date.now()}`,
        supplierName: processingRecord.extracted_data?.vendorName || 'AI Processed',
        totalCost: processingRecord.extracted_data?.totalAmount || 0,
        status: 'pending',
        createdBy: processingRecord.user_id
      });

      // Process each user decision with enhanced error handling
      for (let index = 0; index < userDecisions.length; index++) {
        const decision = userDecisions[index];
        try {
          console.log(`Processing decision ${index + 1}/${userDecisions.length}: ${decision.action}`);
          
          if (decision.action === 'create_new') {
            // Validate required fields for new product creation
            if (!decision.productName || !decision.cost) {
              throw new Error(`Invalid product data for new product creation at index ${index}: missing productName or cost`);
            }

            // Create new product
            const newProduct = await this.storage.createProduct({
              name: decision.productName,
              description: decision.description || '',
              price: parseFloat(decision.price) || 0,
              cost: parseFloat(decision.cost) || 0,
              categoryId: decision.categoryId || null,
              stock: 0,
              sku: decision.sku || '',
              isActive: true
            });

            console.log(`✅ Created new product: ${newProduct.name} (ID: ${newProduct.id})`);

          // Add to purchase order with correct field mapping
          await this.storage.addItemToPurchaseOrder(purchaseOrder.id, {
            productId: newProduct.id,
            quantityOrdered: decision.quantity,
            unitCost: parseFloat(decision.cost),
            totalCost: parseFloat(decision.cost) * decision.quantity
          });
          } else if (decision.action === 'map_existing') {
            // Validate required fields for existing product mapping
            if (!decision.productId || !decision.cost || !decision.quantity) {
              throw new Error(`Invalid mapping data for existing product at index ${index}: missing productId, cost, or quantity`);
            }

            // Map to existing product with correct field mapping
            await this.storage.addItemToPurchaseOrder(purchaseOrder.id, {
              productId: decision.productId,
              quantityOrdered: decision.quantity,
              unitCost: parseFloat(decision.cost),
              totalCost: parseFloat(decision.cost) * decision.quantity
            });

            console.log(`✅ Mapped to existing product ID: ${decision.productId}`);

            // Update product cost if requested
            if (decision.updateCost) {
              await this.storage.updateProductCost(decision.productId, parseFloat(decision.cost));
              console.log(`✅ Updated product cost for ID: ${decision.productId}`);
            }
          } else if (decision.action === 'skip') {
            console.log(`⏭️ Skipped item at index ${index}`);
          } else {
            console.warn(`⚠️ Unknown action '${decision.action}' for decision at index ${index}`);
          }
        } catch (decisionError: any) {
          console.error(`❌ Error processing decision ${index + 1}:`, decisionError);
          throw new Error(`Failed to process decision ${index + 1}: ${decisionError?.message || 'Unknown error'}`);
        }
      }

      console.log(`✅ Purchase order ${purchaseOrder.id} created successfully`);
      return purchaseOrder.id;
    } catch (error: any) {
      console.error(`❌ Critical error creating purchase order for invoice ${invoiceId}:`, error);
      
      // Provide specific error context based on error type
      if (error?.message?.includes('productName or cost')) {
        throw new Error(`Product validation failed: ${error.message}`);
      } else if (error?.message?.includes('productId, cost, or quantity')) {
        throw new Error(`Product mapping validation failed: ${error.message}`);
      } else if (error?.message?.includes('Processing record not found')) {
        throw new Error(`Invalid invoice ID: No AI processing record found for invoice ${invoiceId}`);
      } else if (error?.message?.includes('No user decisions')) {
        throw new Error('Purchase order creation failed: No user decisions provided');
      } else {
        throw new Error(`Purchase order creation failed: ${error?.message || 'Unknown error'}`);
      }
    }
  }

  private async cleanupFile(filePath: string) {
    try {
      await unlink(filePath);
      console.log(`🗑️ Cleaned up uploaded file: ${filePath}`);
    } catch (error: any) {
      console.error(`⚠️ Error cleaning up file ${filePath}:`, error.message);
      // Don't throw - file cleanup failure shouldn't break the main process
    }
  }
}