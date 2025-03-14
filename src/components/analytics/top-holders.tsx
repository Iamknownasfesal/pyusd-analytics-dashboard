"use client";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopHolders } from "@/hooks/use-api-queries";
import { useAddress } from "@/components/address/address-context";

// Colors for the pie chart
const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#94a3b8",
];

// Custom tooltip for the pie chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-sm">{`${payload[0].value}% of total supply`}</p>
      </div>
    );
  }
  return null;
};

export function TopHolders() {
  const { data: holderData, isLoading, error } = useTopHolders(5);
  const { openAddressModal } = useAddress();

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Top PYUSD Holders</h2>
          <div className="text-sm text-muted-foreground">
            Distribution Analysis
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardCard title="Holder Distribution" className="h-[400px]">
            <div className="h-full flex items-center justify-center">
              <Skeleton className="h-[200px] w-[200px] rounded-full" />
            </div>
          </DashboardCard>

          <DashboardCard title="Top 5 Holders" className="h-[400px]">
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                ))}
            </div>
          </DashboardCard>
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

  // Prepare data for the pie chart
  const pieData =
    holderData?.holders.map((holder) => ({
      name:
        holder.address === "Others"
          ? "Others"
          : `${holder.address.substring(0, 6)}...${holder.address.substring(
              holder.address.length - 4
            )}`,
      value: holder.percentage,
    })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Top PYUSD Holders</h2>
        <div className="text-sm text-muted-foreground">
          Distribution Analysis
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard title="Holder Distribution" className="h-[400px]">
          <div className="w-full h-full flex items-center justify-center pt-0 pb-4 px-4">
            {pieData.length > 0 ? (
              <PieChart width={300} height={350}>
                <Pie
                  data={pieData}
                  cx={150}
                  cy={120}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => {
                    // Shortened label to prevent overflow
                    const value = parseFloat((percent * 100).toFixed(0));
                    return value > 5 ? `${value}%` : "";
                  }}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Legend
                  wrapperStyle={{ paddingTop: 0 }}
                  verticalAlign="top"
                  align="center"
                  layout="horizontal"
                />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            ) : (
              <div>
                <p>No data available</p>
              </div>
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Top 5 Holders" className="h-[400px]">
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Address</th>
                  <th className="text-right py-2">Balance</th>
                  <th className="text-right py-2">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {holderData?.holders.map((holder, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-3">
                      {holder.address === "Others" ? (
                        <span>Other Holders</span>
                      ) : (
                        <button
                          onClick={() => openAddressModal(holder.address)}
                          className="hover:underline text-blue-600 dark:text-blue-400 cursor-pointer"
                        >
                          {holder.address.substring(0, 6)}...
                          {holder.address.substring(holder.address.length - 4)}
                        </button>
                      )}
                    </td>
                    <td className="py-3 text-right font-medium">
                      ${holder.balance.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {holder.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="Holder Concentration">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold">
              {holderData?.holders[0]?.percentage || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Top Holder</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold">
              {holderData?.holders
                .slice(0, 5)
                .reduce((acc, holder) => acc + holder.percentage, 0)
                .toFixed(2) || 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Top 5 Holders</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold">
              {holderData?.totalHolders || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total Holders</p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
