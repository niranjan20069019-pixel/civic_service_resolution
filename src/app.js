'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/env');
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const clientBuildPath = path.join(__dirname, '../frontend/dist');

const authRoutes        = require('./routes/auth.routes');
const issueRoutes       = require('./routes/issue.routes');
const adminRoutes       = require('./routes/admin.routes');
const analyticsRoutes   = require('./routes/analytics.routes');
const translateRoutes   = require('./routes/translate.routes');
const uploadRoutes      = require('./routes/upload.routes');
const notificationRoutes = require('./routes/notification.routes');

// ─── Build the allowed-origins Set once ──────────────────────────────────────
function buildAllowedOrigins() {
  const set = new Set([
    'http://localhost:5173',
    'http://localhost:3000',
    'https://civic-service-resolution.onrender.com',
  ]);
  if (config.frontendUrl) set.add(config.frontendUrl);
  config.cors.origins.forEach(o => o && set.add(o));
  return set;
}

const allowedOrigins = buildAllowedOrigins();

const corsOptions = {
  origin(origin, cb) {
    // No Origin header = same-origin / curl / Postman — always allow
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    logger.warn(`CORS blocked: ${origin}`);
    return cb(Object.assign(new Error(`CORS: Origin ${origin} not allowed`), { statusCode: 403 }));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Export so server.js can reuse the same list for Socket.IO
module.exports.allowedOrigins = allowedOrigins;

const createApp = () => {
  const app = express();

  // ── 1. Security headers ────────────────────────────────────────────────────
  // crossOriginResourcePolicy: false lets the browser load fonts/images served
  // by this same Express process from a different port during dev.
  app.use(
    helmet({
      contentSecurityPolicy: false,       // React app uses inline styles/scripts
      crossOriginEmbedderPolicy: false,   // Leaflet / third-party iframes
      crossOriginResourcePolicy: false,   // Allow assets fetched cross-origin
    })
  );

  // ── 2. Static assets — BEFORE CORS and rate-limiting ──────────────────────
  // Browsers load <script>, <link>, <img> tags without an Origin header, so
  // they never trigger CORS. Serving them here means they bypass the CORS
  // middleware entirely and are never accidentally blocked.
  app.use(express.static(clientBuildPath, { maxAge: '1d', etag: true }));
  app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '7d' }));

  // ── 3. CORS — only for /api and /uploads fetch requests ───────────────────
  app.options('*', cors(corsOptions));          // pre-flight for every route
  app.use('/api', cors(corsOptions));
  app.use('/uploads', cors(corsOptions));       // fetch('/uploads/…') from JS

  // ── 4. Body parsing ────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── 5. HTTP request logging ────────────────────────────────────────────────
  if (config.env !== 'test') {
    app.use(morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    }));
  }

  // ── 6. Rate limiting (API only) ────────────────────────────────────────────
  app.use('/api/', apiLimiter);

  // ── 7. Health check ────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({
    success: true,
    message: 'Civic Issue API is running',
    data: { uptime: Math.floor(process.uptime()), env: config.env, timestamp: new Date().toISOString() },
    errors: null,
  }));

  // ── 8. Swagger UI ──────────────────────────────────────────────────────────
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Civic Issue API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: { persistAuthorization: true },
  }));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

  // ── 9. API routes ──────────────────────────────────────────────────────────
  app.use('/api/auth',          authRoutes);
  app.use('/api/issues',        issueRoutes);
  app.use('/api/admin',         adminRoutes);
  app.use('/api/analytics',     analyticsRoutes);
  app.use('/api/translate',     translateRoutes);
  app.use('/api/upload',        uploadRoutes);
  app.use('/api/notifications', notificationRoutes);

  // ── 10. SPA fallback — send index.html for every non-API path ─────────────
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
      if (err) next(err);
    });
  });

  // ── 11. Error handlers (must be last) ─────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
