import { normalizeCTCToLPA, formatCTCAsLPA } from "./ctc-normalizer";

// Test cases for normalizeCTCToLPA
describe("normalizeCTCToLPA", () => {
  // Test handling of empty values
  test("handles null, undefined, and empty values", () => {
    expect(normalizeCTCToLPA(null as any)).toBe(0);
    expect(normalizeCTCToLPA(undefined as any)).toBe(0);
    expect(normalizeCTCToLPA("")).toBe(0);
  });

  // Test Case 1: Values already in LPA format (1-100 range)
  test("keeps values already in LPA format (1-100 range)", () => {
    expect(normalizeCTCToLPA(5)).toBe(5);
    expect(normalizeCTCToLPA("5")).toBe(5);
    expect(normalizeCTCToLPA(12.5)).toBe(12.5);
    expect(normalizeCTCToLPA("12.5")).toBe(12.5);
    expect(normalizeCTCToLPA(50)).toBe(50); // 50 LPA
    expect(normalizeCTCToLPA(99)).toBe(99); // 99 LPA
  });

  // Test Case 2: Annual salaries (500,000+ range)
  test("converts annual salaries to LPA by dividing by 100,000", () => {
    // 500,000 per year = 5 LPA
    expect(normalizeCTCToLPA(500000)).toBe(5);
    expect(normalizeCTCToLPA("500000")).toBe(5);

    // 1,200,000 per year = 12 LPA
    expect(normalizeCTCToLPA(1200000)).toBe(12);
    expect(normalizeCTCToLPA("12,00,000")).toBe(12);
    expect(normalizeCTCToLPA("1,200,000")).toBe(12);

    // 10,000,000 per year = 100 LPA
    expect(normalizeCTCToLPA(10000000)).toBe(100);
    expect(normalizeCTCToLPA("1,00,00,000")).toBe(100);
  });

  // Test Case 3: Monthly salaries (10,000 to 499,999 range)
  test("converts monthly salaries to LPA by multiplying by 12 and dividing by 100,000", () => {
    // 30,000 per month = 3.6 LPA
    expect(normalizeCTCToLPA(30000)).toBe(3.6);
    expect(normalizeCTCToLPA("30,000")).toBe(3.6);

    // 50,000 per month = 6 LPA
    expect(normalizeCTCToLPA(50000)).toBe(6);
    expect(normalizeCTCToLPA("50000")).toBe(6);

    // 83,333 per month = 10 LPA (approximately)
    expect(normalizeCTCToLPA(83333)).toBeCloseTo(10, 1);
    expect(normalizeCTCToLPA("83,333")).toBeCloseTo(10, 1);
  });

  // Test Case 4: Small values (less than 10,000)
  test("handles small values correctly", () => {
    // 0.5 LPA
    expect(normalizeCTCToLPA(0.5)).toBe(0.5);

    // 8,000 could be a very low monthly salary or already in thousands of LPA
    // Our function assumes it's already in a decimal LPA format
    expect(normalizeCTCToLPA(8000)).toBe(8000);

    // 1,000 is treated as already in some LPA format
    expect(normalizeCTCToLPA(1000)).toBe(1000);
  });

  // Test handling of formatted strings with commas and spaces
  test("handles formatted strings with commas and spaces", () => {
    expect(normalizeCTCToLPA("4,00,000")).toBe(4); // 4 LPA (annual)
    expect(normalizeCTCToLPA("10,00,000")).toBe(10); // 10 LPA (annual)
    expect(normalizeCTCToLPA("  50,000  ")).toBe(6); // 6 LPA (monthly)
    expect(normalizeCTCToLPA("  5  ")).toBe(5); // 5 LPA (already in LPA)
  });

  // Test specific edge cases
  test("handles edge cases correctly", () => {
    // Edge case: 499,999 (just below the annual threshold)
    expect(normalizeCTCToLPA(499999)).toBeCloseTo(59.9999, 4); // Treated as monthly

    // Edge case: 500,000 (just at the annual threshold)
    expect(normalizeCTCToLPA(500000)).toBe(5); // Treated as annual

    // Edge case: 9,999 (just below the monthly threshold)
    expect(normalizeCTCToLPA(9999)).toBe(9999); // Treated as already in some format

    // Edge case: 10,000 (just at the monthly threshold)
    expect(normalizeCTCToLPA(10000)).toBe(1.2); // Treated as monthly
  });
});

// Test cases for formatCTCAsLPA
describe("formatCTCAsLPA", () => {
  test("formats LPA values correctly", () => {
    expect(formatCTCAsLPA(5)).toBe("5 LPA");
    expect(formatCTCAsLPA(12.5)).toBe("12.5 LPA");
    expect(formatCTCAsLPA(7.25)).toBe("7.25 LPA");
  });

  test("handles invalid inputs", () => {
    expect(formatCTCAsLPA(NaN)).toBe("0 LPA");
    expect(formatCTCAsLPA(null as any)).toBe("0 LPA");
    expect(formatCTCAsLPA(undefined as any)).toBe("0 LPA");
  });

  test("rounds to 2 decimal places", () => {
    expect(formatCTCAsLPA(5.333333)).toBe("5.33 LPA");
    expect(formatCTCAsLPA(12.567)).toBe("12.57 LPA");
  });
});
