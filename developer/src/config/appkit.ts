import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base, baseSepolia } from '@reown/appkit/networks'

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

if (!projectId) {
  throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined')
}

// Networks for AppKit
export const networks = process.env.NODE_ENV === 'production'
  ? [base]
  : [base, baseSepolia]

// Create the Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

// AppKit metadata
export const metadata = {
  name: 'SHIELD Developer',
  description: 'Developer platform for secure content sharing',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://developer.shieldhq.xyz',
  icons: ['https://shieldhq.xyz/favicon.ico']
}