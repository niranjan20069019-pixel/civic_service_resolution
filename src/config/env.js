const dotenv = require('dotenv');
dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  // The deployed frontend URL — used to seed allowedOrigins in app.js
  frontendUrl: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.trim() : null,

  redis: {
    url: process.env.REDIS_URL || null,
  },

  jwt: {
    accessSecret:  process.env.JWT_ACCESS_SECRET  || 'dev_access_secret_change_in_production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_production',
    accessExpiresIn:  process.env.JWT_ACCESS_EXPIRES_IN  || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS,    10) || 15 * 60 * 1000,
    max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    authMax:  parseInt(process.env.AUTH_RATE_LIMIT_MAX,     10) || 10,
  },

  cors: {
    // Extra origins beyond the hardcoded defaults in app.js
    origins: (process.env.CORS_ORIGINS || '')
      .split(',').map(s => s.trim()).filter(Boolean),
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

module.exports = config;
