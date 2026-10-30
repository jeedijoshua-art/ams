import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  let datasourceUrl: string | undefined = undefined;
  const rawUrl = process.env.DATABASE_URL;

  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      let modified = false;

      // Neon PgBouncer transaction-mode optimization:
      // When connecting to Neon pooler (-pooler.), pgbouncer=true prevents prepared statement
      // deallocation crashes ("Error in PostgreSQL connection: Error { kind: Closed, cause: None }")
      if (parsed.host.includes('-pooler.') && !parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true');
        modified = true;
      }

      // Resilient connect timeout (15s) for mobile networks and cold Neon compute wake-ups (prevents P1001)
      if (!parsed.searchParams.has('connect_timeout')) {
        parsed.searchParams.set('connect_timeout', '15');
        modified = true;
      }

      if (modified) {
        datasourceUrl = parsed.toString();
      }
    } catch {
      // Non-standard URI format fallback
    }
  }

  return new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
