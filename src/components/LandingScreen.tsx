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

      <section className={styles.panel}>
        <h1 className={styles.title}>Voxel editor</h1>
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
        <div className={styles.actions}>
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
      </section>
    </main>
  );
}
