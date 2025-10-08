const Redis = require('ioredis')

// Create Redis client using REDIS_URL or default localhost
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

let redis
let useInMemory = false

try {
  // Configure Redis to fail fast and use in-memory fallback if connection fails
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Don't retry - fail immediately
    lazyConnect: true, // Don't connect on creation
    enableOfflineQueue: false,
  })

  redis.on('error', (err) => {
    if (!useInMemory) {
      console.warn('Redis connection failed, using in-memory fallback:', err.message)
      useInMemory = true
    }
  })

  // Try to connect - if it fails, we'll use in-memory
  redis.connect().catch((err) => {
    console.warn('Redis not available, using in-memory token store (non-persistent)')
    useInMemory = true
  })
} catch (e) {
  console.warn('Failed to create Redis client, using in-memory store:', e && e.message)
  useInMemory = true
  redis = null
}

// Minimal in-memory fallback implementing the subset of methods used by tokenStore
if (!redis || useInMemory) {
  console.log('✓ Using in-memory token store (development mode - tokens not persisted across restarts)')
  const store = new Map()
  const inMemoryClient = {
    async get(k) {
      const v = store.get(k)
      if (!v) return null
      if (v.expiresAt && Date.now() > v.expiresAt) {
        store.delete(k)
        return null
      }
      return v.value
    },
    async set(k, value, opt, ttl) {
      let expiresAt = null
      if (opt === 'EX' && ttl) expiresAt = Date.now() + ttl * 1000
      store.set(k, { value, expiresAt })
      return 'OK'
    },
    async del(k) {
      return store.delete(k) ? 1 : 0
    },
    async mget(...keys) {
      return keys.map(k => store.get(k)?.value ?? null)
    },
    scanStream() {
      // return async iterable of key batches
      const allKeys = Array.from(store.keys())
      let i = 0
      return {
        async *[Symbol.asyncIterator]() {
          const chunkSize = 100
          while (i < allKeys.length) {
            yield allKeys.slice(i, i + chunkSize)
            i += chunkSize
          }
        }
      }
    }
  }
  
  // Wrap Redis client methods to check useInMemory flag
  if (redis && !useInMemory) {
    const originalGet = redis.get.bind(redis)
    const originalSet = redis.set.bind(redis)
    const originalDel = redis.del.bind(redis)
    const originalMget = redis.mget.bind(redis)
    const originalScanStream = redis.scanStream.bind(redis)
    
    redis.get = async function(...args) {
      if (useInMemory) return inMemoryClient.get(...args)
      try { return await originalGet(...args) } catch (e) { useInMemory = true; return inMemoryClient.get(...args) }
    }
    redis.set = async function(...args) {
      if (useInMemory) return inMemoryClient.set(...args)
      try { return await originalSet(...args) } catch (e) { useInMemory = true; return inMemoryClient.set(...args) }
    }
    redis.del = async function(...args) {
      if (useInMemory) return inMemoryClient.del(...args)
      try { return await originalDel(...args) } catch (e) { useInMemory = true; return inMemoryClient.del(...args) }
    }
    redis.mget = async function(...args) {
      if (useInMemory) return inMemoryClient.mget(...args)
      try { return await originalMget(...args) } catch (e) { useInMemory = true; return inMemoryClient.mget(...args) }
    }
    redis.scanStream = function(...args) {
      if (useInMemory) return inMemoryClient.scanStream(...args)
      try { return originalScanStream(...args) } catch (e) { useInMemory = true; return inMemoryClient.scanStream(...args) }
    }
  } else {
    redis = inMemoryClient
  }
}

module.exports = redis
