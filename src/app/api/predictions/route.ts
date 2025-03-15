import { NextResponse } from "next/server";
import { initBigQueryClient } from "../bigQuery";
import { PYUSD_CONTRACT_ADDRESS } from "@/lib/blockchain";
import { generateMarketPredictions } from "@/lib/market-predictions";

export async function GET() {
  try {
    const bigquery = initBigQueryClient();

    // Query to get recent transaction patterns
    const recentPatternsQuery = `
      WITH hourly_stats AS (
        SELECT 
          TIMESTAMP_TRUNC(block_timestamp, HOUR) as hour,
          COUNT(*) as tx_count,
          SUM(CAST(quantity AS NUMERIC)) as volume,
          COUNT(DISTINCT from_address) as unique_senders,
          COUNT(DISTINCT to_address) as unique_receivers,
          MAX(CAST(quantity AS NUMERIC)) as max_transfer
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        GROUP BY hour
        ORDER BY hour DESC
      ),
      whale_movements AS (
        SELECT 
          TIMESTAMP_TRUNC(block_timestamp, HOUR) as hour,
          COUNT(*) as whale_txs,
          SUM(CAST(quantity AS NUMERIC)) as whale_volume
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
          AND CAST(quantity AS NUMERIC) >= 100000 * 1e6  -- Transactions >= 100k PYUSD
        GROUP BY hour
      ),
      accumulation_patterns AS (
        SELECT 
          to_address as address,
          COUNT(*) as receive_count,
          SUM(CAST(quantity AS NUMERIC)) as total_received
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        GROUP BY to_address
        HAVING COUNT(*) >= 3  -- At least 3 receives in 24h
      ),
      distribution_patterns AS (
        SELECT 
          from_address as address,
          COUNT(*) as send_count,
          SUM(CAST(quantity AS NUMERIC)) as total_sent
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        GROUP BY from_address
        HAVING COUNT(*) >= 3  -- At least 3 sends in 24h
      )
      SELECT
        h.hour,
        h.tx_count,
        h.volume / 1e6 as volume,
        h.unique_senders,
        h.unique_receivers,
        h.max_transfer / 1e6 as max_transfer,
        COALESCE(w.whale_txs, 0) as whale_txs,
        COALESCE(w.whale_volume / 1e6, 0) as whale_volume,
        (
          SELECT COUNT(*)
          FROM accumulation_patterns
        ) as accumulation_wallets,
        (
          SELECT COUNT(*)
          FROM distribution_patterns
        ) as distribution_wallets
      FROM hourly_stats h
      LEFT JOIN whale_movements w ON h.hour = w.hour
    `;

    // Execute query
    const [results] = await bigquery.query({ query: recentPatternsQuery });

    // Process the data for AI analysis
    const marketData = results.map((row: any) => ({
      timestamp: row.hour.value,
      transactionCount: row.tx_count,
      volume: row.volume,
      uniqueSenders: row.unique_senders,
      uniqueReceivers: row.unique_receivers,
      maxTransfer: row.max_transfer,
      whaleTransactions: row.whale_txs,
      whaleVolume: row.whale_volume,
      accumulationWallets: row.accumulation_wallets,
      distributionWallets: row.distribution_wallets,
    }));

    // Generate predictions using AI
    const predictions = await generateMarketPredictions(marketData);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      predictions,
      marketData: marketData[0], // Most recent data point
    });
  } catch (error) {
    console.error("Error generating market predictions:", error);
    return NextResponse.json(
      {
        error: "Failed to generate market predictions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
