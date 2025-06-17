const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'wordpress_db',
  user: process.env.DB_USER || 'bot_kurukin_user',
  password: process.env.DB_PASSWORD || 'cdfedf0ae18a2b08cdd180823fad884d',
  database: process.env.DB_NAME || 'bot_kurukin_wp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
