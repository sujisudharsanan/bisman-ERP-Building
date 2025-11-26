/**
 * 🔍 useOcrUpload Hook
 * 
 * React hook for handling bill upload and OCR processing
 * Features:
 * - File upload with progress
 * - OCR processing
 * - Parsed field extraction
 * - Error handling
 */

import { useState, useCallback } from 'react';

// ==========================================
// TYPES
// ==========================================

export interface ParsedBillData {
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
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

export interface OcrResult {
  billId: string;
  ocrStatus: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  ocrText: string;
  parsed: ParsedBillData;
  suggestedTask: SuggestedTask;
  processingTime: number;
  confidence: number;
}

export interface OcrError {
  message: string;
  code?: string;
}

export interface UseOcrUploadReturn {
  uploadBill: (file: File) => Promise<OcrResult | null>;
  isUploading: boolean;
  isProcessing: boolean;
  progress: number;
  error: OcrError | null;
  result: OcrResult | null;
  reset: () => void;
}

// ==========================================
// HOOK
// ==========================================

export function useOcrUpload(): UseOcrUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<OcrError | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);

  /**
   * Upload bill file and run OCR
   */
  const uploadBill = useCallback(async (file: File): Promise<OcrResult | null> => {
    try {
      // Reset state
      setError(null);
      setResult(null);
      setProgress(0);
      setIsUploading(true);

      // Validate file
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/tiff',
        'image/bmp',
        'application/pdf',
      ];

      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload an image or PDF.');
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 10MB.');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload and process
      setProgress(30);
      setIsProcessing(true);

      const response = await fetch('/api/bills', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'OCR processing failed');
      }

      // Extract result
      const ocrResult: OcrResult = {
        billId: data.billId,
        ocrStatus: data.ocrStatus,
        ocrText: data.ocrText,
        parsed: data.parsed,
        suggestedTask: data.suggestedTask,
        processingTime: data.processingTime,
        confidence: data.confidence,
      };

      setResult(ocrResult);
      return ocrResult;
    } catch (err: any) {
      const ocrError: OcrError = {
        message: err.message || 'Failed to process bill',
        code: err.code,
      };
      setError(ocrError);
      return null;
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  }, []);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setIsUploading(false);
    setIsProcessing(false);
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  return {
    uploadBill,
    isUploading,
    isProcessing,
    progress,
    error,
    result,
    reset,
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Check if file is a bill (image or PDF)
 */
export function isBillFile(file: File): boolean {
  const billTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/tiff',
    'image/bmp',
    'application/pdf',
  ];
  return billTypes.includes(file.type);
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€';
  return `${symbol}${amount.toLocaleString('en-IN', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Get confidence color
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-green-500';
  if (confidence >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'Excellent';
  if (confidence >= 80) return 'Good';
  if (confidence >= 70) return 'Fair';
  if (confidence >= 60) return 'Low';
  return 'Very Low';
}

/**
 * Create task from OCR result
 */
export async function createTaskFromBill(
  billId: string,
  taskData: {
    title: string;
    description: string;
    dueDate?: string;
    assigneeId: number;
    priority: string;
    serialNumber: string;
  }
): Promise<any> {
  const response = await fetch(`/api/bills/${billId}/create-task`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create task');
  }

  const data = await response.json();
  return data.task;
}

/**
 * Get bill details
 */
export async function getBillDetails(billId: string): Promise<any> {
  const response = await fetch(`/api/bills/${billId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch bill details');
  }

  const data = await response.json();
  return data.bill;
}

/**
 * List user's bills
 */
export async function listBills(options: {
  status?: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  limit?: number;
  offset?: number;
} = {}): Promise<{ bills: any[]; pagination: any }> {
  const params = new URLSearchParams();
  if (options.status) params.append('status', options.status);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());

  const response = await fetch(`/api/bills?${params}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch bills');
  }

  const data = await response.json();
  return {
    bills: data.bills,
    pagination: data.pagination,
  };
}
