"use client";

import { useState, useRef, useEffect } from "react";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PYUSD_CONTRACT_ADDRESS, PYUSD_ABI } from "@/lib/blockchain";
import { useTransfers, Transfer } from "@/hooks/use-api-queries";
import { useQueryClient } from "@tanstack/react-query";
import { useAddress } from "@/components/address/address-context";

export function RealTimeTransactionsTable() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<
    "filter" | "polling" | "none"
  >("none");
  const lastBlockProcessedRef = useRef<number>(0);
  const queryClient = useQueryClient();
  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
  const filterIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { openAddressModal } = useAddress();

  // Use Tanstack Query for fetching transfers
  const { data: transfers = [], isLoading } = useTransfers(
    connectionType === "polling"
  );

  // Keep track of newly added transfers for animations
  const [newTransferHashes, setNewTransferHashes] = useState<Set<string>>(
    new Set()
  );

  // Update lastBlockProcessed when we get new data
  useEffect(() => {
    if (transfers.length > 0) {
      lastBlockProcessedRef.current = Math.max(
        ...transfers.map((t) => t.blockNumber),
        lastBlockProcessedRef.current
      );
    }
  }, [transfers]);

  // Function to mark transfers as "new" for animation
  const markTransfersAsNew = (transferHashes: string[]) => {
    setNewTransferHashes((prev) => new Set([...prev, ...transferHashes]));

    // Remove the "new" flag after animation completes
    setTimeout(() => {
      setNewTransferHashes((prev) => {
        const newSet = new Set(prev);
        transferHashes.forEach((hash) => newSet.delete(hash));
        return newSet;
      });
    }, 3000);
  };

  // Setup event monitoring
  useEffect(() => {
    const setupEventMonitoring = async () => {
      try {
        // Clean up any existing connections
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        if (filterIdRef.current && providerRef.current) {
          try {
            // Attempt to uninstall filter if it exists
            await providerRef.current.send("eth_uninstallFilter", [
              filterIdRef.current,
            ]);
          } catch (e) {
            console.warn("Error uninstalling filter:", e);
          }
          filterIdRef.current = null;
        }

        // Get the RPC URL from env
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
        if (!rpcUrl) {
          console.error("No RPC URL provided");
          return;
        }

        // Create a JSON RPC provider (works better with Google's implementation)
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        providerRef.current = provider;

        // Helper function to fetch logs in batches respecting the 5-block limit
        const fetchLogsInBatches = async (
          contract: ethers.Contract,
          filter: any,
          fromBlock: number,
          toBlock: number
        ) => {
          // Google Blockchain RPC has a limit of 5 blocks per request
          const MAX_BLOCK_RANGE = 5;
          let logs: any[] = [];

          // Process in chunks of MAX_BLOCK_RANGE blocks
          for (
            let start = fromBlock;
            start <= toBlock;
            start += MAX_BLOCK_RANGE
          ) {
            const end = Math.min(start + MAX_BLOCK_RANGE - 1, toBlock);

            try {
              console.log(`Fetching logs from blocks ${start} to ${end}`);
              const batchLogs = await contract.queryFilter(filter, start, end);
              logs = [...logs, ...batchLogs];
            } catch (error) {
              console.error(
                `Error fetching logs for blocks ${start}-${end}:`,
                error
              );
              // Continue with the next batch even if this one fails
            }

            // Add a small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          return logs;
        };

        try {
          // Try to set up an event filter first (more efficient)
          const contract = new ethers.Contract(
            PYUSD_CONTRACT_ADDRESS,
            PYUSD_ABI,
            provider
          );

          // Get contract interface to encode event topics
          const transferEventSignature = "Transfer(address,address,uint256)";
          const transferTopic = ethers.id(transferEventSignature);

          // Create a filter for the Transfer event
          const filter = {
            address: PYUSD_CONTRACT_ADDRESS,
            topics: [transferTopic],
          };

          // Try to use filter-based approach
          try {
            const filterId = await provider.send("eth_newFilter", [filter]);
            filterIdRef.current = filterId;
            setConnectionType("filter");
            setIsConnected(true);
            console.log("Filter-based event monitoring set up successfully");

            // Poll for new events using the filter
            pollIntervalRef.current = setInterval(async () => {
              try {
                if (!filterIdRef.current) return;

                const newLogs = await provider.send("eth_getFilterChanges", [
                  filterIdRef.current,
                ]);

                if (
                  !newLogs ||
                  !Array.isArray(newLogs) ||
                  newLogs.length === 0
                ) {
                  return;
                }

                console.log(`Received ${newLogs.length} new transfer events`);

                // Process new transfer events
                const transferPromises = newLogs.map(async (log) => {
                  try {
                    // Parse the log data
                    const parsedLog = contract.interface.parseLog({
                      topics: log.topics as string[],
                      data: log.data,
                    });

                    if (!parsedLog) return null;

                    const { from, to, value } = parsedLog.args;

                    // Get the block
                    const block = await provider.getBlock(log.blockNumber);

                    if (!block) return null;

                    const decimals = 6; // PYUSD has 6 decimals

                    return {
                      hash: log.transactionHash,
                      from,
                      to,
                      value: ethers.formatUnits(value, decimals),
                      timestamp: new Date(
                        Number(block.timestamp) * 1000
                      ).toISOString(),
                      blockNumber: Number(log.blockNumber),
                    };
                  } catch (error) {
                    console.error("Error processing log:", error);
                    return null;
                  }
                });

                const newTransfers = (
                  await Promise.all(transferPromises)
                ).filter((t): t is Transfer => t !== null);

                if (newTransfers.length > 0) {
                  // Update the query cache with the new transfers
                  queryClient.setQueryData<Transfer[]>(
                    ["transfers"],
                    (oldData = []) => {
                      // Combine new transfers with existing ones, remove duplicates, and keep only the latest 20
                      const combined = [...newTransfers, ...oldData];
                      const uniqueTransfers = Array.from(
                        new Map(combined.map((t) => [t.hash, t])).values()
                      );
                      return uniqueTransfers.slice(0, 20);
                    }
                  );

                  // Mark new transfers for animation
                  markTransfersAsNew(newTransfers.map((t) => t.hash));
                }
              } catch (error) {
                console.error("Error polling for new events:", error);

                // If filter polling fails, try creating a new filter
                try {
                  if (filterIdRef.current) {
                    await provider.send("eth_uninstallFilter", [
                      filterIdRef.current,
                    ]);
                  }
                  const newFilterId = await provider.send("eth_newFilter", [
                    filter,
                  ]);
                  filterIdRef.current = newFilterId;
                  console.log("Created new filter after error:", newFilterId);
                } catch (filterError) {
                  console.error("Failed to create new filter:", filterError);
                  // Fall back to regular polling if filter approach fails
                  setConnectionType("polling");
                }
              }
            }, 5000); // Poll every 5 seconds
          } catch (filterError) {
            console.warn(
              "Filter-based monitoring failed, falling back to polling:",
              filterError
            );
            setConnectionType("polling");
            setIsConnected(true);

            // Set up polling approach
            let lastProcessedBlock = await provider.getBlockNumber();

            pollIntervalRef.current = setInterval(async () => {
              try {
                // Get current block
                const currentBlock = await provider.getBlockNumber();

                // Skip if no new blocks
                if (currentBlock <= lastProcessedBlock) {
                  return;
                }

                console.log(
                  `Checking blocks ${lastProcessedBlock + 1} to ${currentBlock}`
                );

                // Create a filter for the Transfer event
                const transferFilter = contract.filters.Transfer();

                // Fetch logs in batches respecting the 5-block limit
                const logs = await fetchLogsInBatches(
                  contract,
                  transferFilter,
                  lastProcessedBlock + 1,
                  currentBlock
                );

                // Update last processed block
                lastProcessedBlock = currentBlock;

                if (logs.length === 0) {
                  return;
                }

                console.log(`Found ${logs.length} transfer events`);

                // Process the logs to create transfer objects
                const processedTransfers = await Promise.all(
                  logs.map(async (log) => {
                    try {
                      const decimals = 6; // PYUSD has 6 decimals
                      const block = await provider.getBlock(log.blockNumber);

                      if (!block) return null;

                      return {
                        hash: log.transactionHash,
                        from: log.args[0],
                        to: log.args[1],
                        value: ethers.formatUnits(log.args[2], decimals),
                        timestamp: new Date(
                          Number(block.timestamp) * 1000
                        ).toISOString(),
                        blockNumber: Number(log.blockNumber),
                      };
                    } catch (error) {
                      console.error("Error processing log:", error);
                      return null;
                    }
                  })
                );

                const newTransfers = processedTransfers.filter(
                  (t): t is Transfer => t !== null
                );

                if (newTransfers.length > 0) {
                  // Update the query cache with the new transfers
                  queryClient.setQueryData<Transfer[]>(
                    ["transfers"],
                    (oldData = []) => {
                      // Combine new transfers with existing ones, remove duplicates, and keep only the latest 20
                      const combined = [...newTransfers, ...oldData];
                      const uniqueTransfers = Array.from(
                        new Map(combined.map((t) => [t.hash, t])).values()
                      );
                      return uniqueTransfers.slice(0, 20);
                    }
                  );

                  // Mark new transfers for animation
                  markTransfersAsNew(newTransfers.map((t) => t.hash));
                }
              } catch (error) {
                console.error("Error in polling approach:", error);
              }
            }, 15000); // Poll less frequently (15 seconds) to avoid rate limits
          }
        } catch (error) {
          console.error("Error setting up event monitoring:", error);
          setConnectionType("polling");
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error setting up event monitoring:", error);
        setConnectionType("polling");
        setIsConnected(true);
      }
    };

    setupEventMonitoring();

    // Cleanup
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      if (filterIdRef.current && providerRef.current) {
        providerRef.current
          .send("eth_uninstallFilter", [filterIdRef.current])
          .catch((e) =>
            console.warn("Error uninstalling filter on cleanup:", e)
          );
      }

      setIsConnected(false);
      setConnectionType("none");
    };
  }, [queryClient]);

  // Handle cases when new transfers come from polling
  useEffect(() => {
    if (connectionType === "polling" && transfers.length > 0) {
      // Identify transfers from blocks we haven't seen before
      const newTransferHashes = transfers
        .filter((t) => t.blockNumber > lastBlockProcessedRef.current)
        .map((t) => t.hash);

      if (newTransferHashes.length > 0) {
        // Update the last block we've processed
        lastBlockProcessedRef.current = Math.max(
          ...transfers.map((t) => t.blockNumber),
          lastBlockProcessedRef.current
        );

        // Mark new transfers for animation
        markTransfersAsNew(newTransferHashes);
      }
    }
  }, [connectionType, transfers]);

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-2 flex justify-between items-center bg-muted/50">
          <div className="text-sm">Loading transactions...</div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction Hash</TableHead>
              <TableHead>Block</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Amount (PYUSD)</TableHead>
              <TableHead className="text-right">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5)
              .fill(0)
              .map((_, index) => (
                <TableRow key={index} className="border-b">
                  <TableCell
                    colSpan={6}
                    className="h-12 animate-pulse bg-muted/20"
                  ></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="p-2 flex justify-between items-center bg-muted/50">
        <div className="text-sm">
          {isConnected ? (
            <span className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Live updates enabled (
              {connectionType === "filter" ? "Event Filter" : "Polling"})
            </span>
          ) : (
            <span className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
              Live updates disabled
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Showing the latest {transfers.length} PYUSD transfers
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction Hash</TableHead>
            <TableHead>Block</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Amount (PYUSD)</TableHead>
            <TableHead className="text-right">Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {transfers.map((transfer, index) => (
              <motion.tr
                key={`${transfer.hash}-${index}`}
                initial={
                  newTransferHashes.has(transfer.hash)
                    ? { backgroundColor: "#4ade8050", opacity: 0 }
                    : {}
                }
                animate={{ backgroundColor: "#00000000", opacity: 1 }}
                transition={{ duration: 2 }}
                className="border-b"
              >
                <TableCell className="font-mono text-xs">
                  <a
                    href={`https://etherscan.io/tx/${transfer.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-blue-600 dark:text-blue-400"
                  >
                    {transfer.hash.substring(0, 16)}...
                  </a>
                </TableCell>
                <TableCell>
                  <a
                    href={`https://etherscan.io/block/${transfer.blockNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-blue-600 dark:text-blue-400"
                  >
                    {transfer.blockNumber}
                  </a>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <button
                    onClick={() => openAddressModal(transfer.from)}
                    className="hover:underline text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    {transfer.from.substring(0, 6)}...
                    {transfer.from.substring(38)}
                  </button>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <button
                    onClick={() => openAddressModal(transfer.to)}
                    className="hover:underline text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    {transfer.to.substring(0, 6)}...{transfer.to.substring(38)}
                  </button>
                </TableCell>
                <TableCell>{Number(transfer.value).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {new Date(transfer.timestamp).toLocaleString()}
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
