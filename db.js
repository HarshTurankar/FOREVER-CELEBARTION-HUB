  /*login page database*/
  import pkg from 'pg';
const { Pool } = pkg;

const harsh_db= new Pool({
  user: 'postgres',      // 🔁 Replace with your DB username
  host: 'localhost',
  database: 'harsh_db',  // 🔁 Replace with your DB name
  password: 'Harsh@2004',  // 🔁 Replace with your DB password
  port: 5432,                 // Default PostgreSQL port
});

export default harsh_db;
