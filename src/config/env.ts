import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().default('speedscale_garage_jwt_secret_2026'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('./uploads'),
  BASE_URL: z.string().default('http://localhost:4000'),
  FB_PIXEL_ID: z.string().optional(),
  FB_ACCESS_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
  console.error(`❌ [ENVIRONMENT CONFIG ERROR] Invalid or missing environment variables: ${missing}`);
  console.error(`👉 If deploying on Vercel, ensure you have added DATABASE_URL in Vercel Project Settings ➔ Environment Variables.`);
  throw new Error(`Environment validation failed: ${missing}`);
}

export const env = parsed.data;
