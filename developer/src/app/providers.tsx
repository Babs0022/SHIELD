'use client';

import { wagmiAdapter, projectId, metadata } from '@/config/appkit'
import { base, baseSepolia } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import React, { type ReactNode } from 'react'
import { WagmiProvider, type Config } from 'wagmi'

// Set up queryClient
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('WalletConnect Project ID is not defined')
}

// Create the AppKit modal with properly typed networks
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: process.env.NODE_ENV === 'production' ? [base] : [base, baseSepolia],
  defaultNetwork: base,
  metadata: metadata,
  features: {
    analytics: false,
    email: false,
    socials: [],
  }
})

function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default Providers
