import { Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionVolume } from "@/components/analytics/transaction-volume";
import { TopHolders } from "@/components/analytics/top-holders";
import { TokenSupply } from "@/components/analytics/token-supply";
import { MarketPredictions } from "@/components/analytics/market-predictions";
import { MEVAnalysis } from "@/components/analytics/mev-analysis";
import dynamic from "next/dynamic";
import { PYUSDOverview } from "@/components/dashboard/pyusd-overview";
import { GasStatistics } from "@/components/dashboard/gas-statistics";
import { LoadingFallback } from "@/components/ui/loading-fallback";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "PYUSD Analytics Dashboard",
  description:
    "Real-time monitoring and analytics for PayPal USD (PYUSD) transactions",
};

// Dynamically import the client component with no SSR
const RealTimeTransactionsTable = dynamic(
  () =>
    import("@/components/transactions/real-time-transactions").then(
      (mod) => mod.RealTimeTransactionsTable
    ),
  { ssr: true }
);

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time monitoring and analytics for PayPal USD (PYUSD) transactions
        </p>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full md:flex md:bg-inherit grid grid-cols-3 gap-2 bg-transparent p-0">
            <TabsTrigger value="overview" className="px-3 py-2 text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="live" className="px-3 py-2 text-sm">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="supply" className="px-3 py-2 text-sm">
              Supply
            </TabsTrigger>
            <TabsTrigger value="holders" className="px-3 py-2 text-sm">
              Holders
            </TabsTrigger>
            <TabsTrigger value="volume" className="px-3 py-2 text-sm">
              Volume
            </TabsTrigger>
            <TabsTrigger value="predictions" className="px-3 py-2 text-sm">
              Predictions
            </TabsTrigger>
            <TabsTrigger value="mev" className="px-3 py-2 text-sm">
              MEV
            </TabsTrigger>
            <TabsTrigger value="network" className="px-3 py-2 text-sm">
              Network
            </TabsTrigger>
          </TabsList>

          <div className="my-10 md:my-3"></div>

          <TabsContent value="overview" className="space-y-6">
            <Suspense fallback={<LoadingFallback />}>
              <PYUSDOverview />
            </Suspense>
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            <div className="flex flex-col space-y-1 mb-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Live PYUSD Transactions
              </h2>
              <p className="text-muted-foreground">
                Watch PYUSD transactions as they happen in real-time on the
                Ethereum blockchain.
              </p>
            </div>
            <RealTimeTransactionsTable />
          </TabsContent>

          <TabsContent value="supply" className="space-y-6">
            <Suspense fallback={<LoadingFallback />}>
              <div className="flex flex-col space-y-1 mb-4">
                <h2 className="text-2xl font-bold tracking-tight">
                  PYUSD Supply
                </h2>
                <p className="text-muted-foreground">
                  Total supply and supply changes of PYUSD stablecoin since
                  launch
                </p>
              </div>
              <TokenSupply />
            </Suspense>
          </TabsContent>

          <TabsContent value="holders" className="space-y-6">
            <Suspense fallback={<LoadingFallback />}>
              <div className="flex flex-col space-y-1 mb-4">
                <h2 className="text-2xl font-bold tracking-tight">
                  PYUSD Holders
                </h2>
                <p className="text-muted-foreground">
                  Analysis of PayPal USD (PYUSD) token distribution and top
                  holders.
                </p>
              </div>
              <TopHolders />
            </Suspense>
          </TabsContent>

          <TabsContent value="volume" className="space-y-6">
            <Suspense fallback={<LoadingFallback />}>
              <div className="flex flex-col space-y-1 mb-4">
                <h2 className="text-2xl font-bold tracking-tight">
                  Transaction Volume
                </h2>
                <p className="text-muted-foreground">
                  Historical transaction volume for PYUSD token.
                </p>
              </div>
              <TransactionVolume />
            </Suspense>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <Suspense fallback={<LoadingFallback />}>
              <div className="flex flex-col space-y-1 mb-4">
                <h2 className="text-2xl font-bold tracking-tight">
                  Market Predictions
                </h2>
                <p className="text-muted-foreground">
                  AI-powered analysis and predictions of PYUSD market movements.
                </p>
              </div>
              <MarketPredictions />
            </Suspense>
          </TabsContent>

          <TabsContent value="mev" className="space-y-6">
            <Suspense fallback={<LoadingFallback />}>
              <div className="flex flex-col space-y-1 mb-4">
                <h2 className="text-2xl font-bold tracking-tight">
                  MEV Analysis
                </h2>
                <p className="text-muted-foreground">
                  Monitor MEV activities like sandwich attacks and frontrunning
                  affecting PYUSD.
                </p>
              </div>
              <MEVAnalysis />
            </Suspense>
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
            <Suspense fallback={<LoadingFallback />}>
              <GasStatistics />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
