/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
        ],
      },
    ];
  },
  env: {
    // Client-safe variables only
    SHIELD_CONTRACT_ADDRESS: process.env.SHIELD_CONTRACT_ADDRESS,
    BASE_RPC: process.env.BASE_RPC,
    PINATA_GATEWAY: process.env.PINATA_GATEWAY,
    FRONTEND_URL: process.env.FRONTEND_URL,
    DEVELOPER_URL: process.env.DEVELOPER_URL,
  },
};

export default nextConfig;
