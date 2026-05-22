const http = require('http');
const { Server } = require('socket.io');
const createApp = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { startAll, stopAll } = require('./jobs/cron');
const { setIO } = require('./io');

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.cors.origins, methods: ['GET', 'POST'] },
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
