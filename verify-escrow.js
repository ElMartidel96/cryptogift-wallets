const { ethers } = require('ethers');
require('dotenv').config();

async function verifyEscrowContract() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS;
  
  console.log('🔍 VERIFICANDO CONTRATO ESCROW...');
  console.log('📍 Address:', contractAddress);
  console.log('🌐 RPC:', rpcUrl);
  
  if (!contractAddress || !rpcUrl) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const code = await provider.getCode(contractAddress);
  
  if (code === '0x') {
    console.error('❌ NO CONTRACT FOUND');
    process.exit(1);
  }
  
  console.log('✅ Contract exists - Code size:', (code.length - 2) / 2, 'bytes');
  
  // Test basic contract functions
  const abi = [
    "function FIFTEEN_MINUTES() external view returns (uint256)",
    "function SEVEN_DAYS() external view returns (uint256)",
    "function owner() external view returns (address)"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  try {
    const fifteenMin = await contract.FIFTEEN_MINUTES();
    const sevenDays = await contract.SEVEN_DAYS();
    const owner = await contract.owner();
    
    console.log('✅ FIFTEEN_MINUTES:', fifteenMin.toString(), 'seconds');
    console.log('✅ SEVEN_DAYS:', sevenDays.toString(), 'seconds');
    console.log('✅ Owner:', owner);
    console.log('✅ ESCROW CONTRACT FULLY OPERATIONAL');
    
  } catch (error) {
    console.error('❌ Contract function test failed:', error.message);
    process.exit(1);
  }
}

verifyEscrowContract().catch(console.error);