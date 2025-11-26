/**
 * Graceful Shutdown Handler
 * Ensures clean shutdown of server, database, and external connections
 */

import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

interface ShutdownConfig {
  server: Server;
  prisma: PrismaClient;
  redis?: Redis;
  timeout?: number; // Milliseconds to wait before force shutdown
}

let isShuttingDown = false;

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(config: ShutdownConfig): void {
  const { server, prisma, redis, timeout = 30000 } = config;

  // Handle SIGTERM (Railway, Kubernetes)
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    handleShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    handleShutdown('unhandledRejection');
  });

  async function handleShutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
      console.log('⚠️  Shutdown already in progress...');
      return;
    }

    isShuttingDown = true;
    console.log(`\n🛑 ${signal} received, initiating graceful shutdown...`);

    // Set force shutdown timeout
    const forceShutdownTimeout = setTimeout(() => {
      console.error('⚠️  Graceful shutdown timeout, forcing exit...');
      process.exit(1);
    }, timeout);

    try {
      // Step 1: Stop accepting new connections
      console.log('1️⃣  Stopping HTTP server from accepting new connections...');
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            console.error('❌ Error closing HTTP server:', err);
            reject(err);
          } else {
            console.log('✅ HTTP server closed');
            resolve();
          }
        });
      });

      // Step 2: Close database connections
      console.log('2️⃣  Closing database connections...');
      await prisma.$disconnect();
      console.log('✅ Database connections closed');

      // Step 3: Close Redis connections
      if (redis) {
        console.log('3️⃣  Closing Redis connections...');
        await redis.quit();
        console.log('✅ Redis connections closed');
      }

      // Step 4: Additional cleanup
      console.log('4️⃣  Running additional cleanup...');
      await performAdditionalCleanup();
      console.log('✅ Additional cleanup completed');

      // Clear force shutdown timeout
      clearTimeout(forceShutdownTimeout);

      console.log('✅ Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      clearTimeout(forceShutdownTimeout);
      process.exit(1);
    }
  }

  /**
   * Perform any additional cleanup needed
   */
  async function performAdditionalCleanup(): Promise<void> {
    // Close any open file handles
    // Cancel any pending timers
    // Flush logs
    // etc.
    
    // Example: Wait for ongoing operations to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('✅ Graceful shutdown handlers registered');
}

/**
 * Health check middleware that returns 503 during shutdown
 */
export function shutdownHealthCheck(req: any, res: any, next: any): void {
  if (isShuttingDown) {
    return res.status(503).json({
      status: 'shutting_down',
      message: 'Server is shutting down, please retry in a moment',
    });
  }
  next();
}

/**
 * Check if server is shutting down
 */
export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}
