import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getGasStats, getRecentTransfers } from "@/lib/blockchain";

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

// Generic data fetcher with error handling
async function fetchData<T>(url: string, errorMessage: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: errorMessage }));
    const error = new Error(errorData?.message || errorMessage);
    toast.error(errorMessage);
    return null as unknown as T;
  }

  return response.json();
}

// Transaction Volume API hook
export function useTransactionVolume(enabled: boolean = true) {
  return useQuery({
    queryKey: ["transaction-volume"],
    queryFn: async () => {
      try {
        return await fetchData<{
          data: VolumeData[];
          summary: VolumeSummary;
        }>(
          "/api/transaction-volume",
          "Failed to fetch transaction volume data"
        );
      } catch (error) {
        // Fallback data if needed
        return {
          data: [],
          summary: {
            volume_24h: 0,
            percent_change_24h: 0,
            volume_7d: 0,
            percent_change_7d: 0,
            volume_30d: 0,
            percent_change_30d: 0,
          },
        };
      }
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Token Supply API hook with dedicated caching key
export function useTokenSupply(enabled: boolean = true) {
  return useQuery({
    queryKey: ["token-supply"],
    queryFn: async () => {
      try {
        return await fetchData<{
          supply_history: SupplyHistoryData[];
          current_supply: number;
          total_minted: number;
          total_burned: number;
          monthly_avg: AvgChangeData[];
          yearly_avg: AvgChangeData[];
          current_month_avg: AvgChangeData;
          current_year_avg: AvgChangeData;
        }>("/api/token-supply", "Failed to fetch token supply data");
      } catch (error) {
        console.error("Supply data fetch error:", error);
        // Return minimal fallback data
        return {
          supply_history: [],
          current_supply: 0,
          total_minted: 0,
          total_burned: 0,
          monthly_avg: [],
          yearly_avg: [],
          current_month_avg: {
            period: "",
            avg_daily_change: 0,
            total_change: 0,
          },
          current_year_avg: {
            period: "",
            avg_daily_change: 0,
            total_change: 0,
          },
        };
      }
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Top Holders API hook with parametrized query key
export function useTopHolders(limit: number = 5, enabled: boolean = true) {
  return useQuery({
    queryKey: ["holders", limit],
    queryFn: async () => {
      try {
        return await fetchData<HolderData>(
          `/api/holders?limit=${limit}`,
          "Failed to fetch holder data"
        );
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
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes for holder data
  });
}

// Transfers API hook with configurable polling
export function useTransfers(enablePolling = false) {
  return useQuery<Transfer[]>({
    queryKey: ["transfers"],
    queryFn: async () => {
      try {
        const transfers = await getRecentTransfers(20);
        return transfers;
      } catch (error) {
        console.error("Error fetching transfers:", error);
        // Return an empty array on error to prevent UI from breaking
        return [];
      }
    },
    staleTime: 10000, // 10 seconds
    refetchInterval: enablePolling ? 15000 : false, // Poll every 15 seconds if enabled
    retry: 2,
    retryDelay: 1000,
  });
}

// Market predictions API hook
export function useMarketPredictions(enabled: boolean = true) {
  return useQuery({
    queryKey: ["market-predictions"],
    queryFn: async () => {
      try {
        return await fetchData<any>(
          "/api/predictions",
          "Failed to fetch market predictions"
        );
      } catch (error) {
        console.error("Predictions fetch error:", error);
        return {
          predictions: [],
          timestamp: new Date().toISOString(),
          marketData: {},
        };
      }
    },
    enabled,
    staleTime: 1000 * 60 * 30, // 30 minutes for AI predictions
  });
}

// MEV analysis API hook
export function useMEVAnalysis(enabled: boolean = true) {
  return useQuery({
    queryKey: ["mev-analysis"],
    queryFn: async () => {
      try {
        return await fetchData<any>("/api/mev", "Failed to fetch MEV analysis");
      } catch (error) {
        console.error("MEV analysis fetch error:", error);
        return {
          risk_score: 0,
          insights: [],
          last_week_activity: [],
          monthly_trends: [],
          recent_activities: [],
        };
      }
    },
    enabled,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

// Address info API hook
export function useAddressInfo(address: string | null) {
  return useQuery({
    queryKey: ["address", address],
    queryFn: async () => {
      if (!address) throw new Error("No address provided");
      try {
        return await fetchData<any>(
          `/api/address-info?address=${address}`,
          "Failed to fetch address information"
        );
      } catch (error) {
        console.error("Address info fetch error:", error);
        return null;
      }
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Gas statistics API hook
export function useGasStats(enabled: boolean = true) {
  return useQuery({
    queryKey: ["gas-stats"],
    queryFn: async () => {
      try {
        // We'll call the blockchain utilities directly to get gas stats
        const { getGasStats } = await import("@/lib/blockchain");
        return await getGasStats();
      } catch (error) {
        console.error("Gas stats fetch error:", error);
        return {
          gasPrice: "0",
          maxFeePerGas: null,
          maxPriorityFeePerGas: null,
        };
      }
    },
    enabled,
    staleTime: 1000 * 30, // 30 seconds - gas prices change frequently
    refetchInterval: 1000 * 60, // Refresh every minute
  });
}

// PYUSD token info hook
export function usePYUSDInfo(enabled: boolean = true) {
  return useQuery({
    queryKey: ["pyusd-info"],
    queryFn: async () => {
      try {
        const { getPYUSDInfo } = await import("@/lib/blockchain");
        return await getPYUSDInfo();
      } catch (error) {
        console.error("PYUSD info fetch error:", error);
        return {
          name: "PayPal USD",
          symbol: "PYUSD",
          totalSupply: "0",
          decimals: 6,
        };
      }
    },
    enabled,
    staleTime: 1000 * 60 * 15, // 15 minutes - this rarely changes
  });
}
