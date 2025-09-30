/**
 * Utility functions for formatting values in the NANU Financial System
 */

/**
 * Format currency values for Moldova (MDL by default)
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'MDL',
  locale: string = 'ro-MD'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format numbers without currency symbol
 */
export const formatNumber = (
  value: number,
  locale: string = 'ro-MD',
  minimumFractionDigits: number = 0,
  maximumFractionDigits: number = 2
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
};

/**
 * Format dates for Moldova
 */
export const formatDate = (
  date: Date,
  locale: string = 'ro-MD',
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }
): string => {
  return new Intl.DateTimeFormat(locale, options).format(date);
};

/**
 * Format percentage values
 */
export const formatPercentage = (
  value: number,
  minimumFractionDigits: number = 2
): string => {
  return `${value.toFixed(minimumFractionDigits)}%`;
};

/**
 * Format contract numbers with proper spacing
 */
export const formatContractNumber = (contractNumber: string): string => {
  // Add spacing to contract numbers like CR-2024-001
  return contractNumber.replace(/([A-Z]+)(\d+)/g, '$1-$2');
};

/**
 * Parse string currency to number (removing formatting)
 */
export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
};

/**
 * Format file sizes
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Generate initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};