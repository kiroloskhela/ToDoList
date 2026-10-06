import { readEnvironment } from './config/environment.js';
import { createPool } from './database/pool.js';
import { createBoardConfigRepository } from './board/board-config-repository.js';
import { createApp } from './app.js';
const environment = readEnvironment();
const pool = createPool(environment);
await createBoardConfigRepository(pool).get();
const server = createApp(pool).listen(environment.PORT, environment.HOST, () => {
  console.log(`Task board API: http://${environment.HOST}:${environment.PORT}`);
});
let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(() => { void pool.end().then(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
