import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Get the Gemini model
const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
};

/**
 * Generate wallet insights using Gemini AI based on PYUSD transaction data
 *
 * @param walletAddress Ethereum wallet address
 * @param balance Current PYUSD balance
 * @param stats Transaction statistics
 * @returns Array of AI-generated insights
 */
export async function generateWalletInsights(
  walletAddress: string,
  balance: number,
  stats: {
    total_transactions: number;
    first_transaction_date: string | null;
    send_transactions: number;
    receive_transactions: number;
    total_sent: number;
    total_received: number;
    max_sent: number;
    max_received: number;
    avg_sent: number;
    avg_received: number;
  }
) {
  try {
    // If there's no transaction data, return a simple insight
    if (stats.total_transactions === 0) {
      return ["This wallet has no PYUSD transaction history."];
    }

    const model = getGeminiModel();

    // Format the wallet data as a prompt for Gemini
    const prompt = `
      Analyze this Ethereum wallet's PYUSD stablecoin transaction data and provide 3-5 concise insights (each under 150 characters):
      
      Wallet: ${walletAddress}
      Current PYUSD Balance: $${balance.toFixed(2)}
      Total Transactions: ${stats.total_transactions}
      First Transaction: ${stats.first_transaction_date || "Unknown"}
      
      Send Transactions: ${stats.send_transactions}
      Receive Transactions: ${stats.receive_transactions}
      Total Sent: $${stats.total_sent.toFixed(2)}
      Total Received: $${stats.total_received.toFixed(2)}
      Max Sent: $${stats.max_sent.toFixed(2)}
      Max Received: $${stats.max_received.toFixed(2)}
      Average Sent: $${stats.avg_sent.toFixed(2)}
      Average Received: $${stats.avg_received.toFixed(2)}
      
      Focus on transaction patterns, wallet behavior, and potential use cases. Each insight should begin with a dash (-) and be on a new line.
    `;

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response to extract insights
    // Each insight starts with a dash and is on a new line
    let insights = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-"))
      .map((line) => line.substring(1).trim()); // Remove the dash prefix

    // If no insights were properly formatted, try to extract sentences
    if (insights.length === 0) {
      insights = text
        .split(".")
        .map((s) => s.trim())
        .filter((s) => s.length > 10 && s.length < 150);
    }

    // If still no insights, use a fallback
    if (insights.length === 0) {
      insights = ["This wallet shows typical PYUSD transaction patterns."];
    }

    return insights;
  } catch (error) {
    console.error("Error generating AI insights:", error);

    // Use rule-based insights as fallback
    const fallbackInsights = [];

    if (balance > 0) {
      if (stats.send_transactions === 0 && stats.receive_transactions > 0) {
        fallbackInsights.push(
          "This appears to be a holding wallet that has only received PYUSD without sending any out."
        );
      } else if (
        stats.send_transactions > 0 &&
        stats.receive_transactions > 0
      ) {
        const ratio = stats.total_sent / stats.total_received;
        if (ratio < 0.2) {
          fallbackInsights.push(
            "This wallet primarily accumulates PYUSD, sending out only a small portion of what it receives."
          );
        } else if (ratio > 0.8 && ratio < 1.2) {
          fallbackInsights.push(
            "This wallet shows balanced transaction patterns, with similar amounts of PYUSD being received and sent."
          );
        } else if (ratio > 3) {
          fallbackInsights.push(
            "This wallet appears to be distributing PYUSD, sending out significantly more than it receives."
          );
        }
      }
    }

    if (stats.total_transactions > 0 && stats.first_transaction_date) {
      try {
        const daysSinceFirstTx = Math.ceil(
          (new Date().getTime() -
            new Date(stats.first_transaction_date).getTime()) /
            (1000 * 3600 * 24)
        );

        if (daysSinceFirstTx > 0) {
          const txPerDay = stats.total_transactions / daysSinceFirstTx;
          if (txPerDay > 5) {
            fallbackInsights.push(
              "This is a highly active wallet with frequent PYUSD transactions."
            );
          } else if (txPerDay < 0.1) {
            fallbackInsights.push(
              "This wallet shows infrequent PYUSD activity, with long periods between transactions."
            );
          }
        }
      } catch (error) {
        console.error("Error calculating activity level insights:", error);
      }
    }

    if (fallbackInsights.length === 0) {
      fallbackInsights.push(
        "This wallet shows typical PYUSD transaction patterns."
      );
    }

    return fallbackInsights;
  }
}
