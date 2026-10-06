import { boardConfigSchema, taskSchema, type Task } from '@task-board/contracts';
export const statusA = '11111111-1111-4111-8111-111111111111';
export const statusB = '22222222-2222-4222-8222-222222222222';
export const priorityId = '33333333-3333-4333-8333-333333333333';
export const config = boardConfigSchema.parse({ brandName: 'Studio', boardName: 'Team board', description: 'A shared space', defaultStatusId: statusA, defaultPriorityId: priorityId, titleMaxLength: 12, descriptionMaxLength: 40, motion: { enabled: false, durationMs: 250, staggerMs: 40, easing: 'power2.out' }, statuses: [{ id: statusA, label: 'Ready', description: '', color: '#ffffff', displayOrder: 0, isComplete: false }, { id: statusB, label: 'Finished', description: '', color: '#000000', displayOrder: 1, isComplete: true }], priorities: [{ id: priorityId, label: 'Normal', color: '#888888', displayOrder: 0 }] });
export const makeTask = (overrides: Partial<Task> = {}): Task => taskSchema.parse({ id: '44444444-4444-4444-8444-444444444444', title: 'Write brief', description: 'Next step', statusId: statusA, priorityId, version: 1, createdAt: '2026-10-06T10:00:00.000Z', updatedAt: '2026-10-06T10:00:00.000Z', ...overrides });
export const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
