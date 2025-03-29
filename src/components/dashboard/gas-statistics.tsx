"use client";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { useGasStats } from "@/hooks/use-api-queries";
import { LoadingFallback } from "@/components/ui/loading-fallback";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GasStatistics() {
  const { data: gasStats, isLoading, error } = useGasStats();

  if (isLoading) {
    return <LoadingFallback message="Loading gas statistics..." />;
  }

  if (error || !gasStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Gas Data</CardTitle>
          <CardDescription>
            There was an error fetching current gas statistics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">
            {error instanceof Error
              ? error.message
              : "Unable to load gas data. Please try again later."}
          </p>
        </CardContent>
      </Card>
    );
  }

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
}
