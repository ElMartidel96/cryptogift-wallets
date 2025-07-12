import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { promises as fs } from "fs";
import { upload } from "thirdweb/storage";
import { uploadToIPFS, uploadMetadata, validateIPFSConfig } from "../../lib/ipfs";
import { addMintLog } from "./debug/mint-logs";

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    addMintLog('INFO', 'UPLOAD_API_START', { timestamp: new Date().toISOString() });
    
    // Check IPFS configuration
    const ipfsConfig = validateIPFSConfig();
    addMintLog('INFO', 'IPFS_CONFIG_CHECK', ipfsConfig);
    
    if (!ipfsConfig.nftStorage && !ipfsConfig.thirdweb) {
      throw new Error('No IPFS providers configured. Check environment variables.');
    }

    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the file
    const fileData = await fs.readFile(uploadedFile.filepath);
    
    // Create File object
    const nftFile = new File([fileData], uploadedFile.originalFilename || 'image', {
      type: uploadedFile.mimetype || 'image/jpeg',
    });

    // Upload using hybrid IPFS strategy
    addMintLog('INFO', 'IPFS_UPLOAD_START', { 
      fileName: nftFile.name, 
      fileSize: nftFile.size,
      mimeType: nftFile.type 
    });
    
    const uploadResult = await uploadToIPFS(nftFile);
    addMintLog('SUCCESS', 'IPFS_UPLOAD_COMPLETE', {
      provider: uploadResult.provider,
      cid: uploadResult.cid,
      url: uploadResult.url,
      size: uploadResult.size
    });
    
    const cid = uploadResult.cid;

    // Create metadata if this is the final upload
    const filteredUrl = fields.filteredUrl?.[0];
    if (filteredUrl && typeof filteredUrl === 'string' && filteredUrl.startsWith('http')) {
      // If we have a filtered image URL, use that as the main image
      const metadataResponse = await fetch(filteredUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'CryptoGift-Wallets/1.0'
        }
      });
      
      if (!metadataResponse.ok) {
        throw new Error(`Failed to fetch filtered image: ${metadataResponse.status}`);
      }
      
      const filteredImageData = await metadataResponse.arrayBuffer();
      
      const filteredFile = new File([filteredImageData], 'filtered-image.jpg', {
        type: 'image/jpeg',
      });
      
      addMintLog('INFO', 'FILTERED_IMAGE_UPLOAD_START', { 
        filteredUrl, 
        imageSize: filteredImageData.byteLength 
      });
      
      const filteredUploadResult = await uploadToIPFS(filteredFile);
      addMintLog('SUCCESS', 'FILTERED_IMAGE_UPLOAD_COMPLETE', {
        provider: filteredUploadResult.provider,
        cid: filteredUploadResult.cid,
        url: filteredUploadResult.url
      });
      
      const filteredCid = filteredUploadResult.cid;
      
      // Store the metadata
      const metadata = {
        name: `CryptoGift NFT #${Date.now()}`,
        description: "Un regalo cripto único creado con amor",
        image: `ipfs://${filteredCid}`,
        external_url: "https://cryptogift-wallets.vercel.app",
        attributes: [
          {
            trait_type: "Creation Date",
            value: new Date().toISOString(),
          },
          {
            trait_type: "Platform",
            value: "CryptoGift Wallets",
          }
        ],
      };

      addMintLog('INFO', 'METADATA_UPLOAD_START', { metadata });
      
      const metadataUploadResult = await uploadMetadata(metadata);
      addMintLog('SUCCESS', 'METADATA_UPLOAD_COMPLETE', {
        provider: metadataUploadResult.provider,
        cid: metadataUploadResult.cid,
        url: metadataUploadResult.url
      });
      
      const metadataCid = metadataUploadResult.cid;

      return res.status(200).json({
        success: true,
        ipfsCid: metadataCid,
        imageIpfsCid: filteredCid,
        originalIpfsCid: cid,
        ipfsUrl: `ipfs://${metadataCid}`,
        imageUrl: `ipfs://${filteredCid}`,
        metadata,
      });
    }

    // Just return the image CID for now
    res.status(200).json({
      success: true,
      ipfsCid: cid,
      ipfsUrl: `ipfs://${cid}`,
      httpUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
    });

  } catch (error) {
    console.error('Upload error:', error);
    addMintLog('ERROR', 'UPLOAD_API_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      debug: 'Check /api/debug/mint-logs for detailed error information'
    });
  }
}