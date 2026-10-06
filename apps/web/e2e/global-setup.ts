import { migrate } from '../../../scripts/migrate.mjs';
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Refusing to migrate a non-test database.');
  await migrate(url);
}
