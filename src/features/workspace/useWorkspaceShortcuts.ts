import { useEffect } from 'react';
export function useWorkspaceShortcuts(commands: Record<string, () => void>) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')
      )
        return;
      if (
        target instanceof HTMLElement &&
        target.closest('[role="treegrid"]') &&
        !event.metaKey &&
        !event.ctrlKey &&
        event.key.length === 1 &&
        event.key !== ' '
      )
        return;
      const key = `${event.metaKey || event.ctrlKey ? 'mod+' : ''}${event.shiftKey ? 'shift+' : ''}${event.key.toLowerCase()}`;
      const command = commands[key];
      if (command) {
        event.preventDefault();
        command();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commands]);
}
