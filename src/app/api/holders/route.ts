import { NextResponse } from "next/server";
import { initBigQueryClient } from "../bigQuery";
import { PYUSD_CONTRACT_ADDRESS } from "@/lib/blockchain";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5", 10);
    const pyusdAddress = PYUSD_CONTRACT_ADDRESS.toLowerCase();

    const bigquery = initBigQueryClient();

    // Combined query to get top holders, total supply and holder count
    const combinedQuery = `
      WITH token_balances AS (
        SELECT 
          address,
          SUM(balance_change) as balance
        FROM (
          SELECT 
            to_address as address,
            CAST(quantity AS NUMERIC) as balance_change
          FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
          WHERE address = '${pyusdAddress}'
          
          UNION ALL
          
          SELECT 
            from_address as address,
            -CAST(quantity AS NUMERIC) as balance_change
          FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers\`
          WHERE address = '${pyusdAddress}'
        )
        GROUP BY address
      ),
      top_holders AS (
        SELECT address, balance
        FROM token_balances
        WHERE balance > 0
        ORDER BY balance DESC
        LIMIT ${limit}
      ),
      supply_stats AS (
        SELECT 
          SUM(balance) as total_supply,
          COUNT(*) as holder_count
        FROM token_balances
        WHERE balance > 0
      )
      SELECT 
        h.address,
        h.balance,
        s.total_supply,
        s.holder_count
      FROM top_holders h, supply_stats s
    `;

    const [results] = await bigquery.query({ query: combinedQuery });

    if (!results || results.length === 0) {
      throw new Error("No holder data returned");
    }

    // Extract supply and holder count from the first row
    const totalSupply = results[0].total_supply;
    const totalHolders = results[0].holder_count;

    // Format holders with percentages
    const holders = results.map((holder: any) => {
      const percentage = (holder.balance / totalSupply) * 100;
      return {
        address: holder.address,
        balance: parseFloat((holder.balance / 1e6).toFixed(2)), // 6 decimals for PYUSD
        percentage: parseFloat(percentage.toFixed(2)),
      };
    });

    // Calculate "Others" percentage
    const topHoldersPercentage = holders.reduce(
      (sum: number, holder: any) => sum + holder.percentage,
      0
    );

    const othersPercentage = parseFloat(
      (100 - topHoldersPercentage).toFixed(2)
    );
    const othersBalance = parseFloat(
      ((totalSupply * othersPercentage) / 100 / 1e6).toFixed(2)
    );

    // Add "Others" to the holders list
    const response = {
      holders: [
        ...holders,
        {
          address: "Others",
          balance: othersBalance,
          percentage: othersPercentage,
        },
      ],
      totalHolders,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching top holders:", error);

    // Return mock data if query fails
    return NextResponse.json(
      {
        holders: [
          { address: "0x688e...ac82", balance: 180621920.5, percentage: 28.64 },
          {
            address: "0x2fb0...41a4",
            balance: 144359776.77,
            percentage: 22.89,
          },
          { address: "0x9ceb...0328", balance: 79922093.41, percentage: 12.67 },
          { address: "0x5c5d...85a0", balance: 35642535, percentage: 5.65 },
          { address: "0x7e4b...477a", balance: 20121862.32, percentage: 3.19 },
          { address: "Others", balance: 169988157.11, percentage: 26.96 },
        ],
        totalHolders: 24201,
      },
      { status: 500 }
    );
  }
}
