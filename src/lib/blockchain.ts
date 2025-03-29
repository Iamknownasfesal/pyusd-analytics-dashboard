import { ethers } from "ethers";

// PYUSD Contract Address on Ethereum Mainnet
export const PYUSD_CONTRACT_ADDRESS =
  "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8";

// ABI for PYUSD token (ERC20 standard functions)
export const PYUSD_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

// Provider cache
let provider: ethers.JsonRpcProvider | null = null;
let pyusdContract: ethers.Contract | null = null;
let cachedDecimals: number | null = null;
let providerInitTime = 0;

// Initialize provider with GCP Blockchain RPC URL
export const getProvider = (options?: { staticNetwork?: boolean }) => {
  const now = Date.now();

  // Recreate provider if it's more than 30 minutes old to prevent stale connections
  if (provider && now - providerInitTime > 30 * 60 * 1000) {
    console.log("Re-initializing provider due to age");
    provider = null;
    pyusdContract = null;
  }

  if (provider) return provider;

  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://blockchain.googleapis.com/v1/projects/vernal-hall-453617-c0/locations/asia-east1/endpoints/ethereum-mainnet/rpc?key=AIzaSyCPlGAhJ29zfBMlEQtNg3XqyE3Uov1wr7k";

  // Create provider with optimized settings
  provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
    staticNetwork: options?.staticNetwork || false, // Prevents unnecessary network detection
    polling: true, // Use polling as a fallback
    cacheTimeout: -1, // Disable provider cache to prevent stale data
  });

  // Track when we created the provider
  providerInitTime = now;

  return provider;
};

// Get PYUSD Contract instance (cached) with better error handling
export const getPYUSDContract = (provider: ethers.JsonRpcProvider) => {
  // If provider was recreated, we need a new contract instance
  if (!pyusdContract || !provider) {
    // Get a fresh provider instance
    pyusdContract = new ethers.Contract(
      PYUSD_CONTRACT_ADDRESS,
      PYUSD_ABI,
      provider
    );
  }

  return pyusdContract;
};

// Get PYUSD decimals (cached)
export const getPYUSDDecimals = async (): Promise<number> => {
  if (cachedDecimals !== null && cachedDecimals !== undefined)
    return cachedDecimals;

  const contract = getPYUSDContract(getProvider());
  cachedDecimals = await contract.decimals();
  return cachedDecimals as number;
};

// Get basic PYUSD token info
export async function getPYUSDInfo() {
  try {
    const contract = getPYUSDContract(getProvider());
    const [name, symbol, totalSupply, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.totalSupply(),
      getPYUSDDecimals(),
    ]);

    return {
      name,
      symbol,
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      decimals,
    };
  } catch (error) {
    console.error("Error fetching PYUSD info:", error);
    throw error;
  }
}

// Get PYUSD balance for a specific address
export async function getPYUSDBalance(address: string) {
  try {
    const contract = getPYUSDContract(getProvider());
    const decimals = await getPYUSDDecimals();
    const balance = await contract.balanceOf(address);

    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error("Error fetching PYUSD balance:", error);
    throw error;
  }
}

// Fetch recent PYUSD transfers with optimized caching
export async function getRecentTransfers(count = 5) {
  try {
    const provider = getProvider({ staticNetwork: true });
    const contract = getPYUSDContract(provider);
    const decimals = await getPYUSDDecimals();

    // Get current block
    const currentBlock = await provider.getBlockNumber();

    // Google Blockchain RPC has a limit of 5 blocks per request for eth_getLogs
    const MAX_BLOCK_RANGE = 5;

    // Look back further to find enough transfers
    const blockRanges = [];
    const MAX_LOOKBACK = 1000; // Maximum number of blocks to look back
    const startBlock = Math.max(0, currentBlock - MAX_LOOKBACK);

    // Create block ranges of 5 blocks each
    for (
      let fromBlock = currentBlock;
      fromBlock > startBlock;
      fromBlock -= MAX_BLOCK_RANGE
    ) {
      const toBlock = fromBlock;
      const fromBlockRange = Math.max(
        startBlock,
        fromBlock - MAX_BLOCK_RANGE + 1
      );
      blockRanges.push({ fromBlock: fromBlockRange, toBlock });
    }

    // Query for Transfer events in small batches
    const transferEvents = [];
    for (const range of blockRanges) {
      try {
        console.log(
          `Querying transfers from blocks ${range.fromBlock} to ${range.toBlock}`
        );
        const events = await contract.queryFilter(
          "Transfer",
          range.fromBlock,
          range.toBlock
        );

        transferEvents.push(...events);

        // Break early if we have enough events
        if (transferEvents.length >= count) {
          break;
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `Error fetching logs for blocks ${range.fromBlock}-${range.toBlock}:`,
          error
        );
        // Continue with next range even if this one fails
      }
    }

    // Process unique events
    const uniqueEvents = filterUniqueEvents(transferEvents);
    const formattedTransfers = await formatTransfers(
      uniqueEvents.slice(0, count),
      decimals
    );

    return formattedTransfers;
  } catch (error) {
    console.error("Error fetching recent transfers:", error);
    throw error;
  }
}

// Helper to filter unique events by transaction hash
function filterUniqueEvents(events: ethers.Log[]): ethers.Log[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.transactionHash)) {
      return false;
    }
    seen.add(event.transactionHash);
    return true;
  });
}

// Helper to format transfer events
async function formatTransfers(events: ethers.Log[], decimals: number) {
  const blockPromises = events.map((e) => e.getBlock());
  const blocks = await Promise.all(blockPromises);

  return events
    .map((event, index) => {
      // Extract the parameters from the event
      const eventLog = event as unknown as { args: [string, string, bigint] };
      const [from, to, value] = eventLog.args || [];
      const block = blocks[index];

      return {
        hash: event.transactionHash,
        from,
        to,
        value: ethers.formatUnits(value, decimals),
        timestamp: new Date(block.timestamp * 1000).toISOString(),
        blockNumber: event.blockNumber,
      };
    })
    .sort((a, b) => b.blockNumber - a.blockNumber);
}

// Get gas price statistics
export async function getGasStats() {
  try {
    const provider = getProvider();
    const feeData = await provider.getFeeData();

    return {
      gasPrice: ethers.formatUnits(feeData.gasPrice || 0, "gwei"),
      maxFeePerGas: feeData.maxFeePerGas
        ? ethers.formatUnits(feeData.maxFeePerGas, "gwei")
        : null,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        ? ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei")
        : null,
    };
  } catch (error) {
    console.error("Error fetching gas stats:", error);
    throw error;
  }
}
