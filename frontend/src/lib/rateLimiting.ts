/**
 * RATE LIMITING SYSTEM
 * Simple in-memory rate limiting for authentication requests
 * Separate from gasless validation to avoid Redis dependency issues
 */

/**
 * Rate limiting for authentication requests per user
 */
const userRateLimits = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userAddress: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5; // 5 requests per minute
  
  const userKey = userAddress.toLowerCase();
  const current = userRateLimits.get(userKey);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    userRateLimits.set(userKey, {
      count: 1,
      resetTime: now + windowMs
    });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    };
  }
  
  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    };
  }
  
  current.count += 1;
  
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime
  };
}

/**
 * Clean up expired rate limit entries (maintenance function)
 */
export function cleanupExpiredRateLimits(): void {
  const now = Date.now();
  
  for (const [userKey, data] of userRateLimits.entries()) {
    if (now > data.resetTime) {
      userRateLimits.delete(userKey);
    }
  }
  
  console.log('🧹 Rate limit cleanup completed. Active limits:', userRateLimits.size);
}