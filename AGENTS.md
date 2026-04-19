# AGENTS

## Fast Start

- Stack: Vite + React + TypeScript, npm lockfile at `package-lock.json`.
- Commands: `npm run dev`, `npm run format`, `npm run lint`, `npm run build`.
- Baseline verification is `format + lint` (no dedicated test script).

## Real Source Of Truth

- Treat code/config as authoritative. `README.md` is still template-level and stale.

## Application Flow

- Entry: `src/main.tsx` renders `src/App.tsx`.
- `App.tsx` controls top-level mode split:
  - `landing`: project bootstrap only
  - `editor`: voxel editing workspace
- Landing responsibilities live in `src/components/LandingScreen.tsx`:
  - create by resolution
  - load `.voxproj`/`.json`
  - load autosave

## State Architecture

- Types: `src/features/editor/state/types.ts`
- Reducer + lifecycle actions: `src/features/editor/state/editorReducer.ts`
- History snapshots: `src/features/editor/state/history.ts`
- Persistence/autosave: `src/features/editor/state/persistence.ts`
- Parse boundary validation (ArkType): `src/features/editor/state/projectSchema.ts`
- Hook glue and derived state: `src/hooks/useVoxelState.ts`

## Core Domain/Rendering

- Projection + voxel math: `src/domain/voxel/model.ts`
- Runtime mesh generation + hit mapping: `src/utils/voxelUtils.ts`
- GLB export + project import/export: `src/utils/exportGLB.ts`

## Non-Negotiable Behavior

- Projection semantics must remain:
  - front = `+Z`
  - side = `+X`
  - top = `+Y`
- Piece voxels are the 3-way intersection of front/side/top grids.
- Side-view 2D mapping keeps the Z flip for visual consistency.

## Undo/Redo And Persistence Rules

- History is snapshot-based, capped at `MAX_HISTORY = 200`.
- Any model-affecting mutation must call `updateState(..., true)`.
- UI-only toggles (`SET_TOOL`, camera view/mode, color slot select) stay out of history.
- Autosave is debounced (300ms) to localStorage key `voxel-editor-autosave`.

## Performance Hotspots (Edit Carefully)

- `buildVoxelGeometry` and GLB geometry builders are hot loops.
  - avoid per-voxel object allocations
  - prefer cached palette RGB values
- Grid rendering in `Grid2D.tsx` is canvas-based and redraws often; avoid extra allocations in pointer paths.
- `Viewport3D.tsx` and `App.tsx` are high-churn; keep prop identity stable with memoized callbacks.

## UI Composition Rules

- Use React Aria wrappers from `src/components/ui/*` for controls.
- Styling uses CSS Modules (`*.module.css`); keep `src/index.css` global-only.
- Color editing is via React Aria `ColorPicker` composition in `src/components/ColorPalette.tsx`.
- Toolbar scope is in-editor actions only (`save/export/back`, tools, camera, history, piece actions).

## Serialization Boundaries

- Runtime state uses `Uint8Array`; serialized project shape uses number arrays.
- Validate external JSON through `parseSerializedProject(...)` before hydration.
- GLB export intentionally uses flipped face winding for Unity compatibility.
