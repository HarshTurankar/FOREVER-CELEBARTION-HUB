import pkg from 'pg';
const { Pool } = pkg;

const mumbai_db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default mumbai_db;