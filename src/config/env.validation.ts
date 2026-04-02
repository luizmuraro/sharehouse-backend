import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT: z.coerce.number().int().min(4).max(15).default(10),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

export const validateEnv = (config: Record<string, unknown>) => {
  const parsed = envSchema.parse(config);
  return parsed;
};
