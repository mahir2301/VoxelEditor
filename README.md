# Voxel Assembly Editor

Create voxel pieces from three silhouettes, assemble rigid moving parts, and export towers, players and interchangeable weapons to Godot. The workspace has Shape, Assemble and Preview modes, an editable hierarchy, local transform/pivot controls, piece-local painting, sockets and motion bindings. Rapid/frost/beam towers, a player and Pulse/Arc weapon starters are included.

## Run

Use a Node version supported by Vite 8 (Node 20.19+ or 22.12+), then:

```sh
npm ci
npm run dev
```

Open the printed local URL. Save `.voxproj` files for editable backups. Browser autosave flushes on page hide but may reach localStorage quota for large models; storage failures are shown in the editor.

## Author a tower

1. Create a project, load your existing `.voxproj` / legacy JSON, or open a tower starter. Versions 1/2 migrate automatically to version 4 with a Base rigid part and per-piece copies of the original colors. Arbitrary GLB import/voxelization is not implemented.
2. In **Shape**, draw Front (+Z), Side (+X) and Top (+Y). The three-way intersection creates a geometry piece. Choose its owning part and **Add piece** / **Apply changes**. Double-click pieces to edit their silhouettes. Reconstructing silhouettes can fill holes that the projections cannot represent.
3. In **Assemble**, create rigid parts, group pieces and drag them into a hierarchy. Reparenting preserves world pose. Use local Move/Rotate or numeric fields. **Pivot** relocates a part origin while preserving its geometry/children. Typical hierarchy: Base → Turret (yaw Y) → Hinge (pitch X) → Barrel (recoil Z) → Muzzle socket.
4. Add empty sockets with role **ProjectileOrigin**, local −Z pointing out of the barrel. Mark luminous parts **Energy glow / dim**. Other exported roles are EnergyConnector and HealthbarAnchor; the game currently only consumes ProjectileOrigin for attachment effects.
5. In **Preview**, test yaw, pitch, recoil/fire, play/pause, power and four camera orientations. Preview does not change saved or exported rest poses. Apply or cancel drafts before exporting. Overlap warnings compare coincident voxel centers across rigid parts; they do not detect every rotated or swept collision.
6. Click empty viewport space to clear selection and set the project/export name, e.g. `rapid`. At 16 voxels per world unit, 16 voxel widths equal one gameplay tile. Center the model on X/Z and place its bottom at local Y=0; forward is −Z.
7. **Save project** produces the editable `.voxproj`. **Export GLB** and **Export bindings** produce a matching `.glb` and `.presentation.json`; export both from the same project state. Hide/isolate affect the editor only; Include/Exclude explicitly controls export.
8. Copy both files into the game’s `Game.Client/assets/base/blocks/`, using `rapid`, `frost` or `beam` to replace a shipped tower. Let Godot import the GLB, restart the game and press F5. Metadata is cached until process restart.

The complete game contract and validation commands are owned by [`voxel-td/docs/technical/18-assets-and-tooling.md`](../voxel-td/docs/technical/18-assets-and-tooling.md). Art never changes footprint, collision, range, damage or authoritative projectile origin. A new gameplay tower needs a registered content definition in the game.

## Players and weapons

Open **Player**, **Pulse weapon** or **Arc weapon** in a project. These starters share the existing workspace; custom projects can choose Generic/Tower/Player/Weapon in the inspector with selection cleared. Version 4 adds profiles, rig roles, team tags and local hold/fire/knockout pose offsets. Versions 1/2/3 migrate without guessing the profile from names. Generic and Tower continue to export v1 sidecars; Player/Weapon export v2 metadata.

1. Build independent player and weapon projects. Players require Torso, Head, LeftArm, RightArm, LeftLeg and RightLeg parts plus a HandGrip socket. Weapons require PrimaryGrip and ProjectileOrigin sockets. Keep the primary grip outside moving mechanisms. Use 16 voxels/world unit, player feet at Y=0 and forward −Z.
2. Select a part to add a sized **Box**, mirror/duplicate along parent-local X/Y/Z, or relocate its pivot to bottom/center/top bounds. Assign mirrored limb/socket roles explicitly; duplicate roles are cleared. Use **Add voxel / Remove voxel** on faces for direct edits, or numeric voxel indices on a piece to edit empty cells. Each stroke is one undo step. Unchanged projection apply preserves carved holes; changing silhouettes explicitly reconstructs occupancy.
3. Assign **Rig role** and edit **Pose offset** hold/fire/knockout angles on player parts. Mark **Team color** only on parts whose directly owned geometry should change team color. Mechanical recoil/spin stays on weapon parts; the rigid player preset owns walking, aiming and pose blending.
4. Set the player's hand frame and the weapon's primary grip frame. On PrimaryGrip, **Hand pose offset** hold/fire adjusts the player's right arm for that weapon. SupportGrip is an optional manual fitting marker; automatic IK is not implemented.
5. In Preview, **Load companion** loads the opposite profile's saved `.voxproj`. The grip follows the hand in either editing direction. Companion data is temporary and separate from undo/save/export. Test movement speed with Play/Pause, yaw/pitch, fire, hit appearance, knockout, reset and all four camera views. Save/reload a companion to see its edits.
6. Save both sources and export matching GLB/bindings pairs separately. The game's default player is `Game.Client/assets/base/players/default.glb`; weapon paths are `Game.Client/assets/base/weapons/pulse.glb` and `arc.glb`, each with a same-basename `.presentation.json`. Restart after Godot import. New gameplay weapon registration is separate from model authoring.

The full [manual game workflow and validation commands](../voxel-td/docs/technical/18-assets-and-tooling.md#player-and-weapon-authoring) are owned by the game tooling specification. In-game aim currently supplies horizontal facing; preview pitch prepares poses but does not add vertical aim replication. Skeletal skinning, full timelines, automatic IK and holstered loadouts remain outside this rigid workflow.

## Controls

| Action                         | Control                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| Orbit / pan / zoom             | Right drag / middle or Shift-right drag / scroll                  |
| Select multiple                | Shift-click hierarchy ranges; Command/Ctrl-click individual nodes |
| Select / move / rotate / pivot | V / G / R / B                                                     |
| Paint / paint fill / focus     | P / Shift-P / F                                                   |
| Shape draw / erase             | D / E                                                             |
| Shape fill / fill erase        | Shift-D / Shift-E                                                 |
| Apply draft                    | Command/Ctrl-Enter                                                |
| Duplicate / delete             | Command/Ctrl-D / Delete                                           |
| Undo / redo                    | Command/Ctrl-Z / Command/Ctrl-Shift-Z                             |
| Cancel transform               | Escape                                                            |

The React Aria hierarchy supports search, arrow-key navigation/collapse, typeahead, range/multiple selection, pointer and keyboard drag reparenting, grouping, duplicate/delete subtree, hide, lock and isolate. Letters type ahead to matching hierarchy nodes while the tree has focus; single-letter viewport tool shortcuts apply outside the tree. Use a row’s Move handle, press Enter, navigate drop targets with Tab, and press Enter to drop or Escape to cancel. Double-click a geometry piece or use its Edit shape action to edit projections. Translation snaps to one voxel, half a voxel or free; enabled snapping uses 15° rotation increments. Scale stays one. One stroke/drag produces one undo step. View/tool/selection and preview changes stay outside history and serialization. Export does not mark the editable project saved.

## Interface design

The home screen provides resolution, create, load and autosave controls. The workspace keeps functional labels and actionable warnings; promotional copy, help text, shortcut hints and footers are omitted. Keyboard shortcuts are available from the toolbar or Shift+H in a grouped dialog with platform-aware TanStack Hotkeys keycaps. Displayed shortcuts and handlers share `features/editor/hotkeys.ts`. Controls and workflow are also documented above.

The editor uses neutral grayscale light and dark themes across the home screen, workspace, projection canvases, menus and dialogs. The system color scheme selects the theme and updates it live, including mounted 2D canvases and the 3D viewport. `src/theme/tokens.css` owns colors, spacing, radii, focus and popup shadows; CSS Modules consume those tokens. `src/theme/canvas.ts` reads the same CSS tokens for 2D canvas/Three.js editor accents; `src/theme/useCanvasTheme.ts` shares a system-scheme subscription and cached colors across canvas consumers. Authored model colors, energy appearance and conventional XYZ axis colors remain artwork/presentation data.

All interface controls are built with `react-aria-components`: Tabs, Tree/TreeItem with drag-and-drop hooks, Button/Tooltip, TextField/NumberField/Select, palette ToggleButtonGroup/ColorPicker, Disclosure and Modal/Dialog. Shared wrappers live in `components/ui`; numeric fields include accessible stepper buttons. Both select variants share the same implementation. Interactive states use React Aria data attributes. Icon-only actions have labels/tooltips; focus is visible, dialogs support Escape, motion respects reduced-motion preferences, and compact layouts stack the inspector below the workspace rather than clipping it.

Use the shared tokens and wrappers for future UI work. Contrasting grayscale fills, borders and focus outlines identify selection/primary actions; amber and red are reserved for warnings and destructive actions. Do not add a second theme through component-specific color overrides. Canvas pointer editing remains custom geometry interaction, independent of the React Aria control layer.

## Internals

- `features/editor/state`: versioned document types, ArkType validation/migration, reducers, bounded immutable history and persistence.
- `domain/voxel`: projection and painting math.
- `domain/assembly`: transforms, hierarchy/pivot operations, motion preview, checks and starters.
- `features/workspace`: hierarchy, inspector, modes, lifecycle toolbar and shortcuts.
- `features/viewport`: camera framing, hierarchical motion groups, piece rendering/hit ownership and gizmos.
- `features/export`: shared assembly scene, stable node paths and presentation sidecar; `utils/exportGLB.ts` loads the binary exporter on demand.
- `utils/voxelUtils.ts`: shared outward-CCW mesh builder, internal-face culling within each piece and cached triangle-to-voxel painting lookup.

Version 4 owns separate local occupancy/colors for each geometry piece; every piece belongs to one rigid part. Parts/sockets own local position/rotation and stable IDs. Export uses a VoxelAssembly root, world-unit translations and ID-derived node names. Display names remain glTF extras, so renaming does not break bindings. Pieces remain separate meshes, including within a rigid part; cross-piece merging is a future optimization. Independently moving parts retain their contacting faces.

React Compiler is enabled through the Vite Babel plugin. The lint configuration retains type/correctness/hooks checks and avoids rules demanding manual memoization of compiler-managed JSX callbacks. Vite emits a large-chunk warning for the 3D workspace/runtime; production build succeeds. Timelines, skeletal rigs and GLB-to-voxel import remain outside this rigid-assembly workflow.

## Checks and examples

```sh
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

Tests exercise projection semantics, version migrations, validation, hierarchy/pivot invariants, local paint, transactions, mesh winding/hit ownership, export exclusions, scale and motion bindings. Browser checks should also cover pointer interactions, project save/load and exports.

Editable starter sources are committed in `examples/*.voxproj`. Regenerate exports beside them:

```sh
npm run examples
```

To replace the six game fixtures directly from those saved sources:

```sh
npm run examples -- /Users/lex/Projects/voxel-td
```

The script reads existing tower/player/weapon example projects, preserving their stable IDs; it creates missing sources from the starter generator. It overwrites matching GLBs/sidecars at the selected destination.
