/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validates and filters CC/BCC arrays, removing empty strings and triggerer email
 */
export function filterEmailArray(
  emails: string[] | undefined,
  triggerer?: string,
): string[] {
  if (!emails) {
    return [];
  }

  return emails.filter(
    (email) =>
      email.trim() !== '' && (!triggerer || email.trim() !== triggerer),
  );
}

/**
 * Gets the triggerer email from context or parameter
 */
export function getTriggererEmail(
  context: { sentByEmail?: string } | { emailHistoryId: string } | undefined,
  triggererEmail?: string,
): string | undefined {
  if (context && 'sentByEmail' in context) {
    return context.sentByEmail;
  }
  return triggererEmail;
}
