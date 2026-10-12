import 'dotenv/config';

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? '',
  testDatabaseUrl: process.env.TEST_DATABASE_URL ?? '',
  demoCustomerId: process.env.DEMO_CUSTOMER_ID ?? 'cust_demo_001',
  llmProvider: (process.env.LLM_PROVIDER ?? 'mock') as 'mock' | 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
};

export const isPgConfigured = () => env.databaseUrl.length > 0;
