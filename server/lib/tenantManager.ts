/**
 * ============================================================================
 * TENANT MANAGER - Dynamic Prisma Client Factory
 * ============================================================================
 * 
 * Purpose:
 * - Dynamically create and cache Prisma clients for each tenant
 * - Manage connection pooling to avoid exhausting database connections
 * - Provide singleton access to enterprise database
 * 
 * Features:
 * - LRU cache for tenant Prisma clients (max 50 tenants in memory)
 * - Automatic eviction and cleanup of unused connections
 * - Thread-safe singleton pattern
 * - Health check capabilities
 * - Graceful shutdown support
 * 
 * Usage:
 * ```typescript
 * // Get enterprise DB
 * const enterprise = await getEnterprisePrisma();
 * const clients = await enterprise.client.findMany();
 * 
 * // Get tenant-specific DB
 * const tenantPrisma = await getTenantPrisma(dbConnectionUri);
 * const users = await tenantPrisma.user.findMany();
 * ```
 * ============================================================================
 */

import { PrismaClient as PrismaClientEnterprise } from '.prisma/client-enterprise';
import { PrismaClient as PrismaClientClient } from '.prisma/client-client';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';
import logger from './logger';

// ============================================================================
// TYPES
// ============================================================================

interface CachedClient {
  prisma: PrismaClientClient;
  createdAt: number;
  lastAccessed: number;
  connectionUri: string; // For debugging
}

interface TenantManagerConfig {
  maxCachedClients: number;
  clientTTL: number; // milliseconds
  connectionTimeout: number;
  enableLogging: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: TenantManagerConfig = {
  maxCachedClients: 50, // Maximum tenant clients to keep in memory
  clientTTL: 30 * 60 * 1000, // 30 minutes
  connectionTimeout: 10000, // 10 seconds
  enableLogging: process.env.NODE_ENV === 'development',
};

// ============================================================================
// ENTERPRISE DATABASE (SINGLETON)
// ============================================================================

let enterpriseInstance: PrismaClientEnterprise | null = null;

/**
 * Get singleton instance of Enterprise Prisma Client
 * This connects to the central enterprise_db
 */
export async function getEnterprisePrisma(): Promise<PrismaClientEnterprise> {
  if (!enterpriseInstance) {
    const connectionUrl = process.env.ENTERPRISE_DATABASE_URL;
    
    if (!connectionUrl) {
      throw new Error('ENTERPRISE_DATABASE_URL environment variable is not set');
    }

    enterpriseInstance = new PrismaClientEnterprise({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
      log: DEFAULT_CONFIG.enableLogging 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });

    // Test connection
    try {
      await enterpriseInstance.$connect();
      logger.info('✅ Enterprise database connected successfully');
    } catch (error) {
      logger.error('❌ Failed to connect to enterprise database:', error);
      enterpriseInstance = null;
      throw error;
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await enterpriseInstance?.$disconnect();
      logger.info('Enterprise database disconnected');
    });

    process.on('SIGTERM', async () => {
      await enterpriseInstance?.$disconnect();
      logger.info('Enterprise database disconnected');
    });
  }

  return enterpriseInstance;
}

// ============================================================================
// TENANT DATABASE (CACHED INSTANCES)
// ============================================================================

/**
 * LRU Cache for tenant Prisma clients
 * Automatically evicts least recently used clients when limit is reached
 */
const tenantCache = new LRUCache<string, CachedClient>({
  max: DEFAULT_CONFIG.maxCachedClients,
  ttl: DEFAULT_CONFIG.clientTTL,
  
  // Cleanup on eviction
  dispose: async (value: CachedClient, key: string) => {
    try {
      await value.prisma.$disconnect();
      logger.info(`🗑️  Tenant client evicted from cache: ${key.substring(0, 8)}...`);
    } catch (error) {
      logger.error(`Failed to disconnect tenant client: ${key}`, error);
    }
  },
  
  // Update last accessed time
  updateAgeOnGet: true,
});

/**
 * Generate cache key from connection URI
 * Uses SHA256 to create unique, deterministic key
 */
function generateCacheKey(connectionUri: string): string {
  return crypto
    .createHash('sha256')
    .update(connectionUri)
    .digest('hex');
}

/**
 * Decrypt database connection URI
 * TODO: Implement proper encryption/decryption using AWS KMS, Vault, etc.
 */
function decryptConnectionUri(encryptedUri: string): string {
  // TODO: Replace with actual decryption logic
  // For now, assume URI is not encrypted
  
  if (process.env.DB_ENCRYPTION_ENABLED === 'true') {
    // Example: AES-256-GCM decryption
    // const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    // return decipher.update(encryptedUri, 'hex', 'utf8') + decipher.final('utf8');
    
    logger.warn('⚠️  DB encryption is enabled but decryption not implemented');
  }
  
  return encryptedUri;
}

/**
 * Validate database connection URI format
 */
function validateConnectionUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.protocol === 'postgresql:' || url.protocol === 'postgres:';
  } catch {
    return false;
  }
}

/**
 * Get or create Prisma client for a specific tenant
 * 
 * @param connectionUri - Encrypted or plain database connection URI
 * @param options - Optional configuration overrides
 * @returns Prisma client connected to tenant database
 */
export async function getTenantPrisma(
  connectionUri: string,
  options?: Partial<TenantManagerConfig>
): Promise<PrismaClientClient> {
  
  // Decrypt if needed
  const decryptedUri = decryptConnectionUri(connectionUri);
  
  // Validate URI
  if (!validateConnectionUri(decryptedUri)) {
    throw new Error('Invalid database connection URI format');
  }
  
  // Generate cache key
  const cacheKey = generateCacheKey(decryptedUri);
  
  // Check cache
  const cached = tenantCache.get(cacheKey);
  if (cached) {
    cached.lastAccessed = Date.now();
    logger.debug(`♻️  Tenant client retrieved from cache: ${cacheKey.substring(0, 8)}...`);
    return cached.prisma;
  }
  
  // Create new Prisma client
  logger.info(`🆕 Creating new tenant Prisma client: ${cacheKey.substring(0, 8)}...`);
  
  const config = { ...DEFAULT_CONFIG, ...options };
  
  const prisma = new PrismaClientClient({
    datasources: {
      db: {
        url: decryptedUri,
      },
    },
    log: config.enableLogging 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });
  
  // Test connection
  try {
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), config.connectionTimeout)
      ),
    ]);
    
    logger.info(`✅ Tenant database connected: ${cacheKey.substring(0, 8)}...`);
  } catch (error) {
    logger.error(`❌ Failed to connect to tenant database: ${cacheKey.substring(0, 8)}...`, error);
    await prisma.$disconnect();
    throw new Error(`Failed to connect to tenant database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Cache the client
  const cachedClient: CachedClient = {
    prisma,
    createdAt: Date.now(),
    lastAccessed: Date.now(),
    connectionUri: decryptedUri, // Store for debugging
  };
  
  tenantCache.set(cacheKey, cachedClient);
  
  return prisma;
}

/**
 * Get tenant Prisma client by tenant ID
 * Fetches connection URI from enterprise database
 * 
 * @param tenantId - Client/Tenant UUID
 * @returns Prisma client connected to tenant database
 */
export async function getTenantPrismaById(tenantId: string): Promise<PrismaClientClient> {
  const enterprise = await getEnterprisePrisma();
  
  // Fetch client record
  const client = await enterprise.client.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      status: true,
      dbConnectionUri: true,
    },
  });
  
  if (!client) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }
  
  if (client.status !== 'ACTIVE') {
    throw new Error(`Tenant is not active: ${client.name} (${client.status})`);
  }
  
  logger.info(`📡 Connecting to tenant: ${client.name} (${tenantId})`);
  
  return getTenantPrisma(client.dbConnectionUri);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check health of enterprise database connection
 */
export async function checkEnterpriseHealth(): Promise<boolean> {
  try {
    const enterprise = await getEnterprisePrisma();
    await enterprise.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Enterprise database health check failed:', error);
    return false;
  }
}

/**
 * Check health of tenant database connection
 */
export async function checkTenantHealth(tenantId: string): Promise<boolean> {
  try {
    const prisma = await getTenantPrismaById(tenantId);
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error(`Tenant database health check failed: ${tenantId}`, error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: tenantCache.size,
    maxSize: DEFAULT_CONFIG.maxCachedClients,
    hitRate: tenantCache.size > 0 ? 'N/A (use redis for production stats)' : 0,
  };
}

/**
 * Clear specific tenant from cache
 */
export async function evictTenantFromCache(tenantId: string): Promise<void> {
  const enterprise = await getEnterprisePrisma();
  const client = await enterprise.client.findUnique({
    where: { id: tenantId },
    select: { dbConnectionUri: true },
  });
  
  if (client) {
    const cacheKey = generateCacheKey(client.dbConnectionUri);
    const cached = tenantCache.get(cacheKey);
    
    if (cached) {
      await cached.prisma.$disconnect();
      tenantCache.delete(cacheKey);
      logger.info(`🗑️  Tenant evicted from cache: ${tenantId}`);
    }
  }
}

/**
 * Clear all cached tenant connections
 */
export async function clearAllTenantCache(): Promise<void> {
  logger.info('🗑️  Clearing all tenant cache...');
  
  const keys = [...tenantCache.keys()];
  for (const key of keys) {
    const cached = tenantCache.get(key);
    if (cached) {
      await cached.prisma.$disconnect();
    }
  }
  
  tenantCache.clear();
  logger.info(`✅ Cleared ${keys.length} cached tenant connections`);
}

/**
 * Graceful shutdown - disconnect all databases
 */
export async function shutdown(): Promise<void> {
  logger.info('🛑 Shutting down tenant manager...');
  
  // Disconnect all tenant clients
  await clearAllTenantCache();
  
  // Disconnect enterprise client
  if (enterpriseInstance) {
    await enterpriseInstance.$disconnect();
    enterpriseInstance = null;
    logger.info('Enterprise database disconnected');
  }
  
  logger.info('✅ Tenant manager shutdown complete');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getEnterprisePrisma,
  getTenantPrisma,
  getTenantPrismaById,
  checkEnterpriseHealth,
  checkTenantHealth,
  getCacheStats,
  evictTenantFromCache,
  clearAllTenantCache,
  shutdown,
};
