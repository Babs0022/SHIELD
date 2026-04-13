import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

export const SHIELD_CONTRACT_ADDRESS = process.env.SHIELD_CONTRACT_ADDRESS as `0x${string}`;

// Determine chain based on RPC URL or NODE_ENV
const rpcUrl = process.env.BASE_RPC || '';
const isMainnet = rpcUrl.includes('mainnet') || process.env.NODE_ENV === 'production';
export const currentChain = isMainnet ? base : baseSepolia;

export const shieldAbi = [
  {
    inputs: [
      { name: 'policyId', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
      { name: 'expiry', type: 'uint256' },
      { name: 'maxAttempts', type: 'uint256' },
    ],
    name: 'createPolicy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'policyId', type: 'bytes32' }],
    name: 'isPolicyValid',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'bytes32' }],
    name: 'policies',
    outputs: [
      { name: 'sender', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'expiry', type: 'uint64' },
      { name: 'maxAttempts', type: 'uint32' },
      { name: 'attempts', type: 'uint32' },
      { name: 'valid', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'policyId', type: 'bytes32' },
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: false, name: 'expiry', type: 'uint256' },
      { indexed: false, name: 'maxAttempts', type: 'uint256' },
    ],
    name: 'PolicyCreated',
    type: 'event',
  },
] as const;

export const publicClient = createPublicClient({
  chain: currentChain,
  transport: http(process.env.BASE_RPC),
});

export function getWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: currentChain,
    transport: http(process.env.BASE_RPC),
  });
}