// Alternate entry to run the backend on port 3002 for local testing
try { require('dotenv').config() } catch (e) {}
const app = require('./app')
const port = 3002
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
