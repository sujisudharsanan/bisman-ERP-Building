// server.js - Express backend
const express = require('express');
require('dotenv').config();
const { getUsers, addUser } = require('./users');

const app = express();
app.use(express.json());

app.get('/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    console.error('[GET /users] error', err && err.message);
    res.status(500).json({ error: 'internal' });
  }
});

app.post('/users', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });
    const newUser = await addUser(username || null, email, password, role || 'USER');
    res.json(newUser);
  } catch (err) {
    console.error('[POST /users] error', err && err.message);
    if (err.code === '23505') return res.status(409).json({ error: 'email_exists' });
    res.status(500).json({ error: 'internal' });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Server running on port ${port}`));
