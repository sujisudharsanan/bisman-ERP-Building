import express from 'express';
import { json } from 'body-parser';
import { router as apiRouter } from './routes/api'; // Assuming you have an API router set up

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(json());

// Routes
app.use('/api', apiRouter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});