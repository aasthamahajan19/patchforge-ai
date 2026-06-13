const express = require('express');
const mysql = require('mysql');
const app = express();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'user_db'
});

// VULNERABLE: Direct SQL string concatenation allows SQL Injection
app.get('/api/users', (req, res) => {
  const userId = req.query.id;
  const query = "SELECT username, email, role FROM users WHERE id = '" + userId + "'";
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
