// Error types for better error handling
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  API_KEY = 'api_key',
  CONTRACT = 'contract',
  UNKNOWN = 'unknown'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
  userMessage?: string;
}

export class CryptoGiftError extends Error {
  type: ErrorType;
  code?: string;
  details?: any;
  userMessage?: string;

  constructor(type: ErrorType, message: string, options?: {
    code?: string;
    details?: any;
    userMessage?: string;
  }) {
    super(message);
    this.name = 'CryptoGiftError';
    this.type = type;
    this.code = options?.code;
    this.details = options?.details;
    this.userMessage = options?.userMessage || this.getDefaultUserMessage(type);
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';
      case ErrorType.VALIDATION:
        return 'Invalid input provided. Please check your data and try again.';
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait a moment before trying again.';
      case ErrorType.API_KEY:
        return 'Service temporarily unavailable. Please try again later.';
      case ErrorType.CONTRACT:
        return 'Blockchain transaction failed. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  toJSON(): AppError {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      userMessage: this.userMessage,
    };
  }
}

// Error parsing utilities
export function parseApiError(error: any): CryptoGiftError {
  // Handle fetch errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new CryptoGiftError(ErrorType.NETWORK, 'Network request failed', {
      details: error.message,
    });
  }

  // Handle API response errors
  if (error.status) {
    switch (error.status) {
      case 429:
        return new CryptoGiftError(ErrorType.RATE_LIMIT, 'Rate limit exceeded', {
          code: '429',
          details: error,
        });
      case 401:
      case 403:
        return new CryptoGiftError(ErrorType.API_KEY, 'Authentication failed', {
          code: error.status.toString(),
          details: error,
        });
      case 400:
        return new CryptoGiftError(ErrorType.VALIDATION, 'Invalid request', {
          code: '400',
          details: error,
        });
      case 500:
      case 502:
      case 503:
        return new CryptoGiftError(ErrorType.NETWORK, 'Service temporarily unavailable', {
          code: error.status.toString(),
          details: error,
        });
    }
  }

  // Handle contract errors
  if (error.message?.includes('revert') || error.message?.includes('execution reverted')) {
    return new CryptoGiftError(ErrorType.CONTRACT, 'Transaction failed', {
      details: error.message,
      userMessage: 'Transaction failed. Please check your balance and try again.',
    });
  }

  // Handle wallet connection errors
  if (error.message?.includes('User rejected') || error.message?.includes('user rejected')) {
    return new CryptoGiftError(ErrorType.VALIDATION, 'User rejected transaction', {
      details: error.message,
      userMessage: 'Transaction was cancelled.',
    });
  }

  // Default to unknown error
  return new CryptoGiftError(ErrorType.UNKNOWN, error.message || 'Unknown error', {
    details: error,
  });
}

// Retry mechanism for network errors
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (i === maxRetries) {
        throw lastError;
      }

      // Only retry on network errors
      const parsedError = parseApiError(error);
      if (parsedError.type !== ErrorType.NETWORK) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }

  throw lastError!;
}

// Structured JSON logging function
export function logError(error: Error | CryptoGiftError, context?: string): void {
  const logEntry = {
    level: "ERROR",
    message: error.message,
    context: context || "unknown",
    timestamp: new Date().toISOString(),
    errorType: error instanceof CryptoGiftError ? error.type : "native_error",
    code: error instanceof CryptoGiftError ? error.code : undefined,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    userId: "anonymized", // Never log real user data
    sessionId: typeof window !== 'undefined' ? window.crypto?.randomUUID?.()?.slice(0, 8) : undefined,
  };

  // Structured JSON output for monitoring systems
  console.error(JSON.stringify(logEntry));

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToLoggingService(logEntry);
  }
}

// Success logging with same structure
export function logSuccess(message: string, context?: string, metadata?: any): void {
  const logEntry = {
    level: "INFO",
    message,
    context: context || "success",
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
    userId: "anonymized",
  };

  console.log(JSON.stringify(logEntry));
}

// Toast notification helpers
export interface ToastOptions {
  duration?: number;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export function showErrorToast(error: Error | CryptoGiftError, options?: ToastOptions): void {
  const message = error instanceof CryptoGiftError 
    ? error.userMessage || error.message 
    : error.message;

  // This would integrate with your toast library
  // Example with react-hot-toast:
  // toast.error(message, { duration: options?.duration || 5000 });
  
  console.error('Toast:', message);
}

export function showSuccessToast(message: string, options?: ToastOptions): void {
  // Example with react-hot-toast:
  // toast.success(message, { duration: options?.duration || 3000 });
  
  console.log('Success:', message);
}