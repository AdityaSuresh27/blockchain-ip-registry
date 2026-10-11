const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize PostgreSQL pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ip_registry',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Test DB Connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else {
    console.log('Connected to PostgreSQL Database');
    release();
  }
});

// Basic route
app.get('/', (req, res) => {
  res.send('IP Registry Backend API');
});

// Example route to store off-chain metadata references (not stored on blockchain to save gas)
app.post('/metadata', async (req, res) => {
  const { fileHash, originalName, fileSize, mimeType } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO metadata (file_hash, original_name, file_size, mime_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [fileHash, originalName, fileSize, mimeType]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
