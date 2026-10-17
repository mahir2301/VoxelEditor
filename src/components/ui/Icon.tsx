const paths = {
  cube: 'M12 3 3 8v9l9 5 9-5V8L12 3ZM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5',
  part: 'M4 4h16v16H4zM4 9h16M9 9v11',
  shape: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  socket: 'm12 3 9 9-9 9-9-9 9-9ZM9 12h6M12 9v6',
  move: 'M12 3v18M3 12h18M9 6l3-3 3 3M18 9l3 3-3 3M15 18l-3 3-3-3M6 15l-3-3 3-3',
  rotate: 'M4 10a8 8 0 1 1 1 7M4 4v6h6',
  pivot: 'M12 3v6M12 15v6M3 12h6M15 12h6M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8',
  select: 'm5 3 14 9-7 1-3 7-4-17Z',
  paint: 'm14 3 7 7-9 9-7-7 9-9ZM4 16c-4 5 0 7 4 3M8 7l9 9',
  fill: 'm10 3 10 10-9 8L2 12l8-9ZM3 12h16M21 16v4',
  erase: 'm15 3 6 6-10 11H6l-4-4L15 3ZM7 11l7 7M10 20h11',
  undo: 'M9 5 3 11l6 6M3 11h10a7 7 0 0 1 7 7',
  redo: 'm15 5 6 6-6 6M21 11H11a7 7 0 0 0-7 7',
  save: 'M5 3h12l4 4v14H3V3h2ZM7 3v6h10V3M7 21v-8h10v8',
  export: 'M12 15V3M7 8l5-5 5 5M4 14v7h16v-7',
  file: 'M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 13h8M8 17h5',
  folder: 'M3 6h7l2 3h9v12H3V6Z',
  plus: 'M12 5v14M5 12h14',
  chevron: 'm9 5 7 7-7 7',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
  eyeOff: 'm3 3 18 18M10 5l2-.1c6 0 10 7 10 7a22 22 0 0 1-4 4M6 6a22 22 0 0 0-4 6s4 7 10 7l3-.5',
  lock: 'M5 10h14v11H5V10ZM8 10V7a4 4 0 0 1 8 0v3M12 14v3',
  unlock: 'M5 10h14v11H5V10ZM8 10V7a4 4 0 0 1 7-3M12 14v3',
  focus: 'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M8 12h8M12 8v8',
  play: 'm8 4 12 8-12 8V4Z',
  pause: 'M7 4v16M17 4v16',
  fire: 'm13 2-3 8H5l6 12 3-8h5L13 2Z',
  power: 'M12 2v10M7 5a9 9 0 1 0 10 0',
  keyboard: 'M2 5h20v14H2V5ZM6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h4M7 16h10',
  check: 'm5 12 4 4L19 6',
  warning: 'm12 3 10 18H2L12 3ZM12 9v5M12 17h.01',
  grip: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01'
};
export type IconName = keyof typeof paths;
export default function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <path d={paths[name]} />
    </svg>
  );
}
