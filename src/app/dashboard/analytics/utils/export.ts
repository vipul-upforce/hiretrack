// Utility functions for data export
import logger from '@/lib/logger';

export interface ExportData {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Convert array of objects to CSV string
 */
export const convertToCSV = (data: ExportData[]): string => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get all unique headers from all objects
  const allHeaders = new Set<string>();
  data.forEach((row) => {
    Object.keys(row).forEach((key) => allHeaders.add(key));
  });

  // Convert set to array and sort for consistent order
  const headers = Array.from(allHeaders).sort();

  // Create CSV header row
  const csvHeaders = headers
    .map((header) => {
      // Quote headers that contain special characters
      if (
        header.includes(',') ||
        header.includes('"') ||
        header.includes('\n')
      ) {
        return `"${header.replace(/"/g, '""')}"`;
      }
      return header;
    })
    .join(',');

  // Create CSV data rows
  const csvRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        // Handle values that might contain commas, quotes, or newlines
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(','),
  );

  return [csvHeaders, ...csvRows].join('\n');
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvString: string, filename: string): void => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Generate filename with timestamp
 */
export const generateFilename = (
  baseName: string,
  extension: string = 'csv',
): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  return `${baseName}_${timestamp}.${extension}`;
};

/**
 * Export data as CSV with automatic filename generation
 */
export const exportToCSV = (data: ExportData[], baseName: string): void => {
  if (!data || data.length === 0) {
    logger.warn('No data to export');
    return;
  }

  const csvString = convertToCSV(data);

  const filename = generateFilename(baseName);
  downloadCSV(csvString, filename);
};
