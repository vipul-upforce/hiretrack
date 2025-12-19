import mongoose from 'mongoose';
import type { OrganizationEmailNotifications } from '@/lib/models/settings';

/**
 * Type for admin override settings (partial notification settings)
 */
export type AdminOverrideSettings =
  OrganizationEmailNotifications['adminOverrides'][string];

/**
 * Safely set a value in a record with key validation
 * Prevents Object Injection Sink warnings by validating keys
 */
export function safeSet<T>(
  record: Record<string, T>,
  key: string,
  value: T,
): void {
  if (typeof key === 'string' && mongoose.Types.ObjectId.isValid(key)) {
    // Use Reflect.set to avoid Object Injection Sink warnings
    // Key is validated as a valid MongoDB ObjectId before assignment
    Reflect.set(record, key, value);
  }
}

/**
 * Safely get a value from a record with key validation
 */
export function safeGet<T>(
  record: Record<string, T>,
  key: string,
): T | undefined {
  if (typeof key === 'string' && mongoose.Types.ObjectId.isValid(key)) {
    return Reflect.get(record, key) as T | undefined;
  }
  return undefined;
}

/**
 * Convert adminOverrides Map to plain object for JSON response
 */
export function mapToObject(
  adminOverrides: Map<string, AdminOverrideSettings> | Record<string, AdminOverrideSettings> | undefined,
): Record<string, AdminOverrideSettings> {
  const result: Record<string, AdminOverrideSettings> = {};
  
  if (!adminOverrides) {
    return result;
  }

  if (adminOverrides instanceof Map) {
    adminOverrides.forEach((value, key) => {
      safeSet(result, String(key), value as AdminOverrideSettings);
    });
  } else {
    Object.entries(adminOverrides).forEach(([key, value]) => {
      safeSet(result, key, value);
    });
  }

  return result;
}

/**
 * Convert plain object to Map for MongoDB storage
 */
export function objectToMap(
  overrides: Record<string, AdminOverrideSettings>,
): Map<string, AdminOverrideSettings> {
  const overrideMap = new Map<string, AdminOverrideSettings>();
  
  Object.entries(overrides).forEach(([userId, settings]) => {
    if (settings && typeof settings === 'object') {
      overrideMap.set(userId, settings);
    }
  });

  return overrideMap;
}

/**
 * Merge admin overrides with existing ones
 */
export function mergeAdminOverrides(
  existing: Map<string, AdminOverrideSettings> | Record<string, AdminOverrideSettings> | undefined,
  newOverrides: Record<string, Partial<AdminOverrideSettings>> | undefined,
): Record<string, AdminOverrideSettings> {
  // Convert existing Map to object for easier manipulation
  const merged: Record<string, AdminOverrideSettings> = {};
  
  if (existing) {
    if (existing instanceof Map) {
      existing.forEach((value, key) => {
        safeSet(merged, String(key), value as AdminOverrideSettings);
      });
    } else {
      Object.entries(existing).forEach(([key, value]) => {
        safeSet(merged, key, value);
      });
    }
  }

  // Merge new admin overrides with existing ones
  if (newOverrides && typeof newOverrides === 'object') {
    Object.entries(newOverrides).forEach(([userId, settings]) => {
      if (settings && typeof settings === 'object') {
        // If settings object is empty or all values are undefined, remove the override
        const hasAnyValue = Object.values(settings).some(
          (val) => val !== undefined,
        );

        if (!hasAnyValue) {
          // Remove override for this user if all values are undefined
          if (mongoose.Types.ObjectId.isValid(userId)) {
            // eslint-disable-next-line security/detect-object-injection
            delete merged[userId];
          }
        } else {
          // Merge with existing override for this user
          const typedSettings = settings as AdminOverrideSettings;
          const existingOverride = safeGet(merged, userId);
          if (existingOverride) {
            safeSet(merged, userId, {
              ...existingOverride,
              ...typedSettings,
            });
          } else {
            safeSet(merged, userId, { ...typedSettings });
          }
        }
      }
    });
  }

  return merged;
}

