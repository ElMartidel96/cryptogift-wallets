import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { promises as fs } from "fs";
import { upload } from "thirdweb/storage";

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
    if (!process.env.TW_CLIENT_ID) {
      throw new Error('ThirdWeb client ID not configured');
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

    // Upload to ThirdWeb Storage (IPFS)
    const uploadResult = await upload({
      client: { clientId: process.env.TW_CLIENT_ID! },
      files: [nftFile],
    });
    const cid = uploadResult;

    // Create metadata if this is the final upload
    const filteredUrl = fields.filteredUrl?.[0];
    if (filteredUrl) {
      // If we have a filtered image URL, use that as the main image
      const metadataResponse = await fetch(filteredUrl);
      const filteredImageData = await metadataResponse.arrayBuffer();
      
      const filteredFile = new File([filteredImageData], 'filtered-image.jpg', {
        type: 'image/jpeg',
      });
      
      const filteredCidResult = await upload({
        client: { clientId: process.env.TW_CLIENT_ID! },
        files: [filteredFile],
      });
      const filteredCid = filteredCidResult;
      
      // Store the metadata
      const metadata = {
        name: `CryptoGift NFT #${Date.now()}`,
        description: "Un regalo cripto único creado con amor",
        image: `ipfs://${filteredCid}`,
        external_url: "https://cryptogift.gl",
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

      const metadataFile = new File([JSON.stringify(metadata)], 'metadata.json', {
        type: 'application/json',
      });

      const metadataCidResult = await upload({
        client: { clientId: process.env.TW_CLIENT_ID! },
        files: [metadataFile],
      });
      const metadataCid = metadataCidResult;

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
    res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}