import { FileTrigger } from 'react-aria-components';
import { importProject } from '../utils/exportGLB';
import type { SerializedProject } from '../features/editor/state/types';
import Button from './ui/Button';
import SelectField from './ui/SelectField';
import styles from './LandingScreen.module.css';

const RESOLUTIONS = [16, 32, 48, 64];

interface Props {
  resolution: number;
  hasAutosave: boolean;
  onResolutionChange: (resolution: number) => void;
  onCreateProject: () => void;
  onLoadProject: (project: SerializedProject) => void;
  onLoadAutosave: () => void;
}

export default function LandingScreen({
  resolution,
  hasAutosave,
  onResolutionChange,
  onCreateProject,
  onLoadProject,
  onLoadAutosave,
}: Props) {
  const handleImport = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const project = await importProject(file);
      onLoadProject(project);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      window.alert(`Import failed: ${message}`);
    }
  };

  return (
    <main className={styles.root}>
      <section className={styles.card}>
        <h1 className={styles.title}>Voxel Editor</h1>
        <p className={styles.subtitle}>Start a new project, open a saved file, or continue from autosave.</p>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>New Project</h2>
          <div className={styles.row}>
            <SelectField
              label="Resolution"
              value={resolution}
              options={RESOLUTIONS.map((value) => ({ value, label: `${value}x${value}` }))}
              onChange={onResolutionChange}
            />
            <Button variant="accent" onPress={onCreateProject}>Create Project</Button>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Open Project</h2>
          <div className={styles.row}>
            <FileTrigger acceptedFileTypes={['.voxproj', '.json']} onSelect={handleImport}>
              <Button>Load Project</Button>
            </FileTrigger>
            <Button isDisabled={!hasAutosave} onPress={onLoadAutosave}>Load Autosave</Button>
          </div>
        </div>
      </section>
    </main>
  );
}
