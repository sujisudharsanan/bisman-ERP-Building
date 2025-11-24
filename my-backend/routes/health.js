const express = require('express')
const router = express.Router()
const { getPrisma } = require('../lib/prisma')

router.get('/', async (req, res) => {
  const start = Date.now()
  let db = 'skipped'
  try {
    const prisma = getPrisma && getPrisma()
    if (prisma && prisma.$queryRaw) {
      await prisma.$queryRaw`SELECT 1`
      db = 'ok'
    } else {
      db = 'unavailable'
    }
  } catch (e) {
    db = 'error'
    return res.status(500).json({ ok: false, db, error: e.message, ms: Date.now() - start })
  }
  res.json({ ok: true, db, ms: Date.now() - start })
})

module.exports = router
