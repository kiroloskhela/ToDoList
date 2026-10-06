import { z } from 'zod';

export const idSchema = z.uuid();
export const versionSchema = z.number().int().min(1).max(2147483647);
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const motionSchema = z.strictObject({
  enabled: z.boolean(), durationMs: z.number().int().min(0).max(1000),
  staggerMs: z.number().int().min(0).max(100),
  easing: z.enum(['none', 'power1.out', 'power2.out', 'power3.out', 'power2.inOut']),
});
export const statusSchema = z.strictObject({
  id: idSchema, label: z.string().min(1), description: z.string(),
  color: colorSchema, displayOrder: z.number().int(), isComplete: z.boolean(),
});
export const prioritySchema = z.strictObject({
  id: idSchema, label: z.string().min(1), color: colorSchema, displayOrder: z.number().int(),
});
export const boardConfigSchema = z.strictObject({
  brandName: z.string().min(1), boardName: z.string().min(1), description: z.string(),
  defaultStatusId: idSchema, defaultPriorityId: idSchema,
  titleMaxLength: z.number().int().min(1).max(1000),
  descriptionMaxLength: z.number().int().min(0).max(20000),
  motion: motionSchema,
  statuses: z.array(statusSchema).min(1), priorities: z.array(prioritySchema).min(1),
}).superRefine((config, ctx) => {
  if (!config.statuses.some(status => status.id === config.defaultStatusId)) {
    ctx.addIssue({ code: 'custom', path: ['defaultStatusId'], message: 'Default status is missing.' });
  }
  if (!config.priorities.some(priority => priority.id === config.defaultPriorityId)) {
    ctx.addIssue({ code: 'custom', path: ['defaultPriorityId'], message: 'Default priority is missing.' });
  }
  for (const field of ['statuses', 'priorities'] as const) {
    if (new Set(config[field].map(item => item.id)).size !== config[field].length) {
      ctx.addIssue({ code: 'custom', path: [field], message: 'Configuration IDs must be unique.' });
    }
  }
});
export type BoardConfig = z.infer<typeof boardConfigSchema>;
export type TaskStatus = z.infer<typeof statusSchema>;
export type TaskPriority = z.infer<typeof prioritySchema>;
export type MotionSettings = z.infer<typeof motionSchema>;

export const taskSchema = z.strictObject({
  id: idSchema, title: z.string(), description: z.string(),
  statusId: idSchema, priorityId: idSchema, version: versionSchema,
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export type Task = z.infer<typeof taskSchema>;
export type TaskFields = Pick<Task, 'title' | 'description' | 'statusId' | 'priorityId'>;
export const taskEnvelopeSchema = z.strictObject({ data: taskSchema });
export const tasksEnvelopeSchema = z.strictObject({ data: z.array(taskSchema) });
export const configEnvelopeSchema = z.strictObject({ data: boardConfigSchema });
export const errorEnvelopeSchema = z.object({ error: z.object({
  code: z.string(), message: z.string(), requestId: z.string(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
}) });

const limitedText = (max: number, name: string) => z.string()
  .refine(value => !value.includes('\0'), `${name} cannot contain NUL characters.`)
  .refine(value => Array.from(value).length <= max, `${name} must be ${max} characters or fewer.`);

export const createTaskSchemas = (config: BoardConfig) => {
  const title = z.string().trim().min(1, 'Give your task a title.')
    .pipe(limitedText(config.titleMaxLength, 'Title'));
  const description = limitedText(config.descriptionMaxLength, 'Description');
  const statusId = idSchema.refine(id => config.statuses.some(status => status.id === id), 'Choose a valid column.');
  const priorityId = idSchema.refine(id => config.priorities.some(priority => priority.id === id), 'Choose a valid priority.');
  const replace = z.strictObject({ title, description, statusId, priorityId });
  const create = z.strictObject({
    title, description: description.default(''),
    statusId: statusId.default(config.defaultStatusId), priorityId: priorityId.default(config.defaultPriorityId),
  });
  return { create, replace };
};

export const formatTaskEtag = (task: Pick<Task, 'id' | 'version'>) => `"${task.id}:${task.version}"`;
