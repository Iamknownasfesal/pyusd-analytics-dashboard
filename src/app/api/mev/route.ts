import { NextResponse } from "next/server";
import { initBigQueryClient } from "../bigQuery";
import { PYUSD_CONTRACT_ADDRESS } from "@/lib/blockchain";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { calculateMEVRiskScore, generateMEVInsights } from "@/lib/ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function GET() {
  try {
    const bigquery = initBigQueryClient();

    // Query to detect potential MEV activities with historical data
    const mevQuery = `
      WITH pyusd_txs AS (
        SELECT 
          block_number,
          transaction_hash,
          from_address,
          to_address,
          CAST(quantity AS NUMERIC) as amount,
          block_timestamp,
          DATE(block_timestamp) as tx_date
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
      ),
      block_analysis AS (
        SELECT 
          block_number,
          COUNT(*) as txs_in_block,
          COUNT(DISTINCT from_address) as unique_senders,
          COUNT(DISTINCT to_address) as unique_receivers,
          MIN(block_timestamp) as block_timestamp,
          DATE(MIN(block_timestamp)) as block_date,
          ARRAY_AGG(STRUCT(transaction_hash, from_address, to_address, amount)) as transactions
        FROM pyusd_txs
        GROUP BY block_number
      ),
      daily_stats AS (
        SELECT
          tx_date,
          COUNT(DISTINCT block_number) as total_blocks,
          COUNT(*) as total_transactions,
          COUNT(DISTINCT from_address) as unique_senders,
          COUNT(DISTINCT to_address) as unique_receivers,
          SUM(amount) as total_volume
        FROM pyusd_txs
        GROUP BY tx_date
        ORDER BY tx_date
      ),
      monthly_stats AS (
        SELECT
          FORMAT_DATE('%Y-%m', b.block_date) as month,
          COUNT(DISTINCT b.block_number) as total_blocks,
          SUM(b.txs_in_block) as total_transactions,
          SUM(b.unique_senders) as unique_senders,
          SUM(b.unique_receivers) as unique_receivers,
          SUM(t.amount) as total_volume,
          COUNT(DISTINCT CASE WHEN b.txs_in_block >= 3 THEN b.block_number END) as sandwich_blocks,
          COUNT(DISTINCT CASE 
            WHEN EXISTS (
              SELECT 1 FROM pyusd_txs t2 
              WHERE t2.block_number = t.block_number
              AND t2.from_address != t.from_address
              AND t2.to_address = t.to_address
              AND t.amount > 0
              AND ABS(t2.amount - t.amount) / t.amount < 0.1
            ) THEN t.block_number 
          END) as frontrun_blocks
        FROM block_analysis b
        JOIN pyusd_txs t ON b.block_number = t.block_number
        GROUP BY month
        ORDER BY month
      ),
      last_week_mev AS (
        SELECT 
          DATE(b.block_timestamp) as activity_date,
          COUNT(DISTINCT CASE WHEN b.txs_in_block >= 3 THEN b.block_number END) as sandwich_blocks,
          COUNT(DISTINCT CASE 
            WHEN EXISTS (
              SELECT 1 FROM pyusd_txs t2 
              WHERE t2.block_number = t.block_number
              AND t2.from_address != t.from_address
              AND t2.to_address = t.to_address
              AND t.amount > 0
              AND ABS(t2.amount - t.amount) / t.amount < 0.1
            ) THEN t.block_number 
          END) as frontrun_blocks,
          COUNT(DISTINCT b.block_number) as total_blocks,
          SUM(t.amount) as total_volume
        FROM block_analysis b
        JOIN pyusd_txs t ON b.block_number = t.block_number
        WHERE b.block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        GROUP BY activity_date
        ORDER BY activity_date
      ),
      sandwich_patterns AS (
        SELECT 
          block_date,
          COUNT(*) as sandwich_count,
          SUM(CASE WHEN txs_in_block >= 3 THEN 1 ELSE 0 END) as potential_sandwich_blocks
        FROM block_analysis
        GROUP BY block_date
        ORDER BY block_date
      ),
      frontrun_patterns AS (
        SELECT 
          DATE(t1.block_timestamp) as block_date,
          COUNT(*) as frontrun_count
        FROM pyusd_txs t1
        JOIN pyusd_txs t2 
        ON t1.block_number = t2.block_number
        AND t1.from_address != t2.from_address
        AND t1.to_address = t2.to_address
        AND t1.amount > 0
        AND ABS(t1.amount - t2.amount) / t1.amount < 0.1
        GROUP BY block_date
        ORDER BY block_date
      ),
      recent_mev AS (
        SELECT 
          b.*,
          CASE 
            WHEN txs_in_block >= 3 THEN 'SANDWICH'
            WHEN EXISTS (
              SELECT 1 FROM pyusd_txs t2 
              WHERE t2.block_number = b.block_number
              AND t2.from_address != transactions[OFFSET(0)].from_address
              AND t2.to_address = transactions[OFFSET(0)].to_address
              AND transactions[OFFSET(0)].amount > 0
              AND ABS(t2.amount - transactions[OFFSET(0)].amount) / transactions[OFFSET(0)].amount < 0.1
            ) THEN 'FRONTRUN'
            ELSE 'NORMAL'
          END as mev_type
        FROM block_analysis b
        WHERE block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
      )
      SELECT
        -- Monthly trends
        (
          SELECT ARRAY_AGG(
            STRUCT(
              month,
              total_blocks,
              total_transactions,
              unique_senders,
              unique_receivers,
              total_volume,
              sandwich_blocks,
              frontrun_blocks
            ) ORDER BY month
          )
          FROM monthly_stats
        ) as monthly_data,
        -- Last week's activity
        (
          SELECT ARRAY_AGG(
            STRUCT(
              activity_date,
              sandwich_blocks,
              frontrun_blocks,
              total_blocks,
              total_volume
            ) ORDER BY activity_date
          )
          FROM last_week_mev
        ) as last_week_activity,
        -- Recent MEV activities
        (
          SELECT ARRAY_AGG(
            STRUCT(
              block_number,
              block_timestamp,
              txs_in_block,
              transactions,
              mev_type
            )
            ORDER BY block_timestamp DESC
            LIMIT 10
          )
          FROM recent_mev
        ) as recent_activities,
        -- Summary statistics
        (
          SELECT AS STRUCT
            COUNT(DISTINCT CASE WHEN mev_type = 'SANDWICH' THEN block_number END) as sandwich_blocks_24h,
            COUNT(DISTINCT CASE WHEN mev_type = 'FRONTRUN' THEN block_number END) as frontrun_blocks_24h,
            COUNT(DISTINCT block_number) as total_blocks_24h
          FROM recent_mev
        ) as recent_stats
      FROM daily_stats d
      LEFT JOIN sandwich_patterns s ON d.tx_date = s.block_date
      LEFT JOIN frontrun_patterns f ON d.tx_date = f.block_date
    `;

    // Execute query
    const [results] = await bigquery.query({ query: mevQuery });
    const mevData = results[0];

    // Calculate trends and prepare data for AI analysis
    const monthlyData = mevData.monthly_data || [];
    const lastWeekActivity = mevData.last_week_activity || [];
    const recentStats = mevData.recent_stats || {};

    // Calculate moving averages for sandwich and frontrun patterns
    const movingAverages = calculateMovingAverages(lastWeekActivity);

    // Generate AI insights
    const insights = await generateMEVInsights({
      monthlyData,
      lastWeekActivity,
      recentStats,
      movingAverages,
    });

    // Calculate risk score
    const riskScore = calculateMEVRiskScore(recentStats, monthlyData);

    // Format the response
    const response = {
      risk_score: riskScore,
      insights,
      last_week_activity: lastWeekActivity.map((day: any) => ({
        date: day.activity_date,
        sandwich_blocks: day.sandwich_blocks,
        frontrun_blocks: day.frontrun_blocks,
        total_blocks: day.total_blocks,
        volume: day.total_volume / 1e6,
      })),
      monthly_trends: monthlyData.map((month: any) => ({
        month: month.month,
        total_blocks: month.total_blocks,
        total_transactions: month.total_transactions,
        sandwich_blocks: month.sandwich_blocks,
        frontrun_blocks: month.frontrun_blocks,
        volume: month.total_volume / 1e6,
      })),
      recent_activities: mevData.recent_activities.map((activity: any) => ({
        block_number: activity.block_number,
        timestamp: activity.block_timestamp.value,
        transaction_count: activity.txs_in_block,
        transactions: activity.transactions.map((tx: any) => ({
          ...tx,
          amount: tx.amount / 1e6,
        })),
        mev_type: activity.mev_type,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error analyzing MEV activities:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze MEV activities",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Calculate 7-day moving averages and trends
function calculateMovingAverages(historicalData: any[]) {
  const windowSize = 7;
  const movingAverages = [];

  for (let i = windowSize - 1; i < historicalData.length; i++) {
    const window = historicalData.slice(i - windowSize + 1, i + 1);
    const avgSandwich =
      window.reduce((sum, day) => sum + (day.sandwich_blocks || 0), 0) /
      windowSize;
    const avgFrontrun =
      window.reduce((sum, day) => sum + (day.frontrun_blocks || 0), 0) /
      windowSize;
    const avgVolume =
      window.reduce((sum, day) => sum + (day.total_volume || 0), 0) /
      windowSize;

    movingAverages.push({
      date: historicalData[i].activity_date,
      avg_sandwich_count: parseFloat(avgSandwich.toFixed(2)),
      avg_frontrun_count: parseFloat(avgFrontrun.toFixed(2)),
      avg_volume: parseFloat((avgVolume / 1e6).toFixed(2)),
    });
  }

  return movingAverages;
}
