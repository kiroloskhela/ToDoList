import { SelectField } from './SelectField';
import { useRef, useState, type FormEvent } from 'react';
import { X, ArrowUpRight, LoaderCircle } from 'lucide-react';
import { createTaskSchemas, type BoardConfig, type Task, type TaskFields } from '@task-board/contracts';
import { ApiError } from '../api/http-client';
import { useNativeDialog } from './use-native-dialog';
import { useMotion } from '../motion/use-motion';
import { taskFields } from '../tasks/board-cache';

interface Props { config: BoardConfig; task?: Task; statusId?: string; pending: boolean; onClose: () => void; onSave: (fields: TaskFields) => Promise<unknown> }
export const TaskFormDialog = ({ config, task, statusId, pending, onClose, onSave }: Props) => {
  const dialog = useNativeDialog();
  const panel = useRef<HTMLDivElement>(null);
  useMotion(panel, config.motion);
  const [fields, setFields] = useState<TaskFields>(() => task ? taskFields(task) : {
    title: '', description: '', statusId: statusId ?? config.defaultStatusId, priorityId: config.defaultPriorityId,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState('');
  const change = (key: keyof TaskFields, value: string) => { setFields(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: [] })); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (pending) return;
    const parsed = createTaskSchemas(config).replace.safeParse(fields);
    if (!parsed.success) {
      const validation: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) (validation[String(issue.path[0]) || 'body'] ??= []).push(issue.message);
      setErrors(validation); return;
    }
    setFailure('');
    try { await onSave(parsed.data); onClose(); }
    catch (error) { if (error instanceof ApiError && error.fields) setErrors(error.fields); setFailure(error instanceof Error ? error.message : 'Could not save this task.'); }
  };
  return <dialog ref={dialog} className="task-dialog" aria-labelledby="task-dialog-title" onCancel={event => { event.preventDefault(); if (!pending) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <div ref={panel} className="dialog-panel">
      <div className="dialog-heading"><div><span className="eyebrow">MAKE SPACE FOR PROGRESS</span><h2 id="task-dialog-title">{task ? 'Edit your task' : 'A fresh start'}</h2></div><button className="icon-button" aria-label="Close dialog" disabled={pending} onClick={onClose}><X size={20}/></button></div>
      <p className="dialog-description">{task ? 'Fine-tune the details and keep things moving.' : 'Big plans start with one small task.'}</p>
      <form onSubmit={event => void submit(event)} noValidate>
        <label htmlFor="task-title">Task title <span className="required">*</span></label>
        <input data-dialog-initial-focus id="task-title" value={fields.title} onChange={event => change('title', event.target.value)} placeholder="What would you like to get done?" disabled={pending} aria-invalid={Boolean(errors.title?.length)} aria-describedby="title-error title-limit"/>
        <div className="field-meta"><span id="title-error" className="field-error">{errors.title?.[0]}</span><span id="title-limit">{Array.from(fields.title).length}/{config.titleMaxLength}</span></div>
        <label htmlFor="task-description">Description <span className="optional">optional</span></label>
        <textarea id="task-description" value={fields.description} onChange={event => change('description', event.target.value)} rows={4} placeholder="Add a little context, a next step, or a useful detail…" disabled={pending} aria-invalid={Boolean(errors.description?.length)} aria-describedby="description-error description-limit"/>
        <div className="field-meta"><span id="description-error" className="field-error">{errors.description?.[0]}</span><span id="description-limit">{Array.from(fields.description).length}/{config.descriptionMaxLength}</span></div>
        <div className="form-grid"><div><label htmlFor="task-status">Column</label><SelectField id="task-status" label="Column" value={fields.statusId} onValueChange={value => change('statusId', value)} disabled={pending} describedBy="status-error" invalid={Boolean(errors.statusId?.length)} options={config.statuses}/><span id="status-error" className="field-error">{errors.statusId?.[0]}</span></div>
        <div><label htmlFor="task-priority">Priority</label><SelectField id="task-priority" label="Priority" value={fields.priorityId} onValueChange={value => change('priorityId', value)} disabled={pending} describedBy="priority-error" invalid={Boolean(errors.priorityId?.length)} options={config.priorities}/><span id="priority-error" className="field-error">{errors.priorityId?.[0]}</span></div></div>
        {failure && <p className="form-failure" role="alert">{failure}</p>}
        <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose} disabled={pending}>Cancel</button><button type="submit" className="button primary" disabled={pending}>{pending ? <LoaderCircle size={17} className="spinner"/> : <ArrowUpRight size={17}/>} {pending ? 'Saving…' : task ? 'Save changes' : 'Create task'}</button></footer>
      </form>
    </div>
  </dialog>;
};
