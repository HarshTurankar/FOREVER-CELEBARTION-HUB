import pkg from "pg";
const { Pool } = pkg;

const catring_db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default catring_db;