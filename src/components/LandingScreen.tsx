import { useCallback, useState } from 'react';
import { FileTrigger } from 'react-aria-components';
import type { SerializedProject } from '../features/editor/state/types';
import { importProject } from '../features/export/projectFiles';
import Button from './ui/Button';
import ConfirmDialog from './ui/ConfirmDialog';
import Icon from './ui/Icon';
import SelectField from './ui/SelectField';
import styles from './LandingScreen.module.css';

const RESOLUTIONS = [16, 32, 48, 64];
const RESOLUTION_OPTIONS = RESOLUTIONS.map((value) => ({ label: `${value}x${value}`, value }));
const ACCEPTED_PROJECT_TYPES = ['.voxproj', '.json'];

interface Props {
  resolution: number;
  hasAutosave: boolean;
  onResolutionChange: (resolution: number) => void;
  onCreateProject: () => void;
  onLoadProject: (project: SerializedProject) => void;
  onLoadAutosave: () => void;
}

interface ImportErrorDialogState {
  summary: string;
  details?: string;
}

function buildImportErrorDialogState(message: string): ImportErrorDialogState {
  if (message.startsWith('Invalid JSON:')) {
    return {
      summary: 'The file is not valid JSON.',
      details: message
    };
  }

  if (message.startsWith('Project schema validation failed:')) {
    return {
      summary: 'The file does not match the expected voxel project format.',
      details: message
    };
  }

  if (message.startsWith('Project consistency validation failed:')) {
    return {
      summary: 'The file contains inconsistent project data for its resolution/palette.',
      details: message
    };
  }

  return {
    summary: 'The file could not be imported as a voxel project.',
    details: message
  };
}

export default function LandingScreen({
  resolution,
  hasAutosave,
  onResolutionChange,
  onCreateProject,
  onLoadProject,
  onLoadAutosave
}: Props) {
  const [importError, setImportError] = useState<ImportErrorDialogState | null>(null);
  const [importing, setImporting] = useState(false);

  const closeImportError = useCallback(() => {
    setImportError(null);
  }, []);

  const handleImport = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) {
        return;
      }
      setImporting(true);
      try {
        const project = await importProject(file);
        onLoadProject(project);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setImportError(buildImportErrorDialogState(message));
      } finally {
        setImporting(false);
      }
    },
    [onLoadProject]
  );

  return (
    <main className={styles.root}>
      <ConfirmDialog
        isOpen={Boolean(importError)}
        title="Import failed"
        description={importError?.summary || ''}
        details={importError?.details}
        cancelLabel="Close"
        onCancel={closeImportError}
      />

      <div className={styles.shell}>
        <header className={styles.brand}>
          <span>
            <Icon name="cube" size={24} />
          </span>
          Voxel editor <small>ASSEMBLY WORKSPACE</small>
        </header>
        <div className={styles.layout}>
          <section className={styles.intro}>
            <p className={styles.eyebrow}>FROM VOXELS TO MOVING PARTS</p>
            <h1 className={styles.headline}>
              Build shapes.
              <br />
              Assemble motion.
            </h1>
            <p className={styles.description}>
              A focused workspace for voxel models with real hierarchy, precise pivots, and moving
              parts.
            </p>
            <ol className={styles.workflow}>
              <li>
                <Icon name="shape" size={20} />
                <div>
                  <strong>Shape</strong>
                  <p>Draw three views. Create solid voxel pieces.</p>
                </div>
                <span>01</span>
              </li>
              <li>
                <Icon name="cube" size={20} />
                <div>
                  <strong>Assemble</strong>
                  <p>Group geometry. Place pivots and sockets.</p>
                </div>
                <span>02</span>
              </li>
              <li>
                <Icon name="play" size={20} />
                <div>
                  <strong>Preview</strong>
                  <p>Rehearse movement. Export your assembly.</p>
                </div>
                <span>03</span>
              </li>
            </ol>
          </section>
          <section className={styles.card}>
            <h2 className={styles.title}>Your next assembly</h2>
            <p className={styles.subtitle}>Start fresh or pick up an editable project.</p>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <Icon name="plus" />
                Create a project
              </h3>
              <div className={styles.row}>
                <SelectField
                  label="Resolution"
                  value={resolution}
                  options={RESOLUTION_OPTIONS}
                  onChange={onResolutionChange}
                />
                <Button variant="accent" onPress={onCreateProject}>
                  <Icon name="plus" />
                  Create project
                </Button>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <Icon name="folder" />
                Open a project
              </h3>
              <div className={styles.row}>
                <FileTrigger acceptedFileTypes={ACCEPTED_PROJECT_TYPES} onSelect={handleImport}>
                  <Button isDisabled={importing}>
                    <Icon name="folder" />
                    {importing ? 'Importing…' : 'Load project'}
                  </Button>
                </FileTrigger>
                <Button isDisabled={!hasAutosave || importing} onPress={onLoadAutosave}>
                  <Icon name="rotate" />
                  Load autosave
                </Button>
              </div>
              <p className={styles.hint}>Editable .voxproj and legacy JSON projects</p>
            </div>
            <p className={styles.localNote}>
              <Icon name="lock" size={13} />
              Projects stay on your device.
            </p>
          </section>
        </div>
        <footer className={styles.footer}>
          <span>Voxel geometry · Rigid assemblies · glTF export</span>
          <span>Built with React Aria Components</span>
        </footer>
      </div>
    </main>
  );
}
