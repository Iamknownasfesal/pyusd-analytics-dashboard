# PYUSD Analytics Dashboard

A comprehensive real-time analytics dashboard for monitoring PayPal USD (PYUSD) stablecoin transactions on the Ethereum blockchain. This project is built as part of the Stackup, PayPal and Google Cloud Bounty Challenge.

## Features

- **Real-time PYUSD Transaction Monitoring**: Live updates of PYUSD transfers with automatic updates of new transactions
- **Enhanced Analytics Dashboard**: Detailed transaction metrics, volume analysis, and token supply changes
- **Top Holders Analysis**: Distribution visualization via Google BigQuery with percentage breakdowns
- **Market Predictions**: AI-powered market movement predictions and suggested actions
- **Wallet Insights**: Detailed wallet analysis with transaction patterns and behaviors
- **MEV Analysis**: Monitor MEV activities like sandwich attacks and frontrunning
- **Gas Statistics**: Real-time gas price monitoring and historical trends
- **Interactive UI**: Rich visualization with responsive design and dark mode support
- **Address Lookup**: Search for any Ethereum address to view PYUSD holdings and transaction history

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **State Management**: React Query for data fetching, caching, and synchronization
- **Styling**: Tailwind CSS with shadcn/ui components
- **Charts**: Recharts for data visualization
- **Blockchain Interface**: Ethers.js v6 with GCP Blockchain RPC
- **Data Analytics**: Google BigQuery for blockchain data analysis
- **Package Manager**: Bun
- **Performance Optimization**: Lazy loading, code splitting, and memoization
- **AI Integration**: Google Gemini 1.5 Pro for intelligent insights

## Environment Variables

To enable full functionality of this dashboard, you need to set up the following environment variables:

1. Create a `.env.local` file in the root of the project with:

```
NEXT_PUBLIC_RPC_URL=https://blockchain.googleapis.com/v1/projects/your-project-id/locations/your-region/endpoints/ethereum-mainnet/rpc?key=your-api-key
NEXT_PUBLIC_WS_RPC_URL=wss://blockchain.googleapis.com/v1/projects/your-project-id/locations/your-region/endpoints/ethereum-mainnet/rpc?key=your-api-key
GEMINI_API_KEY=your-gemini-api-key
```

## Google Cloud Setup

This dashboard uses Google Cloud services for blockchain data analysis:

### Setting up Google Cloud Authentication

1. Create a Google Cloud Platform (GCP) account if you don't have one
2. Create a new project in the GCP Console
3. Enable the BigQuery API for your project
4. Set up authentication using one of these methods:

#### Option 1: Application Default Credentials (for development or when deployed on GCP)

```bash
# Install Google Cloud CLI
gcloud auth application-default login
```

#### Option 2: Service Account Key (for production or non-GCP deployments)

1. Create a service account in GCP Console
2. Grant the service account BigQuery permissions (at least BigQuery Data Viewer)
3. Create and download a service account key as JSON
4. Add the path to your service account JSON file in your `.env.local`:

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account-key.json
```

#### Option 3: Environment Variables (for production)

For production deployments, you can set the Google Cloud credentials directly as environment variables:

```
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY=your_private_key
GOOGLE_CLIENT_EMAIL=your_client_email
GOOGLE_CLIENT_ID=your_client_id
```

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- Bun (latest version)
- Google Cloud account with BigQuery access

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/pyusd-analytics-dashboard.git
cd pyusd-analytics-dashboard
```

2. Install dependencies using Bun

```bash
bun install
```

3. Set up Google Cloud authentication as described above

4. Start the development server

```bash
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
pyusd-analytics-dashboard/
├── src/
│   ├── app/                   # Next.js App Router pages and API routes
│   │   ├── api/               # API endpoints for data fetching
│   │   ├── page.tsx           # Main dashboard page
│   │   └── metadata.ts        # SEO metadata
│   ├── components/            # UI components
│   │   ├── address/           # Address lookup and information components
│   │   ├── analytics/         # Analytics visualization components
│   │   ├── dashboard/         # Dashboard layout components
│   │   ├── transactions/      # Transaction related components
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                 # Custom React hooks
│   │   └── use-api-queries.ts # React Query hooks for data fetching
│   └── lib/                   # Utility functions and blockchain interactions
│       ├── ai.ts              # AI helper functions and Gemini integration
│       ├── blockchain.ts      # Ethereum blockchain interaction utilities
│       ├── react-query.ts     # React Query client configuration
│       └── utils.ts           # General utility functions
├── public/                    # Static assets
└── README.md                  # Project documentation
```

## GCP Blockchain RPC & BigQuery Integration

This dashboard leverages Google Cloud Platform's services:

1. **BigQuery for Analytics**:

   - Top PYUSD token holders data with custom SQL queries
   - Historical transaction analysis with optimized data retrieval
   - Token distribution metrics using aggregated queries
   - Market pattern detection with custom SQL aggregations
   - MEV analysis with specialized queries

2. **Blockchain RPC for Real-time Data**:
   - Real-time transaction monitoring with batched block queries (respecting the 5-block range limit)
   - Gas price tracking with efficient polling
   - On-chain contract data retrieval with caching
   - Optimized WebSocket connections for live updates

## Key Optimization Features

1. **Enhanced React Query Integration**:

   - Comprehensive caching strategies with appropriate stale times
   - Error handling with fallback data
   - Dedicated hooks for each API endpoint

2. **Improved Error Handling**:

   - Graceful degradation with fallback UI
   - Detailed error logging
   - Retry mechanisms with exponential backoff
   - Block range limitation handling (5-block maximum for eth_getLogs)

3. **Performance Optimizations**:
   - Lazy loading for dashboard tabs
   - Memoization to prevent unnecessary re-renders
   - Component virtualization for large datasets
   - Client-side caching of blockchain data

## AI Features & Capabilities

The dashboard incorporates advanced AI capabilities powered by Google's Gemini 1.5 Pro model:

### Wallet Analysis

- **Smart Pattern Detection**: Automatically identifies transaction patterns and user behaviors
- **Historical Context**: Analyzes historical transaction data to provide meaningful insights

### Market Predictions

- **Pattern Recognition**: Identifies market patterns like accumulation or distribution
- **Action Recommendations**: Suggests actions based on detected patterns
- **Confidence Scoring**: Provides confidence levels for each prediction

### Technical Implementation

- Uses Google's Gemini 1.5 Pro model with optimized temperature settings
- Robust JSON extraction and validation
- Fallback to rule-based insights for reliability

### Environment Setup

To enable AI features, add your Gemini API key to your `.env.local`:

```
GEMINI_API_KEY=your_api_key_here
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- PayPal USD (PYUSD)
- Google Cloud Platform
- Stackup
