"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import Link from "next/link";

interface MEVData {
  risk_score: number;
  insights: string[];
  last_week_activity: Array<{
    date: string;
    sandwich_blocks: number;
    frontrun_blocks: number;
    total_blocks: number;
    volume: number;
  }>;
  monthly_trends: Array<{
    month: string;
    total_blocks: number;
    total_transactions: number;
    sandwich_blocks: number;
    frontrun_blocks: number;
    volume: number;
  }>;
  recent_activities: Array<{
    block_number: number;
    timestamp: string;
    transactions_count: number;
    mev_type: string;
    transactions: Array<{
      hash: string;
      from: string;
      to: string;
      amount: number;
    }>;
  }>;
}

function getRiskColor(score: number): string {
  if (score >= 80) return "text-red-500";
  if (score >= 60) return "text-orange-500";
  if (score >= 40) return "text-yellow-500";
  return "text-green-500";
}

function getRiskLabel(score: number): string {
  if (score >= 80) return "High Risk";
  if (score >= 60) return "Moderate Risk";
  if (score >= 40) return "Low Risk";
  return "Safe";
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonth(monthString: string): string {
  const [year, month] = monthString.split("-");
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
    "en-US",
    {
      month: "short",
      year: "numeric",
    }
  );
}

export function MEVAnalysis() {
  const { data: mevData, isLoading } = useQuery<MEVData>({
    queryKey: ["mev-analysis"],
    queryFn: async () => {
      const response = await fetch("/api/mev");
      if (!response.ok) {
        throw new Error("Failed to fetch MEV data");
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading || !mevData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <DashboardCard key={i} title="Loading...">
                <Skeleton className="h-24" />
              </DashboardCard>
            ))}
        </div>
        <DashboardCard title="Loading...">
          <Skeleton className="h-[400px]" />
        </DashboardCard>
      </div>
    );
  }

  // Calculate weekly totals
  const weeklyTotals = {
    sandwich_blocks: mevData.last_week_activity.reduce(
      (sum, day) => sum + day.sandwich_blocks,
      0
    ),
    frontrun_blocks: mevData.last_week_activity.reduce(
      (sum, day) => sum + day.frontrun_blocks,
      0
    ),
    total_blocks: mevData.last_week_activity.reduce(
      (sum, day) => sum + day.total_blocks,
      0
    ),
  };

  return (
    <div className="space-y-6">
      {/* Risk Score and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard title="MEV Risk Score">
          <div className="flex flex-col items-center">
            <div
              className={`text-4xl font-bold ${getRiskColor(
                mevData.risk_score
              )}`}
            >
              {mevData.risk_score}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {getRiskLabel(mevData.risk_score)}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Last 7 Days Activity">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">
                {weeklyTotals.sandwich_blocks}
              </div>
              <div className="text-sm text-muted-foreground">
                Sandwich Attacks
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {weeklyTotals.frontrun_blocks}
              </div>
              <div className="text-sm text-muted-foreground">
                Frontrun Attempts
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="AI Insights">
          <div className="space-y-2">
            {mevData.insights.map((insight, index) => (
              <div key={index} className="text-sm">
                • {insight}
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Monthly MEV Activity" className="h-[450px]">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={mevData.monthly_trends}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                minTickGap={50}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(label) => formatMonth(label)}
                formatter={(value: number) => [value, "Blocks"]}
              />
              <Legend />
              <Bar
                dataKey="sandwich_blocks"
                name="Sandwich Attacks"
                fill="#f97316"
                stackId="a"
              />
              <Bar
                dataKey="frontrun_blocks"
                name="Frontrun Attempts"
                fill="#8b5cf6"
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </DashboardCard>

        <DashboardCard title="Monthly Transaction Volume" className="h-[450px]">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={mevData.monthly_trends}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                minTickGap={50}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(label) => formatMonth(label)}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Volume",
                ]}
              />
              <Area
                type="monotone"
                dataKey="volume"
                name="Transaction Volume"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </DashboardCard>
      </div>

      {/* Recent MEV Activities */}
      <DashboardCard title="Recent MEV Activities">
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Block</th>
                <th className="text-left py-2">Time</th>
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {mevData.recent_activities.map((activity, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="py-3">
                    <Link
                      href={`https://etherscan.io/block/${activity.block_number}`}
                      target="_blank"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      {activity.block_number}
                    </Link>
                  </td>
                  <td className="py-3">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        activity.mev_type === "SANDWICH"
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                          : activity.mev_type === "FRONTRUN"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {activity.mev_type}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    $
                    {activity.transactions
                      .reduce((sum, tx) => sum + tx.amount, 0)
                      .toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
