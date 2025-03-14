"use client";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactionVolume } from "@/hooks/use-api-queries";

export function TransactionVolume() {
  const { data: transactionData, isLoading, error } = useTransactionVolume();

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">PYUSD Transaction Volume</h2>
          <div className="text-sm text-muted-foreground">Last 3 months</div>
        </div>

        <DashboardCard title="Daily Transaction Volume" className="h-[450px]">
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="h-[300px] w-[700px]" />
          </div>
        </DashboardCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <DashboardCard
                key={i}
                title={
                  i === 0 ? "24h Volume" : i === 1 ? "7d Volume" : "30d Volume"
                }
              >
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </DashboardCard>
            ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-600 dark:text-red-400">
            Error Loading Data
          </h3>
          <p className="mt-2 text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const volumeData = transactionData?.data || [];
  const summaryData = transactionData?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">PYUSD Transaction Volume</h2>
        <div className="text-sm text-muted-foreground">Last 3 months</div>
      </div>

      <DashboardCard title="Daily Transaction Volume" className="h-[450px]">
        <div className="w-full h-full flex items-center justify-center p-4">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={volumeData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
              />
              <Tooltip
                formatter={(value: number) => [
                  `$${Number(value).toLocaleString()}`,
                  "Volume",
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard title="24h Volume">
          <div className="text-2xl font-bold">
            ${summaryData?.volume_24h.toLocaleString()}
          </div>
          <div
            className={`flex items-center text-sm ${
              summaryData?.percent_change_24h &&
              summaryData.percent_change_24h >= 0
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            <span>
              {summaryData?.percent_change_24h &&
              summaryData.percent_change_24h >= 0
                ? "+"
                : ""}
              {summaryData?.percent_change_24h}%
            </span>
            <span className="ml-1">vs previous day</span>
          </div>
        </DashboardCard>

        <DashboardCard title="7d Volume">
          <div className="text-2xl font-bold">
            ${summaryData?.volume_7d.toLocaleString()}
          </div>
          <div
            className={`flex items-center text-sm ${
              summaryData?.percent_change_7d &&
              summaryData.percent_change_7d >= 0
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            <span>
              {summaryData?.percent_change_7d &&
              summaryData.percent_change_7d >= 0
                ? "+"
                : ""}
              {summaryData?.percent_change_7d}%
            </span>
            <span className="ml-1">vs previous week</span>
          </div>
        </DashboardCard>

        <DashboardCard title="30d Volume">
          <div className="text-2xl font-bold">
            ${summaryData?.volume_30d.toLocaleString()}
          </div>
          <div
            className={`flex items-center text-sm ${
              summaryData?.percent_change_30d &&
              summaryData.percent_change_30d >= 0
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            <span>
              {summaryData?.percent_change_30d &&
              summaryData.percent_change_30d >= 0
                ? "+"
                : ""}
              {summaryData?.percent_change_30d}%
            </span>
            <span className="ml-1">vs previous month</span>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
