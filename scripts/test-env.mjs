import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
if (existsSync('.env')) loadEnvFile('.env');
export const testDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || new URL(value).pathname !== '/task_board_test') throw new Error('Tests require the dedicated task_board_test database.');
  return value;
};
