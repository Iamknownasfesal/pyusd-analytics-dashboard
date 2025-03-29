import { BigQuery } from "@google-cloud/bigquery";
import { PYUSD_CONTRACT_ADDRESS } from "@/lib/blockchain";

// Singleton BigQuery client
let bigQueryClient: BigQuery | null = null;

// Common query parameters
const PYUSD_ADDRESS = PYUSD_CONTRACT_ADDRESS.toLowerCase();

export const initBigQueryClient = () => {
  if (bigQueryClient) return bigQueryClient;

  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const options: any = {};

    if (projectId) options.projectId = projectId;

    if (
      process.env.NODE_ENV === "development" &&
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    ) {
      options.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      bigQueryClient = new BigQuery(options);
    } else {
      bigQueryClient = new BigQuery({
        credentials: {
          type: "service_account",
          project_id: process.env.GOOGLE_CLOUD_PROJECT,
          private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
          private_key: process.env.GOOGLE_PRIVATE_KEY,
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_CLIENT_ID,
        },
      });
    }

    return bigQueryClient;
  } catch (error) {
    console.error("Error initializing BigQuery client:", error);
    throw error;
  }
};

// Common queries
export const queries = {
  // Token transfers table reference
  tokenTransfers:
    "`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.token_transfers`",

  // Get transfers for an address
  getAddressTransfers: (address: string) => `
    SELECT * 
    FROM ${queries.tokenTransfers}
    WHERE 
      address = '${PYUSD_ADDRESS}'
      AND (from_address = '${address.toLowerCase()}' OR to_address = '${address.toLowerCase()}')
  `,

  // Common query executor with error handling
  executeQuery: async (query: string) => {
    try {
      const client = initBigQueryClient();
      const [results] = await client.query({ query });
      return results;
    } catch (error) {
      console.error("BigQuery execution error:", error);
      throw error;
    }
  },
};
