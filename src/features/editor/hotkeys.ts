import type { Hotkey } from '@tanstack/react-hotkeys';

export const HOTKEYS = {
  backToLanding: 'Shift+Escape',
  cancelEditing: 'Escape',
  selectTool: 'V',
  moveTool: 'G',
  rotateTool: 'R',
  pivotTool: 'B',
  paintTool: 'P',
  paintFillTool: 'Shift+P',
  focusSelection: 'F',
  drawTool: 'D',
  eraseTool: 'E',
  fillTool: 'Shift+D',
  fillEraseTool: 'Shift+E',
  pushOrDonePiece: 'Mod+Enter',
  duplicate: 'Mod+D',
  deleteSelection: 'Delete',
  undo: 'Mod+Z',
  redo: 'Mod+Shift+Z',
  saveProject: 'Mod+S',
  exportGlb: 'Mod+E',
  openShortcuts: 'Shift+H'
} as const satisfies Record<string, Hotkey>;
