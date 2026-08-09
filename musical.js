// musical.js
import pkg from 'pg';
const { Pool } = pkg;

const musical_db = new Pool({
  user: 'postgres',        // अपना PostgreSQL username
  host: 'localhost',
  database: 'musical_db',  // <-- ध्यान दो! यही database नाम होना चाहिए जिसमें "musical" टेबल बना है
  password: 'Harsh@2004',
  port: 5432,
});

musical_db.connect()
  .then(() => console.log("✅ Connected to musical_db"))
  .catch(err => console.error("❌ DB Connection Error:", err));

export default musical_db;
