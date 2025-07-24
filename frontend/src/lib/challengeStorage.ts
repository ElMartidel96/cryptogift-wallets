/**
 * Challenge Storage System
 * Secure storage for SIWE challenges with Redis and fallback
 * Uses timeout protection to prevent Vercel hanging issues
 */

import { Redis } from '@upstash/redis';
import { SiweChallenge, CHALLENGE_EXPIRY } from './siweAuth';

// Initialize Redis with Vercel-optimized configuration
let redis: any = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      enableAutoPipelining: false, // Disable pipelining to prevent hanging in Vercel
      retry: false, // CRITICAL: Disable retry to prevent hanging in serverless functions
    });
    console.log('✅ Redis client initialized for SIWE challenges (Vercel optimized)');
  } else {
    console.warn('⚠️ Redis not configured, using in-memory fallback for SIWE challenges');
  }
} catch (error) {
  console.warn('⚠️ Redis initialization failed, using in-memory fallback:', error);
}

// Helper function to wrap Redis operations with timeout protection
async function redisWithTimeout<T>(operation: Promise<T>, timeoutMs: number = 3000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Redis operation timeout')), timeoutMs)
  );
  
  return Promise.race([operation, timeoutPromise]);
}

// Fallback in-memory store when Redis is not available
const challengeStore = new Map<string, SiweChallenge>();

/**
 * Store SIWE challenge securely
 */
export async function storeChallenge(nonce: string, challenge: SiweChallenge): Promise<void> {
  const key = `siwe_challenge:${nonce}`;
  
  if (redis) {
    try {
      // Store in Redis with TTL
      await redisWithTimeout(
        redis.setex(key, Math.floor(CHALLENGE_EXPIRY / 1000), JSON.stringify(challenge))
      );
      
      console.log('📝 SIWE challenge stored in Redis:', {
        nonce: nonce.slice(0, 10) + '...',
        address: challenge.address.slice(0, 10) + '...',
        ttl: Math.floor(CHALLENGE_EXPIRY / 1000) + 's'
      });
      
      return;
    } catch (redisError) {
      console.warn('⚠️ Redis challenge storage failed, falling back to memory:', redisError);
      // Temporarily disable redis to prevent future hangs in this request
      redis = null;
    }
  }
  
  // Fallback to in-memory storage
  challengeStore.set(nonce, challenge);
  
  // Clean up expired challenges in memory
  setTimeout(() => {
    challengeStore.delete(nonce);
  }, CHALLENGE_EXPIRY);
  
  console.log('📝 SIWE challenge stored in memory (fallback):', {
    nonce: nonce.slice(0, 10) + '...',
    address: challenge.address.slice(0, 10) + '...'
  });
}

/**
 * Retrieve and validate SIWE challenge
 */
export async function getChallenge(nonce: string): Promise<SiweChallenge | null> {
  const key = `siwe_challenge:${nonce}`;
  
  if (redis) {
    try {
      const stored = await redisWithTimeout(redis.get(key));
      
      if (stored && typeof stored === 'string') {
        const challenge = JSON.parse(stored) as SiweChallenge;
        
        // Validate expiration
        if (Date.now() - challenge.timestamp > CHALLENGE_EXPIRY) {
          console.log('⏰ SIWE challenge expired (Redis):', nonce.slice(0, 10) + '...');
          await redisWithTimeout(redis.del(key)); // Clean up expired challenge
          return null;
        }
        
        console.log('✅ SIWE challenge retrieved from Redis:', {
          nonce: nonce.slice(0, 10) + '...',
          address: challenge.address.slice(0, 10) + '...',
          age: Math.floor((Date.now() - challenge.timestamp) / 1000) + 's'
        });
        
        return challenge;
      }
    } catch (redisError) {
      console.warn('⚠️ Redis challenge retrieval failed, falling back to memory:', redisError);
      // Temporarily disable redis to prevent future hangs in this request
      redis = null;
    }
  }
  
  // Fallback to in-memory storage
  const challenge = challengeStore.get(nonce);
  
  if (challenge) {
    // Validate expiration
    if (Date.now() - challenge.timestamp > CHALLENGE_EXPIRY) {
      console.log('⏰ SIWE challenge expired (memory):', nonce.slice(0, 10) + '...');
      challengeStore.delete(nonce);
      return null;
    }
    
    console.log('✅ SIWE challenge retrieved from memory (fallback):', {
      nonce: nonce.slice(0, 10) + '...',
      address: challenge.address.slice(0, 10) + '...',
      age: Math.floor((Date.now() - challenge.timestamp) / 1000) + 's'
    });
    
    return challenge;
  }
  
  console.log('❌ SIWE challenge not found:', nonce.slice(0, 10) + '...');
  return null;
}

/**
 * Remove SIWE challenge after successful verification
 */
export async function removeChallenge(nonce: string): Promise<void> {
  const key = `siwe_challenge:${nonce}`;
  
  if (redis) {
    try {
      await redisWithTimeout(redis.del(key));
      console.log('🗑️ SIWE challenge removed from Redis:', nonce.slice(0, 10) + '...');
      return;
    } catch (redisError) {
      console.warn('⚠️ Redis challenge removal failed:', redisError);
    }
  }
  
  // Fallback to in-memory storage
  const removed = challengeStore.delete(nonce);
  if (removed) {
    console.log('🗑️ SIWE challenge removed from memory (fallback):', nonce.slice(0, 10) + '...');
  }
}

/**
 * Clean up expired challenges (maintenance function)
 */
export async function cleanupExpiredChallenges(): Promise<void> {
  const now = Date.now();
  
  // Clean up in-memory challenges
  for (const [nonce, challenge] of challengeStore.entries()) {
    if (now - challenge.timestamp > CHALLENGE_EXPIRY) {
      challengeStore.delete(nonce);
      console.log('🧹 Cleaned up expired challenge from memory:', nonce.slice(0, 10) + '...');
    }
  }
  
  console.log('🧹 Challenge cleanup completed. Active challenges:', challengeStore.size);
}