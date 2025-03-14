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
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useTokenSupply } from "@/hooks/use-api-queries";

export function TokenSupply() {
  const { data: supplyData, isLoading, error } = useTokenSupply();

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">PYUSD Supply</h2>
          <div className="text-sm text-muted-foreground">All-time data</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <DashboardCard
                key={i}
                title={
                  i === 0
                    ? "Current Supply"
                    : i === 1
                    ? "Total Minted"
                    : "Total Burned"
                }
              >
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </DashboardCard>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(2)
            .fill(0)
            .map((_, i) => (
              <DashboardCard
                key={i}
                title={
                  i === 0 ? "Monthly Average Change" : "Yearly Average Change"
                }
              >
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </DashboardCard>
            ))}
        </div>

        <DashboardCard title="PYUSD Supply Over Time" className="h-[450px]">
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="h-[300px] w-[700px]" />
          </div>
        </DashboardCard>

        <DashboardCard title="Daily Supply Changes" className="h-[450px]">
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="h-[300px] w-[700px]" />
          </div>
        </DashboardCard>
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

  // Extract data from the query
  const supplyHistory = supplyData?.supply_history || [];
  const supplySummary = {
    current_supply: supplyData?.current_supply || 0,
    total_minted: supplyData?.total_minted || 0,
    total_burned: supplyData?.total_burned || 0,
  };
  const currentMonthAvg = supplyData?.current_month_avg;
  const currentYearAvg = supplyData?.current_year_avg;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">PYUSD Supply</h2>
        <div className="text-sm text-muted-foreground">All-time data</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard title="Current Supply">
          <div className="text-2xl font-bold">
            ${supplySummary.current_supply.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">
            Total PYUSD in circulation
          </div>
        </DashboardCard>

        <DashboardCard title="Total Minted">
          <div className="text-2xl font-bold">
            ${supplySummary.total_minted.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">
            PYUSD minted since launch
          </div>
        </DashboardCard>

        <DashboardCard title="Total Burned">
          <div className="text-2xl font-bold">
            ${supplySummary.total_burned.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">
            PYUSD burned since launch
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard
          title={`Monthly Average (${
            currentMonthAvg?.period || "Current Month"
          })`}
        >
          <div className="text-2xl font-bold flex items-center">
            {currentMonthAvg && currentMonthAvg.avg_daily_change >= 0 ? (
              <div className="flex md:flex-row flex-col">
                +${currentMonthAvg.avg_daily_change.toLocaleString()}
                <span className="ml-2 text-lg text-green-500">
                  (+
                  {(
                    (currentMonthAvg.avg_daily_change /
                      (supplySummary.current_supply || 1)) *
                    100
                  ).toFixed(5)}
                  %)
                </span>
              </div>
            ) : (
              <div className="flex md:flex-row flex-col">
                ${currentMonthAvg?.avg_daily_change.toLocaleString()}
                <span className="ml-2 text-lg text-red-500">
                  (
                  {(
                    ((currentMonthAvg?.avg_daily_change || 0) /
                      (supplySummary.current_supply || 1)) *
                    100
                  ).toFixed(5)}
                  %)
                </span>
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Average daily supply change
          </div>
          <div className="mt-2">
            <div className="text-lg font-semibold flex md:flex-row flex-col md:items-center items-start">
              {currentMonthAvg && currentMonthAvg.total_change >= 0 ? "+" : ""}$
              {currentMonthAvg?.total_change.toLocaleString()}
              <span
                className={`ml-2 text-sm ${
                  currentMonthAvg && currentMonthAvg.total_change >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                (
                {currentMonthAvg && currentMonthAvg.total_change >= 0
                  ? "+"
                  : ""}
                {(
                  ((currentMonthAvg?.total_change || 0) /
                    (supplySummary.current_supply || 1)) *
                  100
                ).toFixed(3)}
                %)
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Total change this month
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title={`Yearly Average (${currentYearAvg?.period || "Current Year"})`}
        >
          <div className="text-2xl font-bold flex items-center">
            {currentYearAvg && currentYearAvg.avg_daily_change >= 0 ? (
              <div className="flex md:flex-row flex-col">
                +${currentYearAvg.avg_daily_change.toLocaleString()}
                <span className="ml-2 text-lg text-green-500">
                  (+
                  {(
                    (currentYearAvg.avg_daily_change /
                      (supplySummary.current_supply || 1)) *
                    100
                  ).toFixed(5)}
                  %)
                </span>
              </div>
            ) : (
              <div className="flex md:flex-row flex-col">
                ${currentYearAvg?.avg_daily_change.toLocaleString()}
                <span className="ml-2 text-lg text-red-500">
                  (
                  {(
                    ((currentYearAvg?.avg_daily_change || 0) /
                      (supplySummary.current_supply || 1)) *
                    100
                  ).toFixed(5)}
                  %)
                </span>
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Average daily supply change
          </div>
          <div className="mt-2">
            <div className="text-lg font-semibold flex md:flex-row flex-col md:items-center items-start">
              {currentYearAvg && currentYearAvg.total_change >= 0 ? "+" : ""}$
              {currentYearAvg?.total_change.toLocaleString()}
              <span
                className={`ml-2 text-sm ${
                  currentYearAvg && currentYearAvg.total_change >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                ({currentYearAvg && currentYearAvg.total_change >= 0 ? "+" : ""}
                {(
                  ((currentYearAvg?.total_change || 0) /
                    (supplySummary.current_supply || 1)) *
                  100
                ).toFixed(3)}
                %)
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Total change this year
            </div>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="PYUSD Supply Over Time" className="h-[450px]">
        <div className="w-full h-full flex items-center justify-center p-4">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={supplyHistory}
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
                tickFormatter={(value) =>
                  value >= 1000000
                    ? `$${(value / 1000000).toFixed(0)}M`
                    : `$${(value / 1000).toFixed(0)}K`
                }
              />
              <Tooltip
                formatter={(value: number) => [
                  `$${Number(value).toLocaleString()}`,
                  "Total Supply",
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                name="Total Supply"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title="Daily Supply Changes" className="h-[450px]">
        <div className="w-full h-full flex items-center justify-center p-4">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={supplyHistory}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 30,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
              <YAxis
                tickFormatter={(value) =>
                  value >= 1000000
                    ? `$${(value / 1000000).toFixed(1)}M`
                    : `$${(value / 1000).toFixed(0)}K`
                }
              />
              <Tooltip
                formatter={(value: number) => [
                  `$${Number(value).toLocaleString()}`,
                  "Supply Change",
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Bar dataKey="change" fill="#10b981" name="Daily Supply Change" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>
    </div>
  );
}
