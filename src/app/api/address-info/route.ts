import { NextResponse } from "next/server";
import { initBigQueryClient } from "../bigQuery";
import { PYUSD_CONTRACT_ADDRESS, getPYUSDBalance } from "@/lib/blockchain";
import { ethers } from "ethers";
import { generateWalletInsights } from "@/lib/ai";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    // Get PYUSD balance
    const balance = await getPYUSDBalance(address);
    const balanceNumeric = parseFloat(balance);

    // Query BigQuery for transaction history
    const bigquery = initBigQueryClient();

    // Get the total number of transactions
    const transactionCountQuery = `
      SELECT COUNT(*) as tx_count
      FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
      WHERE 
        address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
        AND (from_address = '${address.toLowerCase()}' OR to_address = '${address.toLowerCase()}')
    `;

    // Get first transaction date
    const firstTxQuery = `
      SELECT MIN(block_timestamp) as first_tx_date
      FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
      WHERE 
        address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
        AND (from_address = '${address.toLowerCase()}' OR to_address = '${address.toLowerCase()}')
    `;

    // Get transaction stats
    const txStatsQuery = `
      WITH send_transactions AS (
        SELECT 
          block_timestamp,
          CAST(quantity AS NUMERIC) as amount
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND from_address = '${address.toLowerCase()}'
      ),
      receive_transactions AS (
        SELECT 
          block_timestamp,
          CAST(quantity AS NUMERIC) as amount
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND to_address = '${address.toLowerCase()}'
      )
      SELECT
        COUNT(*) as total_txs,
        (SELECT COUNT(*) FROM send_transactions) as send_txs,
        (SELECT COUNT(*) FROM receive_transactions) as receive_txs,
        (SELECT SUM(amount) FROM send_transactions) as total_sent,
        (SELECT SUM(amount) FROM receive_transactions) as total_received,
        (SELECT MAX(amount) FROM send_transactions) as max_sent,
        (SELECT MAX(amount) FROM receive_transactions) as max_received,
        (SELECT AVG(amount) FROM send_transactions) as avg_sent,
        (SELECT AVG(amount) FROM receive_transactions) as avg_received
      FROM (
        SELECT * FROM send_transactions
        UNION ALL
        SELECT * FROM receive_transactions
      )
    `;

    // Run queries in parallel
    const [txCountResult, firstTxResult, txStatsResult] = await Promise.all([
      bigquery.query({ query: transactionCountQuery }),
      bigquery.query({ query: firstTxQuery }),
      bigquery.query({ query: txStatsQuery }),
    ]);

    const txCount = txCountResult[0][0].tx_count;
    const firstTxDate = firstTxResult[0][0].first_tx_date;
    const txStats = txStatsResult[0][0];

    // Format data - with proper date validation
    let formattedFirstTxDate = null;
    if (firstTxDate && firstTxDate instanceof Date) {
      try {
        formattedFirstTxDate = firstTxDate.toISOString();
      } catch (error) {
        console.error("Error formatting date:", error);
        formattedFirstTxDate = null;
      }
    } else if (firstTxDate && typeof firstTxDate === "string") {
      try {
        formattedFirstTxDate = new Date(firstTxDate).toISOString();
      } catch (error) {
        console.error("Error parsing date string:", error);
        formattedFirstTxDate = null;
      }
    }

    const formattedStats = {
      total_transactions: txCount,
      first_transaction_date: formattedFirstTxDate,
      send_transactions: txStats.send_txs,
      receive_transactions: txStats.receive_txs,
      total_sent: txStats.total_sent
        ? parseFloat((txStats.total_sent / 1e6).toFixed(2))
        : 0,
      total_received: txStats.total_received
        ? parseFloat((txStats.total_received / 1e6).toFixed(2))
        : 0,
      max_sent: txStats.max_sent
        ? parseFloat((txStats.max_sent / 1e6).toFixed(2))
        : 0,
      max_received: txStats.max_received
        ? parseFloat((txStats.max_received / 1e6).toFixed(2))
        : 0,
      avg_sent: txStats.avg_sent
        ? parseFloat((txStats.avg_sent / 1e6).toFixed(2))
        : 0,
      avg_received: txStats.avg_received
        ? parseFloat((txStats.avg_received / 1e6).toFixed(2))
        : 0,
    };

    // Generate AI insights based on transaction data using the AI model
    const insights = await generateWalletInsights(
      address,
      balanceNumeric,
      formattedStats
    );

    return NextResponse.json({
      address,
      balance: balanceNumeric,
      stats: formattedStats,
      ai_insights: insights,
    });
  } catch (error) {
    console.error("Error fetching address info:", error);

    // Return a generic error with mock data for demo purposes
    return NextResponse.json(
      {
        address: "0x0000000000000000000000000000000000000000",
        balance: 0,
        stats: {
          total_transactions: 0,
          first_transaction_date: null,
          send_transactions: 0,
          receive_transactions: 0,
          total_sent: 0,
          total_received: 0,
          max_sent: 0,
          max_received: 0,
          avg_sent: 0,
          avg_received: 0,
        },
        ai_insights: ["Unable to fetch data for this address."],
        error: "Failed to retrieve address information",
      },
      { status: 500 }
    );
  }
}
