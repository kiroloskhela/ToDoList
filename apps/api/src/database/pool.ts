import pg from 'pg';
import type { Environment } from '../config/environment.js';
import { mapPgError } from '../errors/pg-error-mapper.js';
export type QueryExecutor = Pick<pg.Pool, 'query'>;
export const createPool = (environment: Environment) => {
  const pool = new pg.Pool({ connectionString: environment.DATABASE_URL,
    max: environment.DB_POOL_MAX, connectionTimeoutMillis: environment.DB_CONNECT_TIMEOUT_MS,
    idleTimeoutMillis: 30000,
    options: `-c statement_timeout=${environment.DB_STATEMENT_TIMEOUT_MS} -c lock_timeout=${environment.DB_LOCK_TIMEOUT_MS}`,
  });
  pool.on('error', error => console.error(JSON.stringify({ event: 'database_pool_error', message: error.message })));
  return pool;
};
export const query = async <Row extends pg.QueryResultRow>(executor: QueryExecutor, sql: string, values: unknown[] = []) => {
  try { return await executor.query<Row>(sql, values); } catch (error) { throw mapPgError(error); }
};
