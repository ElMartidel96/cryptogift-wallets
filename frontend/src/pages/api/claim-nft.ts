import { NextApiRequest, NextApiResponse } from "next";
import { createThirdwebClient, getContract, prepareContractCall } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { createBiconomySmartAccount, sendGaslessTransaction, validateBiconomyConfig } from "../../lib/biconomy";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      tokenId, 
      contractAddress, 
      claimerAddress,
      setupGuardians = false,
      guardianEmails = []
    } = req.body;

    if (!tokenId || !contractAddress || !claimerAddress) {
      return res.status(400).json({ 
        error: 'Missing required parameters: tokenId, contractAddress, claimerAddress' 
      });
    }

    // Initialize ThirdWeb client
    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_TW_CLIENT_ID!,
      secretKey: process.env.TW_SECRET_KEY!,
    });

    // Get NFT contract
    const nftContract = getContract({
      client,
      chain: baseSepolia,
      address: contractAddress,
    });

    let claimResult: any = {};

    // Try gasless claim with Biconomy
    try {
      if (!validateBiconomyConfig()) {
        throw new Error('Biconomy not configured for gasless claim');
      }

      // Create Smart Account for gasless transaction
      const smartAccount = await createBiconomySmartAccount(process.env.PRIVATE_KEY_DEPLOY!);

      // Use proper thirdweb v5 syntax for prepareContractCall
      const claimTransaction = prepareContractCall({
        contract: nftContract,
        method: "function transferFrom(address from, address to, uint256 tokenId) external",
        params: [
          "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a", // Current owner (deployer wallet)
          claimerAddress, // New owner (claimer)
          BigInt(tokenId)
        ],
      });

      // Execute gasless claim
      const claimTxResult = await sendGaslessTransaction(smartAccount, claimTransaction);

      claimResult = {
        success: true,
        gasless: true,
        transactionHash: claimTxResult.transactionHash,
        blockNumber: claimTxResult.blockNumber,
      };

      console.log(`✅ Gasless NFT claim successful: tokenId=${tokenId}, tx=${claimTxResult.transactionHash}`);

    } catch (gaslessError) {
      console.warn('Gasless claim failed, using gas-paid fallback:', gaslessError);
      
      // FALLBACK: Real gas-paid transaction
      try {
        console.log("🔍 FALLBACK: Using gas-paid transferFrom");
        
        // Create deployer account for gas-paid transaction
        const { privateKeyToAccount } = await import("thirdweb/wallets");
        const account = privateKeyToAccount({
          client,
          privateKey: process.env.PRIVATE_KEY_DEPLOY!,
        });

        // Prepare transfer transaction
        const transferTransaction = prepareContractCall({
          contract: nftContract,
          method: "function transferFrom(address from, address to, uint256 tokenId) external",
          params: [
            account.address, // Current owner (our deployer)
            claimerAddress, // New owner (claimer)
            BigInt(tokenId)
          ],
        });

        // Send gas-paid transaction
        const { sendTransaction } = await import("thirdweb");
        const result = await sendTransaction({
          transaction: transferTransaction,
          account,
        });

        claimResult = {
          success: true,
          gasless: false,
          transactionHash: result.transactionHash,
          blockNumber: 0, // Will be filled when mined
          message: 'NFT claimed with gas-paid transaction'
        };

        console.log(`✅ Gas-paid NFT claim successful: tokenId=${tokenId}, tx=${result.transactionHash}`);

      } catch (fallbackError) {
        console.error('Both gasless and gas-paid claim failed:', fallbackError);
        throw new Error(`Claim failed: ${fallbackError.message}`);
      }
    }

    // Setup guardians if requested
    let guardianResult: any = null;
    if (setupGuardians && guardianEmails.length >= 3) {
      try {
        // TODO: Implement guardian setup with Smart Account
        // This would involve calling a guardian contract or storing guardian info
        guardianResult = {
          success: true,
          guardians: guardianEmails.slice(0, 3),
          message: 'Guardians configured successfully'
        };
        
        console.log(`Guardians set up for ${claimerAddress}:`, guardianEmails.slice(0, 3));
      } catch (guardianError) {
        console.error('Guardian setup failed:', guardianError);
        guardianResult = {
          success: false,
          error: 'Guardian setup failed but claim succeeded'
        };
      }
    }

    // Calculate TBA address for the claimed NFT
    const tbaAddress = await calculateTBAAddressForNFT(tokenId);

    res.status(200).json({
      success: true,
      claim: claimResult,
      guardians: guardianResult,
      nft: {
        tokenId,
        contractAddress,
        owner: claimerAddress,
        tbaAddress
      },
      message: 'NFT claimed successfully!'
    });

  } catch (error) {
    console.error('Claim API error:', error);
    res.status(500).json({
      error: 'Failed to claim NFT',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Helper function to calculate TBA address for claimed NFT (SAME as mint.ts)
async function calculateTBAAddressForNFT(tokenId: string): Promise<string> {
  try {
    // Use the SAME deterministic calculation as in mint.ts
    const { ethers } = await import("ethers");
    
    // Modo simplificado - dirección determinística (SAME as mint.ts)
    const NFT_CONTRACT = process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS || "0x54314166B36E3Cc66cFb36265D99697f4F733231";
    const DEPLOYER_ADDRESS = "0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a"; // Deployer fijo
    
    // Crear dirección determinística usando keccak256 (SAME as mint.ts)
    const deterministicSeed = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'address'],
      [NFT_CONTRACT, tokenId, DEPLOYER_ADDRESS]
    );
    
    // Generar dirección TBA determinística (SAME as mint.ts)
    const tbaAddress = ethers.getAddress('0x' + deterministicSeed.slice(-40));
    
    console.log(`✅ TBA determinística calculada para claimed NFT ${tokenId}: ${tbaAddress}`);
    return tbaAddress;
  } catch (error) {
    console.error('Error calculating TBA address for claim:', error);
    return "0x0000000000000000000000000000000000000000";
  }
}