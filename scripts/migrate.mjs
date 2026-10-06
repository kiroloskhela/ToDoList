import { runner } from 'node-pg-migrate';
export const migrate = async (databaseUrl, direction = 'up', count) => {
  if (!databaseUrl) throw new Error('MIGRATION_DATABASE_URL is required.');
  await runner({ databaseUrl, dir: 'apps/api/migrations', direction, count,
    migrationsTable: 'pgmigrations', checkOrder: true,
    log: () => {}, verbose: false,
  });
};
if (process.argv[1]?.endsWith('/migrate.mjs')) {
  await migrate(process.env.MIGRATION_DATABASE_URL);
  console.log('Database migrations applied.');
}
