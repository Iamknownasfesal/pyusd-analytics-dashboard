"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Fish,
} from "lucide-react";
import { ReactNode } from "react";

interface MarketPrediction {
  type: "ACCUMULATION" | "DISTRIBUTION" | "WHALE_MOVEMENT" | "NORMAL";
  probability: number;
  reasoning: string;
  suggestedAction: string;
  timeframe: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  potentialImpact: "HIGH" | "MEDIUM" | "LOW";
}

interface PredictionResponse {
  timestamp: string;
  predictions: MarketPrediction[];
  marketData: {
    transactionCount: number;
    volume: number;
    whaleTransactions: number;
    whaleVolume: number;
    accumulationWallets: number;
    distributionWallets: number;
  };
}

async function fetchPredictions(): Promise<PredictionResponse> {
  const response = await fetch("/api/predictions");
  if (!response.ok) {
    throw new Error("Failed to fetch predictions");
  }
  return response.json();
}

function getImpactColor(impact: "HIGH" | "MEDIUM" | "LOW") {
  switch (impact) {
    case "HIGH":
      return "text-red-500 dark:text-red-400";
    case "MEDIUM":
      return "text-yellow-500 dark:text-yellow-400";
    case "LOW":
      return "text-green-500 dark:text-green-400";
  }
}

function getConfidenceColor(confidence: "HIGH" | "MEDIUM" | "LOW") {
  switch (confidence) {
    case "HIGH":
      return "text-green-500 dark:text-green-400";
    case "MEDIUM":
      return "text-yellow-500 dark:text-yellow-400";
    case "LOW":
      return "text-red-500 dark:text-red-400";
  }
}

function PredictionIcon({ type }: { type: MarketPrediction["type"] }) {
  switch (type) {
    case "ACCUMULATION":
      return <ArrowUpRight className="w-5 h-5 text-green-500" />;
    case "DISTRIBUTION":
      return <ArrowDownRight className="w-5 h-5 text-red-500" />;
    case "WHALE_MOVEMENT":
      return <Fish className="w-5 h-5 text-blue-500" />;
    case "NORMAL":
      return <BarChart3 className="w-5 h-5 text-gray-500" />;
  }
}

interface DashboardCardProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

export function MarketPredictions() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["market-predictions"],
    queryFn: fetchPredictions,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Market Predictions</h2>
          <div className="text-sm text-muted-foreground">
            AI-Powered Analysis
          </div>
        </div>

        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <DashboardCard key={i} title="Loading...">
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </DashboardCard>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-yellow-500" />
          <h3 className="mt-2 text-lg font-medium">
            Error Loading Predictions
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Market Predictions</h2>
        <div className="text-sm text-muted-foreground">
          Updated {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      </div>

      <div className="grid gap-4">
        {data.predictions.map((prediction, index) => (
          <DashboardCard
            key={index}
            title={
              <div className="flex items-center gap-2">
                <PredictionIcon type={prediction.type} />
                <span>
                  {prediction.type.charAt(0) +
                    prediction.type.slice(1).toLowerCase().replace("_", " ")}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  ({Math.round(prediction.probability * 100)}% probability)
                </span>
              </div>
            }
          >
            <div className="space-y-4">
              <p className="text-sm">{prediction.reasoning}</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Suggested Action:
                  </span>
                  <span className="font-medium">
                    {prediction.suggestedAction}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Expected Timeframe:
                  </span>
                  <span className="font-medium">{prediction.timeframe}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Confidence:</span>
                  <span
                    className={`font-medium ${getConfidenceColor(
                      prediction.confidence
                    )}`}
                  >
                    {prediction.confidence}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Potential Impact:
                  </span>
                  <span
                    className={`font-medium ${getImpactColor(
                      prediction.potentialImpact
                    )}`}
                  >
                    {prediction.potentialImpact}
                  </span>
                </div>
              </div>
            </div>
          </DashboardCard>
        ))}
      </div>

      <DashboardCard title="Current Market Metrics">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">24h Volume</div>
            <div className="text-lg font-semibold">
              ${data.marketData.volume.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              Whale Transactions
            </div>
            <div className="text-lg font-semibold">
              {data.marketData.whaleTransactions}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Whale Volume</div>
            <div className="text-lg font-semibold">
              ${data.marketData.whaleVolume.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              Total Transactions
            </div>
            <div className="text-lg font-semibold">
              {data.marketData.transactionCount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              Accumulating Wallets
            </div>
            <div className="text-lg font-semibold">
              {data.marketData.accumulationWallets}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              Distributing Wallets
            </div>
            <div className="text-lg font-semibold">
              {data.marketData.distributionWallets}
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
