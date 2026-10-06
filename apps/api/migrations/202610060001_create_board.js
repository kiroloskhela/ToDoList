import { readFileSync } from 'node:fs';
export const up = pgm => pgm.sql(readFileSync(new URL('../schema/schema.sql', import.meta.url), 'utf8'));
export const down = pgm => pgm.sql(`
  DROP TABLE tasks;
  DROP TABLE board_settings;
  DROP TABLE task_priorities;
  DROP TABLE task_statuses;
  DROP FUNCTION validate_task_limits();
  DROP FUNCTION protect_board_limits();
`);
