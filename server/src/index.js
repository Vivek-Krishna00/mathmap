import { createApp } from './app.js';
import { config } from './config.js';
import { closePool } from './db/pool.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`\n  MathMap API  ->  http://localhost:${config.port}`);
  console.log(`  environment :  ${config.env}`);
  console.log(`  allowed CORS :  ${config.clientOrigins.join(', ')}\n`);
});

async function shutdown(signal) {
  console.log(`\n[server] ${signal} received, shutting down...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
