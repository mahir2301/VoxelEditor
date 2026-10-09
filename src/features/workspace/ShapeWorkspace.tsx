import Grid2D from '../../components/Grid2D';
import Button from '../../components/ui/Button';
import { Choice } from '../../components/ui/Fields';
import { computePieceVoxels } from '../../domain/voxel/model';
import AssemblyViewport from '../viewport/AssemblyViewport';
import type { WorkspaceProps } from './types';
import styles from './Workspace.module.css';
export default function ShapeWorkspace({ state, dispatch }: WorkspaceProps) {
  const voxels = computePieceVoxels(
    state.frontGrid,
    state.sideGrid,
    state.topGrid,
    state.resolution
  );
  return (
    <div className={styles.shape}>
      <div className={styles.shapeHeader}>
        <div>
          <strong>{state.editingPieceId ? 'Edit piece shape' : 'Create a piece'}</strong>
          <p className={styles.help}>A voxel exists where Front, Side and Top all intersect.</p>
        </div>
        {!state.editingPieceId && (
          <Choice
            label="Add geometry to"
            value={state.draftPartId}
            options={state.parts
              .filter((p) => p.kind === 'part')
              .map((p) => ({ id: p.id, label: p.name }))}
            onChange={(partId) => dispatch({ type: 'SET_DRAFT_PART', partId })}
          />
        )}
        <Button
          variant="accent"
          isDisabled={!voxels.some(Boolean)}
          onPress={() => dispatch({ type: state.editingPieceId ? 'FINISH_EDITING' : 'PUSH_PIECE' })}
        >
          {state.editingPieceId ? 'Apply changes' : 'Add piece'}
        </Button>
        <Button onPress={() => dispatch({ type: 'CANCEL_EDITING' })}>Cancel draft</Button>
      </div>
      <div className={styles.projections}>
        {(['front', 'side', 'top'] as const).map((view) => (
          <Grid2D
            key={view}
            gridData={state[`${view}Grid`]}
            label={view === 'front' ? 'Front · +Z' : view === 'side' ? 'Side · +X' : 'Top · +Y'}
            view={view}
            size={state.resolution}
            tool={state.tool}
            onViewClick={() =>
              dispatch({ type: 'SET_CAMERA_VIEW', view: view === 'side' ? 'right' : view })
            }
            onSetCell={(index, value) => dispatch({ type: 'SET_CELL', grid: view, index, value })}
            onFillCell={(index, value) => dispatch({ type: 'FILL_CELL', grid: view, index, value })}
            onBegin={() => dispatch({ type: 'BEGIN_TRANSACTION' })}
            onEnd={() => dispatch({ type: 'END_TRANSACTION' })}
          />
        ))}
      </div>
      <div className={styles.draftPreview}>
        <AssemblyViewport
          state={state}
          dispatch={dispatch}
          draft={voxels}
          selected={[]}
          select={() => {}}
          hidden={new Set()}
          locked={new Set()}
          tool="select"
          snap={1}
          focusToken={0}
        />
      </div>
    </div>
  );
}
