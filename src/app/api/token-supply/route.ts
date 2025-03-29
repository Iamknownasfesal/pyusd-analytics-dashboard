import { NextResponse } from "next/server";
import { initBigQueryClient } from "../bigQuery";
import { PYUSD_CONTRACT_ADDRESS } from "@/lib/blockchain";

export async function GET(_: Request) {
  try {
    const bigquery = initBigQueryClient();

    // Query to get current total supply
    const totalSupplyQuery = `
      WITH mint_events AS (
        SELECT 
          SUM(CAST(quantity AS NUMERIC)) as total_minted
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND from_address = '0x0000000000000000000000000000000000000000'
      ),
      burn_events AS (
        SELECT 
          SUM(CAST(quantity AS NUMERIC)) as total_burned
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND to_address = '0x0000000000000000000000000000000000000000'
      )
      SELECT
        (SELECT total_minted FROM mint_events) as total_minted,
        (SELECT total_burned FROM burn_events) as total_burned,
        (SELECT total_minted FROM mint_events) - (SELECT total_burned FROM burn_events) as current_supply
    `;

    // Query to get historical supply changes
    const supplyChangeQuery = `
      WITH daily_changes AS (
        SELECT
          DATE(block_timestamp) as date,
          SUM(
            CASE 
              WHEN from_address = '0x0000000000000000000000000000000000000000' THEN CAST(quantity AS NUMERIC)
              WHEN to_address = '0x0000000000000000000000000000000000000000' THEN -CAST(quantity AS NUMERIC)
              ELSE 0
            END
          ) as daily_change
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND (from_address = '0x0000000000000000000000000000000000000000' OR to_address = '0x0000000000000000000000000000000000000000')
        GROUP BY DATE(block_timestamp)
        ORDER BY date
      ),
      cumulative_changes AS (
        SELECT
          date,
          daily_change,
          SUM(daily_change) OVER (ORDER BY date) as cumulative_supply
        FROM daily_changes
      )
      SELECT 
        FORMAT_DATE('%b %d, %Y', date) as formatted_date,
        daily_change,
        cumulative_supply
      FROM cumulative_changes
      ORDER BY date
    `;

    // Query to get monthly average changes
    const monthlyAvgQuery = `
      WITH daily_changes AS (
        SELECT
          DATE(block_timestamp) as date,
          SUM(
            CASE 
              WHEN from_address = '0x0000000000000000000000000000000000000000' THEN CAST(quantity AS NUMERIC)
              WHEN to_address = '0x0000000000000000000000000000000000000000' THEN -CAST(quantity AS NUMERIC)
              ELSE 0
            END
          ) as daily_change
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND (from_address = '0x0000000000000000000000000000000000000000' OR to_address = '0x0000000000000000000000000000000000000000')
        GROUP BY DATE(block_timestamp)
      ),
      monthly_stats AS (
        SELECT
          FORMAT_DATE('%Y-%m', date) as month,
          AVG(daily_change) as avg_daily_change,
          SUM(daily_change) as total_change,
          COUNT(date) as days_in_month
        FROM daily_changes
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      )
      SELECT 
        month,
        avg_daily_change,
        total_change
      FROM monthly_stats
    `;

    // Query to get yearly average change
    const yearlyAvgQuery = `
      WITH daily_changes AS (
        SELECT
          DATE(block_timestamp) as date,
          SUM(
            CASE 
              WHEN from_address = '0x0000000000000000000000000000000000000000' THEN CAST(quantity AS NUMERIC)
              WHEN to_address = '0x0000000000000000000000000000000000000000' THEN -CAST(quantity AS NUMERIC)
              ELSE 0
            END
          ) as daily_change
        FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
        WHERE 
          address = '${PYUSD_CONTRACT_ADDRESS.toLowerCase()}'
          AND (from_address = '0x0000000000000000000000000000000000000000' OR to_address = '0x0000000000000000000000000000000000000000')
        GROUP BY DATE(block_timestamp)
      ),
      yearly_stats AS (
        SELECT
          EXTRACT(YEAR FROM date) as year,
          AVG(daily_change) as avg_daily_change,
          SUM(daily_change) as total_change,
          COUNT(date) as days_in_year
        FROM daily_changes
        GROUP BY year
        ORDER BY year DESC
      )
      SELECT 
        CAST(year AS STRING) as year,
        avg_daily_change,
        total_change
      FROM yearly_stats
    `;

    // Run queries in parallel
    const [
      totalSupplyResults,
      supplyChangeResults,
      monthlyAvgResults,
      yearlyAvgResults,
    ] = await Promise.all([
      bigquery.query({ query: totalSupplyQuery }),
      bigquery.query({ query: supplyChangeQuery }),
      bigquery.query({ query: monthlyAvgQuery }),
      bigquery.query({ query: yearlyAvgQuery }),
    ]);

    const totalSupplyData = totalSupplyResults[0][0];

    // Convert to USD (assuming 6 decimals for PYUSD token)
    const currentSupply = parseFloat(
      (totalSupplyData.current_supply / 1e6).toFixed(2)
    );
    const totalMinted = parseFloat(
      (totalSupplyData.total_minted / 1e6).toFixed(2)
    );
    const totalBurned = parseFloat(
      (totalSupplyData.total_burned / 1e6).toFixed(2)
    );

    const supplyChangeData = supplyChangeResults[0].map((row: any) => ({
      date: row.formatted_date,
      change: parseFloat((row.daily_change / 1e6).toFixed(2)),
      total: parseFloat((row.cumulative_supply / 1e6).toFixed(2)),
    }));

    const monthlyAvgData = monthlyAvgResults[0].map((row: any) => {
      // Parse year and month from the YYYY-MM format
      const [year, month] = row.month.split("-");
      // Create a date object to get the month name
      const date = new Date(parseInt(year), parseInt(month) - 1);
      // Format the month and year (e.g., "Jan 2024")
      const formattedMonth = date.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });

      return {
        period: formattedMonth,
        avg_daily_change: parseFloat((row.avg_daily_change / 1e6).toFixed(2)),
        total_change: parseFloat((row.total_change / 1e6).toFixed(2)),
      };
    });

    const yearlyAvgData = yearlyAvgResults[0].map((row: any) => ({
      period: row.year,
      avg_daily_change: parseFloat((row.avg_daily_change / 1e6).toFixed(2)),
      total_change: parseFloat((row.total_change / 1e6).toFixed(2)),
    }));

    // Calculate current month and year averages
    const currentMonthAvg =
      monthlyAvgData.length > 0 ? monthlyAvgData[0] : null;
    const currentYearAvg = yearlyAvgData.length > 0 ? yearlyAvgData[0] : null;

    return NextResponse.json({
      current_supply: currentSupply,
      total_minted: totalMinted,
      total_burned: totalBurned,
      supply_history: supplyChangeData,
      monthly_avg: monthlyAvgData,
      yearly_avg: yearlyAvgData,
      current_month_avg: currentMonthAvg,
      current_year_avg: currentYearAvg,
    });
  } catch (error) {
    console.error("Error fetching token supply data from BigQuery:", error);

    // Return mock data if the BigQuery query fails
    const mockSupplyHistory = [
      { date: "Nov 1, 2023", change: 100000, total: 100000 },
      { date: "Nov 15, 2023", change: 200000, total: 300000 },
      { date: "Dec 1, 2023", change: 150000, total: 450000 },
      { date: "Dec 15, 2023", change: 350000, total: 800000 },
      { date: "Jan 1, 2024", change: 500000, total: 1300000 },
      { date: "Jan 15, 2024", change: 700000, total: 2000000 },
      { date: "Feb 1, 2024", change: 1000000, total: 3000000 },
      { date: "Feb 15, 2024", change: 1500000, total: 4500000 },
      { date: "Mar 1, 2024", change: 1000000, total: 5500000 },
      { date: "Mar 15, 2024", change: 500000, total: 6000000 },
    ];

    const mockMonthlyAvg = [
      { period: "Mar 2024", avg_daily_change: 75000, total_change: 1500000 },
      { period: "Feb 2024", avg_daily_change: 89285.71, total_change: 2500000 },
      { period: "Jan 2024", avg_daily_change: 38709.68, total_change: 1200000 },
      { period: "Dec 2023", avg_daily_change: 16129.03, total_change: 500000 },
      { period: "Nov 2023", avg_daily_change: 10000, total_change: 300000 },
    ];

    const mockYearlyAvg = [
      { period: "2024", avg_daily_change: 67032.97, total_change: 6100000 },
      { period: "2023", avg_daily_change: 13114.75, total_change: 800000 },
    ];

    return NextResponse.json(
      {
        current_supply: 6000000,
        total_minted: 6300000,
        total_burned: 300000,
        supply_history: mockSupplyHistory,
        monthly_avg: mockMonthlyAvg,
        yearly_avg: mockYearlyAvg,
        current_month_avg: mockMonthlyAvg[0],
        current_year_avg: mockYearlyAvg[0],
      },
      { status: 500 }
    );
  }
}
