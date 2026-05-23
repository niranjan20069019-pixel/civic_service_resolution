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

const authRoutes = require('./routes/auth.routes');
const issueRoutes = require('./routes/issue.routes');
const adminRoutes = require('./routes/admin.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const translateRoutes = require('./routes/translate.routes');
const uploadRoutes = require('./routes/upload.routes');
const notificationRoutes = require('./routes/notification.routes');

const createApp = () => {
  const app = express();

  // ─── Security headers (relaxed for inline styles used by the app) ──────────
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = config.cors.origins;
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes('*')) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: Origin ${origin} not allowed`));
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // ─── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ─── Request logging ───────────────────────────────────────────────────────
  if (config.env !== 'test') {
    app.use(
      morgan('combined', {
        stream: { write: (msg) => logger.http(msg.trim()) },
      })
    );
  }

  // ─── Global rate limiter ───────────────────────────────────────────────────
  app.use('/api/', apiLimiter);

  // ─── Health check (no auth, no rate limit) ────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'Civic Issue API is running',
      data: {
        uptime: Math.floor(process.uptime()),
        env: config.env,
        timestamp: new Date().toISOString(),
      },
      errors: null,
    });
  });

  // ─── Swagger UI ───────────────────────────────────────────────────────────
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Civic Issue API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: { persistAuthorization: true },
    })
  );

  // OpenAPI JSON spec endpoint
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

  // ─── API Routes ───────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/issues', issueRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/translate', translateRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Serve uploaded images
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // ─── Frontend static assets ───────────────────────────────────────────────
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path === '/health' ||
      req.path.startsWith('/api/docs')
    ) {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });

  // ─── 404 handler ──────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ─── Global error handler (must be last) ──────────────────────────────────
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
