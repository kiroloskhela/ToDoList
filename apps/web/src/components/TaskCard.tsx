import { SelectField } from './SelectField';
import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Pencil, Trash2, CalendarDays, LoaderCircle } from 'lucide-react';
import type { BoardConfig, Task } from '@task-board/contracts';
import { useMotion } from '../motion/use-motion';
interface Props { task: Task; config: BoardConfig; pending: boolean; onEdit: (task: Task) => void; onDelete: (task: Task) => void; onMove: (task: Task, statusId: string) => void }
const date = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
export const TaskCard = ({ task, config, pending, onEdit, onDelete, onMove }: Props) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { statusId: task.statusId }, disabled: pending });
  const inner = useRef<HTMLDivElement>(null); useMotion(inner, config.motion);
  const priority = config.priorities.find(item => item.id === task.priorityId);
  return <article ref={setNodeRef} className={`task-card-wrapper${isDragging ? ' dragging' : ''}`} style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined} aria-label={task.title} aria-busy={pending}>
    <div ref={inner} className="task-card"><div className="card-top"><span className="priority-badge"><span style={{ backgroundColor: priority?.color }}/>{priority?.label}</span><button className="drag-handle icon-button" aria-label={`Drag ${task.title}`} disabled={pending} {...attributes} {...listeners}><GripVertical aria-hidden="true" size={18}/></button></div>
      <h3>{task.title}</h3>{task.description && <p className="task-description">{task.description}</p>}
      <div className="card-date"><CalendarDays aria-hidden="true" size={13}/><time dateTime={task.createdAt}>{date.format(new Date(task.createdAt))}</time>{pending && <span className="saving"><LoaderCircle aria-hidden="true" size={13} className="spinner"/>Saving…</span>}</div>
      <div className="card-footer"><SelectField label={`Move ${task.title} to column`} variant="card" value={task.statusId} onValueChange={value => onMove(task, value)} disabled={pending} options={config.statuses}/><div className="card-actions"><button className="icon-button" aria-label={`Edit ${task.title}`} disabled={pending} onClick={() => onEdit(task)}><Pencil aria-hidden="true" size={15}/></button><button className="icon-button delete-action" aria-label={`Delete ${task.title}`} disabled={pending} onClick={() => onDelete(task)}><Trash2 aria-hidden="true" size={15}/></button></div></div>
    </div>
  </article>;
};
