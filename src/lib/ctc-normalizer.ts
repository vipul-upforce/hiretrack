/**
 * Normalizes various CTC input formats to LPA (Lakhs Per Annum)
 * Standard approach to handle different salary formats in India
 *
 * @param value - The CTC value to normalize
 * @returns The normalized value in LPA format (e.g., 12 for 12 LPA)
 */
export function normalizeCTCToLPA(value: string | number): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  // Convert to string for processing
  const stringValue = String(value).trim();

  // Remove all commas and spaces
  const cleanValue = stringValue.replace(/[,\s]/g, '');

  // Convert to number
  const numericValue = parseFloat(cleanValue);

  if (Number.isNaN(numericValue)) {
    return 0;
  }

  // Standard approach to determine the format based on value range:

  // Case 1: Already in LPA format (common range for Indian salaries in LPA)
  // Typically between 1-100 LPA
  if (numericValue >= 1 && numericValue <= 100) {
    return numericValue;
  }

  // Case 2: Annual salary in INR (₹500,000 to ₹50,000,000)
  // Convert to LPA by dividing by 100,000
  if (numericValue >= 500000) {
    return numericValue / 100000;
  }

  // Case 3: Monthly salary in INR (₹10,000 to ₹499,999)
  // Convert to annual and then to LPA
  if (numericValue >= 100 && numericValue < 500000) {
    return (numericValue * 12) / 100000;
  }

  // Case 4: Small values that don't fit the above cases
  // If less than 10,000, could be:
  // - Decimal LPA (e.g., 0.8 LPA)
  // - Very low monthly salary
  // - Some other format
  // Most likely it's already in LPA or decimal LPA

  return numericValue;
}

/**
 * Formats a CTC value in LPA format for display
 *
 * @param lpaValue - The CTC value in LPA
 * @returns Formatted string in LPA format
 */
export function formatCTCAsLPA(lpaValue: number): string {
  if (Number.isNaN(lpaValue) || lpaValue === null || lpaValue === undefined) {
    return '0 LPA';
  }

  // Round to 2 decimal places
  const roundedValue = Math.round(lpaValue * 100) / 100;

  return `${roundedValue} LPA`;
}
