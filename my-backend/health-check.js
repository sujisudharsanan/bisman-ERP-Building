// Basic health check script for container HEALTHCHECK
// Reports process uptime and optional database connectivity status.
const { getPrisma } = require('./lib/prisma')

async function main() {
  const start = Date.now()
  let db = 'skipped'
  let ok = true
  try {
    const prisma = getPrisma && getPrisma()
    if (prisma && prisma.$queryRaw) {
      // Lightweight query; avoid heavy scans
      await prisma.$queryRaw`SELECT 1`;
      db = 'ok'
      await prisma.$disconnect().catch(() => {})
    } else {
      db = 'unavailable'
    }
  } catch (e) {
    ok = false
    db = 'error:' + e.code || e.message
  }
  const payload = {
    ok,
    uptime_seconds: Math.floor(process.uptime()),
    db,
    ts: new Date().toISOString(),
    response_ms: Date.now() - start
  }
  const status = ok ? 0 : 1
  process.stdout.write(JSON.stringify(payload) + '\n')
  process.exit(status)
}

main()
