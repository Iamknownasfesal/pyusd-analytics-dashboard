import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { getPYUSDInfo } from "@/lib/blockchain";

// Server component to fetch and display PYUSD overview
export async function PYUSDOverview() {
  try {
    const pyusdInfo = await getPYUSDInfo();

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Token Name">
          <div className="text-2xl font-bold">{pyusdInfo.name}</div>
          <p className="text-xs text-muted-foreground">
            Official PayPal USD Token
          </p>
        </DashboardCard>

        <DashboardCard title="Symbol">
          <div className="text-2xl font-bold">{pyusdInfo.symbol}</div>
          <p className="text-xs text-muted-foreground">Token Ticker</p>
        </DashboardCard>

        <DashboardCard title="Total Supply">
          <div className="text-2xl font-bold">
            {Number(pyusdInfo.totalSupply).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">PYUSD in Circulation</p>
        </DashboardCard>

        <DashboardCard title="Decimals">
          <div className="text-2xl font-bold">{pyusdInfo.decimals}</div>
          <p className="text-xs text-muted-foreground">Token Precision</p>
        </DashboardCard>
      </div>
    );
  } catch (error) {
    console.error("Error loading PYUSD overview:", error);
    return (
      <div className="text-red-500">
        Error loading PYUSD data. Please try again later.
      </div>
    );
  }
}
