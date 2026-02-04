/**
 * ============================================================================
 * BISMAN ERP - Asset Validation Schema
 * ============================================================================
 * 
 * Centralized validation rules for asset data.
 * Used by both frontend and backend for consistent validation.
 * 
 * @module validation/assetValidation
 */

// ============================================================================
// Constants
// ============================================================================

export const ASSET_STATUSES = [
  'draft',
  'pending_approval',
  'active',
  'inactive',
  'under_maintenance',
  'retired',
  'disposed',
  'lost',
  'sold'
] as const;

export const ASSET_CONDITIONS = [
  'new',
  'excellent',
  'good',
  'fair',
  'poor',
  'damaged'
] as const;

export const FILE_CATEGORIES = [
  'invoice',
  'warranty',
  'manual',
  'image',
  'certificate',
  'insurance',
  'general'
] as const;

export const DEPRECIATION_METHODS = [
  'straight_line',
  'declining_balance',
  'double_declining',
  'sum_of_years',
  'units_of_production'
] as const;

// File upload limits
export const FILE_LIMITS = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  maxSizeMB: 10,
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
};

// ============================================================================
// Types
// ============================================================================

export type AssetStatus = typeof ASSET_STATUSES[number];
export type AssetCondition = typeof ASSET_CONDITIONS[number];
export type FileCategory = typeof FILE_CATEGORIES[number];
export type DepreciationMethod = typeof DEPRECIATION_METHODS[number];

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface AssetData {
  name?: string;
  asset_code?: string;
  description?: string;
  category_id?: number | null;
  asset_type?: string;
  serial_number?: string;
  model_number?: string;
  manufacturer?: string;
  purchase_date?: string | Date;
  purchase_cost?: number | string;
  current_value?: number | string;
  salvage_value?: number | string;
  warranty_expiry?: string | Date;
  vendor_name?: string;
  vendor_contact?: string;
  location_name?: string;
  department?: string;
  assigned_to_user_id?: number | null;
  assigned_to_name?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  notes?: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate required string field
 */
export function validateRequired(value: any, fieldName: string): ValidationError | null {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return {
      field: fieldName,
      message: `${fieldName} is required`,
      code: 'REQUIRED',
    };
  }
  return null;
}

/**
 * Validate string length
 */
export function validateLength(
  value: string | undefined,
  fieldName: string,
  min: number,
  max: number
): ValidationError | null {
  if (!value) return null;
  
  if (value.length < min) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${min} characters`,
      code: 'TOO_SHORT',
    };
  }
  
  if (value.length > max) {
    return {
      field: fieldName,
      message: `${fieldName} must be less than ${max} characters`,
      code: 'TOO_LONG',
    };
  }
  
  return null;
}

/**
 * Validate asset code format
 */
export function validateAssetCode(value: string | undefined): ValidationError | null {
  if (!value) return null;
  
  const pattern = /^[A-Z0-9\-_]{3,50}$/i;
  if (!pattern.test(value)) {
    return {
      field: 'asset_code',
      message: 'Asset code can only contain letters, numbers, hyphens, and underscores (3-50 characters)',
      code: 'INVALID_FORMAT',
    };
  }
  
  return null;
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(
  value: number | string | undefined,
  fieldName: string
): ValidationError | null {
  if (value === undefined || value === null || value === '') return null;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return {
      field: fieldName,
      message: `${fieldName} must be a valid number`,
      code: 'INVALID_NUMBER',
    };
  }
  
  if (num < 0) {
    return {
      field: fieldName,
      message: `${fieldName} cannot be negative`,
      code: 'NEGATIVE_VALUE',
    };
  }
  
  return null;
}

/**
 * Validate date format
 */
export function validateDate(
  value: string | Date | undefined,
  fieldName: string
): ValidationError | null {
  if (!value) return null;
  
  const date = value instanceof Date ? value : new Date(value);
  
  if (isNaN(date.getTime())) {
    return {
      field: fieldName,
      message: `${fieldName} must be a valid date`,
      code: 'INVALID_DATE',
    };
  }
  
  return null;
}

/**
 * Validate date range (end must be after start)
 */
export function validateDateRange(
  startValue: string | Date | undefined,
  endValue: string | Date | undefined,
  startFieldName: string,
  endFieldName: string
): ValidationError | null {
  if (!startValue || !endValue) return null;
  
  const startDate = startValue instanceof Date ? startValue : new Date(startValue);
  const endDate = endValue instanceof Date ? endValue : new Date(endValue);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  
  if (endDate < startDate) {
    return {
      field: endFieldName,
      message: `${endFieldName} must be after ${startFieldName}`,
      code: 'INVALID_DATE_RANGE',
    };
  }
  
  return null;
}

/**
 * Validate enum value
 */
export function validateEnum<T extends readonly string[]>(
  value: string | undefined,
  fieldName: string,
  allowedValues: T
): ValidationError | null {
  if (!value) return null;
  
  if (!allowedValues.includes(value as any)) {
    return {
      field: fieldName,
      message: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      code: 'INVALID_ENUM',
    };
  }
  
  return null;
}

/**
 * Validate file
 */
export function validateFile(
  file: { size: number; type: string; name: string }
): ValidationError | null {
  if (file.size > FILE_LIMITS.maxSizeBytes) {
    return {
      field: 'file',
      message: `File size must be less than ${FILE_LIMITS.maxSizeMB}MB`,
      code: 'FILE_TOO_LARGE',
    };
  }
  
  if (!FILE_LIMITS.allowedTypes.includes(file.type)) {
    return {
      field: 'file',
      message: `File type not allowed. Allowed types: ${FILE_LIMITS.allowedExtensions.join(', ')}`,
      code: 'INVALID_FILE_TYPE',
    };
  }
  
  return null;
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate asset data for create/update operations
 */
export function validateAssetData(
  data: AssetData,
  options: { isUpdate?: boolean } = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const { isUpdate = false } = options;
  
  // Required fields (for create)
  if (!isUpdate) {
    const nameError = validateRequired(data.name, 'name');
    if (nameError) errors.push(nameError);
  }
  
  // Name length
  const nameLengthError = validateLength(data.name, 'name', 1, 200);
  if (nameLengthError) errors.push(nameLengthError);
  
  // Asset code format
  const assetCodeError = validateAssetCode(data.asset_code);
  if (assetCodeError) errors.push(assetCodeError);
  
  // Description length
  const descLengthError = validateLength(data.description, 'description', 0, 2000);
  if (descLengthError) errors.push(descLengthError);
  
  // Serial number length
  const serialError = validateLength(data.serial_number, 'serial_number', 0, 100);
  if (serialError) errors.push(serialError);
  
  // Financial validations
  const purchaseCostError = validatePositiveNumber(data.purchase_cost, 'purchase_cost');
  if (purchaseCostError) errors.push(purchaseCostError);
  
  const currentValueError = validatePositiveNumber(data.current_value, 'current_value');
  if (currentValueError) errors.push(currentValueError);
  
  const salvageValueError = validatePositiveNumber(data.salvage_value, 'salvage_value');
  if (salvageValueError) errors.push(salvageValueError);
  
  // Date validations
  const purchaseDateError = validateDate(data.purchase_date, 'purchase_date');
  if (purchaseDateError) errors.push(purchaseDateError);
  
  const warrantyExpiryError = validateDate(data.warranty_expiry, 'warranty_expiry');
  if (warrantyExpiryError) errors.push(warrantyExpiryError);
  
  // Date range validation
  const dateRangeError = validateDateRange(
    data.purchase_date,
    data.warranty_expiry,
    'purchase_date',
    'warranty_expiry'
  );
  if (dateRangeError) errors.push(dateRangeError);
  
  // Enum validations
  if (data.status) {
    const statusError = validateEnum(data.status, 'status', ASSET_STATUSES);
    if (statusError) errors.push(statusError);
  }
  
  if (data.condition) {
    const conditionError = validateEnum(data.condition, 'condition', ASSET_CONDITIONS);
    if (conditionError) errors.push(conditionError);
  }
  
  // Notes length
  const notesError = validateLength(data.notes, 'notes', 0, 5000);
  if (notesError) errors.push(notesError);
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  return errors.reduce((acc, err) => {
    acc[err.field] = err.message;
    return acc;
  }, {} as Record<string, string>);
}

// Default export for CommonJS compatibility
module.exports = {
  ASSET_STATUSES,
  ASSET_CONDITIONS,
  FILE_CATEGORIES,
  DEPRECIATION_METHODS,
  FILE_LIMITS,
  validateRequired,
  validateLength,
  validateAssetCode,
  validatePositiveNumber,
  validateDate,
  validateDateRange,
  validateEnum,
  validateFile,
  validateAssetData,
  formatValidationErrors,
};
