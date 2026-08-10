import pkg from "pg";
const { Pool } = pkg;

const harsh_db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default harsh_db;