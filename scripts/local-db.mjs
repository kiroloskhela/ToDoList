import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, '.local-postgres');
const data = resolve(directory, 'data');
const socket = resolve(directory, 'socket');
mkdirSync(socket, { recursive: true, mode: 0o700 });
if (process.argv[2] === 'stop') {
  execFileSync('pg_ctl', ['-D', data, 'stop', '-m', 'fast'], { stdio: 'inherit' });
  process.exit(0);
}
const credentialsPath = resolve(directory, 'credentials.json');
const credentials = existsSync(credentialsPath) ? JSON.parse(readFileSync(credentialsPath, 'utf8')) :
  Object.fromEntries(['owner', 'app', 'migrator', 'test'].map(key => [key, randomBytes(24).toString('hex')]));
writeFileSync(credentialsPath, JSON.stringify(credentials), { mode: 0o600 });
const passwordPath = resolve(directory, 'owner-password');
writeFileSync(passwordPath, credentials.owner, { mode: 0o600 });
if (!existsSync(resolve(data, 'PG_VERSION'))) {
  execFileSync('initdb', ['-D', data, '-U', 'task_board_owner', '--auth-local=trust',
    '--auth-host=scram-sha-256', `--pwfile=${passwordPath}`, '--encoding=UTF8', '--locale=C'], { stdio: 'inherit' });
}
let running = true;
try { execFileSync('pg_ctl', ['-D', data, 'status'], { stdio: 'ignore' }); } catch { running = false; }
if (!running) {
  execFileSync('pg_ctl', ['-D', data, '-l', resolve(directory, 'server.log'), '-o',
    `-p 5433 -h 127.0.0.1 -k ${socket}`, '-w', 'start'], { stdio: 'inherit' });
}
const owner = new pg.Client({ host: socket, port: 5433, user: 'task_board_owner', database: 'postgres' });
await owner.connect();
try {
  for (const key of ['app', 'migrator', 'test']) {
    const role = `task_board_${key}`;
    const exists = await owner.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
    // Passwords are generated hex values; role names are fixed, never user input.
    if (!exists.rowCount) await owner.query(`CREATE ROLE ${role} LOGIN PASSWORD '${credentials[key]}'`);
  }
  for (const [name, role] of [['task_board_dev', 'task_board_migrator'], ['task_board_test', 'task_board_test']]) {
    const exists = await owner.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!exists.rowCount) await owner.query(`CREATE DATABASE ${name} OWNER ${role}`);
  }
} finally { await owner.end(); }
const dev = new pg.Client({ host: socket, port: 5433, user: 'task_board_owner', database: 'task_board_dev' });
await dev.connect();
try {
  await dev.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  await dev.query('GRANT USAGE, CREATE ON SCHEMA public TO task_board_migrator');
} finally { await dev.end(); }
const url = (key, database) => `postgresql://task_board_${key}:${credentials[key]}@127.0.0.1:5433/${database}`;
if (!existsSync(resolve(root, '.env'))) {
  writeFileSync(resolve(root, '.env'), `NODE_ENV=development\nHOST=127.0.0.1\nPORT=3001\nDATABASE_URL=${url('app', 'task_board_dev')}\nMIGRATION_DATABASE_URL=${url('migrator', 'task_board_dev')}\nTEST_DATABASE_URL=${url('test', 'task_board_test')}\n`, { mode: 0o600 });
}
console.log('Isolated PostgreSQL is ready on port 5433. Project credentials are in ignored local files.');
