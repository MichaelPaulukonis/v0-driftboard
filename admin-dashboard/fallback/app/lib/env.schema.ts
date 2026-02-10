import { z } from "zod";

export const envSchema = z.object({
  // Current MVP variables
  METABASE_ADMIN_PASSWORD: z
    .string()
    .min(16, "METABASE_ADMIN_PASSWORD must be at least 16 characters"),
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_SERVICE_ACCOUNT: z.string(),

  // Future cloud deployment variables
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  AUTH_TYPE: z.enum(["token", "firebase-auth"]).default("token"),
  SESSION_SECRET: z.string().optional(),

  // Day 2 features
  ENABLE_AUTO_REFRESH: z.coerce.boolean().default(false),
  AUTO_REFRESH_INTERVAL: z.coerce.number().min(60).default(300),
  ENABLE_TIME_FILTERS: z.coerce.boolean().default(true),

  // Vercel deployment
  VERCEL_URL: z.string().optional(),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),

  // Token-based admin access for fallback
  ADMIN_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  // Parse process.env with defaults and validation
  return envSchema.parse(process.env);
}
