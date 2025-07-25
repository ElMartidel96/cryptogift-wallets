/**
 * SIWE (Sign-In With Ethereum) Client Library
 * Handles wallet authentication flow for frontend components
 */

import { ethers } from 'ethers';

export interface SiweAuthState {
  isAuthenticated: boolean;
  address?: string;
  token?: string;
  expiresAt?: number;
}

export interface ChallengeResponse {
  success: boolean;
  nonce?: string;
  message?: string;
  domain?: string;
  error?: string;
}

export interface VerifyResponse {
  success: boolean;
  token?: string;
  address?: string;
  expiresAt?: number;
  error?: string;
}

// Global authentication state
let authState: SiweAuthState = {
  isAuthenticated: false
};

/**
 * Request authentication challenge from server
 */
export async function requestChallenge(address: string, chainId?: number): Promise<ChallengeResponse> {
  try {
    console.log('🎯 Requesting SIWE challenge for:', address.slice(0, 10) + '...');
    
    // Use provided chainId or default to Base Sepolia
    const targetChainId = chainId || 84532;
    
    const response = await fetch('/api/auth/challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address,
        chainId: targetChainId,
        domain: typeof window !== 'undefined' ? window.location.hostname : undefined
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Challenge request failed:', data);
      return {
        success: false,
        error: data.error || 'Failed to request challenge'
      };
    }
    
    console.log('✅ Challenge received:', {
      nonce: data.nonce?.slice(0, 10) + '...',
      domain: data.domain
    });
    
    return data;
    
  } catch (error: any) {
    console.error('❌ Challenge request error:', error);
    return {
      success: false,
      error: error.message || 'Network error requesting challenge'
    };
  }
}

/**
 * Sign SIWE message with wallet
 */
export async function signMessage(message: string, account: any): Promise<string> {
  try {
    console.log('✍️ Signing SIWE message...');
    
    // For Thirdweb v5, we need to use signMessage with proper parameters
    if (!account?.signMessage) {
      throw new Error('Wallet does not support message signing');
    }
    
    // Sign the message using Thirdweb v5 API
    const signature = await account.signMessage({
      message: message
    });
    
    console.log('✅ Message signed successfully');
    return signature;
    
  } catch (error: any) {
    console.error('❌ Message signing failed:', error);
    throw new Error(`Failed to sign message: ${error.message}`);
  }
}

/**
 * Verify signature and get JWT token
 */
export async function verifySignature(
  address: string,
  signature: string,
  nonce: string,
  chainId?: number
): Promise<VerifyResponse> {
  try {
    console.log('🔐 Verifying signature for:', address.slice(0, 10) + '...');
    
    // Use provided chainId or default to Base Sepolia
    const targetChainId = chainId || 84532;
    
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address,
        signature,
        nonce,
        chainId: targetChainId,
        domain: typeof window !== 'undefined' ? window.location.hostname : undefined
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Signature verification failed:', data);
      return {
        success: false,
        error: data.error || 'Failed to verify signature'
      };
    }
    
    console.log('✅ Signature verified, JWT received:', {
      address: data.address?.slice(0, 10) + '...',
      expiresAt: new Date(data.expiresAt * 1000).toISOString()
    });
    
    return data;
    
  } catch (error: any) {
    console.error('❌ Signature verification error:', error);
    return {
      success: false,
      error: error.message || 'Network error verifying signature'
    };
  }
}

/**
 * Complete SIWE authentication flow
 * This is the main function components should use
 */
export async function authenticateWithSiwe(address: string, account: any): Promise<SiweAuthState> {
  try {
    console.log('🚀 Starting SIWE authentication flow for:', address.slice(0, 10) + '...');
    
    // DYNAMIC Chain ID detection to match wallet's current network
    // This prevents "Chain ID mismatch" warnings in wallets
    let chainId = 84532; // Default to Base Sepolia
    
    try {
      // Get the actual chain ID from the connected wallet
      if (window.ethereum && window.ethereum.chainId) {
        chainId = parseInt(window.ethereum.chainId, 16);
        console.log('🔗 Using wallet\'s current Chain ID:', chainId);
      } else if (account?.wallet?.getChain) {
        const chain = await account.wallet.getChain();
        chainId = chain.id;
        console.log('🔗 Using chain from Thirdweb account:', chainId);
      }
    } catch (error) {
      console.warn('⚠️ Could not detect wallet chain, using Base Sepolia default:', chainId);
    }
    
    console.log('🔗 SIWE will use Chain ID:', chainId, '(matches wallet to prevent warnings)');
    
    console.log('🔗 Using Chain ID:', chainId);
    
    // Step 1: Request challenge
    const challengeResponse = await requestChallenge(address, chainId);
    if (!challengeResponse.success || !challengeResponse.message || !challengeResponse.nonce) {
      throw new Error(challengeResponse.error || 'Failed to get challenge');
    }
    
    // Step 2: Sign challenge message
    const signature = await signMessage(challengeResponse.message, account);
    
    // Step 3: Verify signature and get JWT
    const verifyResponse = await verifySignature(address, signature, challengeResponse.nonce, chainId);
    if (!verifyResponse.success || !verifyResponse.token) {
      throw new Error(verifyResponse.error || 'Failed to verify signature');
    }
    
    // Update global auth state
    authState = {
      isAuthenticated: true,
      address: verifyResponse.address,
      token: verifyResponse.token,
      expiresAt: verifyResponse.expiresAt
    };
    
    console.log('🎉 SIWE authentication completed successfully!');
    return authState;
    
  } catch (error: any) {
    console.error('❌ SIWE authentication failed:', error);
    
    // Reset auth state on failure
    authState = { isAuthenticated: false };
    
    throw error;
  }
}

/**
 * Get current authentication state
 */
export function getAuthState(): SiweAuthState {
  return { ...authState };
}

/**
 * Check if current authentication is still valid
 */
export function isAuthValid(): boolean {
  if (!authState.isAuthenticated || !authState.token || !authState.expiresAt) {
    return false;
  }
  
  // Check if token is expired (with 5 minute buffer)
  const now = Math.floor(Date.now() / 1000);
  const buffer = 5 * 60; // 5 minutes
  
  return authState.expiresAt > (now + buffer);
}

/**
 * Clear authentication state (logout)
 */
export function clearAuth(): void {
  authState = { isAuthenticated: false };
  console.log('🚪 Authentication cleared');
}

/**
 * Get authorization header for API calls
 */
export function getAuthHeader(): string | null {
  if (!isAuthValid() || !authState.token) {
    return null;
  }
  
  return `Bearer ${authState.token}`;
}

/**
 * Make authenticated API call
 */
export async function makeAuthenticatedRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const authHeader = getAuthHeader();
  
  if (!authHeader) {
    throw new Error('No valid authentication token available. Please sign in again.');
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': authHeader
    }
  });
}