// fetch_places.js
import axios from 'axios';
import fs from 'fs';

const API_KEY = 'AIzaSyBW1tpHmjzRcJYjhIuouPb7Oq9JlObM9Fc'; // <-- अपनी API Key डालें
const city = 'Mumbai';
const query = `wedding halls in ${city}`;
const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;

async function fetchPlaces() {
  try {
    const response = await axios.get(url);
    const data = response.data;

    // Save to JSON file
    fs.writeFileSync(`${city}_halls.json`, JSON.stringify(data.results, null, 2));
    console.log(`✅ Data saved to ${city}_halls.json`);
  } catch (err) {
    console.error('❌ Error fetching places:', err.message);
  }
}

fetchPlaces();
