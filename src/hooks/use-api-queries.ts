import { useQuery } from "@tanstack/react-query";

// Transaction Volume types
export interface VolumeData {
  date: string;
  volume: number;
}

export interface VolumeSummary {
  volume_24h: number;
  percent_change_24h: number;
  volume_7d: number;
  percent_change_7d: number;
  volume_30d: number;
  percent_change_30d: number;
}

// Token Supply types
export interface SupplyHistoryData {
  date: string;
  change: number;
  total: number;
}

export interface SupplySummaryData {
  current_supply: number;
  total_minted: number;
  total_burned: number;
}

export interface AvgChangeData {
  period: string;
  avg_daily_change: number;
  total_change: number;
}

// Top Holders types
export interface Holder {
  address: string;
  balance: number;
  percentage: number;
}

export interface HolderData {
  holders: Holder[];
  totalHolders: number;
}

// Transfers types
export interface Transfer {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: string;
  blockNumber: number;
  isNew?: boolean;
}

// Transaction Volume API hook
export function useTransactionVolume() {
  return useQuery({
    queryKey: ["transaction-volume"],
    queryFn: async () => {
      const response = await fetch("/api/transaction-volume");
      if (!response.ok) {
        throw new Error("Failed to fetch transaction volume data");
      }
      const data = await response.json();
      return {
        data: data.data as VolumeData[],
        summary: data.summary as VolumeSummary,
      };
    },
  });
}

// Token Supply API hook
export function useTokenSupply() {
  return useQuery({
    queryKey: ["token-supply"],
    queryFn: async () => {
      const response = await fetch("/api/token-supply");
      if (!response.ok) {
        throw new Error("Failed to fetch token supply data");
      }
      const data = await response.json();
      return {
        supply_history: data.supply_history as SupplyHistoryData[],
        current_supply: data.current_supply as number,
        total_minted: data.total_minted as number,
        total_burned: data.total_burned as number,
        monthly_avg: data.monthly_avg as AvgChangeData[],
        yearly_avg: data.yearly_avg as AvgChangeData[],
        current_month_avg: data.current_month_avg as AvgChangeData,
        current_year_avg: data.current_year_avg as AvgChangeData,
      };
    },
  });
}

// Top Holders API hook
export function useTopHolders(limit: number = 5) {
  return useQuery({
    queryKey: ["holders", limit],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/holders?limit=${limit}`);
        const data = await response.json();
        return data as HolderData;
      } catch (err) {
        console.error("Failed to fetch holder data:", err);

        // Fallback data if the API fails
        return {
          holders: [
            { address: "0x1234...5678", balance: 15000000, percentage: 15 },
            { address: "0x2345...6789", balance: 12000000, percentage: 12 },
            { address: "0x3456...7890", balance: 10000000, percentage: 10 },
            { address: "0x4567...8901", balance: 8000000, percentage: 8 },
            { address: "0x5678...9012", balance: 7000000, percentage: 7 },
            { address: "Others", balance: 48000000, percentage: 48 },
          ],
          totalHolders: 4281,
        } as HolderData;
      }
    },
  });
}

// Transfers API hook
export function useTransfers(pollingEnabled: boolean = false) {
  return useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const response = await fetch("/api/transfers");
      if (!response.ok) {
        throw new Error("Failed to fetch transfers data");
      }
      const data = await response.json();
      return data as Transfer[];
    },
    refetchInterval: pollingEnabled ? 10000 : false, // If polling is enabled, refetch every 10 seconds
  });
}
