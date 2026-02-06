import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Performance-optimized Prisma client configuration
const prismaClientOptions = {
  datasourceUrl: process.env.DATABASE_URL,
};

export const prisma =
  globalForPrisma.prisma || new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Query optimization helpers
export async function optimizeQuery<T>(
  query: () => Promise<T>,
  queryName?: string
): Promise<T> {
  const start = performance.now();
  try {
    const result = await query();
    const duration = performance.now() - start;
    if (duration > 200 && queryName) {
      console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
    }
    return result;
  } catch (error) {
    console.error(`Query failed: ${queryName}`, error);
    throw error;
  }
}

// Batch query helper to prevent N+1 queries
export async function batchQueries<T, K, V>(
  items: T[],
  keyFn: (item: T) => K,
  fetchFn: (keys: K[]) => Promise<Map<K, V>>
): Promise<Map<T, V>> {
  const cache = new Map<T, V>();
  if (items.length === 0) return cache;

  const keys = items.map(keyFn);
  const fetchedData = await fetchFn(keys);

  for (const item of items) {
    const key = keyFn(item);
    cache.set(item, fetchedData.get(key) as V);
  }

  return cache;
}

export default prisma;
