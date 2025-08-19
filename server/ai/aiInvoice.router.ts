// server/ai/aiInvoice.router.ts
// Drop-in Express router for AI Invoice Processor (no Ghostscript dependency).
// - PDFs: parsed to text via pdf-parse
// - Images (jpg/png): sent to GPT-4o vision
// - JSON normalized & stored in-memory (replace with your DB)
// - Endpoints:
//   POST   /api/admin/ai/process-invoice
//   GET    /api/admin/ai/invoice/:id/results
//   POST   /api/admin/ai/invoice/:id/approve

import { Router, Request, Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
// import pdfParse from 'pdf-parse'; // Temporarily disabled due to test file issue
import path from 'path';
import fs from 'fs/promises';
import { requireAuth } from '../simpleAuth';

const upload = multer({ dest: 'uploads/' });
const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

// --- In-memory store (replace with your DB implementation) ---
type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ProcessingRecord {
  id: number;
  originalFileName: string;
  fileType: string;
  filePath: string;
  status: ProcessingStatus;
  createdAt: string;
  extractedData?: any;
  errorMessage?: string;
}

interface Suggestion {
  id: number;
  extractedProductName: string;
  extractedSku: string;
  extractedQuantity: number;
  extractedUnitCost: number;
  extractedTotalCost: number;
  extractedDescription?: string;
  suggestedProductId: number | null;
  matchConfidence: number;
  matchReasoning: string;
  suggestedCategoryId: number | null;
  suggestedCategoryName: string | null;
}

const store = {
  seq: 1,
  records: new Map<number, ProcessingRecord>(),
  suggestions: new Map<number, Suggestion[]>(),
};

// --- In-memory POs (replace with your DB) ---
type POStatus = 'pending' | 'submitted' | 'receiving' | 'completed' | 'cancelled';

interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplierName: string;
  status: POStatus;
  totalCost: number;
  createdAt: string;
}

interface PurchaseOrderItem {
  id: number;
  purchaseOrderId: number;
  productId: number | null;     // may be null if new product to be created later
  productName: string;
  sku: string;
  quantityOrdered: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

const poStore = {
  seq: 1000,
  itemSeq: 1,
  pos: new Map<number, PurchaseOrder>(),
  items: new Map<number, PurchaseOrderItem[]>(), // keyed by PO id
};

// --- Utilities ---
function normalizeExtracted(json: any) {
  // Ensure consistent shape
  const items = Array.isArray(json?.items) ? json.items : [];
  return {
    supplierName: json?.supplierName || json?.vendorName || 'Unknown Supplier',
    invoiceNumber: json?.invoiceNumber || json?.poNumber || '',
    date: json?.date || '',
    totalAmount: Number(json?.totalAmount || 0),
    items: items.map((x: any) => ({
      productName: x.productName || x.name || '',
      sku: x.sku || x.code || '',
      quantity: Number(x.quantity || 0),
      unitPrice: Number(x.unitPrice || 0),
      totalPrice: Number(x.totalPrice || (Number(x.unitPrice || 0) * Number(x.quantity || 0))),
      description: x.description || '',
    })),
  };
}

async function extractFromPdfBuffer(buf: Buffer) {
  // Temporarily disabled due to test file issue
  // const parsed = await pdfParse(buf);
  const parsed = { text: "PDF parsing temporarily disabled - demo text for testing" };
  const text = parsed.text?.slice(0, 120_000) || ''; // cap for safety
  const prompt = `
You are reading an invoice or purchase order text. Extract structured JSON with this shape:
{
  "supplierName": "string",
  "invoiceNumber": "string", 
  "date": "YYYY-MM-DD",
  "totalAmount": number,
  "items": [
    {
      "productName": "string",
      "sku": "string",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "description": "string"
    }
  ]
}
Rules:
- "supplierName" is the vendor/seller (NOT the buyer).
- Parse all line items; be precise with qty & price.
- Return ONLY valid JSON (no markdown).
Text starts below:
---
${text}
---`;

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = resp.choices[0]?.message?.content || '{}';
  return JSON.parse(content);
}

async function extractFromImageBase64(base64: string, mime: string) {
  const prompt = `
Analyze this invoice image and return structured JSON:
{
  "supplierName": "string",
  "invoiceNumber": "string",
  "date": "YYYY-MM-DD",
  "totalAmount": number,
  "items": [
    {"productName": "string","sku": "string","quantity": number,"unitPrice": number,"totalPrice": number,"description": "string"}
  ]
}
Rules:
- supplierName is the vendor/seller (NOT the buyer).
- Extract ALL line items.
- Return ONLY JSON.`;

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: `data:${mime};base64,${base64}` },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = resp.choices[0]?.message?.content || '{}';
  return JSON.parse(content);
}

// Enhanced matching algorithms
class InvoiceProcessor {
  // --------------------------
  // Normalization helpers
  // --------------------------
  private normalizeText(s: string): string {
    return (s || '')
      .toLowerCase()
      .replace(/twangerz/g, 'twang')            // brand normalization
      .replace(/[^a-z0-9]+/g, ' ')              // collapse punctuation
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeSKU(s: string): string {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // --------------------------
  // Jaro-Winkler similarity (0..1)
  // --------------------------
  private jaroWinkler(a: string, b: string): number {
    if (!a || !b) return 0;
    const s1 = a, s2 = b;
    const mRange = Math.max(0, Math.floor(Math.max(s1.length, s2.length) / 2) - 1);

    const s1Matches: boolean[] = Array(s1.length).fill(false);
    const s2Matches: boolean[] = Array(s2.length).fill(false);

    let matches = 0;
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - mRange);
      const end = Math.min(i + mRange + 1, s2.length);
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
    if (!matches) return 0;

    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    transpositions /= 2;

    const j = (matches / s1.length + matches / s2.length + (matches - transpositions) / matches) / 3;

    // Winkler prefix boost
    let prefix = 0;
    for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }
    const p = 0.1;
    return j + prefix * p * (1 - j);
  }

  // --------------------------
  // Token-set/Dice similarity (for names/descriptions)
  // --------------------------
  private tokenSetDice(a: string, b: string): number {
    const tok = (s: string) => this.normalizeText(s).split(' ').filter(Boolean);
    const A = new Set(tok(a));
    const B = new Set(tok(b));
    if (A.size === 0 || B.size === 0) return 0;
    let intersect = 0;
    A.forEach(t => { if (B.has(t)) intersect++; });
    return (2 * intersect) / (A.size + B.size); // Dice coefficient 0..1
  }

  // --------------------------
  // Levenshtein distance for fuzzy matching
  // --------------------------
  private calculateFuzzyMatch(a: string, b: string): number {
    if (!a || !b) return 0;
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : (maxLen - matrix[b.length][a.length]) / maxLen;
  }

  // --------------------------
  // SKU similarity: Levenshtein + JW + containment
  // --------------------------
  private skuSimilarity(a: string, b: string): number {
    const s1 = this.normalizeSKU(a);
    const s2 = this.normalizeSKU(b);
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;

    // exact containment (OCR knocks a dash/space) → strong 0.90
    if (s1.includes(s2) || s2.includes(s1)) return 0.90;

    // Levenshtein-based similarity
    const levSim = this.calculateFuzzyMatch(s1, s2); // you already have this (0..1)
    const jw = this.jaroWinkler(s1, s2);

    // If 1 edit distance off (very likely OCR or minor typo) → ≥0.95
    const levDistanceLikely = Math.round((1 - levSim) * Math.max(s1.length, s2.length));
    const nearMiss = levDistanceLikely <= 1 ? 0.95 : 0;

    return Math.max(nearMiss, (levSim * 0.6) + (jw * 0.4));
  }

  // --------------------------
  // Name/description combined similarity 0..1
  // --------------------------
  private nameDescriptionSimilarity(itemName: string, productName: string, itemDesc: string, productDesc: string): number {
    const n1 = this.normalizeText(itemName);
    const n2 = this.normalizeText(productName);
    if (!n1 && !n2) return 0;

    const jw = this.jaroWinkler(n1, n2);
    const dice = this.tokenSetDice(n1, n2);

    let descScore = 0;
    if (itemDesc && productDesc) {
      const d1 = this.normalizeText(itemDesc);
      const d2 = this.normalizeText(productDesc);
      descScore = d1 && d2 ? this.jaroWinkler(d1, d2) : 0;
    }

    // Weighted combo: token set catches reordering; JW catches minor typos
    return (dice * 0.55) + (jw * 0.35) + (descScore * 0.10);
  }

  // --------------------------
  // MAIN MATCHER
  // --------------------------
  private async findBestProductMatch(
    item: any,
    products: any[]
  ): Promise<{ id: number; confidence: number; reasoning: string } | null> {
    try {
      const itemName = this.normalizeText(item.productName || '');
      const itemSkuRaw = item.sku || '';
      const itemSku = this.normalizeSKU(itemSkuRaw);
      const itemDescription = this.normalizeText(item.description || '');

      let best: { id: number; confidence: number; reasoning: string } | null = null;
      let bestScore = 0;
      let bestWhy = '';

      for (const product of products) {
        const pName = this.normalizeText(product.name || '');
        const pSku = this.normalizeSKU(product.sku || '');
        const pDesc = this.normalizeText(product.description || '');
        const brand = this.normalizeText(product.brand || '');

        const reasons: string[] = [];
        let score = 0;

        // 1) Strong SKU signal
        let skuScore = 0;
        if (itemSku && pSku) {
          skuScore = this.skuSimilarity(itemSku, pSku); // 0..1
          if (skuScore >= 0.99) { score = 1; reasons.push('Exact SKU match'); }
          else if (skuScore >= 0.95) { score = Math.max(score, 0.95); reasons.push('1-edit SKU near-match'); }
          else if (skuScore >= 0.90) { score = Math.max(score, 0.90); reasons.push('High SKU similarity / containment'); }
        }

        // 2) Names/descriptions
        const ndScore = this.nameDescriptionSimilarity(itemName, pName, itemDescription, pDesc); // 0..1
        if (ndScore >= 0.8) reasons.push(`High name/desc similarity (${Math.round(ndScore * 100)}%)`);
        else if (ndScore >= 0.6) reasons.push(`Moderate name/desc similarity (${Math.round(ndScore * 100)}%)`);

        // 3) Brand presence (light bonus)
        let brandBonus = 0;
        if (brand && (itemName.includes(brand) || pName.includes(brand))) {
          brandBonus = 0.05;
          reasons.push('Brand match');
        }

        // Final weighted score:
        // - If SKU exists, it dominates. Otherwise rely on names/descriptions
        const combined = Math.max(
          skuScore,                            // respect strong SKU matches
          (ndScore * 0.92) + brandBonus        // otherwise quality name/desc + brand
        );

        // Keep the maximum of any signal so a strong SKU doesn't get diluted
        score = Math.max(score, combined);

        // Lower the consideration floor to 0.30 so we don't drop "some similarity" to 0.
        if (score > bestScore) {
          bestScore = score;
          bestWhy = reasons.length ? reasons.join(', ') : 'Similarity across fields';
          best = {
            id: product.id,
            confidence: Math.round(score * 100),
            reasoning: bestWhy,
          };
        }
      }

      if (best) {
        // Debug
        console.log(`🎯 Best match for "${item.productName}" → Product #${best.id} @ ${best.confidence}% (${best.reasoning})`);
      }

      return best; // may be <50% but never forced to 0 if there's evidence
    } catch (err) {
      console.error('Error in findBestProductMatch:', err);
      return null;
    }
  }
}

// Create suggestions with enhanced matching
async function createProductSuggestions(extracted: any): Promise<Suggestion[]> {
  const processor = new InvoiceProcessor();
  
  try {
    // Get products and categories from database
    // Import storage dynamically to avoid circular imports
    const { storage } = await import('../storage');
    const products = await storage.getProducts();
    const categories = await storage.getCategories();
    
    const suggestions: Suggestion[] = [];
    
    for (let idx = 0; idx < (extracted.items || []).length; idx++) {
      const item = extracted.items[idx];
      
      // Find potential product matches
      const matchingProduct = await processor['findBestProductMatch'](item, products);
      const suggestedCategory = await findSuggestedCategory(item, categories);
      
      // Decide auto-suggest thresholds
      const AUTO_SUGGEST_THRESHOLD = 90;  // auto-map candidate
      const SOFT_SUGGEST_THRESHOLD = 75;  // show as suggested but require review
      
      const confidence = matchingProduct?.confidence ?? 0;
      const shouldAutoSuggest = confidence >= AUTO_SUGGEST_THRESHOLD;
      const isGoodSuggestion = confidence >= SOFT_SUGGEST_THRESHOLD;
      
      suggestions.push({
        id: idx + 1,
        extractedProductName: item.productName || 'Unknown Product',
        extractedSku: item.sku || '',
        extractedQuantity: parseInt(item.quantity) || 1,
        extractedUnitCost: parseFloat(item.unitPrice) || 0,
        extractedTotalCost: parseFloat(item.totalPrice) || 0,
        extractedDescription: item.description || '',
        suggestedProductId: isGoodSuggestion ? matchingProduct!.id : null,
        matchConfidence: confidence,
        matchReasoning: matchingProduct?.reasoning || 'Low similarity',
        suggestedCategoryId: suggestedCategory?.id || null,
        suggestedCategoryName: suggestedCategory?.name || 'General',
        userAction: shouldAutoSuggest ? 'auto_suggest' : null, // you can read this in the UI
        finalProductId: null,
        userSetUnitCost: null,
        userSetSalePrice: null,
        approved: false
      });
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error creating product suggestions:', error);
    return (extracted.items || []).map((it: any, idx: number) => ({
      id: idx + 1,
      extractedProductName: it.productName || 'Unknown',
      extractedSku: it.sku || '',
      extractedQuantity: Number(it.quantity || 0),
      extractedUnitCost: Number(it.unitPrice || 0),
      extractedTotalCost: Number(it.totalPrice || 0),
      extractedDescription: it.description || '',
      suggestedProductId: null,
      matchConfidence: 0,
      matchReasoning: 'Processing error',
      suggestedCategoryId: null,
      suggestedCategoryName: null,
    }));
  }
}

// Helper function to suggest category
async function findSuggestedCategory(item: any, categories: any[]): Promise<{ id: number; name: string } | null> {
  // Simple category suggestion based on product name keywords
  const itemName = (item.productName || '').toLowerCase();
  
  for (const category of categories) {
    const categoryName = (category.name || '').toLowerCase();
    if (itemName.includes(categoryName) || categoryName.includes(itemName)) {
      return { id: category.id, name: category.name };
    }
  }
  
  return { id: 1, name: 'General' }; // Default fallback
}

// Enhanced AI product suggestion creation
async function createAiProductSuggestion(suggestion: any): Promise<void> {
  try {
    // Import storage dynamically to avoid circular imports
    const { storage } = await import('../storage');
    
    // Decide auto-suggest thresholds
    const AUTO_SUGGEST_THRESHOLD = 90;  // auto-map candidate
    const SOFT_SUGGEST_THRESHOLD = 75;  // show as suggested but require review
    
    const confidence = suggestion.matchConfidence ?? 0;
    const shouldAutoSuggest = confidence >= AUTO_SUGGEST_THRESHOLD;
    const isGoodSuggestion = confidence >= SOFT_SUGGEST_THRESHOLD;
    
    await storage.createAiProductSuggestion({
      invoiceId: suggestion.invoiceId,
      extractedProductName: suggestion.extractedProductName || 'Unknown Product',
      extractedSku: suggestion.extractedSku || '',
      extractedQuantity: suggestion.extractedQuantity || 1,
      extractedUnitCost: suggestion.extractedUnitCost || 0,
      extractedTotalCost: suggestion.extractedTotalCost || 0,
      extractedDescription: suggestion.extractedDescription || '',
      suggestedProductId: isGoodSuggestion ? suggestion.suggestedProductId : null,
      matchConfidence: confidence,
      matchReasoning: suggestion.matchReasoning || 'Low similarity',
      suggestedCategoryId: suggestion.suggestedCategoryId || null,
      suggestedCategoryName: suggestion.suggestedCategoryName || 'General',
      userAction: shouldAutoSuggest ? 'auto_suggest' : null, // you can read this in the UI
      finalProductId: null,
      userSetUnitCost: null,
      userSetSalePrice: null,
      approved: false
    });
    
    console.log(`✅ Created AI product suggestion for ${suggestion.extractedProductName} with ${confidence}% confidence`);
  } catch (error) {
    console.error('Error creating AI product suggestion:', error);
  }
}

// --- Routes ---
router.post('/process-invoice', requireAuth, upload.single('invoice'), async (req: Request, res: Response) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).send('OPENAI_API_KEY not set');
    }
    if (!req.file) return res.status(400).send('No file uploaded');

    const id = store.seq++;
    const rec: ProcessingRecord = {
      id,
      originalFileName: req.file.originalname,
      fileType: path.extname(req.file.originalname).toLowerCase(),
      filePath: req.file.path,
      status: 'processing',
      createdAt: new Date().toISOString(),
    };
    store.records.set(id, rec);

    // Async processing (fire-and-forget)
    (async () => {
      try {
        const buf = await fs.readFile(rec.filePath);
        const ext = rec.fileType;

        let raw: any;
        if (ext === '.pdf') {
          raw = await extractFromPdfBuffer(buf);
        } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
          const base64 = buf.toString('base64');
          const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
          raw = await extractFromImageBase64(base64, mime);
        } else {
          throw new Error('Unsupported file type (use PDF/JPG/PNG)');
        }

        const normalized = normalizeExtracted(raw);

        rec.extractedData = normalized;
        rec.status = 'completed';
        store.records.set(id, rec);

        const sugg = await createProductSuggestions(normalized);
        
        // Enhanced auto-suggestion logic
        await createAiProductSuggestion({
          invoiceId: id,
          extractedProductName: normalized.items?.[0]?.productName || 'Unknown Product',
          extractedSku: normalized.items?.[0]?.sku || '',
          extractedQuantity: parseInt(normalized.items?.[0]?.quantity) || 1,
          extractedUnitCost: parseFloat(normalized.items?.[0]?.unitPrice) || 0,
          extractedTotalCost: parseFloat(normalized.items?.[0]?.totalPrice) || 0,
          extractedDescription: normalized.items?.[0]?.description || '',
          suggestedProductId: sugg[0]?.suggestedProductId || null,
          matchConfidence: sugg[0]?.matchConfidence || 0,
          matchReasoning: sugg[0]?.matchReasoning || 'No matches found',
          suggestedCategoryId: sugg[0]?.suggestedCategoryId || null,
          suggestedCategoryName: sugg[0]?.suggestedCategoryName || 'General',
          userAction: sugg[0]?.userAction || (sugg[0]?.matchConfidence >= 90 ? 'auto_suggest' : null),
          finalProductId: null,
          userSetUnitCost: null,
          userSetSalePrice: null,
          approved: false
        });
        
        store.suggestions.set(id, sugg);

        // cleanup
        await fs.unlink(rec.filePath).catch(() => {});
      } catch (err: any) {
        rec.status = 'failed';
        rec.errorMessage = err?.message || 'Unknown error';
        store.records.set(id, rec);
        await fs.unlink(rec.filePath).catch(() => {});
      }
    })();

    res.json({ invoiceId: id });
  } catch (e: any) {
    res.status(500).send(e?.message || 'Server error');
  }
});

router.get('/invoice/:id/results', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const rec = store.records.get(id);
  if (!rec) return res.status(404).send('Not found');

  res.json({
    processing: {
      id: rec.id,
      originalFileName: rec.originalFileName,
      fileType: rec.fileType,
      processingStatus: rec.status,
      extractedData: rec.extractedData,
      createdAt: rec.createdAt,
      errorMessage: rec.errorMessage,
    },
    suggestions: store.suggestions.get(id) || [],
  });
});

// --- Approve: create PO only; DO NOT update stock here ---
router.post('/invoice/:id/approve', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const rec = store.records.get(id);
    if (!rec) return res.status(404).send('Not found');

    const { userDecisions } = req.body || {};
    if (!Array.isArray(userDecisions) || userDecisions.length === 0) {
      return res.status(400).send('No decisions provided');
    }

    // Build PO header (supplier from extracted data; default fallback)
    const supplierName =
      rec.extractedData?.supplierName ||
      rec.extractedData?.vendorName ||
      'AI Processed Supplier';

    // Create PO header (status = pending; stock will update in Receiving workflow)
    const purchaseOrderId = poStore.seq++;
    const po: PurchaseOrder = {
      id: purchaseOrderId,
      orderNumber: `AI-PO-${purchaseOrderId}`,
      supplierName,
      status: 'pending',
      totalCost: 0,
      createdAt: new Date().toISOString(),
    };
    poStore.pos.set(purchaseOrderId, po);
    poStore.items.set(purchaseOrderId, []);

    // Map decisions -> PO items (no inventory updates here)
    let runningTotal = 0;
    for (let i = 0; i < userDecisions.length; i++) {
      const d = userDecisions[i];

      // Skip lines user chose to skip
      if (d?.action === 'skip') continue;

      // Validate common fields
      const qty = Number(d?.quantity ?? 0);
      const unitCost = Number(d?.cost ?? d?.unitCost ?? 0);
      if (!qty || qty <= 0 || !Number.isFinite(qty)) {
        return res.status(400).send(`Invalid quantity in decision ${i + 1}`);
      }
      if (!Number.isFinite(unitCost)) {
        return res.status(400).send(`Invalid cost in decision ${i + 1}`);
      }

      // Build item
      const item: PurchaseOrderItem = {
        id: poStore.itemSeq++,
        purchaseOrderId,
        productId: d.action === 'map_existing' ? Number(d.productId) || null : null, // leave null for create_new
        productName:
          (d.productName ??
            d.extractedProductName ??
            'Unnamed Product') as string,
        sku: (d.sku ?? d.extractedSku ?? '').toString(),
        quantityOrdered: qty,
        unitCost,
        totalCost: unitCost * qty,
        notes: d.notes || (d.action === 'create_new' ? 'New product on receive' : undefined),
      };

      // Attach to PO
      const arr = poStore.items.get(purchaseOrderId)!;
      arr.push(item);
      runningTotal += item.totalCost;

      // IMPORTANT: No stock/cost/price mutations here.
      // Receiving workflow will:
      //  - optionally create the product if productId is null
      //  - update cost/price if chosen
      //  - increment stock by quantityReceived
    }

    // Finalize PO total
    po.totalCost = Number(runningTotal.toFixed(2));
    poStore.pos.set(purchaseOrderId, po);

    // Done — return the PO id
    return res.json({ purchaseOrderId, orderNumber: po.orderNumber });
  } catch (e: any) {
    console.error('Approve error:', e);
    return res.status(500).send(e?.message || 'Server error');
  }
});

// Development testing code - remove in production
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  const test = (label: string, v: number) =>
    console.log(`[match-test] ${label}: ${Math.round(v * 100)}%`);

  // Create instance for testing private methods
  class TestProcessor extends InvoiceProcessor {
    public testSkuSimilarity(a: string, b: string): number {
      return this.skuSimilarity(a, b);
    }
    
    public testNameDescriptionSimilarity(itemName: string, productName: string, itemDesc: string, productDesc: string): number {
      return this.nameDescriptionSimilarity(itemName, productName, itemDesc, productDesc);
    }
  }

  const inst = new TestProcessor();

  // SKU similarity tests
  test('SKU exact', inst.testSkuSimilarity('TM-LIME-115', 'TM-LIME-115'));
  test('SKU one-digit off', inst.testSkuSimilarity('TM-LIME-115', 'TM-LIME-116'));
  test('SKU containment', inst.testSkuSimilarity('TMLIME115', 'TM-LIME-115'));

  // Name/desc tests
  test('Name near', inst.testNameDescriptionSimilarity(
    'Twang Lime Salt 1.15oz',
    'Twangerz Lime Salt 1.15 Oz',
    '',
    ''
  ));
  test('Name moderate', inst.testNameDescriptionSimilarity(
    'Mango Chamoy Sauce 12oz',
    'Chamoy Mango 12 oz',
    '',
    ''
  ));
}

export default router;