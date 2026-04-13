import axios from 'axios';

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';

if (!PINATA_JWT) {
  throw new Error('PINATA_JWT environment variable is required');
}

export const pinata = {
  async pinFileToIPFS(
    fileBuffer: Buffer,
    options?: {
      pinataMetadata?: {
        name?: string;
        keyvalues?: Record<string, string>;
      };
    }
  ): Promise<{ IpfsHash: string; PinSize: number; Timestamp: string }> {
    const data = new FormData();

    const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/octet-stream' });
    data.append('file', blob, options?.pinataMetadata?.name || 'file');

    if (options?.pinataMetadata) {
      data.append(
        'pinataMetadata',
        JSON.stringify({
          name: options.pinataMetadata.name || 'shield-content',
          keyvalues: options.pinataMetadata.keyvalues || {},
        })
      );
    }

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      data,
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          'Content-Type': 'multipart/form-data',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return response.data;
  },

  async unpin(cid: string): Promise<void> {
    await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
    });
  },

  getUrl(cid: string): string {
    return `${PINATA_GATEWAY}/ipfs/${cid}`;
  },
};