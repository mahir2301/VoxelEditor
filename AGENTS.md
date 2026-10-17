# Project instructions

Start with README.md for the implemented workflow and architecture. Keep documentation aligned with code. Use Conventional Commits for coherent completed changes.

## Stack and verification

Vite 8, React 19 with React Compiler, TypeScript, Three.js, React Three Fiber/Drei, React Aria and ArkType. Use npm/package-lock.json. Run format, lint, typecheck, test and build for behavioral changes. Document checks that cannot run.

## State ownership

`features/editor/state/types.ts` owns version 4 document/action types. The orchestration reducer delegates projection edits to draftReducer and assembly changes to assemblyReducer. History owns explicit document snapshots, capped at 200. BEGIN/END/CANCEL_TRANSACTION groups strokes/drags. Never mutate shared buffers; copy edited occupancy/colors. UI state must not enter snapshots or exports. Persistence keeps the existing autosave key with a 300 ms debounce; hydration validates external JSON before converting arrays.

Schema/migrations live in projectSchema/legacySchema. Keep version 1/2/3 migration coverage and reject future versions. Every piece owns local geometry/colors and one part. Part parents must be real parts, never sockets; reject cycles/duplicate IDs/missing parents. Reparent/pivot operations preserve world poses through assembly math. Export names derive from stable IDs, never display names.

## Geometry and export

Projection semantics remain front +Z, side +X (including its Z flip), top +Y; occupancy is their three-way intersection. Geometry/export share utils/voxelUtils.ts and outward CCW glTF winding. Retain faces between moving pieces. Dispose owned geometries and exported temporary resources. Use cached triangle-to-voxel ownership for painting.

`features/export` owns assembly scene, sidecar paths and downloads; binary GLTFExporter stays lazy. Export rest poses, world units, hierarchy and sockets; never export UI markers or temporary preview transforms. Game presentation contracts are owned by the sibling voxel-td docs/technical/18-assets-and-tooling.md; authoritative gameplay stays outside editor/model metadata.

## UI

Use React Aria wrappers in components/ui and CSS Modules. The shared slate-blue theme is owned by src/theme/tokens.css; read canvas UI colors through src/theme/canvas.ts. Do not hardcode a second component palette. Use React Aria collection/disclosure controls for hierarchy, tabs and collapsible panels; keep keyboard focus, selection and drag behavior accessible. Workspace panels and viewport collaborators each own a focused responsibility. Preserve native input focus: shortcuts must not hijack text fields/dialogs. React Compiler manages routine JSX memoization; use explicit memoization where it expresses owned expensive geometry/cache lifetimes. Hide/lock/isolation/selection and preview are transient UI state.
