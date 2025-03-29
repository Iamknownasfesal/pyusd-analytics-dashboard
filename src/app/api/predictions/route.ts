import { NextResponse } from "next/server";
import { initBigQueryClient, queries } from "../bigQuery";
import { PYUSD_CONTRACT_ADDRESS } from "@/lib/blockchain";
import { generateMarketPredictions } from "@/lib/ai";

export async function GET() {
  try {
    const pyusdAddress = PYUSD_CONTRACT_ADDRESS.toLowerCase();
    const bigquery = initBigQueryClient();

    // Simplified query to get recent market patterns
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
          address = '${pyusdAddress}'
          AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        GROUP BY hour
        ORDER BY hour DESC
      ),
      whale_txs AS (
        SELECT 
          TIMESTAMP_TRUNC(block_timestamp, HOUR) as hour,
          COUNT(*) as whale_txs,
          SUM(CAST(quantity AS NUMERIC)) as whale_volume
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${pyusdAddress}'
          AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
          AND CAST(quantity AS NUMERIC) >= 100000 * 1e6  -- Transactions >= 100k PYUSD
        GROUP BY hour
      ),
      wallet_patterns AS (
        SELECT
          COUNTIF(receive_count >= 3) as accumulation_wallets,
          COUNTIF(send_count >= 3) as distribution_wallets
        FROM (
          SELECT 
            address,
            COUNTIF(is_receive) as receive_count,
            COUNTIF(NOT is_receive) as send_count
          FROM (
            SELECT 
              to_address as address,
              TRUE as is_receive
            FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
            WHERE 
              address = '${pyusdAddress}'
              AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
            
            UNION ALL
            
            SELECT 
              from_address as address,
              FALSE as is_receive
            FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
            WHERE 
              address = '${pyusdAddress}'
              AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
          )
          GROUP BY address
        )
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
        wp.accumulation_wallets,
        wp.distribution_wallets
      FROM hourly_stats h
      LEFT JOIN whale_txs w ON h.hour = w.hour
      CROSS JOIN wallet_patterns wp
      LIMIT 168 -- One week of hourly data
    `;

    const [results] = await bigquery.query({ query: recentPatternsQuery });

    // Process data for AI analysis
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

    // Generate AI predictions
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
