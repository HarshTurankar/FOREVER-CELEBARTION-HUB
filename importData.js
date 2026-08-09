import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import harsh from './mumbai.js';

dotenv.config();

async function importData() {
  try {
    const data = JSON.parse(readFileSync('Mumbai_halls.json', 'utf-8'));
    for (const hall of data) {
      const { name, formatted_address, rating, user_ratings_total, place_id } = hall;
      await pools.query(
        `INSERT INTO halls (name, formatted_address, rating, user_ratings_total, place_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (place_id) DO NOTHING`,
        [name, formatted_address, rating, user_ratings_total, place_id]
      );
    }
    console.log('Data imported successfully!');
  } catch (err) {
    console.error('Error importing data:', err);
  } finally {
    await pools.end();
  }
}

importData();

