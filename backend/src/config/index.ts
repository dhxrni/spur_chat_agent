import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_PATH: z.string().default('./data/spur_chat.db'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  MAX_MESSAGE_LENGTH: z.coerce.number().int().positive().default(2000),
  MAX_HISTORY_MESSAGES: z.coerce.number().int().positive().default(20),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(400),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('[config] Invalid environment variables:');
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = result.data;

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  databasePath: env.DATABASE_PATH,

  llm: {
    geminiApiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    maxTokens: env.LLM_MAX_TOKENS,
    timeoutMs: env.LLM_TIMEOUT_MS,
  },

  guardrails: {
    maxMessageLength: env.MAX_MESSAGE_LENGTH,
    maxHistoryMessages: env.MAX_HISTORY_MESSAGES,
  },

  cors: {
    origins: env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  },
} as const;
