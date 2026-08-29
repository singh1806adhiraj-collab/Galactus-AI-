/* Galactus AI - Backend Server */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import providerRoutes from './routes/providers.js';
import chatRoutes from './routes/chat.js';
import usageRoutes from './routes/usage.js';

console.log('=== SERVER.JS STARTING ===');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser()); // Regular cookie parser (not signed)

// Debug cookie parsing middleware
app.use((req, res, next) => {
  console.log('=== REQUEST DEBUG ===', req.method, req.path);
  console.log('  Headers cookie:', req.headers.cookie?.substring(0, 100));
  console.log('  req.cookies:', req.cookies ? Object.keys(req.cookies) : 'none');
  next();
});

// TEST ROUTE - REGISTER FIRST
app.get('/api/test/cookies', (req, res) => {
  console.log('=== TEST COOKIES ENDPOINT HIT ===');
  console.log('req.cookies:', req.cookies);
  console.log('req.headers.cookie:', req.headers.cookie);
  res.json({
    cookies: req.cookies,
    headerCookie: req.headers.cookie,
    hasAccessToken: !!req.cookies?.access_token,
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint
app.get('/api/debug/cookies', (req, res) => {
  console.log('DEBUG: /api/debug/cookies hit');
  res.json({
    cookies: req.cookies,
    headerCookie: req.headers.cookie,
    hasAccessToken: !!req.cookies?.access_token,
  });
});

// API Routes - register ALL routes synchronously
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/usage', usageRoutes);

console.log('=== ALL ROUTES REGISTERED ===');

// Initialize database (async, but routes are already registered)
initDatabase().then(() => {
  console.log('=== DATABASE INITIALIZED ===');
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  console.log('404 NOT FOUND:', req.method, req.path);
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Galactus AI backend running on http://localhost:${PORT}`);
});

export default app;