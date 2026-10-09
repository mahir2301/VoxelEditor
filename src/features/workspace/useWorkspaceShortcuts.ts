import { useEffect } from 'react';
export function useWorkspaceShortcuts(commands: Record<string, () => void>) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')
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
