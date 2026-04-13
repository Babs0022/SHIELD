import axios from 'axios';
import FormData from 'form-data';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_JWT = process.env.PINATA_JWT;

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Uploads encrypted content to IPFS via Pinata
 * Returns the IPFS hash (CID)
 */
export async function uploadToIPFS(
  content: Buffer,
  metadata: {
    name: string;
    contentType: string;
    policyId?: string;
  }
): Promise<{ ipfsHash: string; size: number }> {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('Pinata credentials not configured');
  }

  const formData = new FormData();

  // Add the file
  formData.append('file', content, {
    filename: metadata.name,
    contentType: metadata.contentType,
  });

  // Add metadata
  const pinataMetadata = JSON.stringify({
    name: metadata.name,
    keyvalues: {
      policyId: metadata.policyId || '',
      uploadedAt: new Date().toISOString(),
    },
  });
  formData.append('pinataMetadata', pinataMetadata);

  // Add options (pin permanently)
  const pinataOptions = JSON.stringify({
    cidVersion: 1,
    wrapWithDirectory: false,
  });
  formData.append('pinataOptions', pinataOptions);

  try {
    const response = await axios.post<PinataResponse>(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return {
      ipfsHash: response.data.IpfsHash,
      size: response.data.PinSize,
    };
  } catch (error) {
    console.error('IPFS upload failed:', error);
    throw new Error('Failed to upload content to IPFS');
  }
}

/**
 * Uploads JSON metadata to IPFS
 */
export async function uploadJSONToIPFS(
  jsonData: object,
  name: string
): Promise<{ ipfsHash: string; size: number }> {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('Pinata credentials not configured');
  }

  const formData = new FormData();

  // Convert JSON to buffer
  const jsonBuffer = Buffer.from(JSON.stringify(jsonData));

  formData.append('file', jsonBuffer, {
    filename: `${name}.json`,
    contentType: 'application/json',
  });

  const pinataMetadata = JSON.stringify({
    name: `${name}.json`,
    keyvalues: {
      type: 'metadata',
      uploadedAt: new Date().toISOString(),
    },
  });
  formData.append('pinataMetadata', pinataMetadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 1,
    wrapWithDirectory: false,
  });
  formData.append('pinataOptions', pinataOptions);

  try {
    const response = await axios.post<PinataResponse>(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    return {
      ipfsHash: response.data.IpfsHash,
      size: response.data.PinSize,
    };
  } catch (error) {
    console.error('IPFS JSON upload failed:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
}

/**
 * Unpins content from IPFS
 */
export async function unpinFromIPFS(ipfsHash: string): Promise<void> {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('Pinata credentials not configured');
  }

  try {
    await axios.delete(
      `https://api.pinata.cloud/pinning/unpin/${ipfsHash}`,
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );
  } catch (error) {
    console.error('IPFS unpin failed:', error);
    throw new Error('Failed to unpin content from IPFS');
  }
}

/**
 * Gets the public gateway URL for an IPFS hash
 */
export function getIPFSUrl(ipfsHash: string): string {
  return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
}

/**
 * Gets the content from IPFS
 */
export async function getFromIPFS(ipfsHash: string): Promise<Buffer> {
  try {
    const response = await axios.get(getIPFSUrl(ipfsHash), {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('IPFS fetch failed:', error);
    throw new Error('Failed to fetch content from IPFS');
  }
}
