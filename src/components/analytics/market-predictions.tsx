"use client";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { memo, useMemo } from "react";
import { useMarketPredictions } from "@/hooks/use-api-queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Waves,
  Anchor,
  AlertCircle,
} from "lucide-react";
import { Fish } from "lucide-react";
import { LoadingFallback } from "@/components/ui/loading-fallback";
import { Badge } from "@/components/ui/badge";

interface MarketPrediction {
  type: "ACCUMULATION" | "DISTRIBUTION" | "WHALE_MOVEMENT" | "NORMAL";
  probability: number;
  reasoning: string;
  suggestedAction: string;
  timeframe: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  potentialImpact: "HIGH" | "MEDIUM" | "LOW";
}

// Function to get confidence color
function getConfidenceColor(confidence: "HIGH" | "MEDIUM" | "LOW"): string {
  switch (confidence) {
    case "HIGH":
      return "text-green-500";
    case "MEDIUM":
      return "text-yellow-500";
    case "LOW":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}

// Memoized component for prediction icon
const PredictionIcon = memo(function PredictionIcon({
  type,
}: {
  type: MarketPrediction["type"];
}) {
  switch (type) {
    case "ACCUMULATION":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "DISTRIBUTION":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case "WHALE_MOVEMENT":
      return <Fish className="h-4 w-4 text-blue-500" />;
    case "NORMAL":
      return <Waves className="h-4 w-4 text-gray-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  }
});

// Memoized PredictionCard component
const PredictionCard = memo(function PredictionCard({
  prediction,
}: {
  prediction: MarketPrediction;
}) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PredictionIcon type={prediction.type} />
            <CardTitle className="text-lg">
              {prediction.type.replace("_", " ")} Pattern
            </CardTitle>
          </div>
          <Badge
            variant={
              prediction.potentialImpact === "HIGH" ? "destructive" : "default"
            }
          >
            {prediction.potentialImpact} Impact
          </Badge>
        </div>
        <CardDescription className="text-sm">
          Confidence:{" "}
          <span className={getConfidenceColor(prediction.confidence)}>
            {prediction.confidence}
          </span>{" "}
          • Probability: {prediction.probability}% • Timeframe:{" "}
          {prediction.timeframe}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm">{prediction.reasoning}</p>
          <div className="flex items-center space-x-2 mt-2 pt-2 border-t text-sm">
            <Anchor className="h-4 w-4" />
            <span className="font-medium">Suggested Action:</span>
            <span>{prediction.suggestedAction}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Main component
export function MarketPredictions() {
  const { data, isLoading, error } = useMarketPredictions();

  // Memoize summary data to avoid unnecessary recalculations
  const marketSummary = useMemo(() => {
    if (!data?.marketData) return null;

    const {
      transactionCount,
      volume,
      whaleVolume,
      accumulationWallets,
      distributionWallets,
    } = data.marketData;

    return {
      transactionCount,
      volume:
        volume?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "0",
      whalePercentage:
        (((whaleVolume || 0) / (volume || 1)) * 100).toFixed(1) + "%",
      walletActivity:
        accumulationWallets > distributionWallets
          ? "Accumulation"
          : distributionWallets > accumulationWallets
          ? "Distribution"
          : "Neutral",
      walletRatio:
        accumulationWallets && distributionWallets
          ? (accumulationWallets / distributionWallets).toFixed(2)
          : "1.00",
    };
  }, [data?.marketData]);

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (error) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Error Loading Predictions</CardTitle>
          <CardDescription>
            There was an error fetching market predictions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <DashboardCard title="Transaction Volume (24h)">
          <div className="text-2xl font-bold">
            ${marketSummary?.volume || "0"}
          </div>
          <p className="text-xs text-muted-foreground">
            {marketSummary?.transactionCount || 0} transactions
          </p>
        </DashboardCard>

        <DashboardCard title="Whale Activity">
          <div className="text-2xl font-bold">
            {marketSummary?.whalePercentage}
          </div>
          <p className="text-xs text-muted-foreground">Of total volume</p>
        </DashboardCard>

        <DashboardCard title="Market Sentiment">
          <div className="text-2xl font-bold">
            {marketSummary?.walletActivity}
          </div>
          <p className="text-xs text-muted-foreground">Dominant pattern</p>
        </DashboardCard>

        <DashboardCard title="Accumulation/Distribution Ratio">
          <div className="text-2xl font-bold">{marketSummary?.walletRatio}</div>
          <p className="text-xs text-muted-foreground">
            Higher values = more accumulation
          </p>
        </DashboardCard>
      </div>

      {/* Predictions */}
      <div className="grid gap-4 grid-cols-1">
        {data?.predictions?.map(
          (prediction: MarketPrediction, index: number) => (
            <PredictionCard key={index} prediction={prediction} />
          )
        )}

        {(!data?.predictions || data.predictions.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center">
              <p>No market predictions available at this time.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-right">
        Last updated:{" "}
        {data?.timestamp
          ? new Date(data.timestamp).toLocaleString()
          : "Unknown"}
      </div>
    </div>
  );
}
