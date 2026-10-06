import { useReducer, useRef, useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { ArrowUpRight, LayoutDashboard, RefreshCw, Sparkles } from 'lucide-react';
import type { Task } from '@task-board/contracts';
import { useBoardData } from '../tasks/use-board-data';
import { useTaskMutations } from '../tasks/use-task-mutations';
import { boardDialogReducer } from '../tasks/board-dialog-reducer';
import { columnKeyboardCoordinates } from '../tasks/column-keyboard-coordinates';
import { resolveDropStatus } from '../tasks/resolve-drop-status';
import { taskFields } from '../tasks/board-cache';
import { useMotion } from '../motion/use-motion';
import { BoardToolbar } from './BoardToolbar';
import { BoardFeedback } from './BoardFeedback';
import { TaskColumn } from './TaskColumn';
import { TaskFormDialog } from './TaskFormDialog';
import { DeleteTaskDialog } from './DeleteTaskDialog';

export const TaskBoardPage = () => {
  const { configuration, tasks } = useBoardData(); const mutations = useTaskMutations();
  const [search, setSearch] = useState(''); const [priority, setPriority] = useState(''); const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dialog, dispatch] = useReducer(boardDialogReducer, { kind: 'closed' });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }));
  const config = configuration.data;
  const hasPendingMutation = mutations.pendingIds.size > 0;
  const isRefreshing = configuration.isFetching || tasks.isFetching;
  const refreshDisabled = hasPendingMutation || isRefreshing;
  const retry = () => {
    if (refreshDisabled) return;
    void configuration.refetch();
    if (config) void tasks.refetch();
  };
  if (!config || !tasks.data) return <main className="initial-state"><div className="brand-symbol"><LayoutDashboard aria-hidden="true" size={25}/></div>{configuration.isError || tasks.isError ? <><h1>We couldn’t load your board.</h1><p>{configuration.error?.message ?? tasks.error?.message}</p><button className="button primary" onClick={retry} disabled={refreshDisabled}><RefreshCw aria-hidden="true" size={17}/> Try again</button></> : <><h1>Getting your board ready</h1><p role="status">Loading your tasks and workspace…</p></>}</main>;
  const orderedConfig = { ...config, statuses: [...config.statuses].sort((a, b) => a.displayOrder - b.displayOrder), priorities: [...config.priorities].sort((a, b) => a.displayOrder - b.displayOrder) };
  const filtered = Boolean(search.trim() || priority); const query = search.trim().toLocaleLowerCase();
  const visible = tasks.data.filter(task => (!priority || task.priorityId === priority) && (!query || `${task.title} ${task.description}`.toLocaleLowerCase().includes(query)));
  const move = (task: Task, destination: string) => { const statusId = resolveDropStatus(task, destination, config); if (!statusId || mutations.pendingIds.has(task.id)) return; void mutations.execute({ kind: 'replace', task, fields: { ...taskFields(task), statusId } }).catch(() => undefined); };
  const drop = ({ active, over }: DragEndEvent) => { setActiveTask(null); const task = tasks.data.find(item => item.id === active.id); if (task && over) move(task, String(over.data.current?.statusId ?? '')); };
  const completed = tasks.data.filter(task => config.statuses.some(status => status.id === task.statusId && status.isComplete)).length;
  return <div className="app-shell"><a className="skip-link" href="#board">Skip to board</a><header className="app-header"><a className="brand" href="#board"><span className="brand-symbol"><LayoutDashboard aria-hidden="true" size={21}/></span>{config.brandName}<span className="brand-period">.</span></a><span className="workspace-label"><span/> Shared workspace</span></header><main id="board" className="board-main"><BoardIntro name={config.boardName} description={config.description} total={tasks.data.length} completed={completed} motion={config.motion}/>
    <BoardToolbar config={orderedConfig} search={search} priority={priority} onSearch={setSearch} onPriority={setPriority} onCreate={() => dispatch({ type: 'create' })} pending={mutations.pendingIds.has('create')}/>
    {(configuration.isError || tasks.isError) && <div className="stale-banner" role="alert"><span>Your board may be out of date. {configuration.error?.message ?? tasks.error?.message}</span><button className="button secondary" onClick={retry} disabled={refreshDisabled}>Retry refresh</button></div>}
    <div className="board-meta"><span>{filtered ? `${visible.length} of ${tasks.data.length} tasks` : `${tasks.data.length} ${tasks.data.length === 1 ? 'task' : 'tasks'} in your workspace`}</span><button className="refresh-button" onClick={retry} disabled={refreshDisabled}><RefreshCw aria-hidden="true" size={13} className={configuration.isFetching || tasks.isFetching ? 'spinner' : ''}/>{configuration.isFetching || tasks.isFetching ? 'Refreshing…' : 'Refresh board'}</button></div>
    <DndContext sensors={sensors} collisionDetection={args => args.pointerCoordinates ? pointerWithin(args) : closestCenter(args)} onDragStart={event => setActiveTask(tasks.data.find(task => task.id === event.active.id) ?? null)} onDragEnd={drop} onDragCancel={() => setActiveTask(null)}><div className="board-grid" style={{ gridTemplateColumns: `repeat(${config.statuses.length}, minmax(280px, 1fr))` }}>{orderedConfig.statuses.map(status => <TaskColumn key={status.id} status={status} tasks={visible.filter(task => task.statusId === status.id)} config={orderedConfig} pendingIds={mutations.pendingIds} filtered={filtered} onCreate={statusId => dispatch({ type: 'create', statusId })} onEdit={task => dispatch({ type: 'edit', task })} onDelete={task => dispatch({ type: 'delete', task })} onMove={move}/>)}</div><DragOverlay dropAnimation={null}>{activeTask && <div className="drag-preview"><span>Moving task</span><h3>{activeTask.title}</h3></div>}</DragOverlay></DndContext>
    <footer className="board-footer"><span><Sparkles aria-hidden="true" size={14}/> A little progress, every day.</span><span>Drag tasks between columns, or use their column menu.</span></footer>
  </main><BoardFeedback feedback={mutations.feedback} onDismiss={mutations.clearFeedback}/>
    {(dialog.kind === 'create' || dialog.kind === 'edit') && <TaskFormDialog config={orderedConfig} task={dialog.kind === 'edit' ? dialog.task : undefined} statusId={dialog.kind === 'create' ? dialog.statusId : undefined} pending={mutations.pendingIds.has(dialog.kind === 'edit' ? dialog.task.id : 'create')} onClose={() => dispatch({ type: 'close' })} onSave={fields => mutations.execute(dialog.kind === 'edit' ? { kind: 'replace', task: dialog.task, fields } : { kind: 'create', fields })}/>}
    {dialog.kind === 'delete' && <DeleteTaskDialog task={dialog.task} config={orderedConfig} pending={mutations.pendingIds.has(dialog.task.id)} onClose={() => dispatch({ type: 'close' })} onDelete={() => mutations.execute({ kind: 'delete', task: dialog.task })}/>}
  </div>;
};
const BoardIntro = ({ name, description, total, completed, motion }: { name: string; description: string; total: number; completed: number; motion: import('@task-board/contracts').MotionSettings }) => {
  const scope = useRef<HTMLElement>(null); useMotion(scope, motion);
  return <section className="board-intro" ref={scope}><div><span className="eyebrow">YOUR SPACE TO GET THINGS DONE</span><h1>{name}<ArrowUpRight aria-hidden="true" size={36}/></h1><p>{description}</p></div><div className="progress-summary"><span className="progress-number">{completed}<span> / {total}</span></span><span className="progress-label">tasks completed</span><div className="progress-track"><span style={{ width: total ? `${completed / total * 100}%` : '0%' }}/></div></div></section>;
};
