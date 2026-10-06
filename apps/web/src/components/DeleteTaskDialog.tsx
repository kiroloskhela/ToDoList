import { useRef, useState } from 'react';
import { Trash2, X, LoaderCircle } from 'lucide-react';
import type { BoardConfig, Task } from '@task-board/contracts';
import { useNativeDialog } from './use-native-dialog';
import { useMotion } from '../motion/use-motion';
interface Props { task: Task; config: BoardConfig; pending: boolean; onClose: () => void; onDelete: () => Promise<unknown> }
export const DeleteTaskDialog = ({ task, config, pending, onClose, onDelete }: Props) => {
  const dialog = useNativeDialog(); const panel = useRef<HTMLDivElement>(null); useMotion(panel, config.motion);
  const [failure, setFailure] = useState('');
  const confirm = async () => { try { await onDelete(); onClose(); } catch (error) { setFailure(error instanceof Error ? error.message : 'Could not delete this task.'); } };
  return <dialog ref={dialog} className="task-dialog delete-dialog" aria-labelledby="delete-title" onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
    <div ref={panel} className="dialog-panel"><div className="dialog-heading"><div className="delete-symbol"><Trash2 size={24}/></div><button aria-label="Close dialog" className="icon-button" onClick={onClose} disabled={pending}><X size={20}/></button></div>
      <h2 id="delete-title">Delete this task?</h2><p className="dialog-description">“{task.title}” will be permanently removed from your board.</p>
      {failure && <p role="alert" className="form-failure">{failure}</p>}
      <footer className="dialog-footer"><button className="button secondary" onClick={onClose} disabled={pending}>Keep task</button><button className="button danger" onClick={() => void confirm()} disabled={pending}>{pending && <LoaderCircle className="spinner" size={17}/>} {pending ? 'Deleting…' : 'Delete task'}</button></footer>
    </div>
  </dialog>;
};
