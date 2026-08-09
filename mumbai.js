  /*login page database*/
  import pkg from 'pg';
const { Pool } = pkg;

const mumbai_db = new Pool({
  user: 'postgres',      // 🔁 Replace with your DB username
  host: 'localhost',
  database: 'mumbai_db',  // 🔁 Replace with your DB name
  password: 'Harsh@2004',  // 🔁 Replace with your DB password
  port: 5432,                 // Default PostgreSQL port
});

export default mumbai_db;
