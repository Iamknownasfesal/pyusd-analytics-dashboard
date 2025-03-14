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

// Initialize provider with GCP Blockchain RPC URL (placeholder - you'll need to get the actual URL)
export const getProvider = () => {
  // For development, we can use a public RPC, but in production, use GCP's Blockchain RPC
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://blockchain.googleapis.com/v1/projects/vernal-hall-453617-c0/locations/asia-east1/endpoints/ethereum-mainnet/rpc?key=AIzaSyCPlGAhJ29zfBMlEQtNg3XqyE3Uov1wr7k";
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get PYUSD Contract instance
export const getPYUSDContract = () => {
  const provider = getProvider();
  return new ethers.Contract(PYUSD_CONTRACT_ADDRESS, PYUSD_ABI, provider);
};

// Get basic PYUSD token info
export async function getPYUSDInfo() {
  try {
    const contract = getPYUSDContract();
    const [name, symbol, totalSupply, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.totalSupply(),
      contract.decimals(),
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
    const contract = getPYUSDContract();
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(address);

    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error("Error fetching PYUSD balance:", error);
    throw error;
  }
}

// Fetch recent PYUSD transfers
export async function getRecentTransfers(count = 5) {
  try {
    const provider = getProvider();
    const contract = getPYUSDContract();

    // Get the current block number
    const currentBlock = await provider.getBlockNumber();

    // Look back 5 blocks at a time to stay within API limits
    const batchSize = 5;
    let events: ethers.Log[] = [];
    let fromBlock = currentBlock;
    let attempts = 0;
    const maxAttempts = 20; // Limit total number of attempts

    while (events.length < count && attempts < maxAttempts) {
      const toBlock = fromBlock;
      fromBlock = Math.max(0, toBlock - batchSize);

      const filter = contract.filters.Transfer();
      const batchEvents = await contract.queryFilter(
        filter,
        fromBlock,
        toBlock
      );
      events = [...batchEvents, ...events];

      attempts++;
    }

    // Deduplicate events by transaction hash
    const uniqueTransactionHashes = new Set<string>();
    const uniqueEvents = events.filter((event) => {
      if (uniqueTransactionHashes.has(event.transactionHash)) {
        return false;
      }
      uniqueTransactionHashes.add(event.transactionHash);
      return true;
    });

    // Get the most recent events
    const recentEvents = uniqueEvents.slice(0, count);

    // Format the transfer data
    const transfers = await Promise.all(
      recentEvents.map(async (event) => {
        const block = await event.getBlock();
        const decimals = await contract.decimals();

        // Extract the parameters from the event - handling as EventLog
        const eventLog = event as unknown as { args: [string, string, bigint] };
        const [from, to, value] = eventLog.args || [];

        return {
          hash: event.transactionHash,
          from,
          to,
          value: ethers.formatUnits(value, decimals),
          timestamp: new Date(block.timestamp * 1000).toISOString(),
          blockNumber: event.blockNumber,
        };
      })
    );

    return transfers.sort((a, b) => b.blockNumber - a.blockNumber);
  } catch (error) {
    console.error("Error fetching recent transfers:", error);
    throw error;
  }
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
