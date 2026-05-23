const http = require('http');
const { Server } = require('socket.io');
const createApp = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { startAll, stopAll } = require('./jobs/cron');
const { setIO } = require('./io');

// ─── Startup checks ───────────────────────────────────────────────────────────
if (config.env === 'production') {
  const missing = [];
  if (!config.jwt.accessSecret) missing.push('JWT_ACCESS_SECRET');
  if (!config.jwt.refreshSecret) missing.push('JWT_REFRESH_SECRET');
  if (missing.length > 0) {
    logger.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const app = createApp();
const server = http.createServer(app);

const allowedOrigins = config.cors.origins.includes('*')
  ? true
  : config.cors.origins;
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});
setIO(io);

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
});

server.listen(config.port, () => {
  logger.info(`🚀 Civic Issue API running on port ${config.port} [${config.env}]`);
  logger.info(`📖 Swagger UI: http://localhost:${config.port}/api/docs`);
  logger.info(`🏥 Health:     http://localhost:${config.port}/health`);
  logger.info(`⚡ Socket.IO:  enabled`);

  if (config.env !== 'test') startAll();
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  stopAll();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => { logger.error('Forcing exit'); process.exit(1); }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (r) => logger.error('Unhandled rejection:', r));
process.on('uncaughtException',  (e) => { logger.error('Uncaught exception:', e); process.exit(1); });

module.exports = server;
