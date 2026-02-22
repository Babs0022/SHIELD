import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base, baseSepolia } from '@reown/appkit/networks'

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID'

// Networks for AppKit
export const networks = process.env.NODE_ENV === 'development'
  ? [base, baseSepolia] as const
  : [base, baseSepolia] as const

// Create the Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

// AppKit metadata
export const metadata = {
  name: 'Shield',
  description: 'Decentralized and secure file and message sharing.',
  url: 'https://shieldhq.xyz',
  icons: ['https://shieldhq.xyz/Shld.png']
}
