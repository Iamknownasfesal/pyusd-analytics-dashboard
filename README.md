# PYUSD Analytics Dashboard

A comprehensive real-time analytics dashboard for monitoring PayPal USD (PYUSD) stablecoin transactions on the Ethereum blockchain. This project is built as part of the Stackup, PayPal and Google Cloud Bounty Challenge.

## Features

- Real-time PYUSD transaction monitoring
- Detailed transaction history and analysis
- Network congestion metrics related to PYUSD
- Gas usage comparison with other stablecoins
- Top holders analysis and distribution visualization via Google BigQuery
- Interactive charts and graphs for data visualization
- AI-powered wallet analysis and insights
- Smart transaction pattern detection
- Automated behavioral analytics

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Styling**: Tailwind CSS and shadcn/ui
- **Charts**: Recharts
- **Blockchain Interface**: Ethers.js with GCP Blockchain RPC
- **Data Analytics**: Google BigQuery for blockchain data analysis
- **Package Manager**: Bun
- **Data Fetching**: Server Components with Suspense
- **State Management**: React Context API
- **AI Integration**: Google Gemini 2.0 Flash

## Environment Variables

To enable full functionality of this dashboard, you need to set up the following environment variables:

1. Create a `.env.local` file in the root of the project with:

```
NEXT_PUBLIC_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
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
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY=your_private_key
GOOGLE_CLIENT_EMAIL=your_client_email
GOOGLE_CLIENT_ID=your_client_id
```

1. Create a service account in GCP Console
2. Grant the service account BigQuery permissions (at least BigQuery Data Viewer)
3. Create and download a service account key as JSON
4. Add the path to your service account JSON file in your `.env.local`:

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account-key.json
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
│   ├── app/                   # Next.js App Router pages
│   ├── components/            # UI components
│   │   ├── analytics/         # Analytics visualization components
│   │   ├── dashboard/         # Dashboard layout components
│   │   └── ui/                # shadcn/ui components
│   └── lib/                   # Utility functions and blockchain interactions
├── public/                    # Static assets
└── README.md                  # Project documentation
```

## GCP Blockchain RPC & BigQuery Integration

This dashboard leverages Google Cloud Platform's services:

1. **BigQuery for Analytics**:

   - Top PYUSD token holders data
   - Historical transaction analysis
   - Network distribution metrics
   - Token transfer patterns

2. **Blockchain RPC for Real-time Data**:
   - Current blockchain state
   - Network status monitoring
   - Gas price tracking

## AI Features & Capabilities

The dashboard incorporates advanced AI capabilities powered by Google's Gemini 2.0 Flash model:

### Wallet Analysis

- **Smart Pattern Detection**: Automatically identifies transaction patterns and user behaviors
- **Historical Context**: Analyzes historical transaction data to provide meaningful insights

### AI-Powered Insights

- **Transaction Behavior Analysis**: Provides detailed insights about transaction patterns and user behavior
- **Automated Reporting**: Generates natural language summaries of wallet activities
- **Anomaly Detection**: Identifies unusual transaction patterns or behaviors

### Technical Implementation

- Utilizes Google's Gemini 2.0 Flash model for AI capabilities
- Real-time analysis and natural language processing of blockchain data
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
- Next.js Team
- shadcn/ui
