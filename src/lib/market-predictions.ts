import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Get the Gemini model
const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
};

interface MarketData {
  timestamp: string;
  transactionCount: number;
  volume: number;
  uniqueSenders: number;
  uniqueReceivers: number;
  maxTransfer: number;
  whaleTransactions: number;
  whaleVolume: number;
  accumulationWallets: number;
  distributionWallets: number;
}

interface MarketPrediction {
  type: "ACCUMULATION" | "DISTRIBUTION" | "WHALE_MOVEMENT" | "NORMAL";
  probability: number;
  reasoning: string;
  suggestedAction: string;
  timeframe: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  potentialImpact: "HIGH" | "MEDIUM" | "LOW";
}

export async function generateMarketPredictions(
  marketData: MarketData[]
): Promise<MarketPrediction[]> {
  try {
    const model = getGeminiModel();

    // Get the most recent data point
    const currentData = marketData[0];

    // Calculate some basic metrics for analysis
    const hourlyAverages = calculateHourlyAverages(marketData);
    const trends = analyzeTrends(marketData);

    // Prepare the prompt for the AI
    const prompt = `
      Analyze this PYUSD market data and generate specific predictions about potential market movements.
      Focus on identifying patterns that might indicate future significant movements.
      
      Current Market State:
      - Transaction Volume: $${currentData.volume.toLocaleString()}
      - Unique Active Wallets: ${
        currentData.uniqueSenders + currentData.uniqueReceivers
      }
      - Whale Transactions: ${currentData.whaleTransactions}
      - Whale Volume: $${currentData.whaleVolume.toLocaleString()}
      - Accumulation Wallets: ${currentData.accumulationWallets}
      - Distribution Wallets: ${currentData.distributionWallets}
      
      Recent Trends:
      - Volume Trend: ${trends.volumeTrend}
      - Whale Activity Trend: ${trends.whaleActivityTrend}
      - Network Activity: ${trends.networkActivityTrend}
      
      Hourly Averages:
      - Avg Transaction Count: ${hourlyAverages.avgTxCount}
      - Avg Volume: $${hourlyAverages.avgVolume.toLocaleString()}
      - Avg Whale Transactions: ${hourlyAverages.avgWhaleTx}
      
      Based on this data, provide 3 specific predictions in the following JSON format:
      [
        {
          "type": "ACCUMULATION|DISTRIBUTION|WHALE_MOVEMENT|NORMAL",
          "probability": <number between 0-1>,
          "reasoning": "<clear explanation>",
          "suggestedAction": "<what users should consider>",
          "timeframe": "<expected timeframe>",
          "confidence": "HIGH|MEDIUM|LOW",
          "potentialImpact": "HIGH|MEDIUM|LOW"
        }
      ]
      
      Focus on actionable insights and clear patterns. Be specific about timeframes and reasoning.
    `;

    // Generate predictions with Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    try {
      const predictions = JSON.parse(text);
      return validateAndCleanPredictions(predictions);
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return generateFallbackPredictions(currentData, trends);
    }
  } catch (error) {
    console.error("Error generating market predictions:", error);
    return generateFallbackPredictions(
      marketData[0],
      analyzeTrends(marketData)
    );
  }
}

function calculateHourlyAverages(marketData: MarketData[]) {
  const sum = marketData.reduce(
    (acc, data) => ({
      txCount: acc.txCount + data.transactionCount,
      volume: acc.volume + data.volume,
      whaleTx: acc.whaleTx + data.whaleTransactions,
    }),
    { txCount: 0, volume: 0, whaleTx: 0 }
  );

  const count = marketData.length;
  return {
    avgTxCount: Math.round(sum.txCount / count),
    avgVolume: Math.round(sum.volume / count),
    avgWhaleTx: Math.round(sum.whaleTx / count),
  };
}

function analyzeTrends(marketData: MarketData[]) {
  // Need at least 2 data points for trend analysis
  if (marketData.length < 2) {
    return {
      volumeTrend: "Insufficient data",
      whaleActivityTrend: "Insufficient data",
      networkActivityTrend: "Insufficient data",
    };
  }

  const current = marketData[0];
  const previous = marketData[1];

  return {
    volumeTrend: getTrendDescription(current.volume, previous.volume),
    whaleActivityTrend: getTrendDescription(
      current.whaleTransactions,
      previous.whaleTransactions
    ),
    networkActivityTrend: getTrendDescription(
      current.uniqueSenders + current.uniqueReceivers,
      previous.uniqueSenders + previous.uniqueReceivers
    ),
  };
}

function getTrendDescription(current: number, previous: number): string {
  const percentChange = ((current - previous) / previous) * 100;

  if (percentChange > 20) return "Sharp increase";
  if (percentChange > 5) return "Moderate increase";
  if (percentChange < -20) return "Sharp decrease";
  if (percentChange < -5) return "Moderate decrease";
  return "Stable";
}

function validateAndCleanPredictions(predictions: any[]): MarketPrediction[] {
  return predictions
    .filter((p) => {
      // Basic validation
      return (
        p.type &&
        typeof p.probability === "number" &&
        p.probability >= 0 &&
        p.probability <= 1 &&
        p.reasoning &&
        p.suggestedAction &&
        p.timeframe &&
        ["HIGH", "MEDIUM", "LOW"].includes(p.confidence) &&
        ["HIGH", "MEDIUM", "LOW"].includes(p.potentialImpact)
      );
    })
    .map((p) => ({
      type: p.type,
      probability: Math.round(p.probability * 100) / 100, // Round to 2 decimal places
      reasoning: p.reasoning,
      suggestedAction: p.suggestedAction,
      timeframe: p.timeframe,
      confidence: p.confidence,
      potentialImpact: p.potentialImpact,
    }));
}

function generateFallbackPredictions(
  currentData: MarketData,
  trends: {
    volumeTrend: string;
    whaleActivityTrend: string;
    networkActivityTrend: string;
  }
): MarketPrediction[] {
  const predictions: MarketPrediction[] = [];

  // Whale movement prediction
  if (currentData.whaleTransactions > 0) {
    predictions.push({
      type: "WHALE_MOVEMENT",
      probability: 0.7,
      reasoning: `Detected ${
        currentData.whaleTransactions
      } recent whale transactions with volume $${currentData.whaleVolume.toLocaleString()}`,
      suggestedAction: "Monitor large wallet movements closely",
      timeframe: "Next 24 hours",
      confidence: "MEDIUM",
      potentialImpact: "HIGH",
    });
  }

  // Accumulation/Distribution prediction
  if (currentData.accumulationWallets > currentData.distributionWallets) {
    predictions.push({
      type: "ACCUMULATION",
      probability: 0.65,
      reasoning: `${currentData.accumulationWallets} wallets showing accumulation patterns`,
      suggestedAction: "Watch for potential upward pressure",
      timeframe: "2-3 days",
      confidence: "MEDIUM",
      potentialImpact: "MEDIUM",
    });
  } else if (
    currentData.distributionWallets > currentData.accumulationWallets
  ) {
    predictions.push({
      type: "DISTRIBUTION",
      probability: 0.65,
      reasoning: `${currentData.distributionWallets} wallets showing distribution patterns`,
      suggestedAction: "Monitor for potential selling pressure",
      timeframe: "2-3 days",
      confidence: "MEDIUM",
      potentialImpact: "MEDIUM",
    });
  }

  // Add a normal market prediction if we have less than 2 predictions
  if (predictions.length < 2) {
    predictions.push({
      type: "NORMAL",
      probability: 0.8,
      reasoning: "Market metrics within normal ranges",
      suggestedAction: "Maintain regular monitoring",
      timeframe: "24 hours",
      confidence: "HIGH",
      potentialImpact: "LOW",
    });
  }

  return predictions;
}
