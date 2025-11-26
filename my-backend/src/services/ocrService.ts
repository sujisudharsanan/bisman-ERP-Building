/**
 * 📄 OCR Service - Tesseract Integration (Production Ready)
 * 
 * Enhancements:
 * - Env-driven configuration (language, timeouts, concurrency, page limits)
 * - Concurrency semaphore to avoid CPU overload
 * - Timeout wrapper for Tesseract call
 * - PDF page limiting to prevent huge resource usage
 * - Extended OcrResult (pagesProcessed, debug)
 * - Stale temp file cleanup helper
 */

import tesseract from 'node-tesseract-ocr';
import pdf from 'pdf-poppler';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { parse, isValid, format } from 'date-fns';

// Runtime environment configuration
const env = (n: string, fb?: string) => process.env[n] || fb;
const OCR_RUNTIME = {
  LANG: env('OCR_LANG', 'eng'),
  TIMEOUT_MS: parseInt(env('OCR_TIMEOUT_MS', '120000')),
  MAX_PDF_PAGES: parseInt(env('OCR_MAX_PDF_PAGES', '10')),
  MAX_CONCURRENCY: parseInt(env('OCR_MAX_CONCURRENCY', '2')),
  ENABLE_DEBUG: env('OCR_ENABLE_DEBUG', '0') === '1',
  TEMP_MAX_AGE_MS: parseInt(env('OCR_TEMP_MAX_AGE_MS', '3600000')), // 1h
};

let activeJobs = 0;
const waiters: Array<() => void> = [];
async function acquireSlot(): Promise<void> {
  if (activeJobs < OCR_RUNTIME.MAX_CONCURRENCY) { activeJobs++; return; }
  await new Promise<void>(r => waiters.push(r));
  activeJobs++;
}
function releaseSlot() {
  activeJobs = Math.max(0, activeJobs - 1);
  const nxt = waiters.shift(); if (nxt) nxt();
}

// ==========================================
// TYPES
// ==========================================

export interface OcrResult {
  success: boolean;
  text: string;
  confidence?: number;
  processingTime: number;
  error?: string;
  pagesProcessed?: number;
  debug?: any;
}

export interface ParsedInvoiceData {
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string; // ISO format
  dueDate?: string; // ISO format
  totalAmount?: number;
  currency?: string;
  taxAmount?: number;
  subtotal?: number;
  confidence: number;
}

export interface SuggestedTask {
  title: string;
  description: string;
  dueDate?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

// ==========================================
// CONFIGURATION
// ==========================================

const OCR_CONFIG = {
  lang: OCR_RUNTIME.LANG,
  oem: 1, // OCR Engine Mode: 1 = LSTM only
  psm: 3, // Page Segmentation Mode: 3 = Fully automatic
  timeout: OCR_RUNTIME.TIMEOUT_MS, // 2 minutes timeout
};

const TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');

// Ensure temp directory exists
const ensureTempDir = async () => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('[OCR] Failed to create temp directory:', error);
  }
};

// ==========================================
// IMAGE PRE-PROCESSING
// ==========================================

/**
 * Pre-process image to improve OCR accuracy
 * - Convert to grayscale
 * - Enhance contrast
 * - Resize if needed
 */
export async function preprocessImage(imagePath: string): Promise<string> {
  try {
    const processedPath = path.join(
      TEMP_DIR,
      `processed_${Date.now()}_${path.basename(imagePath)}`
    );

    await sharp(imagePath)
      .grayscale()
      .normalize() // Auto-adjust contrast
      .sharpen()
      .resize(null, 2000, { // Resize to ~300 DPI equivalent
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFile(processedPath);

    console.log(`[OCR] Image preprocessed: ${processedPath}`);
    return processedPath;
  } catch (error) {
    console.error('[OCR] Image preprocessing failed:', error);
    return imagePath; // Return original if preprocessing fails
  }
}

// ==========================================
// PDF CONVERSION
// ==========================================

/**
 * Convert PDF pages to images for OCR processing
 */
export async function convertPdfToImages(pdfPath: string): Promise<string[]> {
  await ensureTempDir();

  const outputPrefix = path.join(
    TEMP_DIR,
    `pdf_${Date.now()}_page`
  );

  try {
    const opts = {
      format: 'jpeg',
      out_dir: TEMP_DIR,
      out_prefix: path.basename(outputPrefix),
      page: null, // All pages
    };

    await pdf.convert(pdfPath, opts);

    // Find generated images
    const files = await fs.readdir(TEMP_DIR);
    const imageFiles = files
      .filter(f => f.startsWith(path.basename(outputPrefix)))
      .map(f => path.join(TEMP_DIR, f))
      .sort();

    console.log(`[OCR] PDF converted to ${imageFiles.length} images`);
    return imageFiles;
  } catch (error) {
    console.error('[OCR] PDF conversion failed:', error);
    throw new Error('Failed to convert PDF to images');
  }
}

// ==========================================
// CORE OCR PROCESSING
// ==========================================

/**
 * Run OCR on a single image file
 */
export async function runOcrOnImage(imagePath: string): Promise<OcrResult> {
  const startTime = Date.now();
  try {
    console.log(`[OCR] Processing image: ${imagePath}`);

    // Preprocess image
    const processedPath = await preprocessImage(imagePath);

    await acquireSlot();

    // Run Tesseract OCR with timeout
    const text = await Promise.race([
      tesseract.recognize(processedPath, OCR_CONFIG),
      new Promise<string>((_, rej) => setTimeout(() => rej(new Error('OCR timeout exceeded')), OCR_RUNTIME.TIMEOUT_MS))
    ]);

    const processingTime = Date.now() - startTime;

    // Clean up processed image if different from original
    if (processedPath !== imagePath) {
      await fs.unlink(processedPath).catch(() => {});
    }

    console.log(`[OCR] Completed in ${processingTime}ms - Extracted ${String(text).length} characters`);

    return {
      success: true,
      text: String(text).trim(),
      processingTime,
      confidence: 85, // Tesseract doesn't easily expose per-page confidence
      pagesProcessed: 1,
      debug: OCR_RUNTIME.ENABLE_DEBUG ? { config: OCR_CONFIG } : undefined,
    };
  } catch (error: any) {
    console.error('[OCR] Processing failed:', error);
    return {
      success: false,
      text: '',
      processingTime: Date.now() - startTime,
      error: error.message || 'OCR processing failed',
      pagesProcessed: 1,
      debug: OCR_RUNTIME.ENABLE_DEBUG ? { error: error.message } : undefined,
    };
  } finally {
    releaseSlot();
  }
}

/**
 * Process a file (image or PDF) and extract text
 */
export async function processFile(filePath: string, fileType: string): Promise<OcrResult> {
  await ensureTempDir();
  try {
    // Handle PDF files
    if (fileType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
      console.log('[OCR] Processing PDF file');
      let imageFiles = await convertPdfToImages(filePath);

      // Limit pages if too many
      if (imageFiles.length > OCR_RUNTIME.MAX_PDF_PAGES) {
        console.log(`[OCR] Limiting PDF pages from ${imageFiles.length} to ${OCR_RUNTIME.MAX_PDF_PAGES}`);
        imageFiles = imageFiles.slice(0, OCR_RUNTIME.MAX_PDF_PAGES);
      }

      if (imageFiles.length === 0) {
        return {
          success: false,
          text: '',
          processingTime: 0,
          error: 'No pages found in PDF',
          pagesProcessed: 0,
        };
      }

      // Process each page
      const results: OcrResult[] = [];
      for (const imagePath of imageFiles) {
        const result = await runOcrOnImage(imagePath);
        results.push(result);

        // Clean up temp image
        await fs.unlink(imagePath).catch(() => {});
      }

      // Combine results
      const combinedText = results
        .filter(r => r.success)
        .map(r => r.text)
        .join('\n\n--- PAGE BREAK ---\n\n');

      const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);

      return {
        success: results.some(r => r.success),
        text: combinedText,
        processingTime: totalTime,
        confidence: results.length > 0
          ? results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length
          : 0,
        pagesProcessed: imageFiles.length,
        debug: OCR_RUNTIME.ENABLE_DEBUG ? { pages: imageFiles.length } : undefined,
      };
    }

    // Handle image files
    return await runOcrOnImage(filePath);
  } catch (error: any) {
    console.error('[OCR] File processing failed:', error);
    return {
      success: false,
      text: '',
      processingTime: 0,
      error: error.message || 'File processing failed',
      pagesProcessed: 0,
      debug: OCR_RUNTIME.ENABLE_DEBUG ? { error: error.message } : undefined,
    };
  }
}

// ==========================================
// INVOICE PARSING
// ==========================================

/**
 * Parse invoice/bill data from OCR text
 * Uses regex and keyword detection
 */
export function parseInvoiceData(ocrText: string): ParsedInvoiceData {
  const lines = ocrText.split('\n').map(line => line.trim());
  const fullText = ocrText.toLowerCase();

  const result: ParsedInvoiceData = {
    confidence: 0,
  };

  let matchCount = 0;

  // ========== 1. VENDOR NAME ==========
  // Look for company name patterns (usually at top)
  const vendorPatterns = [
    /(?:from|vendor|supplier|company)[\s:]+([A-Z][A-Za-z\s&,.]+)/i,
    /^([A-Z][A-Za-z\s&,.]{5,40})$/m, // Capitalized line (first few lines)
  ];

  for (const pattern of vendorPatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      result.vendorName = match[1].trim();
      matchCount++;
      break;
    }
  }

  // If not found, try first capitalized line
  if (!result.vendorName) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      if (line.length > 10 && line.length < 50 && /^[A-Z]/.test(line)) {
        result.vendorName = line;
        matchCount += 0.5;
        break;
      }
    }
  }

  // ========== 2. INVOICE NUMBER ==========
  const invoicePatterns = [
    /(?:invoice|inv|bill)[\s#:no.]+([A-Z0-9\-\/]+)/i,
    /(?:ref|reference)[\s#:no.]+([A-Z0-9\-\/]+)/i,
    /#([A-Z0-9\-]{5,20})/i,
  ];

  for (const pattern of invoicePatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      result.invoiceNumber = match[1].trim();
      matchCount++;
      break;
    }
  }

  // ========== 3. INVOICE DATE ==========
  const datePatterns = [
    /(?:invoice date|date|issued)[\s:]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
  ];

  for (const pattern of datePatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      const parsedDate = parseDate(match[1]);
      if (parsedDate) {
        result.invoiceDate = parsedDate;
        matchCount++;
        break;
      }
    }
  }

  // ========== 4. DUE DATE ==========
  const dueDatePatterns = [
    /(?:due date|payment due|pay by)[\s:]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
  ];

  for (const pattern of dueDatePatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      const parsedDate = parseDate(match[1]);
      if (parsedDate) {
        result.dueDate = parsedDate;
        matchCount++;
        break;
      }
    }
  }

  // ========== 5. TOTAL AMOUNT ==========
  const amountPatterns = [
    /(?:total|amount due|grand total|balance)[\s:₹$€£]*([0-9,]+\.?\d{0,2})/i,
    /(?:total|₹|rs\.?)[\s:]*([0-9,]+\.?\d{0,2})/i,
  ];

  for (const pattern of amountPatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) {
        result.totalAmount = amount;
        matchCount++;
        break;
      }
    }
  }

  // Detect currency
  if (fullText.includes('₹') || fullText.includes('inr') || fullText.includes('rs')) {
    result.currency = 'INR';
  } else if (fullText.includes('$') || fullText.includes('usd')) {
    result.currency = 'USD';
  } else if (fullText.includes('€') || fullText.includes('eur')) {
    result.currency = 'EUR';
  }

  // ========== 6. TAX AMOUNT ==========
  const taxPatterns = [
    /(?:tax|gst|vat)[\s:₹$€£]*([0-9,]+\.?\d{0,2})/i,
  ];

  for (const pattern of taxPatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      const tax = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(tax) && tax > 0) {
        result.taxAmount = tax;
        break;
      }
    }
  }

  // ========== 7. SUBTOTAL ==========
  const subtotalPatterns = [
    /(?:subtotal|sub-total)[\s:₹$€£]*([0-9,]+\.?\d{0,2})/i,
  ];

  for (const pattern of subtotalPatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      const subtotal = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(subtotal) && subtotal > 0) {
        result.subtotal = subtotal;
        break;
      }
    }
  }

  // Calculate confidence based on matches
  result.confidence = Math.min(100, (matchCount / 5) * 100); // 5 key fields

  console.log(`[OCR] Parsed invoice data with ${result.confidence.toFixed(0)}% confidence:`, result);

  return result;
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: string): string | null {
  const formats = [
    'dd/MM/yyyy',
    'dd-MM-yyyy',
    'MM/dd/yyyy',
    'MM-dd-yyyy',
    'yyyy-MM-dd',
    'yyyy/MM/dd',
    'dd/MM/yy',
    'dd-MM-yy',
  ];

  for (const formatStr of formats) {
    try {
      const parsed = parse(dateStr, formatStr, new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}

// ==========================================
// TASK SUGGESTION
// ==========================================

/**
 * Generate suggested task from parsed invoice data
 */
export function generateSuggestedTask(parsed: ParsedInvoiceData, ocrText: string): SuggestedTask {
  const currency = parsed.currency || 'INR';
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€';

  // Generate title
  let title = 'Payment';
  if (parsed.vendorName) {
    title += ` – ${parsed.vendorName}`;
  }
  if (parsed.totalAmount) {
    title += ` – ${symbol}${parsed.totalAmount.toLocaleString()}`;
  }

  // Generate description
  let description = '📄 **Invoice Payment Request**\n\n';

  if (parsed.vendorName) {
    description += `**Vendor:** ${parsed.vendorName}\n`;
  }
  if (parsed.invoiceNumber) {
    description += `**Invoice #:** ${parsed.invoiceNumber}\n`;
  }
  if (parsed.invoiceDate) {
    description += `**Invoice Date:** ${parsed.invoiceDate}\n`;
  }
  if (parsed.dueDate) {
    description += `**Due Date:** ${parsed.dueDate}\n`;
  }
  if (parsed.totalAmount) {
    description += `**Total Amount:** ${symbol}${parsed.totalAmount.toLocaleString()}\n`;
  }
  if (parsed.taxAmount) {
    description += `**Tax Amount:** ${symbol}${parsed.taxAmount.toLocaleString()}\n`;
  }

  description += '\n---\n\n';
  description += '**OCR Extract (First 500 chars):**\n';
  description += '```\n';
  description += ocrText.substring(0, 500);
  if (ocrText.length > 500) {
    description += '...';
  }
  description += '\n```';

  // Determine priority based on due date
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
  if (parsed.dueDate) {
    const dueDate = new Date(parsed.dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 3) {
      priority = 'URGENT';
    } else if (daysUntilDue < 7) {
      priority = 'HIGH';
    } else if (daysUntilDue < 14) {
      priority = 'MEDIUM';
    } else {
      priority = 'LOW';
    }
  }

  // Use amount as priority factor
  if (parsed.totalAmount && parsed.totalAmount > 100000) {
    if (priority === 'LOW') priority = 'MEDIUM';
    if (priority === 'MEDIUM') priority = 'HIGH';
  }

  return {
    title,
    description,
    dueDate: parsed.dueDate,
    priority,
  };
}

// ==========================================
// CLEANUP
// ==========================================

/**
 * Clean up temporary files
 */
export async function cleanupTempFiles(filePatterns: string[]) {
  for (const pattern of filePatterns) {
    try {
      await fs.unlink(pattern);
      console.log(`[OCR] Cleaned up: ${pattern}`);
    } catch (error) {
      // Ignore errors (file may not exist)
    }
  }
}

/**
 * Clean up stale temporary files
 */
export async function cleanupStaleTempFiles() {
  try {
    await ensureTempDir();
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    for (const f of files) {
      const full = path.join(TEMP_DIR, f);
      try {
        const stat = await fs.stat(full);
        if (now - stat.mtimeMs > OCR_RUNTIME.TEMP_MAX_AGE_MS) {
          await fs.unlink(full).catch(()=>{});
          if (OCR_RUNTIME.ENABLE_DEBUG) console.log('[OCR] Purged stale temp file:', full);
        }
      } catch {}
    }
  } catch (e:any) {
    console.error('[OCR] Stale cleanup failed:', e.message);
  }
}
