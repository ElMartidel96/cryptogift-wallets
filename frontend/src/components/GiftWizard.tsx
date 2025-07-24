"use client";

import React, { useState, useEffect } from 'react';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { createThirdwebClient, getContract } from 'thirdweb';
import { baseSepolia } from 'thirdweb/chains';
import { client } from '../app/client';
import { ImageUpload } from './ImageUpload';
import { FilterSelector } from './FilterSelector';
import { AmountSelector } from './AmountSelector';
import { GiftSummary } from './GiftSummary';
import { QRShare } from './QRShare';
import { GiftEscrowConfig, type EscrowConfig } from './escrow/GiftEscrowConfig';
import { CREATION_FEE_PERCENT, generateNeutralGiftAddress } from '../lib/constants';
import { CryptoGiftError, parseApiError, logError } from '../lib/errorHandler';
import { ErrorModal } from './ErrorModal';
import { GasEstimationModal } from './GasEstimationModal';
import { startTrace, addStep, addDecision, addError, finishTrace } from '../lib/flowTracker';
import { storeNFTMetadataClient, getNFTMetadataClient, NFTMetadata, getDeviceWalletInfo } from '../lib/clientMetadataStore';
import { DeviceLimitModal } from './DeviceLimitModal';
import { authenticateWithSiwe, getAuthState, isAuthValid, makeAuthenticatedRequest, clearAuth } from '../lib/siweClient';

// Image compression utility to prevent HTTP 413 errors
async function compressImage(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions (max 2048px)
      const maxDimension = 2048;
      let { width, height } = img;
      
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
}

interface GiftWizardProps {
  isOpen: boolean;
  onClose: () => void;
  referrer: string | null;
}

enum WizardStep {
  CONNECT = 'connect',
  UPLOAD = 'upload',
  FILTER = 'filter',
  AMOUNT = 'amount',
  ESCROW = 'escrow',
  SUMMARY = 'summary',
  MINTING = 'minting',
  SUCCESS = 'success'
}

export const GiftWizard: React.FC<GiftWizardProps> = ({ isOpen, onClose, referrer }) => {
  const [mounted, setMounted] = useState(false);
  const account = useActiveAccount();
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.CONNECT);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && account) {
      // CRITICAL: Check device wallet limits when user connects
      const deviceInfo = getDeviceWalletInfo();
      console.log('🔍 Device wallet check:', deviceInfo);
      
      if (!deviceInfo.allowed && !deviceInfo.registeredWallets.includes(account.address.toLowerCase())) {
        console.warn('⚠️ Device wallet limit exceeded for new wallet:', account.address.slice(0, 10) + '...');
        setShowDeviceLimitModal(true);
        return;
      }
      
      // Only move to UPLOAD if authenticated
      if (isAuthenticated) {
        setCurrentStep(WizardStep.UPLOAD);
      } else {
        setCurrentStep(WizardStep.CONNECT);
      }
    } else if (mounted) {
      setCurrentStep(WizardStep.CONNECT);
    }
  }, [mounted, account, isAuthenticated]);
  
  // Handle authentication when account is connected
  useEffect(() => {
    if (account && mounted) {
      // Check if we already have valid authentication
      if (isAuthValid()) {
        const authState = getAuthState();
        if (authState.address?.toLowerCase() === account.address.toLowerCase()) {
          setIsAuthenticated(true);
          return;
        }
      }
      
      // Clear previous auth state and require new authentication
      clearAuth();
      setIsAuthenticated(false);
    } else {
      // No account connected, clear auth
      clearAuth();
      setIsAuthenticated(false);
    }
  }, [account, mounted]);
  
  const [wizardData, setWizardData] = useState({
    imageFile: null as File | null,
    imageUrl: '',
    filteredImageUrl: '',
    selectedFilter: '',
    amount: 50,
    recipientEmail: '',
    message: '',
    nftTokenId: null as string | null, // Enhanced numeric string
    shareUrl: '',
    qrCode: '',
    wasGasless: false,
    escrowConfig: null as EscrowConfig | null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CryptoGiftError | Error | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showGasModal, setShowGasModal] = useState(false);
  const [showDeviceLimitModal, setShowDeviceLimitModal] = useState(false);
  const [gasEstimation, setGasEstimation] = useState({
    estimatedGas: '21000',
    gasPrice: '0.1',
    totalCost: '0.0021',
    networkName: 'Base Sepolia'
  });

  // Calculate fees
  const creationFee = (wizardData.amount * CREATION_FEE_PERCENT) / 100;
  const referralFee = creationFee / 2;
  const platformFee = creationFee / 2;
  const netAmount = wizardData.amount - creationFee;

  const handleNext = () => {
    const steps = Object.values(WizardStep);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps = Object.values(WizardStep);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // SIWE Authentication function
  const handleAuthenticate = async () => {
    if (!account?.address) {
      setError(new Error('No wallet connected'));
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      console.log('🔐 Starting SIWE authentication for:', account.address.slice(0, 10) + '...');
      
      // Get wallet signer for signing messages
      const signer = account;
      if (!signer.signMessage) {
        throw new Error('Wallet does not support message signing');
      }

      // Perform SIWE authentication
      const authState = await authenticateWithSiwe(account.address, signer);
      
      if (authState.isAuthenticated) {
        setIsAuthenticated(true);
        console.log('✅ Authentication successful!');
        
        addStep('GIFT_WIZARD', 'SIWE_AUTHENTICATION_SUCCESS', {
          address: account.address.slice(0, 10) + '...',
          expiresAt: authState.expiresAt ? new Date(authState.expiresAt * 1000).toISOString() : 'unknown'
        }, 'success');
      } else {
        throw new Error('Authentication failed');
      }

    } catch (error: any) {
      console.error('❌ SIWE authentication failed:', error);
      setError(new CryptoGiftError(
        'Authentication failed',
        `Please sign the message with your wallet to continue: ${error.message}`,
        'AUTHENTICATION_ERROR'
      ));
      setIsAuthenticated(false);
      
      addError('GIFT_WIZARD', 'SIWE_AUTHENTICATION_FAILED', error.message, {
        address: account.address.slice(0, 10) + '...'
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleImageUpload = (file: File, url: string) => {
    setWizardData(prev => ({ ...prev, imageFile: file, imageUrl: url }));
    handleNext();
  };

  const handleFilterSelect = (filteredUrl: string, filterName: string) => {
    setWizardData(prev => ({ 
      ...prev, 
      filteredImageUrl: filteredUrl, 
      selectedFilter: filterName 
    }));
    handleNext();
  };

  const handleAmountSelect = (amount: number) => {
    setWizardData(prev => ({ ...prev, amount }));
    handleNext();
  };

  const handleEscrowConfig = (config: EscrowConfig) => {
    setWizardData(prev => ({ ...prev, escrowConfig: config }));
    handleNext();
  };

  const handleSkipEscrow = () => {
    setWizardData(prev => ({ ...prev, escrowConfig: null }));
    handleNext();
  };

  const handleMintGift = async () => {
    if (!account) {
      addError('GIFT_WIZARD', 'HANDLE_MINT_GIFT', 'No account connected');
      return;
    }

    // Check authentication before proceeding
    if (!isAuthenticated || !isAuthValid()) {
      console.log('⚠️ Authentication required before minting');
      await handleAuthenticate();
      
      // Check again after authentication attempt
      if (!isAuthenticated || !isAuthValid()) {
        setError(new CryptoGiftError(
          'Authentication Required',
          'Please sign the authentication message with your wallet to continue',
          'AUTHENTICATION_REQUIRED'
        ));
        return;
      }
    }
    
    // Start flow trace
    const traceId = startTrace(account.address, {
      amount: wizardData.amount,
      filter: wizardData.selectedFilter,
      referrer
    });
    
    addStep('GIFT_WIZARD', 'MINT_GIFT_STARTED', {
      traceId,
      walletAddress: account.address,
      amount: wizardData.amount,
      netAmount,
      referrer
    }, 'pending');
    
    setCurrentStep(WizardStep.MINTING);
    setIsLoading(true);
    setError(null);
    
    addStep('GIFT_WIZARD', 'WIZARD_STATE_SET', {
      currentStep: 'MINTING',
      isLoading: true
    }, 'success');
    
    // STEP 1: Try GASLESS FIRST (no user confirmation needed)
    addStep('GIFT_WIZARD', 'GASLESS_ATTEMPT_DECISION', {
      strategy: 'GASLESS_FIRST',
      reason: 'User preference for free transactions'
    }, 'pending');
    
    console.log('🔄 Attempting GASLESS first...');
    
    try {
      await attemptGaslessMint();
    } catch (gaslessError) {
      console.log('❌ Gasless attempt reported failure:', gaslessError);
      
      // CRITICAL: Check if gasless actually succeeded despite error report
      console.log('🔍 VERIFICATION: Checking if gasless actually succeeded on-chain...');
      
      try {
        const deployerAccount = account?.address; // This should be the deployer address
        const gaslessVerification = await import('../lib/gaslessValidation').then(
          mod => mod.checkGaslessTransactionActuallySucceeded(deployerAccount!)
        );
        
        if (gaslessVerification.found && gaslessVerification.transactionHash && gaslessVerification.tokenId) {
          console.log('🎉 GASLESS ACTUALLY SUCCEEDED! Found transaction:', gaslessVerification);
          
          // Treat as successful gasless transaction
          setWizardData(prev => ({ 
            ...prev, 
            nftTokenId: gaslessVerification.tokenId!,
            shareUrl: `${window.location.origin}/token/${process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS}/${gaslessVerification.tokenId}`,
            qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
              `${window.location.origin}/token/${process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS}/${gaslessVerification.tokenId}`
            )}`,
            wasGasless: true
          }));
          
          setCurrentStep(WizardStep.SUCCESS);
          setIsLoading(false);
          
          addStep('GIFT_WIZARD', 'GASLESS_RECOVERY_SUCCESS', {
            tokenId: gaslessVerification.tokenId,
            transactionHash: gaslessVerification.transactionHash,
            recoveryMethod: 'blockchain_verification'
          }, 'success');
          
          return; // Exit early - gasless actually worked!
        }
      } catch (verificationError) {
        console.warn('⚠️ Gasless verification check failed:', verificationError);
      }
      
      addError('GIFT_WIZARD', 'GASLESS_ATTEMPT_FAILED', gaslessError, {
        errorType: 'GASLESS_FAILURE',
        willShowGasModal: true
      });
      
      console.log('❌ Gasless truly failed, showing gas estimation modal');
      
      addDecision('GIFT_WIZARD', 'gaslessFailed', true, {
        nextAction: 'SHOW_GAS_MODAL',
        errorMessage: gaslessError instanceof Error ? gaslessError.message : gaslessError
      });
      
      // If gasless truly fails, THEN show gas modal
      setIsLoading(false);
      setCurrentStep(WizardStep.SUMMARY);
      
      // Estimate gas for fallback
      const estimatedGas = "150000";
      const gasPrice = "0.1";
      const totalCost = (parseInt(estimatedGas) * parseFloat(gasPrice) * 1e-9).toFixed(6);
      
      setGasEstimation({
        estimatedGas,
        gasPrice,
        totalCost,
        networkName: 'Base Sepolia'
      });
      
      addStep('GIFT_WIZARD', 'GAS_MODAL_SHOWN', {
        estimatedGas,
        gasPrice,
        totalCost,
        networkName: 'Base Sepolia'
      }, 'success');
      
      setShowGasModal(true);
    }
  };
  
  const attemptGaslessMint = async () => {
    addStep('GIFT_WIZARD', 'GASLESS_MINT_STARTED', {
      walletAddress: account?.address,
      imageFile: !!wizardData.imageFile,
      message: wizardData.message || 'default',
      amount: netAmount
    }, 'pending');

    // Step 1: Compress image if needed to prevent 413 errors
    let imageFileToUpload = wizardData.imageFile!;
    const originalSize = imageFileToUpload.size;
    
    if (originalSize > 2 * 1024 * 1024) { // 2MB threshold
      addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_STARTED', {
        originalSize,
        threshold: '2MB'
      }, 'pending');
      
      try {
        imageFileToUpload = await compressImage(imageFileToUpload, 0.8); // 80% quality
        addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_SUCCESS', {
          originalSize,
          compressedSize: imageFileToUpload.size,
          compressionRatio: Math.round((1 - imageFileToUpload.size / originalSize) * 100)
        }, 'success');
      } catch (compressionError) {
        addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_FAILED', {
          error: compressionError.message,
          usingOriginal: true
        }, 'pending'); // Continue with original
      }
    }

    // Step 2: Upload image to IPFS
    addStep('GIFT_WIZARD', 'IPFS_UPLOAD_STARTED', {
      hasImageFile: !!imageFileToUpload,
      hasFilteredUrl: !!wizardData.filteredImageUrl,
      finalImageSize: imageFileToUpload.size
    }, 'pending');

    const formData = new FormData();
    formData.append('file', imageFileToUpload);
    formData.append('filteredUrl', wizardData.filteredImageUrl);
    
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      addError('GIFT_WIZARD', 'IPFS_UPLOAD_FAILED', `Upload failed with status ${uploadResponse.status}`);
      throw new Error('Upload failed');
    }

    const { ipfsCid, imageIpfsCid } = await uploadResponse.json();
    addStep('GIFT_WIZARD', 'IPFS_UPLOAD_SUCCESS', { 
      metadataCid: ipfsCid, 
      imageCid: imageIpfsCid,
      // Use imageIpfsCid if available (filtered images), fallback to ipfsCid (original images)
      actualImageCid: imageIpfsCid || ipfsCid
    }, 'success');

    // Determine correct image CID to use (prioritize actual image over metadata)
    const actualImageCid = imageIpfsCid || ipfsCid;
    
    // Step 3: Always use mint-escrow API (handles both escrow and direct mint)
    const isEscrowEnabled = wizardData.escrowConfig?.enabled;
    const apiEndpoint = '/api/mint-escrow';
    
    addStep('GIFT_WIZARD', 'API_CALL_STARTED', {
      endpoint: apiEndpoint,
      escrowEnabled: isEscrowEnabled,
      to: account?.address,
      imageFile: actualImageCid,
      initialBalance: netAmount,
      filter: wizardData.selectedFilter || 'Original'
    }, 'pending');

    // Prepare request body based on escrow configuration
    const requestBody = isEscrowEnabled ? {
      metadataUri: `ipfs://${ipfsCid}`,
      recipientAddress: wizardData.escrowConfig?.recipientAddress || undefined,
      password: wizardData.escrowConfig?.password!,
      timeframeDays: wizardData.escrowConfig?.timeframe!,
      giftMessage: wizardData.escrowConfig?.giftMessage!,
      creatorAddress: account?.address,
      gasless: true
    } : {
      // Direct mint (skip escrow) - use mint-escrow API but without password
      metadataUri: `ipfs://${ipfsCid}`,
      // No password = direct mint
      giftMessage: wizardData.message || 'Un regalo cripto único creado con amor',
      creatorAddress: account?.address,
      gasless: true
    };

    const mintResponse = await makeAuthenticatedRequest(apiEndpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    addStep('GIFT_WIZARD', 'GASLESS_API_RESPONSE_RECEIVED', {
      status: mintResponse.status,
      statusText: mintResponse.statusText,
      ok: mintResponse.ok
    }, mintResponse.ok ? 'success' : 'error');

    if (!mintResponse.ok) {
      const errorData = await mintResponse.json().catch(() => ({}));
      addError('GIFT_WIZARD', 'GASLESS_API_ERROR', errorData.message || 'API call failed', {
        status: mintResponse.status,
        errorData
      });
      throw new Error(errorData.message || 'Gasless mint failed');
    }

    const mintResult = await mintResponse.json();
    
    // Handle different response formats for escrow vs regular minting
    const tokenId = mintResult.tokenId;
    const shareUrl = mintResult.shareUrl || mintResult.giftLink;
    const qrCode = mintResult.qrCode;
    const gasless = mintResult.gasless;
    const message = mintResult.message;
    const escrowTransactionHash = mintResult.escrowTransactionHash;
    const nonce = mintResult.nonce;
    const isDirectMint = mintResult.directMint;
    
    addStep('GIFT_WIZARD', 'API_RESPONSE_PARSED', {
      tokenId,
      hasShareUrl: !!shareUrl,
      hasQrCode: !!qrCode,
      gasless,
      message,
      isEscrow: isEscrowEnabled,
      isDirectMint: isDirectMint,
      escrowTransactionHash,
      nonce: nonce?.slice(0, 10) + '...',
      fullResponse: mintResult
    }, 'success');
    
    // Store NFT metadata on client for future retrieval
    try {
      console.log('💾 Storing NFT metadata on client...');
      console.log('🔍 Contract address:', process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS);
      console.log('🔍 Token ID:', tokenId);
      console.log('🔍 IPFS CID:', ipfsCid);
      
      const nftMetadata: NFTMetadata = {
        contractAddress: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || '',
        tokenId: tokenId,
        name: `CryptoGift NFT-Wallet #${tokenId}`,
        description: wizardData.message || 'Un regalo cripto único creado con amor',
        image: `ipfs://${actualImageCid}`,
        imageIpfsCid: actualImageCid,
        attributes: [
          {
            trait_type: "Initial Balance",
            value: `${netAmount} USDC`
          },
          {
            trait_type: "Filter",
            value: wizardData.selectedFilter || "Original"
          },
          {
            trait_type: "Creation Date",
            value: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        mintTransactionHash: mintResult.transactionHash,
        owner: account?.address
      };
      
      console.log('📦 Metadata to store:', nftMetadata);
      
      // CRITICAL: Store with wallet address for proper scoping
      if (account?.address) {
        storeNFTMetadataClient(nftMetadata, account.address);
        console.log('✅ NFT metadata stored on client with wallet scope:', account.address.slice(0, 10) + '...');
        
        // Verify it was stored with wallet scope
        const storedCheck = getNFTMetadataClient(nftMetadata.contractAddress, nftMetadata.tokenId, account.address);
        console.log('🔍 Verification check:', storedCheck);
      } else {
        console.warn('⚠️ No wallet address available for scoped storage');
      }
    } catch (metadataError) {
      console.error('⚠️ Failed to store NFT metadata on client:', metadataError);
    }
    
    // CRITICAL DECISION POINT: Was it actually gasless?
    addDecision('GIFT_WIZARD', 'isTransactionGasless', gasless, {
      tokenId,
      message,
      apiSaysGasless: gasless
    });
    
    // Only proceed if it was actually gasless
    if (!gasless) {
      addError('GIFT_WIZARD', 'TRANSACTION_NOT_GASLESS', 'API returned gasless=false', {
        tokenId,
        message,
        gaslessValue: gasless
      });
      throw new Error('Transaction was not gasless');
    }
    
    addStep('GIFT_WIZARD', 'GASLESS_SUCCESS_CONFIRMED', {
      tokenId,
      shareUrl,
      qrCode
    }, 'success');
    
    setWizardData(prev => ({ 
      ...prev, 
      nftTokenId: tokenId,
      shareUrl,
      qrCode,
      wasGasless: true,
      message: isDirectMint ? message : prev.message // Store direct mint message
    }));
    
    addStep('GIFT_WIZARD', 'WIZARD_DATA_UPDATED', {
      tokenId,
      wasGasless: true
    }, 'success');
    
    setCurrentStep(WizardStep.SUCCESS);
    setIsLoading(false);
    
    finishTrace('success', {
      tokenId,
      wasGasless: true,
      finalStep: 'SUCCESS'
    });
    
    addStep('GIFT_WIZARD', 'GASLESS_FLOW_COMPLETED', {
      tokenId,
      currentStep: 'SUCCESS'
    }, 'success');
  };

  const handleGasConfirm = async () => {
    setShowGasModal(false);
    setCurrentStep(WizardStep.MINTING);
    setIsLoading(true);
    setError(null);

    // Log start of mint process to debug system
    try {
      await fetch('/api/debug/mint-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          step: 'GIFT_WIZARD_START',
          data: { walletAddress: account.address, timestamp: new Date().toISOString() }
        })
      });
    } catch (debugError) {
      console.warn('Debug logging failed:', debugError);
    }

    try {
      // Step 1: Compress image if needed to prevent 413 errors
      let imageFileToUpload = wizardData.imageFile!;
      const originalSize = imageFileToUpload.size;
      
      if (originalSize > 2 * 1024 * 1024) { // 2MB threshold
        addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_STARTED', {
          originalSize,
          threshold: '2MB'
        }, 'pending');
        
        try {
          imageFileToUpload = await compressImage(imageFileToUpload, 0.8); // 80% quality
          addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_SUCCESS', {
            originalSize,
            compressedSize: imageFileToUpload.size,
            compressionRatio: Math.round((1 - imageFileToUpload.size / originalSize) * 100)
          }, 'success');
        } catch (compressionError) {
          addStep('GIFT_WIZARD', 'IMAGE_COMPRESSION_FAILED', {
            error: compressionError.message,
            usingOriginal: true
          }, 'pending'); // Continue with original
        }
      }

      // Step 2: Upload image to IPFS
      const formData = new FormData();
      formData.append('file', imageFileToUpload);
      formData.append('filteredUrl', wizardData.filteredImageUrl);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed with status ${uploadResponse.status}`);
      }

      const { ipfsCid, imageIpfsCid } = await uploadResponse.json();
      
      // Determine correct image CID to use (prioritize actual image over metadata)
      const actualImageCid = imageIpfsCid || ipfsCid;

      // Step 2: Mint NFT with GAS PAYMENT (user confirmed to pay gas)
      addStep('GIFT_WIZARD', 'GAS_PAID_MINT_STARTED', {
        endpoint: '/api/mint',
        to: account?.address,
        imageFile: actualImageCid, // Use actual image CID instead of metadata CID
        initialBalance: netAmount,
        filter: wizardData.selectedFilter || 'Original'
      }, 'pending');

      const mintResponse = await makeAuthenticatedRequest('/api/mint', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: account?.address,
          imageFile: actualImageCid, // Send actual image CID, not metadata CID
          giftMessage: wizardData.message || 'Un regalo cripto único creado con amor',
          initialBalance: netAmount, // Net amount after fees
          filter: wizardData.selectedFilter || 'Original',
          referrer: referrer
        }),
      });

      addStep('GIFT_WIZARD', 'GAS_PAID_API_RESPONSE_RECEIVED', {
        status: mintResponse.status,
        statusText: mintResponse.statusText,
        ok: mintResponse.ok
      }, mintResponse.ok ? 'success' : 'error');

      if (!mintResponse.ok) {
        const errorData = await mintResponse.json().catch(() => ({}));
        addError('GIFT_WIZARD', 'GAS_PAID_API_ERROR', errorData.message || 'Gas-paid API call failed', {
          status: mintResponse.status,
          errorData
        });
        throw new Error(errorData.message || `Gas-paid mint failed with status ${mintResponse.status}`);
      }

      const mintResult = await mintResponse.json();
      const { tokenId, shareUrl, qrCode, gasless, message } = mintResult;
      
      addStep('GIFT_WIZARD', 'GAS_PAID_API_RESPONSE_PARSED', {
        tokenId,
        hasShareUrl: !!shareUrl,
        hasQrCode: !!qrCode,
        gasless, // Should be false for gas-paid transactions
        message,
        fullResponse: mintResult
      }, 'success');
      
      // Store NFT metadata on client for future retrieval
      try {
        console.log('💾 Storing NFT metadata on client (gas-paid)...');
        console.log('🔍 Contract address (gas-paid):', process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS);
        console.log('🔍 Token ID (gas-paid):', tokenId);
        console.log('🔍 IPFS CID (gas-paid):', ipfsCid);
        
        const nftMetadata: NFTMetadata = {
          contractAddress: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || '',
          tokenId: tokenId,
          name: `CryptoGift NFT-Wallet #${tokenId}`,
          description: wizardData.message || 'Un regalo cripto único creado con amor',
          image: `ipfs://${actualImageCid}`,
          imageIpfsCid: actualImageCid,
          attributes: [
            {
              trait_type: "Initial Balance",
              value: `${netAmount} USDC`
            },
            {
              trait_type: "Filter",
              value: wizardData.selectedFilter || "Original"
            },
            {
              trait_type: "Creation Date",
              value: new Date().toISOString()
            }
          ],
          createdAt: new Date().toISOString(),
          mintTransactionHash: mintResult.transactionHash,
          owner: account?.address
        };
        
        console.log('📦 Metadata to store (gas-paid):', nftMetadata);
        
        // CRITICAL: Store with wallet address for proper scoping
        if (account?.address) {
          storeNFTMetadataClient(nftMetadata, account.address);
          console.log('✅ NFT metadata stored on client (gas-paid) with wallet scope:', account.address.slice(0, 10) + '...');
        } else {
          console.warn('⚠️ No wallet address available for scoped storage (gas-paid)');
        }
        
        // Verify it was stored with wallet scope
        if (account?.address) {
          const storedCheck = getNFTMetadataClient(nftMetadata.contractAddress, nftMetadata.tokenId, account.address);
          console.log('🔍 Verification check (gas-paid):', storedCheck);
        }
      } catch (metadataError) {
        console.error('⚠️ Failed to store NFT metadata on client (gas-paid):', metadataError);
      }
      
      // CRITICAL DECISION POINT: Confirm this was a gas-paid transaction
      addDecision('GIFT_WIZARD', 'isTransactionGasPaid', !gasless, {
        tokenId,
        message,
        apiSaysGasless: gasless,
        expectedGasPaid: true
      });
      
      addStep('GIFT_WIZARD', 'GAS_PAID_SUCCESS_CONFIRMED', {
        tokenId,
        shareUrl,
        qrCode,
        userPaidGas: !gasless
      }, 'success');
      
      setWizardData(prev => ({ 
        ...prev, 
        nftTokenId: tokenId,
        shareUrl,
        qrCode,
        wasGasless: gasless || false
      }));
      
      setCurrentStep(WizardStep.SUCCESS);
    } catch (err) {
      const parsedError = parseApiError(err);
      logError(parsedError, 'GiftWizard.handleMintGift');
      
      // Log error to debug system
      try {
        await fetch('/api/debug/mint-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'ERROR',
            step: 'GIFT_WIZARD_ERROR',
            data: { 
              error: parsedError.message,
              stack: parsedError.stack,
              userMessage: parsedError instanceof Error ? parsedError.message : 'Unknown error',
              timestamp: new Date().toISOString()
            }
          })
        });
      } catch (debugError) {
        console.warn('Debug error logging failed:', debugError);
      }
      
      setError(parsedError);
      setShowErrorModal(true);
      setCurrentStep(WizardStep.SUMMARY);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case WizardStep.CONNECT:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-6">Conecta tu Wallet</h2>
            <p className="text-gray-600 mb-8">
              Necesitamos conectar tu wallet para crear el NFT-wallet regalo
            </p>
            {mounted && (
              <>
                <ConnectButton
                  client={client}
                  appMetadata={{
                    name: "CryptoGift Wallets",
                    url: "https://cryptogift-wallets.vercel.app",
                  }}
                />
                
                {/* Show authentication status if wallet is connected */}
                {account && (
                  <div className="mt-8">
                    <div className="border rounded-lg p-6 bg-gray-50">
                      <h3 className="font-semibold mb-4">🔐 Autenticación Requerida</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Para mayor seguridad, necesitas firmar un mensaje de autenticación
                      </p>
                      
                      {isAuthenticated ? (
                        <div className="text-green-600">
                          <div className="flex items-center justify-center gap-2">
                            <span>✅</span>
                            <span>Autenticado correctamente</span>
                          </div>
                          <button
                            onClick={() => setCurrentStep(WizardStep.UPLOAD)}
                            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Continuar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleAuthenticate}
                          disabled={isAuthenticating}
                          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          {isAuthenticating ? 'Autenticando...' : 'Firmar Mensaje de Autenticación'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case WizardStep.UPLOAD:
        return (
          <ImageUpload 
            onImageUpload={handleImageUpload}
            onBack={handleBack}
          />
        );

      case WizardStep.FILTER:
        return (
          <FilterSelector
            imageUrl={wizardData.imageUrl}
            onFilterSelect={handleFilterSelect}
            onBack={handleBack}
          />
        );

      case WizardStep.AMOUNT:
        return (
          <AmountSelector
            currentAmount={wizardData.amount}
            onAmountSelect={handleAmountSelect}
            onBack={handleBack}
            referralFee={referralFee}
            platformFee={platformFee}
            netAmount={netAmount}
          />
        );

      case WizardStep.ESCROW:
        return (
          <GiftEscrowConfig
            onConfigureEscrow={handleEscrowConfig}
            onSkipEscrow={handleSkipEscrow}
            initialConfig={wizardData.escrowConfig}
            isLoading={isLoading}
          />
        );

      case WizardStep.SUMMARY:
        return (
          <GiftSummary
            data={wizardData}
            fees={{
              creation: creationFee,
              referral: referralFee,
              platform: platformFee,
              net: netAmount
            }}
            onConfirm={handleMintGift}
            onBack={handleBack}
            isLoading={isLoading}
            error={error ? (error instanceof CryptoGiftError ? error.userMessage || error.message : error.message || error.toString()) : null}
          />
        );

      case WizardStep.MINTING:
        return (
          <div className="text-center py-12">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold mb-4">Creando tu Regalo...</h2>
            <p className="text-gray-600 mb-4">
              Esto puede tomar unos segundos. ¡No cierres esta ventana!
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-700">
                🔄 <strong>Intentando transacción gasless</strong> (gratis)<br/>
                ⚡ Biconomy paymaster procesando...<br/>
                💰 Si falla → te pediremos pagar gas (~$0.01)
              </p>
            </div>
          </div>
        );

      case WizardStep.SUCCESS:
        return (
          <QRShare
            tokenId={wizardData.nftTokenId!}
            shareUrl={wizardData.shareUrl}
            qrCode={wizardData.qrCode}
            onClose={onClose}
            wasGasless={wizardData.wasGasless}
            isDirectMint={!wizardData.escrowConfig?.enabled}
            message={wizardData.message}
          />
        );

      default:
        return null;
    }
  };

  const getStepNumber = () => {
    const stepNumbers = {
      [WizardStep.CONNECT]: 0,
      [WizardStep.UPLOAD]: 1,
      [WizardStep.FILTER]: 2,
      [WizardStep.AMOUNT]: 3,
      [WizardStep.ESCROW]: 4,
      [WizardStep.SUMMARY]: 5,
      [WizardStep.MINTING]: 6,
      [WizardStep.SUCCESS]: 7
    };
    return stepNumbers[currentStep];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h1 className="text-2xl font-bold">Crear Regalo Cripto</h1>
            {currentStep !== WizardStep.SUCCESS && (
              <p className="text-sm text-gray-500 mt-1">
                Paso {getStepNumber()} de 7
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        {currentStep !== WizardStep.SUCCESS && (
          <div className="px-6 py-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getStepNumber() / 7) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        error={error}
        onClose={() => {
          setShowErrorModal(false);
          setError(null);
        }}
        onRetry={() => {
          setShowErrorModal(false);
          setError(null);
          handleMintGift();
        }}
      />

      {/* Gas Estimation Modal */}
      <GasEstimationModal
        isOpen={showGasModal}
        onClose={() => setShowGasModal(false)}
        onConfirm={handleGasConfirm}
        estimatedGas={gasEstimation.estimatedGas}
        gasPrice={gasEstimation.gasPrice}
        totalCost={gasEstimation.totalCost}
        networkName={gasEstimation.networkName}
      />

      {/* Device Limit Modal */}
      <DeviceLimitModal
        isOpen={showDeviceLimitModal}
        registeredWallets={getDeviceWalletInfo().registeredWallets}
        onClose={() => {
          setShowDeviceLimitModal(false);
          onClose(); // Close the entire wizard
        }}
        onSelectWallet={(walletAddress) => {
          setShowDeviceLimitModal(false);
          // TODO: Implement wallet switching logic
          console.log('User selected existing wallet:', walletAddress);
        }}
      />
    </div>
  );
};