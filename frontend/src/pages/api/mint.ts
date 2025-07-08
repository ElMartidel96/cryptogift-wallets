import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "thirdweb";
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

    const sdk = ThirdwebSDK.fromPrivateKey(
      process.env.PRIVATE_KEY_DEPLOY!,
      baseSepolia,
      {
        secretKey: process.env.TW_SECRET_KEY,
      }
    );

    // Get NFT Drop contract
    const nftDrop = await sdk.getContract(
      process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS!,
      "nft-drop"
    );

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

    // Mint NFT using lazy minting
    const tx = await nftDrop.createBatch([nftMetadata]);
    const receipt = await tx[0].receipt;
    
    // Get the token ID from the mint event
    const mintEvents = receipt.events?.filter(event => event.event === 'TokensMinted');
    const tokenId = mintEvents?.[0]?.args?.startTokenId?.toString();

    if (!tokenId) {
      throw new Error('Failed to get token ID from mint transaction');
    }

    // Generate ERC-6551 Token Bound Account address
    const registryContract = await sdk.getContract(
      process.env.NEXT_PUBLIC_ERC6551_REGISTRY!
    );

    const salt = 0; // Can be any number, usually tokenId
    const implementation = process.env.TBA_IMPL!;
    const chainId = 84532; // Base Sepolia
    const tokenContract = process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS!;

    // Calculate TBA address (deterministic)
    const tbaAddress = await registryContract.call("account", [
      implementation,
      salt,
      chainId,
      tokenContract,
      tokenId
    ]);

    // Create the account if it doesn't exist
    try {
      await registryContract.call("createAccount", [
        implementation,
        salt,
        chainId,
        tokenContract,
        tokenId
      ]);
    } catch (error) {
      // Account might already exist, which is fine
      console.log('TBA account might already exist:', error);
    }

    // Process referral fee if applicable
    if (referrer && referralFee > 0) {
      try {
        const referralTreasury = await sdk.getContract(
          process.env.NEXT_PUBLIC_REF_TREASURY_ADDRESS!
        );
        
        // Credit referrer (this would need to be done with actual USDC transfer)
        console.log(`Would credit ${referralFee} USDC to referrer ${referrer}`);
      } catch (referralError) {
        console.error('Referral processing error:', referralError);
        // Don't fail the mint if referral processing fails
      }
    }

    // Generate share URL and QR code
    const baseUrl = req.headers.host?.includes('localhost') 
      ? `http://${req.headers.host}`
      : `https://${req.headers.host}`;
    
    const shareUrl = `${baseUrl}/token/${process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS}/${tokenId}`;
    
    // You would typically use a QR code library here
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
      tokenId: parseInt(tokenId),
      tbaAddress,
      shareUrl,
      qrCode: qrCodeData,
      transactionHash: receipt.transactionHash,
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