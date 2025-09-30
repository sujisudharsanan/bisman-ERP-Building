// users.js - basic user queries
const pool = require('./db');

async function getUsers() {
  const res = await pool.query('SELECT * FROM users');
  return res.rows;
}

async function addUser(username, email, password, role) {
  const res = await pool.query(
    'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [username, email, password, role]
  );
  return res.rows[0];
}

module.exports = { getUsers, addUser };
