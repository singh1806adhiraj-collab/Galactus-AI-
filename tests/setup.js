/* Vitest global setup — runs before every test file so env vars are set before
   any module import captures them (DB_PATH, JWT_SECRET, ENCRYPTION_KEY are read
   at import time by db/database.js / ProviderService.js / routes). */
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // valid 32-byte hex for AES-256
process.env.NODE_ENV = 'test';