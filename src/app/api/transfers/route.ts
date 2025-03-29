import { NextResponse } from "next/server";
import { getRecentTransfers } from "@/lib/blockchain";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get("count") || "20", 10);

    // Limit count to a reasonable number
    const limitedCount = Math.min(count, 50);

    // Fetch the transfers
    const transfers = await getRecentTransfers(limitedCount);

    return NextResponse.json(transfers);
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}
