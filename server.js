/* Galactus AI - Server Launcher */
import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Galactus AI backend running on http://localhost:${PORT}`);
});