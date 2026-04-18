import { useRef } from 'react';
import { exportModelAsGLB, exportProject, importProject, serializeState } from '../utils/exportGLB';
import './Toolbar.css';

const RESOLUTIONS = [16, 32, 48, 64];

export default function Toolbar({
  state,
  onNewProject,
  onNewPiece,
  onPushPiece,
  onUndo,
  onRedo,
  onSetTool,
  onSetCameraMode,
  onImportProject,
  hasPieceVoxels,
}) {
  const fileInputRef = useRef(null);

  const handleExportGLB = () => {
    exportModelAsGLB(state.modelVoxels, state.modelColors, state.palette, state.resolution)
      .catch((err) => alert('Export failed: ' + err.message));
  };

  const handleExportProject = () => {
    const data = serializeState(state);
    exportProject(data);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importProject(file);
      onImportProject(data);
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
    e.target.value = '';
  };

  const handleResolutionChange = (e) => {
    const newRes = Number(e.target.value);
    if (newRes !== state.resolution) {
      if (confirm('Changing resolution will clear the project. Continue?')) {
        onNewProject(newRes);
      }
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <label className="toolbar-label">Resolution</label>
        <select
          className="toolbar-select"
          value={state.resolution}
          onChange={handleResolutionChange}
        >
          {RESOLUTIONS.map((r) => (
            <option key={r} value={r}>{r}x{r}</option>
          ))}
        </select>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <label className="toolbar-label">Tools</label>
        <button
          className={`toolbar-btn ${state.tool === 'draw' ? 'active' : ''}`}
          onClick={() => onSetTool('draw')}
          title="Draw"
        >
          Draw
        </button>
        <button
          className={`toolbar-btn ${state.tool === 'erase' ? 'active' : ''}`}
          onClick={() => onSetTool('erase')}
          title="Erase"
        >
          Erase
        </button>
        <button
          className={`toolbar-btn ${state.tool === 'paint' ? 'active' : ''}`}
          onClick={() => onSetTool('paint')}
          title="Paint Model"
        >
          Paint
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <label className="toolbar-label">Camera</label>
        <button
          className={`toolbar-btn ${state.cameraMode === 'perspective' ? 'active' : ''}`}
          onClick={() => onSetCameraMode('perspective')}
          title="Perspective"
        >
          P
        </button>
        <button
          className={`toolbar-btn ${state.cameraMode === 'isometric' ? 'active' : ''}`}
          onClick={() => onSetCameraMode('isometric')}
          title="Isometric"
        >
          I
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <label className="toolbar-label">Project</label>
        <button className="toolbar-btn" onClick={handleImportClick} title="Import">
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".voxproj,.json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button className="toolbar-btn" onClick={handleExportProject} title="Export Project">
          Save
        </button>
        <button className="toolbar-btn" onClick={() => onNewProject(state.resolution)} title="New Project">
          New
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <label className="toolbar-label">Piece</label>
        {state.editingPieceId ? (
          <>
            <button className="toolbar-btn accent" onClick={onPushPiece} title="Finish Editing">
              Done
            </button>
            <button className="toolbar-btn" onClick={onPushPiece} title="Cancel">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="toolbar-btn" onClick={onNewPiece} title="New Piece">
              New Piece
            </button>
            {hasPieceVoxels && (
              <button className="toolbar-btn accent" onClick={onPushPiece} title="Push Piece to Model">
                Push
              </button>
            )}
          </>
        )}
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <label className="toolbar-label">History</label>
        <button
          className="toolbar-btn"
          onClick={onUndo}
          disabled={state.historyIndex < 0}
          title="Undo"
        >
          Undo
        </button>
        <button
          className="toolbar-btn"
          onClick={onRedo}
          disabled={state.historyIndex >= state.history.length - 1}
          title="Redo"
        >
          Redo
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <label className="toolbar-label">Export</label>
        <button className="toolbar-btn export" onClick={handleExportGLB} title="Export as GLB for Unity">
          Export GLB
        </button>
      </div>
    </div>
  );
}
