'use client';

import { wagmiAdapter, projectId, networks, metadata } from '@/config/appkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import React, { type ReactNode } from 'react'
import { WagmiProvider, type Config } from 'wagmi'
import { ProfileProvider } from '@/contexts/ProfileContext';

// Set up queryClient
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('WalletConnect Project ID is not defined')
}

// Create the AppKit modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [...networks],
  defaultNetwork: networks[0],
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
        <ProfileProvider>
          {children}
        </ProfileProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default Providers
