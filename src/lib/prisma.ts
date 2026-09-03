import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Optimizes the PostgreSQL database URL for serverless environments (Vercel / AWS Lambda):
 * 1. Switches Supabase pooler from Port 5432 (Session mode, max 15 clients) to Port 6543 (Transaction mode)
 * 2. Adds pgbouncer=true to prevent prepared statement collisions in transaction pooling
 * 3. Adds connection_limit=1 so each serverless lambda instance holds only 1 connection
 */
function getOptimizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Auto-switch Supabase pooler from Session mode (5432) to Transaction mode (6543)
  if (url.includes('pooler.supabase.com:5432')) {
    url = url.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
  }

  // Ensure pgbouncer parameter is set for Transaction mode
  if (url.includes(':6543') && !url.includes('pgbouncer=true')) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}pgbouncer=true`;
  }

  // Enforce 1 connection per serverless container to prevent pool starvation
  if (!url.includes('connection_limit=')) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}connection_limit=1`;
  }

  return url;
}

const dbUrl = getOptimizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });

// Always store on globalThis so warm serverless invocations reuse the same Prisma client
globalForPrisma.prisma = prisma;
