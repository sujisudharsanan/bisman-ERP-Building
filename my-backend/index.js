const express = require('express')
const app = express()
const port = process.env.PORT || 3000

app.get('/api/health', (req, res) => {
  res.json({status: 'ok'})
})

app.get('/', (req, res) => {
  res.send('My Backend (Express)')
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
