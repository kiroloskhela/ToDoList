import { defineConfig, devices } from '@playwright/test';
import { loadEnvFile } from 'node:process';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
try { loadEnvFile(path.join(root, '.env')); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) throw new Error('TEST_DATABASE_URL must identify a dedicated _test database.');
export default defineConfig({
  testDir: './e2e', globalSetup: './e2e/global-setup.ts', fullyParallel: false, workers: 1,
  forbidOnly: Boolean(process.env.CI), retries: 0, timeout: 30000,
  outputDir: '../../artifacts/playwright-results', reporter: [['list'], ['html', { outputFolder: '../../artifacts/playwright-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'node --import tsx apps/api/src/server.ts', cwd: root, url: 'http://127.0.0.1:3002/health/ready', reuseExistingServer: false, env: { DATABASE_URL: databaseUrl, HOST: '127.0.0.1', PORT: '3002', NODE_ENV: 'test' } },
    { command: 'npm run dev -w @task-board/web -- --port 5174', cwd: root, url: 'http://127.0.0.1:5174', reuseExistingServer: false, env: { API_PROXY_TARGET: 'http://127.0.0.1:3002' } },
  ],
});
