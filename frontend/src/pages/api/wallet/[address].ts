import { NextApiRequest, NextApiResponse } from "next";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { baseSepolia } from "@thirdweb-dev/chains";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid wallet address' 
      });
    }

    // Initialize ThirdWeb SDK
    const sdk = ThirdwebSDK.fromPrivateKey(
      process.env.PRIVATE_KEY_DEPLOY!,
      baseSepolia,
      {
        secretKey: process.env.TW_SECRET_KEY!,
      }
    );

    const provider = sdk.getProvider();

    // Get ETH balance
    const ethBalance = await provider.getBalance(address);
    const ethBalanceFormatted = (parseFloat(ethBalance.toString()) / 1e18).toFixed(6);

    // Get USDC balance
    let usdcBalance = "0";
    let primaryToken = process.env.NEXT_PUBLIC_USDC_ADDRESS!;
    
    try {
      const usdcContract = await sdk.getContract(
        process.env.NEXT_PUBLIC_USDC_ADDRESS!,
        "token"
      );
      
      const balance = await usdcContract.balanceOf(address);
      usdcBalance = (parseFloat(balance.toString()) / 1e6).toFixed(6); // USDC has 6 decimals
    } catch (error) {
      console.error('Error getting USDC balance:', error);
    }

    // Determine primary token and balance
    const primaryBalance = parseFloat(usdcBalance) > 0 ? usdcBalance : ethBalanceFormatted;
    if (parseFloat(ethBalanceFormatted) > parseFloat(usdcBalance)) {
      primaryToken = "ETH";
      primaryBalance.toString();
    }

    // Get recent transactions (mock data for now)
    // In a real implementation, you'd query blockchain events or use a service like Moralis
    const mockTransactions = [
      {
        type: "receive",
        amount: usdcBalance,
        token: "USDC",
        date: new Date().toLocaleDateString(),
        hash: "0x1234...5678",
      }
    ];

    // Check if this is a Token Bound Account
    let isTBA = false;
    let associatedNFT = null;

    try {
      // Try to get code at address to see if it's a contract
      const code = await provider.getCode(address);
      if (code !== '0x') {
        isTBA = true;
        
        // Try to get associated NFT info
        // This would require calling the TBA contract to get its NFT info
        // For now, we'll mock it
        associatedNFT = {
          contractAddress: process.env.NEXT_PUBLIC_NFT_DROP_ADDRESS!,
          tokenId: "1", // Would be determined from the TBA contract
        };
      }
    } catch (error) {
      console.error('Error checking TBA status:', error);
    }

    res.status(200).json({
      success: true,
      address,
      balances: {
        eth: ethBalanceFormatted,
        usdc: usdcBalance,
        primary: primaryBalance,
      },
      primaryToken,
      transactions: mockTransactions,
      isTBA,
      associatedNFT,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Wallet API error:', error);
    res.status(500).json({
      error: 'Failed to fetch wallet data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}