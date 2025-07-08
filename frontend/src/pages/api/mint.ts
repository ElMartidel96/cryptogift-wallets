import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, amount, referrer, metadata } = req.body;

    if (!to || !amount || !metadata) {
      return res.status(400).json({ 
        error: 'Missing required parameters: to, amount, metadata' 
      });
    }

    // Validate amount
    const minAmount = 5;
    const maxAmount = 10000;
    
    if (amount < minAmount || amount > maxAmount) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        message: `Amount must be between $${minAmount} and $${maxAmount}`,
        minAmount,
        maxAmount
      });
    }

    // Initialize ThirdWeb SDK
    if (!process.env.TW_SECRET_KEY) {
      throw new Error('ThirdWeb secret key not configured');
    }

    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
    });
    
    const account = privateKeyToAccount({
      client,
      privateKey: process.env.PRIVATE_KEY_DEPLOY!,
    });

    // Get NFT Drop contract
    const nftDropContract = getContract({
      client,
      chain: baseSepolia,
      address: process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS!,
    });

    // Calculate fees
    const creationFeePercent = parseInt(process.env.NEXT_PUBLIC_CREATION_FEE_PERCENT || "4");
    const creationFee = (amount * creationFeePercent) / 100;
    const referralFee = referrer ? creationFee / 2 : 0;
    const platformFee = creationFee - referralFee;
    const netAmount = amount - creationFee;

    // Prepare metadata
    const nftMetadata = {
      name: metadata.name || `CryptoGift #${Date.now()}`,
      description: metadata.description || "Un regalo cripto único creado con amor",
      image: metadata.image,
      external_url: "https://cryptogift.gl",
      attributes: [
        ...(metadata.attributes || []),
        {
          trait_type: "Initial Balance",
          value: `${netAmount} USDC`,
        },
        {
          trait_type: "Creation Fee",
          value: `${creationFeePercent}%`,
        },
        {
          trait_type: "Network",
          value: "Base Sepolia",
        },
        {
          trait_type: "Creator",
          value: to,
        },
        ...(referrer ? [{
          trait_type: "Referred By",
          value: referrer,
        }] : []),
      ],
    };

    // Simplified minting - TODO: implement actual minting with thirdweb v5
    const tokenId = Math.floor(Math.random() * 1000000);
    const tbaAddress = "0x0000000000000000000000000000000000000000";
    const transactionHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

    // Generate share URL and QR code
    const baseUrl = req.headers.host?.includes('localhost') 
      ? `http://${req.headers.host}`
      : `https://${req.headers.host}`;
    
    const shareUrl = `${baseUrl}/token/${process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS}/${tokenId}`;
    
    // Simplified QR code
    const qrCodeData = `data:image/svg+xml,${encodeURIComponent(`
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white"/>
        <text x="100" y="100" text-anchor="middle" fill="black" font-size="12">
          QR: ${shareUrl}
        </text>
      </svg>
    `)}`;

    res.status(200).json({
      success: true,
      tokenId: tokenId,
      tbaAddress,
      shareUrl,
      qrCode: qrCodeData,
      transactionHash,
      fees: {
        creation: creationFee,
        referral: referralFee,
        platform: platformFee,
        net: netAmount,
      },
      metadata: nftMetadata,
    });

  } catch (error) {
    console.error('Mint API error:', error);
    res.status(500).json({
      error: 'Mint failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}