import { query, type QueryExecutor } from '../database/pool.js';
import { mapTaskRow, type TaskRow } from './task-row-mapper.js';
import type { TaskRepository } from './task-repository.js';
const columns = 'id, title, description, status_id, priority_id, version, created_at, updated_at';
export const createPgTaskRepository = (database: QueryExecutor): TaskRepository => ({
  insert: async fields => {
    const result = await query<TaskRow>(database, `INSERT INTO tasks (title, description, status_id, priority_id) VALUES ($1,$2,$3,$4) RETURNING ${columns}`,
      [fields.title, fields.description, fields.statusId, fields.priorityId]);
    const row = result.rows[0]; if (!row) throw new Error('Insert returned no task.');
    return mapTaskRow(row);
  },
  list: async () => (await query<TaskRow>(database, `SELECT ${columns} FROM tasks ORDER BY created_at, id`)).rows.map(mapTaskRow),
  findById: async id => {
    const row = (await query<TaskRow>(database, `SELECT ${columns} FROM tasks WHERE id=$1`, [id])).rows[0];
    return row ? mapTaskRow(row) : null;
  },
  replace: async (id, version, fields) => {
    const row = (await query<TaskRow>(database, `UPDATE tasks SET title=$1, description=$2, status_id=$3, priority_id=$4,
      version=version+1, updated_at=GREATEST(updated_at, statement_timestamp()) WHERE id=$5 AND version=$6 RETURNING ${columns}`,
    [fields.title, fields.description, fields.statusId, fields.priorityId, id, version])).rows[0];
    return row ? mapTaskRow(row) : null;
  },
  delete: async (id, version) => (await query(database, 'DELETE FROM tasks WHERE id=$1 AND version=$2 RETURNING id', [id, version])).rowCount === 1,
});
