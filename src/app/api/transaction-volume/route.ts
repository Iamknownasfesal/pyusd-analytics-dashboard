import { NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

// PYUSD Contract Address
const PYUSD_CONTRACT_ADDRESS = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8";

// Initialize BigQuery client
const initBigQueryClient = () => {
  try {
    // Check for environment variables
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId) {
      console.warn("GOOGLE_CLOUD_PROJECT environment variable not set");
    }

    // Configure BigQuery client with options
    const options: any = {};
    if (projectId) options.projectId = projectId;
    if (keyFilename) options.keyFilename = keyFilename;

    return new BigQuery(options);
  } catch (error) {
    console.error("Error initializing BigQuery client:", error);
    throw error;
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "3months"; // Default to 3 months

    const bigquery = initBigQueryClient();

    // Define date ranges based on period parameter
    let daysAgo;
    switch (period) {
      case "24h":
        daysAgo = 1;
        break;
      case "7d":
        daysAgo = 7;
        break;
      case "30d":
        daysAgo = 30;
        break;
      case "3months":
      default:
        daysAgo = 90;
        break;
    }

    // Query to get daily transaction volume
    const query = `
      WITH daily_volumes AS (
        SELECT 
          DATE(block_timestamp) as date,
          SUM(CAST(quantity AS NUMERIC)) as volume
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${daysAgo} DAY)
        GROUP BY DATE(block_timestamp)
        ORDER BY date
      )
      SELECT 
        FORMAT_DATE('%b %d', date) as formatted_date,
        volume
      FROM daily_volumes
    `;

    // Query for period summaries
    const summaryQuery = `
      WITH 
        last_24h AS (
          SELECT SUM(CAST(quantity AS NUMERIC)) as volume
          FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
          WHERE 
            address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
            AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
        ),
        previous_24h AS (
          SELECT SUM(CAST(quantity AS NUMERIC)) as volume
          FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
          WHERE 
            address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
            AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 DAY)
            AND block_timestamp < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
        ),
        last_7d AS (
          SELECT SUM(CAST(quantity AS NUMERIC)) as volume
          FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
          WHERE 
            address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
            AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        ),
        previous_7d AS (
          SELECT SUM(CAST(quantity AS NUMERIC)) as volume
          FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
          WHERE 
            address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
            AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY)
            AND block_timestamp < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        ),
        last_30d AS (
          SELECT SUM(CAST(quantity AS NUMERIC)) as volume
          FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
          WHERE 
            address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
            AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
        ),
        previous_30d AS (
          SELECT SUM(CAST(quantity AS NUMERIC)) as volume
          FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
          WHERE 
            address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
            AND block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY)
            AND block_timestamp < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
        )
      SELECT
        (SELECT volume FROM last_24h) as volume_24h,
        (SELECT volume FROM previous_24h) as prev_volume_24h,
        (SELECT volume FROM last_7d) as volume_7d,
        (SELECT volume FROM previous_7d) as prev_volume_7d,
        (SELECT volume FROM last_30d) as volume_30d,
        (SELECT volume FROM previous_30d) as prev_volume_30d
    `;

    // Run queries in parallel
    const [volumeResults, summaryResults] = await Promise.all([
      bigquery.query({ query }),
      bigquery.query({ query: summaryQuery }),
    ]);

    const volumeData = volumeResults[0].map((row: any) => ({
      date: row.formatted_date,
      volume: parseFloat((row.volume / 1e6).toFixed(2)), // Convert to USD (assuming 6 decimals)
    }));

    const summaryData = summaryResults[0][0];

    // Calculate percentage changes
    const percentChange24h =
      summaryData.prev_volume_24h > 0
        ? ((summaryData.volume_24h - summaryData.prev_volume_24h) /
            summaryData.prev_volume_24h) *
          100
        : 0;

    const percentChange7d =
      summaryData.prev_volume_7d > 0
        ? ((summaryData.volume_7d - summaryData.prev_volume_7d) /
            summaryData.prev_volume_7d) *
          100
        : 0;

    const percentChange30d =
      summaryData.prev_volume_30d > 0
        ? ((summaryData.volume_30d - summaryData.prev_volume_30d) /
            summaryData.prev_volume_30d) *
          100
        : 0;

    // Format summary data
    const summary = {
      volume_24h: parseFloat((summaryData.volume_24h / 1e6).toFixed(2)),
      percent_change_24h: parseFloat(percentChange24h.toFixed(1)),
      volume_7d: parseFloat((summaryData.volume_7d / 1e6).toFixed(2)),
      percent_change_7d: parseFloat(percentChange7d.toFixed(1)),
      volume_30d: parseFloat((summaryData.volume_30d / 1e6).toFixed(2)),
      percent_change_30d: parseFloat(percentChange30d.toFixed(1)),
    };

    return NextResponse.json({
      data: volumeData,
      summary,
    });
  } catch (error) {
    console.error("Error fetching transaction volume from BigQuery:", error);

    // Return mock data if the BigQuery query fails
    const mockVolumeData = [
      { date: "Jan 1", volume: 400000 },
      { date: "Jan 5", volume: 600000 },
      { date: "Jan 10", volume: 800000 },
      { date: "Jan 15", volume: 1000000 },
      { date: "Jan 20", volume: 1200000 },
      { date: "Jan 25", volume: 1800000 },
      { date: "Feb 1", volume: 2400000 },
      { date: "Feb 5", volume: 2600000 },
      { date: "Feb 10", volume: 3200000 },
      { date: "Feb 15", volume: 3800000 },
      { date: "Feb 20", volume: 4200000 },
      { date: "Feb 25", volume: 4600000 },
      { date: "Mar 1", volume: 5000000 },
    ];

    const mockSummary = {
      volume_24h: 5432100,
      percent_change_24h: 5.2,
      volume_7d: 23487562,
      percent_change_7d: 12.8,
      volume_30d: 78123456,
      percent_change_30d: 21.4,
    };

    return NextResponse.json(
      {
        data: mockVolumeData,
        summary: mockSummary,
      },
      { status: 500 }
    );
  }
}
