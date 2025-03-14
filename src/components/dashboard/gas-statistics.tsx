import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { getGasStats } from "@/lib/blockchain";

// Server component to fetch and display gas statistics
export async function GasStatistics() {
  try {
    const gasStats = await getGasStats();

    return (
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard title="Current Gas Price">
          <div className="text-2xl font-bold">
            {Number(gasStats.gasPrice).toFixed(2)} Gwei
          </div>
          <p className="text-xs text-muted-foreground">Network Fee</p>
        </DashboardCard>

        {gasStats.maxFeePerGas && (
          <DashboardCard title="Max Fee Per Gas">
            <div className="text-2xl font-bold">
              {Number(gasStats.maxFeePerGas).toFixed(2)} Gwei
            </div>
            <p className="text-xs text-muted-foreground">EIP-1559 Parameter</p>
          </DashboardCard>
        )}

        {gasStats.maxPriorityFeePerGas && (
          <DashboardCard title="Priority Fee">
            <div className="text-2xl font-bold">
              {Number(gasStats.maxPriorityFeePerGas).toFixed(2)} Gwei
            </div>
            <p className="text-xs text-muted-foreground">Miner Tip</p>
          </DashboardCard>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error loading gas statistics:", error);
    return (
      <div className="text-red-500">
        Error loading gas data. Please try again later.
      </div>
    );
  }
}
