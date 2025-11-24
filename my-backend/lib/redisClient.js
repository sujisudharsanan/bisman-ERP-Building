const Redis = require('ioredis')

// Determine mode based on REDIS_URL
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const forceInMemory = ['inmemory', 'memory', 'mock', 'disabled', 'none'].includes(
  String(redisUrl || '').trim().toLowerCase()
)

// Minimal in-memory client implementing methods used by tokenStore
function createInMemoryClient() {
  const store = new Map()
  return {
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
}

let useInMemory = false
let client

if (forceInMemory) {
  console.log('✓ Using in-memory token store (forced by REDIS_URL)')
  client = createInMemoryClient()
} else if (process.env.NODE_ENV === 'test' || process.env.SKIP_REDIS === '1') {
  console.log('✓ Using in-memory token store (test mode SKIP_REDIS)')
  client = createInMemoryClient()
  useInMemory = true
} else {
  try {
    const real = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // fail fast
      lazyConnect: true,
      enableOfflineQueue: false,
    })

    real.on('error', (err) => {
      if (!useInMemory) {
        console.warn('Redis connection failed, switching to in-memory:', err && err.message)
        useInMemory = true
      }
    })

    // Try connecting; on failure, switch to memory
    real.connect().catch(() => {
      console.warn('Redis not available, using in-memory token store (non-persistent)')
      useInMemory = true
    })

    const mem = createInMemoryClient()
    // Safe wrapper: choose real vs memory at call time; on any error flip to memory
    client = {
      async get(...args) {
        if (useInMemory) return mem.get(...args)
        try { return await real.get(...args) } catch (e) { useInMemory = true; return mem.get(...args) }
      },
      async set(...args) {
        if (useInMemory) return mem.set(...args)
        try { return await real.set(...args) } catch (e) { useInMemory = true; return mem.set(...args) }
      },
      async del(...args) {
        if (useInMemory) return mem.del(...args)
        try { return await real.del(...args) } catch (e) { useInMemory = true; return mem.del(...args) }
      },
      async mget(...args) {
        if (useInMemory) return mem.mget(...args)
        try { return await real.mget(...args) } catch (e) { useInMemory = true; return mem.mget(...args) }
      },
      scanStream(...args) {
        if (useInMemory) return mem.scanStream(...args)
        try { return real.scanStream(...args) } catch (e) { useInMemory = true; return mem.scanStream(...args) }
      }
    }
    client.disconnect = () => { try { real.disconnect(); } catch {} }
  } catch (e) {
    console.warn('Failed to create Redis client, using in-memory store:', e && e.message)
    client = createInMemoryClient()
  }
}

module.exports = client
// Auto-disconnect in test to avoid open handle
if (process.env.NODE_ENV === 'test' && client.disconnect) {
  try { client.disconnect(); } catch {}
}
