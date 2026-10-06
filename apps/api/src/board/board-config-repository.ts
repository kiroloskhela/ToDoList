import { boardConfigSchema, type BoardConfig } from '@task-board/contracts';
import { query, type QueryExecutor } from '../database/pool.js';
export interface BoardConfigRepository { get(): Promise<BoardConfig> }
export const createBoardConfigRepository = (database: QueryExecutor): BoardConfigRepository => ({
  get: async () => {
    const result = await query<{ config: unknown }>(database, `SELECT jsonb_build_object(
      'brandName', brand_name, 'boardName', board_name, 'description', description,
      'defaultStatusId', default_status_id, 'defaultPriorityId', default_priority_id,
      'titleMaxLength', title_max_length, 'descriptionMaxLength', description_max_length,
      'motion', jsonb_build_object('enabled', motion_enabled, 'durationMs', motion_duration_ms,
        'staggerMs', motion_stagger_ms, 'easing', motion_easing),
      'statuses', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label, 'description', description,
        'color', color, 'displayOrder', display_order, 'isComplete', is_complete) ORDER BY display_order) FROM task_statuses),
      'priorities', (SELECT jsonb_agg(jsonb_build_object('id', id, 'label', label,
        'color', color, 'displayOrder', display_order) ORDER BY display_order) FROM task_priorities)
    ) AS config FROM board_settings WHERE singleton`);
    return boardConfigSchema.parse(result.rows[0]?.config);
  },
});
