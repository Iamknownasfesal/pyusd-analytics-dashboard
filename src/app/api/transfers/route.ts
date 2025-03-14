import { NextResponse } from "next/server";
import { getRecentTransfers } from "@/lib/blockchain";

export async function GET() {
  try {
    // Fetch the most recent 20 transfers
    const transfers = await getRecentTransfers(20);

    return NextResponse.json(transfers);
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}
