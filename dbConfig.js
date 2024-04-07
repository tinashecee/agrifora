require("dotenv").config();
const mysql = require("mysql");

const pool = mysql.createPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST, // Replace with your database host (e.g., 'localhost')
  port: process.env.DB_PORT || 3306, // Default port for MySQL
  connectionLimit: 10, // Optional: Limits the number of connections in the pool
});

module.exports = { pool };
