"use client";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePYUSDInfo } from "@/hooks/use-api-queries";
import { LoadingFallback } from "@/components/ui/loading-fallback";

// Simple utility function to format numbers
function formatNumber(value: string | number): string {
  return Number(value).toLocaleString();
}

export function PYUSDOverview() {
  const { data: info, isLoading, error } = usePYUSDInfo();

  if (isLoading) {
    return <LoadingFallback message="Loading PYUSD information..." />;
  }

  if (error || !info) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            Failed to load PYUSD information. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardCard title="Token Name">
        <span className="text-2xl font-bold">{info.name}</span>
      </DashboardCard>

      <DashboardCard title="Symbol">
        <Badge className="text-lg">{info.symbol}</Badge>
      </DashboardCard>

      <DashboardCard title="Total Supply">
        <span className="text-2xl font-bold">
          {formatNumber(info.totalSupply)}
        </span>
      </DashboardCard>

      <DashboardCard title="Decimals">
        <span className="text-2xl font-bold">{info.decimals}</span>
      </DashboardCard>
    </div>
  );
}
