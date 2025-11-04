import DOMPurify from "dompurify";

// Configure DOMPurify options
DOMPurify.setConfig({
  ALLOWED_TAGS: [], // Only allow text
  ALLOWED_ATTR: [], // No attributes
});

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return DOMPurify.sanitize(input.trim());
}

/**
 * Validate a number is within expected bounds
 */
export function validateNumber(value: number, min: number, max: number): boolean {
  return !isNaN(value) && value >= min && value <= max;
}

/**
 * Escape HTML entities
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validate and sanitize an image URL
 */
export function sanitizeImageUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    // Only allow specific domains
    const allowedDomains = [
      "cdn.builder.io",
      "supabase.co"
    ];
    if (!allowedDomains.some(domain => parsedUrl.hostname.includes(domain))) {
      throw new Error("Invalid image domain");
    }
    return parsedUrl.toString();
  } catch {
    return ""; // Return empty string for invalid URLs
  }
}

/**
 * Rate limiting helper
 */
export class RateLimit {
  private static cache = new Map<string, number[]>();
  private static cleanupInterval = 1000 * 60 * 60; // 1 hour

  static checkLimit(key: string, maxRequests: number, timeWindow: number): boolean {
    const now = Date.now();
    const timestamps = RateLimit.cache.get(key) || [];
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(t => now - t < timeWindow);
    
    if (validTimestamps.length >= maxRequests) {
      return false;
    }
    
    validTimestamps.push(now);
    RateLimit.cache.set(key, validTimestamps);
    return true;
  }

  static startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of RateLimit.cache.entries()) {
        const validTimestamps = timestamps.filter(t => now - t < this.cleanupInterval);
        if (validTimestamps.length === 0) {
          RateLimit.cache.delete(key);
        } else {
          RateLimit.cache.set(key, validTimestamps);
        }
      }
    }, this.cleanupInterval);
  }
}