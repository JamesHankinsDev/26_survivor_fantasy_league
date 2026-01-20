/**
 * Input validation and sanitization utilities
 * Protects against XSS and ensures data integrity
 */

const MAX_MESSAGE_LENGTH = 2000;
const MAX_DISPLAY_NAME_LENGTH = 50;
const MAX_LEAGUE_NAME_LENGTH = 100;

/**
 * Sanitize display name - removes HTML characters and limits length
 */
export const sanitizeDisplayName = (
  name: string | null | undefined,
): string => {
  if (!name) return "Unknown";

  return name
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LENGTH)
    .replace(/[<>]/g, "") // Remove potential HTML brackets
    .replace(/\s+/g, " "); // Normalize whitespace
};

/**
 * Sanitize message content - limits length and preserves mentions
 */
export const sanitizeMessageContent = (content: string): string => {
  if (!content) return "";

  return content.trim().slice(0, MAX_MESSAGE_LENGTH);
};

/**
 * Validate avatar URL - ensures HTTPS protocol
 */
export const validateAvatarURL = (url: string | null | undefined): boolean => {
  if (!url) return true; // Empty is okay (will use default)

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Sanitize avatar URL - returns empty string if invalid
 */
export const sanitizeAvatarURL = (url: string | null | undefined): string => {
  if (!url) return "";
  if (!validateAvatarURL(url)) return "";
  return url;
};

/**
 * Sanitize league name - removes HTML characters and limits length
 */
export const sanitizeLeagueName = (name: string): string => {
  if (!name) return "";

  return name.trim().slice(0, MAX_LEAGUE_NAME_LENGTH).replace(/[<>]/g, "");
};

/**
 * Validate message length
 */
export const isValidMessageLength = (content: string): boolean => {
  return (
    content.trim().length > 0 && content.trim().length <= MAX_MESSAGE_LENGTH
  );
};

/**
 * Get validation constants (for UI display)
 */
export const VALIDATION_LIMITS = {
  MAX_MESSAGE_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_LEAGUE_NAME_LENGTH,
} as const;
