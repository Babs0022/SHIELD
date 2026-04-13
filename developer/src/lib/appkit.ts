import { createAppKit } from '@reown/appkit';
import { base, baseSepolia } from '@reown/appkit/networks';

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not defined');
}

export const metadata = {
  name: 'SHIELD Developer',
  description: 'Developer platform for secure content sharing',
  url: process.env.NEXT_PUBLIC_DEVELOPER_URL || 'https://developer.shieldhq.xyz',
  icons: ['https://shieldhq.xyz/favicon.ico'],
};

// Create AppKit inline to avoid type issues with readonly networks
export const appKit = createAppKit({
  projectId,
  metadata,
  networks: process.env.NODE_ENV === 'production' ? [base] : [base, baseSepolia],
  defaultNetwork: process.env.NODE_ENV === 'production' ? base : baseSepolia,
});
