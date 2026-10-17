/** CSS tokens are the single source for both DOM and canvas presentation colors. */
export function readCanvasTheme() {
  const style = getComputedStyle(document.documentElement);
  const value = (name: string) => style.getPropertyValue(name).trim();
  return {
    background: value('--viewport-background'),
    gridPrimary: value('--viewport-grid-primary'),
    gridSecondary: value('--viewport-grid-secondary'),
    selection: value('--viewport-selection'),
    draft: value('--viewport-draft'),
    socket: value('--viewport-socket'),
    gridBackground: value('--grid-background'),
    gridLine: value('--grid-line'),
    gridSelection: value('--grid-selection'),
    gridCenter: value('--grid-center'),
    gridQuarter: value('--grid-quarter'),
    gridHover: value('--grid-hover'),
    gridFill: value('--grid-fill')
  };
}
export type CanvasTheme = ReturnType<typeof readCanvasTheme>;
