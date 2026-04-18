# Voxel Editor - Implementation Plan

## Tech Stack
- Vite + React (fast dev server, JSX)
- React Three Fiber + @react-three/drei (3D rendering)
- Three.js + GLTFExporter (GLB export for Unity)
- HTML5 Canvas (2D grid drawing)

## Project Structure
```
src/
├── main.jsx
├── App.jsx / App.css
├── components/
│   ├── Grid2D.jsx / Grid2D.css
│   ├── Viewport3D.jsx / Viewport3D.css
│   ├── PieceList.jsx / PieceList.css
│   ├── Toolbar.jsx / Toolbar.css
│   └── ColorPalette.jsx / ColorPalette.css
├── hooks/
│   └── useVoxelState.js
└── utils/
    ├── voxelUtils.js
    └── exportGLB.js
```

## Core Data Structure
```
resolution: 16 | 32 | 48 | 64
frontGrid, sideGrid, topGrid: Uint8Array[res * res]  (binary: filled/empty)
pieces: [{ id, name, voxels: Uint8Array[res^3] }]
editingPieceId: string | null
modelVoxels: Uint8Array[res^3]  (binary: filled/empty)
modelColors: Uint8Array[res^3]  (color index per voxel)
history: [{ modelVoxels, modelColors, pieces }[]]
historyIndex: number
palette: string[16]
selectedColor: number
tool: 'draw' | 'erase' | 'paint'
cameraMode: 'perspective' | 'isometric'
```

## Workflow
1. Draw on 3 orthogonal grids (front/side/top) with depth sliders
2. Intersection algorithm: voxel at (x,y,z) exists only if frontGrid[x,y] AND sideGrid[z,y] AND topGrid[x,z] are filled
3. Piece preview shows solid 3D render of current piece
4. Model preview shows assembled pieces (solid) + current piece (semi-transparent overlay)
5. Push: merge piece into model (additive only - never overwrites), add to pieces list, save history, clear grids
6. Click piece in list to edit: loads into grids, model updates live, done button to finalize
7. Paint: left-click voxel on model to color, right-click to erase
8. Camera toggle: perspective / isometric on model viewport
9. Undo/Redo: full history stack
10. Save/Load: .voxproj JSON file + localStorage auto-save
11. Export: GLB with vertex colors for Unity

## UI Layout
```
┌──────────────────────────────── Toolbar ────────────────────────────┐
│ [16|32|48|64] [Draw][Erase][Paint] [Palette]                        │
│ [New Project][New Piece][Import][Export .voxproj][Export .glb]      │
│ [Undo][Redo] [Cam: Persp/Iso]                                       │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  FRONT (XY)  │  SIDE (ZY)   │  TOP (XZ)    │  PIECE PREVIEW (3D)   │
│  [canvas]    │  [canvas]    │  [canvas]    │  [solid piece]        │
│  Z slider    │  X slider    │  Y slider    │  [Done Editing]       │
├──────────────┴──────────────┴──────────────┼────────────────────────┤
│  ┌─ Piece List ──────────────────────────┐ │  MODEL PREVIEW (3D)   │
│  │ [thumb] Name    [Rename][Delete]      │ │  [persp/iso, rotatable│
│  │ [thumb] Name    [Rename][Delete]      │ │  solid + ghost overlay│
│  └───────────────────────────────────────┘ │                       │
└────────────────────────────────────────────┴────────────────────────┘
```

## Key Behaviors
- Additive merge: new pieces only fill empty cells, never erase other pieces
- Live editing: model recomputes from all pieces + current editing piece
- Paint only works on existing voxels (clicking empty space does nothing)
- Resolution set on new project only (cannot change mid-work)
- Auto-save to localStorage on every state change
