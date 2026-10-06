import { SelectField } from './SelectField';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import type { BoardConfig } from '@task-board/contracts';
interface Props { config: BoardConfig; search: string; priority: string; onSearch: (value: string) => void; onPriority: (value: string) => void; onCreate: () => void; pending: boolean }
export const BoardToolbar = ({ config, search, priority, onSearch, onPriority, onCreate, pending }: Props) => <div className="board-toolbar">
  <div className="filters"><label className="search-field"><Search aria-hidden="true" size={18}/><input aria-label="Search tasks" name="search" autoComplete="off" type="search" placeholder="Search your tasks…" value={search} onChange={event => onSearch(event.target.value)}/></label><SelectField label="Filter by priority" variant="filter" icon={<SlidersHorizontal size={16}/>} value={priority || 'all'} onValueChange={value => onPriority(value === 'all' ? '' : value)} options={[{ id: 'all', label: 'All priorities' }, ...config.priorities]}/></div>
  <button id="new-task" className="button primary" onClick={onCreate} disabled={pending}><Plus aria-hidden="true" size={18}/> New task</button>
</div>;
