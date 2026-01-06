import { NextRequest, NextResponse } from 'next/server';

/**
 * Input validation utilities for API endpoints
 * Provides protection against common injection attacks and malformed data
 */

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  objectId: /^[0-9a-fA-F]{24}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  slug: /^[a-zA-Z0-9-_]+$/,
  safeString: /^[a-zA-Z0-9\s\-_.@]*$/,
  url: /^https?:\/\/.+/,
  contact: /^\+?[\d\s\-\(\)]+$/,
  filename: /^[a-zA-Z0-9\-_.]+$/,
};

// Maximum lengths for common fields
export const MAX_LENGTHS = {
  email: 254,
  name: 100,
  description: 1000,
  url: 2048,
  filename: 255,
  title: 200,
  message: 2000,
  shortText: 50,
  mediumText: 500,
};

/**
 * Valid input value types that can be validated
 * Note: Arrays and objects can contain nested values of the same types
 */
export type ValidInputValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ValidInputValue[]
  | { [key: string]: ValidInputValue };

/**
 * Validated input data structure (top-level object)
 */
export type ValidatedInputData = { [key: string]: ValidInputValue };

export interface ValidationRule {
  required?: boolean;
  type?:
    | 'string'
    | 'number'
    | 'boolean'
    | 'array'
    | 'object'
    | 'email'
    | 'objectId'
    | 'url';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  allowedValues?: (string | number)[];
  customValidator?: (value: ValidInputValue) => boolean;
  sanitize?: boolean; // Whether to sanitize HTML/script tags
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(`${field}: ${message}`);
    this.name = 'ValidationError';
  }
}

/**
 * Type validation helper
 */
function validateType(value: ValidInputValue, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return (
        value !== null && typeof value === 'object' && !Array.isArray(value)
      );
    case 'email':
      return typeof value === 'string' && VALIDATION_PATTERNS.email.test(value);
    case 'objectId':
      return (
        typeof value === 'string' && VALIDATION_PATTERNS.objectId.test(value)
      );
    case 'url':
      return typeof value === 'string' && VALIDATION_PATTERNS.url.test(value);
    default:
      return true;
  }
}

function containsHtmlOrScript(value: string): boolean {
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b/gi,
    /<embed\b/gi,
    /<form\b/gi,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(value));
}

/**
 * Validates input data against a schema
 */
export function validateInput(
  data: ValidInputValue,
  schema: ValidationSchema,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for null/undefined data
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  // Type guard: data is now a ValidatedInputData
  const dataRecord = data as ValidatedInputData;

  for (const [field, rules] of Object.entries(schema)) {
    const value = dataRecord[field];

    // Required field check
    if (
      rules.required &&
      (value === undefined || value === null || value === '')
    ) {
      errors.push(`${field} is required`);
      // eslint-disable-next-line no-continue
      continue;
    }

    // Skip validation if field is optional and not provided
    if (!rules.required && (value === undefined || value === null)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // Type validation
    if (rules.type) {
      if (!validateType(value, rules.type)) {
        errors.push(`${field} must be of type ${rules.type}`);
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    // String-specific validations
    if (typeof value === 'string') {
      // Length validation
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(
          `${field} must be no more than ${rules.maxLength} characters`,
        );
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} has invalid format`);
      }

      // Sanitization check (detect potential XSS)
      if (rules.sanitize && containsHtmlOrScript(value)) {
        errors.push(`${field} contains invalid characters`);
      }
    }

    // Number-specific validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${field} must be no more than ${rules.max}`);
      }
    }

    // Array validation
    if (Array.isArray(value) && rules.maxLength) {
      if (value.length > rules.maxLength) {
        errors.push(`${field} can have at most ${rules.maxLength} items`);
      }
    }

    // Allowed values validation
    if (rules.allowedValues) {
      const isValidValue =
        (typeof value === 'string' || typeof value === 'number') &&
        rules.allowedValues.includes(value as string | number);

      if (!isValidValue) {
        errors.push(
          `${field} must be one of: ${rules.allowedValues.join(', ')}`,
        );
      }
    }

    // Custom validation
    if (rules.customValidator && !rules.customValidator(value)) {
      errors.push(`${field} is invalid`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Sanitizes string input by removing dangerous HTML
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<object\b[^>]*>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<form\b[^>]*>/gi, '')
    .trim();
}

/**
 * Validates query parameters
 * Note: Query params are always strings, so number types will be converted
 */
export function validateQueryParams(
  searchParams: URLSearchParams,
  schema: ValidationSchema,
): { isValid: boolean; errors: string[]; data?: ValidatedInputData } {
  const data: ValidatedInputData = {};

  // Convert URLSearchParams to object and handle type conversions
  for (const [key, value] of searchParams.entries()) {
    const rule = schema[key];

    // Convert to number if schema expects a number
    if (rule?.type === 'number') {
      const numValue = Number(value);
      if (!Number.isNaN(numValue)) {
        data[key] = numValue;
      } else {
        data[key] = value; // Keep as string, validation will catch it
      }
    } else {
      data[key] = value;
    }
  }

  const validation = validateInput(data, schema);
  return { ...validation, data: validation.isValid ? data : undefined };
}

/**
 * Middleware wrapper for input validation
 */
export function withInputValidation(
  schema: ValidationSchema,
  handler: (
    validatedData: ValidatedInputData,
    req: NextRequest,
  ) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const validation = validateInput(body, schema);

      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validation.errors,
          },
          { status: 400 },
        );
      }

      return handler(body, req);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  };
}

/**
 * Common validation schemas for reuse
 */
export const COMMON_SCHEMAS = {
  pagination: {
    page: { type: 'number' as const, min: 1, max: 1000 },
    limit: { type: 'number' as const, min: 1, max: 100 },
    skip: { type: 'number' as const, min: 0 },
  },

  organization: {
    organizationId: {
      required: true,
      type: 'objectId' as const,
      pattern: VALIDATION_PATTERNS.objectId,
    },
  },

  email: {
    email: {
      required: true,
      type: 'email' as const,
      maxLength: MAX_LENGTHS.email,
      pattern: VALIDATION_PATTERNS.email,
    },
  },

  search: {
    q: {
      type: 'string' as const,
      maxLength: 200,
      sanitize: true,
    },
    filter: {
      type: 'string' as const,
      maxLength: 100,
    },
  },
};
