import { useState } from 'react';
import { FileTrigger } from 'react-aria-components';
import Button from '../../components/ui/Button';
import { NumberInput } from '../../components/ui/Fields';
import Icon from '../../components/ui/Icon';
import { assertProfile } from '../../domain/assembly/profiles';
import { hydrate } from '../editor/state/document';
import { parseSerializedProjectOrThrow } from '../editor/state/projectSchema';
import type { AssetProfile, ProjectDocument } from '../editor/state/types';
import type { PreviewState } from './types';
import styles from './Workspace.module.css';
export const restPreview = (): PreviewState => ({
  speed: 0,
  knockedOut: false,
  hit: false,
  yaw: 0,
  pitch: 0,
  playing: false,
  powered: true,
  shot: 0,
  reset: 0,
  quarter: 0
});
export default function PreviewControls({
  preview,
  profile,
  companion,
  setCompanion,
  change
}: {
  preview: PreviewState;
  profile: AssetProfile;
  companion: ProjectDocument | null;
  setCompanion: (document: ProjectDocument | null) => void;
  change: (changes: Partial<PreviewState>) => void;
}) {
  const [error, setError] = useState('');
  return (
    <section className={styles.panel}>
      <div className={styles.panelTitle}>PREVIEW</div>
      <div className={styles.inspector}>
        {(profile === 'player' || profile === 'weapon') && (
          <>
            <NumberInput
              label="Movement speed"
              value={preview.speed}
              min={0}
              max={8}
              step={0.25}
              onChange={(speed) => change({ speed })}
            />
            <Button
              isActive={preview.knockedOut}
              onPress={() => change({ knockedOut: !preview.knockedOut })}
            >
              Knockout
            </Button>
            <Button isActive={preview.hit} onPress={() => change({ hit: !preview.hit })}>
              Hit appearance
            </Button>
            <FileTrigger
              acceptedFileTypes={['.voxproj', '.json']}
              onSelect={(files) => {
                const file = files?.[0];
                if (!file) return;
                if (file.size > 64 * 1024 * 1024) {
                  setError('Project files must be smaller than 64 MB.');
                  return;
                }
                void file
                  .text()
                  .then((text) => {
                    const doc = hydrate(parseSerializedProjectOrThrow(JSON.parse(text)));
                    if (doc.profile !== (profile === 'player' ? 'weapon' : 'player'))
                      throw new Error(
                        'Choose a companion with the opposite Player/Weapon profile.'
                      );
                    assertProfile(doc);
                    setCompanion(doc);
                    setError('');
                  })
                  .catch((cause) => setError(String(cause)));
              }}
            >
              <Button>Load companion</Button>
            </FileTrigger>
            {companion && (
              <Button onPress={() => setCompanion(null)}>Remove {companion.name}</Button>
            )}
            {error && <p role="alert">{error}</p>}
          </>
        )}
        <NumberInput
          label="Yaw (degrees)"
          value={preview.yaw}
          min={-180}
          max={180}
          onChange={(yaw) => change({ yaw })}
        />
        <NumberInput
          label="Pitch (degrees)"
          value={preview.pitch}
          min={-90}
          max={90}
          onChange={(pitch) => change({ pitch })}
        />
        <div className={styles.actions}>
          <Button isActive={preview.playing} onPress={() => change({ playing: !preview.playing })}>
            <Icon name={preview.playing ? 'pause' : 'play'} />
            {preview.playing ? 'Pause motion' : 'Play motion'}
          </Button>
          <Button onPress={() => change({ shot: preview.shot + 1 })}>
            <Icon name="fire" />
            Fire / recoil
          </Button>
        </div>
        <Button isActive={!preview.powered} onPress={() => change({ powered: !preview.powered })}>
          <Icon name="power" />
          {preview.powered ? 'Power off' : 'Power on'}
        </Button>
        <Button onPress={() => change({ ...restPreview(), reset: preview.reset + 1 })}>
          <Icon name="rotate" />
          Reset rest pose
        </Button>
        <div className={styles.subheading}>GAME CAMERA</div>
        <div className={styles.actions}>
          {[0, 1, 2, 3].map((quarter) => (
            <Button
              key={quarter}
              isActive={preview.quarter === quarter}
              onPress={() => change({ quarter })}
            >
              {quarter * 90}°
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
