import dayjs from 'dayjs';

/**
 * Validates and converts a value based on the expected field type.
 * Returns a default value if the type is incompatible.
 *
 * @param value - The raw value to validate
 * @param fieldType - The expected field type (text, number, file, etc.)
 * @param defaultValue - The default value to return if validation fails
 * @returns The validated and converted value, or defaultValue if incompatible
 */
export const getValidatedValue = (
  value: unknown,
  fieldType: string,
  defaultValue: unknown = '',
): unknown => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return defaultValue;
  }

  switch (fieldType) {
    case 'text':
    case 'password':
    case 'textarea':
    case 'time':
      // These types expect string values
      if (typeof value === 'string') {
        return value;
      }
      // Check if it's file data (array with file objects) - incompatible
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'object' &&
        value[0] !== null &&
        ('base64' in value[0] || 'url' in value[0] || ('name' in value[0] && 'type' in value[0]))
      ) {
        return defaultValue; // File data incompatible with text fields
      }
      // Try to convert to string
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return defaultValue;

    case 'number':
      // Number fields expect numeric values (but will be converted to string for input)
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        const num = Number(value);
        return !Number.isNaN(num) ? num : defaultValue;
      }
      // Check if it's file data - incompatible
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'object' &&
        value[0] !== null &&
        ('base64' in value[0] || 'url' in value[0])
      ) {
        return defaultValue;
      }
      return defaultValue;

    case 'select':
    case 'radio':
      // These expect string values
      if (typeof value === 'string') {
        return value;
      }
      // Check if it's file data or array - incompatible
      if (
        Array.isArray(value) ||
        (typeof value === 'object' &&
          value !== null &&
          ('base64' in value || 'url' in value))
      ) {
        return defaultValue;
      }
      // Try to convert
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return defaultValue;

    case 'checkbox':
    case 'multiSelect':
      // These expect string arrays
      if (Array.isArray(value)) {
        // Check if it's file data array (objects with base64/url)
        if (
          value.length > 0 &&
          typeof value[0] === 'object' &&
          value[0] !== null &&
          ('base64' in value[0] || 'url' in value[0])
        ) {
          return defaultValue; // File data incompatible
        }
        // Validate all items are strings
        const stringArray = value.filter((item) => typeof item === 'string');
        return stringArray.length > 0 ? stringArray : defaultValue;
      }
      // Single string value - convert to array
      if (typeof value === 'string' && value !== '') {
        return [value];
      }
      return defaultValue;

    case 'file':
      // File fields expect FileData[] array
      if (Array.isArray(value)) {
        // Validate it's file data structure
        const isValidFileData = value.every(
          (item) =>
            item &&
            typeof item === 'object' &&
            ('base64' in item || 'url' in item || ('name' in item && 'type' in item)),
        );
        if (isValidFileData) {
          return value;
        }
      }
      // If it's a string or other type, it's incompatible
      if (typeof value === 'string' || typeof value === 'number') {
        return defaultValue;
      }
      return defaultValue;

    case 'date':
    case 'datetime':
      // Date fields expect string values (formatted dates)
      if (typeof value === 'string') {
        // Validate it's a valid date string
        const dateValue = dayjs(value);
        if (dateValue.isValid()) {
          return value;
        }
        return defaultValue;
      }
      // Check if it's file data - incompatible
      if (
        Array.isArray(value) ||
        (typeof value === 'object' &&
          value !== null &&
          ('base64' in value || 'url' in value))
      ) {
        return defaultValue;
      }
      // Try to convert Date object
      if (value instanceof Date) {
        return dayjs(value).format(fieldType === 'datetime' ? 'MM/DD/YYYY hh:mm A' : 'MM/DD/YYYY');
      }
      return defaultValue;

    default:
      return value;
  }
};

