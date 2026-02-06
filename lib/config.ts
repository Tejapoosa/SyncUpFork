/**
 * Environment Configuration Validation
 * Ensures all required environment variables are set on startup
 */

interface EnvConfig {
  database: {
    url: string;
  };
  clerk: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  pinecone: {
    apiKey: string;
    indexName: string;
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3Bucket: string;
  };
  resend: {
    apiKey: string;
  };
  slack?: {
    clientId?: string;
    clientSecret?: string;
  };
  app: {
    url: string;
    environment: 'development' | 'production' | 'staging';
    nodeEnv: string;
  };
}

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

function validateEnv(): EnvConfig {
  try {
    return {
      database: {
        url: getEnvVar('DATABASE_URL', true),
      },
      clerk: {
        publishableKey: getEnvVar('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', true),
        secretKey: getEnvVar('CLERK_SECRET_KEY', true),
        webhookSecret: getEnvVar('CLERK_WEBHOOK_SECRET', true),
      },
      google: {
        clientId: getEnvVar('GOOGLE_CLIENT_ID', true),
        clientSecret: getEnvVar('GOOGLE_CLIENT_SECRET', true),
        redirectUri: getEnvVar('GOOGLE_REDIRECT_URI', true),
      },
      pinecone: {
        apiKey: getEnvVar('PINECONE_API_KEY', true),
        indexName: getEnvVar('PINECONE_INDEX_NAME', true),
      },
      aws: {
        region: getEnvVar('AWS_REGION', true),
        accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID', true),
        secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY', true),
        s3Bucket: getEnvVar('S3_BUCKET_NAME', true),
      },
      resend: {
        apiKey: getEnvVar('RESEND_API_KEY', true),
      },
      slack: {
        clientId: getEnvVar('SLACK_CLIENT_ID', false),
        clientSecret: getEnvVar('SLACK_CLIENT_SECRET', false),
      },
      app: {
        url: getEnvVar('NEXT_PUBLIC_APP_URL', false) || 'http://localhost:3000',
        environment: (process.env.ENVIRONMENT || 'production') as 'development' | 'production' | 'staging',
        nodeEnv: process.env.NODE_ENV || 'development',
      },
    };
  } catch (error) {
    console.error('Configuration validation error:', error);
    throw error;
  }
}

let cachedConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv();
  }
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}

// Validate on import in production
if (process.env.NODE_ENV === 'production') {
  getConfig();
}

export const config = getConfig();
