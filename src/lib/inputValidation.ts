import { NextResponse } from 'next/server';

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
  customValidator?: (value: any) => boolean;
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
function validateType(value: any, type: string): boolean {
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
  data: any,
  schema: ValidationSchema,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for null/undefined data
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

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
    if (rules.allowedValues && !rules.allowedValues.includes(value)) {
      errors.push(`${field} must be one of: ${rules.allowedValues.join(', ')}`);
    }

    // Custom validation
    if (rules.customValidator && !rules.customValidator(value)) {
      errors.push(`${field} is invalid`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Detects potential HTML/script injection
 */

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
 */
export function validateQueryParams(
  searchParams: URLSearchParams,
  schema: ValidationSchema,
) {
  const data: Record<string, any> = {};

  // Convert URLSearchParams to object
  for (const [key, value] of searchParams.entries()) {
    data[key] = value;
  }

  return validateInput(data, schema);
}

/**
 * Middleware wrapper for input validation
 */
export function withInputValidation(
  schema: ValidationSchema,
  handler: (validatedData: any, req: any) => Promise<NextResponse>,
) {
  return async (req: any) => {
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
