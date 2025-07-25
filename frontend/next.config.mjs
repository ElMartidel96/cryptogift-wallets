/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'nftstorage.link',
      'ipfs.io',
      'gateway.pinata.cloud',
      'image-api.photoroom.com'
    ],
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_TW_CLIENT_ID: process.env.NEXT_PUBLIC_TW_CLIENT_ID,
    NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS: process.env.NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  },
  serverExternalPackages: [
    'thirdweb',
    'ethers'
  ],
  // fixes wallet connect dependency issue https://docs.walletconnect.com/web3modal/nextjs/about#extra-configuration
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
