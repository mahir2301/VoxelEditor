# AGENTS

## Fast Start
- Use Node + npm (lockfile is `package-lock.json`).
- Main commands:
  - `npm run dev`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
- There is no test script configured; use `typecheck + lint + build` as the verification baseline.

## Source of Truth
- `README.md` is still the default Vite template and does **not** describe this app.
- Prefer executable config/scripts and live code over prose docs.

## Architecture (What to Edit)
- App entry: `src/main.tsx` -> `src/App.tsx`.
- App flow is split into `landing` and `editor` modes in `App.tsx`.
- State and actions:
  - Types: `src/features/editor/state/types.ts`
  - Reducer: `src/features/editor/state/editorReducer.ts`
  - Undo/redo snapshots: `src/features/editor/state/history.ts`
  - Persistence: `src/features/editor/state/persistence.ts`
  - Hook wiring: `src/hooks/useVoxelState.ts`
- Domain voxel math: `src/domain/voxel/model.ts`.
- Rendering/export utilities:
  - Runtime voxel geometry: `src/utils/voxelUtils.ts`
  - GLB + project import/export: `src/utils/exportGLB.ts`
- UI composition:
  - Feature components in `src/components/*`
  - React Aria styled wrappers in `src/components/ui/*`

## Entry UX
- Landing screen owns project bootstrap (`new`, `load file`, `load autosave`) in `src/components/LandingScreen.tsx`.
- Toolbar intentionally excludes `new/import/resolution`; it only contains in-editor actions (`save/export/back`) in `src/components/Toolbar.tsx`.

## Repo Conventions That Matter
- TypeScript is strict (`tsconfig.json` has `strict: true`, `allowJs: false`). Keep new code typed; avoid `any`.
- Styling is CSS Modules (`*.module.css`) plus global `src/index.css` only.
- Prefer React Aria wrappers (`src/components/ui/Button.tsx`, `SelectField.tsx`, `ConfirmDialog.tsx`) over raw HTML controls when adding UI.
- Color editing uses React Aria `ColorPicker` composition (`ColorPicker`, `ColorArea`, `ColorSlider`, `ColorField`) in `src/components/ColorPalette.tsx`.

## State/Undo-Redo Gotchas
- History is snapshot-based and capped (`MAX_HISTORY = 200` in `history.ts`).
- Mutations that should be undoable must flow through `updateState(..., true)` in `editorReducer.ts`.
- UI-only actions (tool/camera/color toggles) intentionally do not enter history.
- Autosave is debounced (300ms) to localStorage key `voxel-editor-autosave`.
- Rename/delete piece, palette color edits, and project lifecycle actions are part of undo/redo; keep that behavior when refactoring.

## Serialization/Interop Gotchas
- `EditorState` uses `Uint8Array`; serialized project format uses number arrays (`SerializedProject`). Convert carefully at boundaries.
- GLB export intentionally uses flipped face winding for Unity compatibility in `buildVoxelGeometryForExport`.
