// Load .env when running locally
try {
  require('dotenv').config()
} catch (e) {
  // ignore if dotenv isn't installed in other environments
}

const app = require('./app')
const port = process.env.PORT || 3001

// Bind to 0.0.0.0 so Render/containers can detect the open port
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`)
})
