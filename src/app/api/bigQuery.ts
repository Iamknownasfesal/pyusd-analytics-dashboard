import { BigQuery } from "@google-cloud/bigquery";

export const initBigQueryClient = () => {
  try {
    // Check for environment variables
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId) {
      console.warn("GOOGLE_CLOUD_PROJECT environment variable not set");
    }

    // Configure BigQuery client with options
    const options: any = {};
    if (projectId) options.projectId = projectId;
    if (keyFilename) options.keyFilename = keyFilename;

    if (process.env.NODE_ENV === "development") {
      return new BigQuery(options);
    } else {
      return new BigQuery({
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
  } catch (error) {
    console.error("Error initializing BigQuery client:", error);
    throw error;
  }
};
