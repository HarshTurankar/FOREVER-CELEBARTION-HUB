// musical.js
import pkg from "pg";
const { Pool } = pkg;

const musical_db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

musical_db
  .connect()
  .then(() => console.log("✅ Connected to musical_db"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

export default musical_db;