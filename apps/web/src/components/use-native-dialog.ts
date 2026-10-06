import { useLayoutEffect, useRef } from 'react';
export const useNativeDialog = () => {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const trigger = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
      else document.getElementById('new-task')?.focus();
    };
  }, []);
  return ref;
};
