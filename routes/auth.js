/* Galactus AI - Auth Routes */
import express from 'express';
import jwt from 'jsonwebtoken';
import { getDb, generateId, hashPassword, verifyPassword, hashToken, createSessionToken, now } from '../db/database.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const REFRESH_EXPIRES_IN = '30d';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = createSessionToken();
  return { accessToken, refreshToken };
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('access_token', accessToken, COOKIE_OPTIONS);
  res.cookie('refresh_token', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', COOKIE_OPTIONS);
  res.clearCookie('refresh_token', COOKIE_OPTIONS);
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const userId = generateId();
    const passwordHash = hashPassword(password);
    const timestamp = now();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, is_guest, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(userId, name, email.toLowerCase(), passwordHash, timestamp, timestamp);

    // Create default conversation for new user
    const conversationId = generateId();
    db.prepare(`
      INSERT INTO conversations (id, user_id, title, created_at, updated_at)
      VALUES (?, ?, 'New Conversation', ?, ?)
    `).run(conversationId, userId, timestamp, timestamp);

    const { accessToken, refreshToken } = generateTokens(userId);
    const refreshTokenHash = hashToken(refreshToken);

    db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId(), userId, refreshTokenHash, now() + 30 * 24 * 60 * 60 * 1000, timestamp);

    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      user: { id: userId, name, email: email.toLowerCase() },
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_guest = 0').get(email.toLowerCase());

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    const refreshTokenHash = hashToken(refreshToken);
    const timestamp = now();
    const expiresAt = rememberMe
      ? timestamp + 30 * 24 * 60 * 60 * 1000
      : timestamp + 7 * 24 * 60 * 60 * 1000;

    db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId(), user.id, refreshTokenHash, expiresAt, timestamp);

    // Update cookie options for remember me
    const cookieOptions = { ...COOKIE_OPTIONS };
    if (rememberMe) {
      cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000;
    }

    res.cookie('access_token', accessToken, cookieOptions);
    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      message: 'Logged in successfully',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Guest login
router.post('/guest', async (req, res) => {
  try {
    const db = getDb();
    const userId = generateId();
    const timestamp = now();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, is_guest, created_at, updated_at)
      VALUES (?, 'Guest User', ?, '', 1, ?, ?)
    `).run(userId, `guest-${userId}@galactus.local`, timestamp, timestamp);

    const { accessToken, refreshToken } = generateTokens(userId);
    const refreshTokenHash = hashToken(refreshToken);

    db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId(), userId, refreshTokenHash, timestamp + 24 * 60 * 60 * 1000, timestamp);

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: { id: userId, name: 'Guest User', email: `guest-${userId}@galactus.local`, isGuest: true },
      message: 'Guest session started',
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'Failed to start guest session' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
      const db = getDb();
      const tokenHash = hashToken(refreshToken);
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    }

    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to log out' });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const db = getDb();
    const tokenHash = hashToken(refreshToken);
    const session = db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?').get(tokenHash, now());

    if (!session) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Session expired' });
    }

    const user = db.prepare('SELECT id, name, email, is_guest FROM users WHERE id = ?').get(session.user_id);

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'User not found' });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user.id);
    const newRefreshTokenHash = hashToken(newRefreshToken);

    db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
    db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId(), user.id, newRefreshTokenHash, now() + 30 * 24 * 60 * 60 * 1000, now());

    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({ user: { id: user.id, name: user.name, email: user.email, isGuest: user.is_guest === 1 } });
  } catch (error) {
    console.error('Token refresh error:', error);
    clearAuthCookies(res);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Get current user (protected)
router.get('/me', async (req, res) => {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Check cookies
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    // Fallback: manually parse cookie header
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) acc[key] = value;
        return acc;
      }, {});
      if (cookies.access_token) {
        token = cookies.access_token;
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const db = getDb();
      const user = db.prepare('SELECT id, name, email, is_guest, created_at FROM users WHERE id = ?').get(decoded.userId);

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isGuest: user.is_guest === 1,
          createdAt: user.created_at,
        },
      });
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Verify token (for frontend init)
router.get('/verify', async (req, res) => {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Check cookies
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    // Fallback: manually parse cookie header
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) acc[key] = value;
        return acc;
      }, {});
      if (cookies.access_token) {
        token = cookies.access_token;
      }
    }

    if (!token) {
      return res.status(401).json({ authenticated: false });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const db = getDb();
      const user = db.prepare('SELECT id, name, email, is_guest FROM users WHERE id = ?').get(decoded.userId);

      if (!user) {
        return res.status(401).json({ authenticated: false });
      }

      res.json({
        authenticated: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isGuest: user.is_guest === 1,
        },
      });
    } catch (jwtError) {
      res.status(401).json({ authenticated: false });
    }
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Failed to verify' });
  }
});

export default router;