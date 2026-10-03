import { app } from './app.js';
import { config } from './config.js';

const server = app.listen(config.port, () => {
  console.log(`Fondé 44 API à l’écoute sur http://localhost:${config.port}`);
});

function shutdown(signal) {
  console.log(`[server] arrêt demandé (${signal})`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
