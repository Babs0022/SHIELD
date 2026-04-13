import { ethers } from 'ethers';
import sql from './db';

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.RPC_URL ||
  'https://sepolia.base.org';

const POLICY_FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_POLICY_FACTORY_ADDRESS || '';

// ABI for policy creation (simplified)
const POLICY_FACTORY_ABI = [
  'function createPolicy(bytes32 contentHash, string memory contentURI, bytes memory encryptedKey) external returns (address policyAddress)',
];

interface GasEstimate {
  estimatedGas: bigint;
  gasPrice: bigint;
  totalCost: bigint;
  totalCostEth: string;
  totalCostUsd: number;
}

interface BalanceCheck {
  hasEnough: boolean;
  balance: bigint;
  required: bigint;
  shortfall: bigint;
}

/**
 * Estimates gas for policy creation
 */
export async function estimatePolicyCreationGas(
  contentSizeBytes: number
): Promise<GasEstimate> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Base gas for contract call
  const baseGas = 150000n;

  // Additional gas per KB of content (encrypted data stored on-chain reference)
  const gasPerKB = 10000n;
  const contentKB = BigInt(Math.ceil(contentSizeBytes / 1024));

  const estimatedGas = baseGas + gasPerKB * contentKB;

  // Get current gas price with 20% buffer
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 1000000000n; // 1 gwei default
  const bufferedGasPrice = (gasPrice * 120n) / 100n;

  const totalCost = estimatedGas * bufferedGasPrice;
  const totalCostEth = ethers.formatEther(totalCost);

  // Get ETH price for USD conversion (simplified - in production use price oracle)
  const ethPriceUsd = await getEthPriceUsd();
  const totalCostUsd = parseFloat(totalCostEth) * ethPriceUsd;

  return {
    estimatedGas,
    gasPrice: bufferedGasPrice,
    totalCost,
    totalCostEth,
    totalCostUsd,
  };
}

/**
 * Checks if an address has sufficient balance for a transaction
 */
export async function checkSufficientBalance(
  address: string,
  requiredAmount: bigint
): Promise<BalanceCheck> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const balance = await provider.getBalance(address);
  const hasEnough = balance >= requiredAmount;

  return {
    hasEnough,
    balance,
    required: requiredAmount,
    shortfall: hasEnough ? 0n : requiredAmount - balance,
  };
}

/**
 * Gets ETH balance of an address
 */
export async function getEthBalance(address: string): Promise<{
  balance: bigint;
  balanceEth: string;
  balanceUsd: number;
}> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const balance = await provider.getBalance(address);
  const balanceEth = ethers.formatEther(balance);

  const ethPriceUsd = await getEthPriceUsd();
  const balanceUsd = parseFloat(balanceEth) * ethPriceUsd;

  return {
    balance,
    balanceEth,
    balanceUsd,
  };
}

/**
 * Gets current ETH price in USD
 * In production, use Chainlink or similar oracle
 */
async function getEthPriceUsd(): Promise<number> {
  try {
    // Try to fetch from CoinGecko API
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch ETH price');
    }

    const data = await response.json();
    return data.ethereum.usd;
  } catch (error) {
    console.error('Failed to get ETH price:', error);
    // Fallback price
    return 3000;
  }
}

/**
 * Gets gas price recommendations
 */
export async function getGasRecommendations(): Promise<{
  slow: { gasPrice: bigint; estimatedTime: string };
  standard: { gasPrice: bigint; estimatedTime: string };
  fast: { gasPrice: bigint; estimatedTime: string };
}> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const feeData = await provider.getFeeData();
  const baseGasPrice = feeData.gasPrice || 1000000000n;

  return {
    slow: {
      gasPrice: baseGasPrice,
      estimatedTime: '~5 minutes',
    },
    standard: {
      gasPrice: (baseGasPrice * 120n) / 100n,
      estimatedTime: '~1 minute',
    },
    fast: {
      gasPrice: (baseGasPrice * 150n) / 100n,
      estimatedTime: '~15 seconds',
    },
  };
}

/**
 * Calculates gas cost for a transaction and logs it
 */
export async function calculateAndLogGasCost(
  apiKeyId: string,
  policyId: string,
  txHash: string,
  estimatedGas: bigint,
  actualGasPrice: bigint
): Promise<{ gasUsed: bigint; gasCostEth: string; gasCostUsd: number }> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Wait for receipt to get actual gas used
  const receipt = await provider.waitForTransaction(txHash);
  const gasUsed = receipt?.gasUsed || estimatedGas;

  const gasCost = gasUsed * actualGasPrice;
  const gasCostEth = ethers.formatEther(gasCost);

  const ethPriceUsd = await getEthPriceUsd();
  const gasCostUsd = parseFloat(gasCostEth) * ethPriceUsd;

  // Log gas usage
  await sql`
    INSERT INTO developer.api_usage_logs
      (api_key_id, endpoint, method, policy_id, gas_used, gas_cost_eth, gas_cost_usd, success)
    VALUES
      (${apiKeyId}, '/api/v1/policies', 'POST', ${policyId}, ${gasUsed.toString()}, ${gasCostEth}, ${gasCostUsd}, true)
  `;

  // Update API key balance
  await sql`
    UPDATE developer.api_keys
    SET balance_eth = balance_eth - ${parseFloat(gasCostEth)}
    WHERE id = ${apiKeyId}
  `;

  return { gasUsed, gasCostEth, gasCostUsd };
}

/**
 * Formats gas cost for display
 */
export function formatGasCost(ethAmount: string): string {
  const num = parseFloat(ethAmount);
  if (num < 0.0001) {
    return `${(num * 1000000000).toFixed(2)} gwei`;
  }
  return `${num.toFixed(6)} ETH`;
}
