const express = require('express')
const app = express()

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/', (req, res) => {
  res.send('My Backend (Express)')
})

module.exports = app
