// Simple test server for database monitoring
const express = require('express')
const cors = require('cors')
const app = express()

// CORS middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}))

app.use(express.json())

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Backend server is running' })
})

// Mock monitoring data endpoint
app.get('/api/db-monitoring', (req, res) => {
  res.json({
    status: 'ok',
    monitoring: {
      total: 42,
      last5Minutes: 8,
      slowQueries: 2,
      errors: 0,
      averageDuration: 85,
      slowQueryThreshold: 1000,
      recentSlowQueries: [
        {
          query: 'SELECT * FROM users WHERE role = $1',
          duration: 1250,
          timestamp: new Date().toISOString()
        },
        {
          query: 'SELECT COUNT(*) FROM orders WHERE created_at > $1',
          duration: 1100,
          timestamp: new Date(Date.now() - 60000).toISOString()
        }
      ]
    },
    health: {
      score: 80,
      status: 'warning'
    }
  })
})

const port = process.env.PORT || 3001
app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`)
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully')
  process.exit(0)
})
