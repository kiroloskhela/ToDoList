import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
interface SelectOption { id: string; label: string; color?: string }
interface Props {
  options: SelectOption[]; value: string; onValueChange: (value: string) => void;
  label: string; id?: string; disabled?: boolean; describedBy?: string; invalid?: boolean;
  variant?: 'filter' | 'card' | 'form'; icon?: ReactNode;
}
export const SelectField = ({ options, value, onValueChange, label, id, disabled, describedBy, invalid, variant = 'form', icon }: Props) => {
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | undefined>();
  useLayoutEffect(() => { setContainer(trigger.current?.closest('dialog') ?? undefined); }, []);
  const selected = options.find(option => option.id === value);
  return <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
    <Select.Trigger ref={trigger} id={id} aria-label={label} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={`select-trigger select-${variant}`}>
      {icon && <span className="select-leading" aria-hidden="true">{icon}</span>}
      <Select.Value><span className="select-value">{selected?.color && <span className="select-dot" style={{ backgroundColor: selected.color }}/>}<span>{selected?.label}</span></span></Select.Value>
      <Select.Icon className="select-chevron"><ChevronDown size={15} aria-hidden="true"/></Select.Icon>
    </Select.Trigger>
    <Select.Portal container={container}><Select.Content className="select-popover" position="popper" sideOffset={7} collisionPadding={12} onEscapeKeyDown={event => event.stopPropagation()}>
      <Select.ScrollUpButton className="select-scroll"><ChevronUp size={15} aria-hidden="true"/></Select.ScrollUpButton>
      <Select.Viewport className="select-options">{options.map(option => <Select.Item key={option.id} value={option.id} className="select-option" textValue={option.label}>
        <span className="select-option-label">{option.color && <span className="select-dot" style={{ backgroundColor: option.color }}/>}<Select.ItemText>{option.label}</Select.ItemText></span><Select.ItemIndicator className="select-check"><Check size={15} aria-hidden="true"/></Select.ItemIndicator>
      </Select.Item>)}</Select.Viewport><Select.ScrollDownButton className="select-scroll"><ChevronDown size={15} aria-hidden="true"/></Select.ScrollDownButton>
    </Select.Content></Select.Portal>
  </Select.Root>;
};
