import Button from '../../components/ui/Button';
import { NumberInput } from '../../components/ui/Fields';
import Icon from '../../components/ui/Icon';
import type { PreviewState } from './types';
import styles from './Workspace.module.css';
export const restPreview = (): PreviewState => ({
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
  change
}: {
  preview: PreviewState;
  change: (changes: Partial<PreviewState>) => void;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelTitle}>MOTION REHEARSAL</div>
      <div className={styles.inspector}>
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
        <p className={styles.help}>
          Temporary preview poses are never saved or exported. The floor grid is one gameplay tile
          per 16 voxels at the default scale.
        </p>
      </div>
    </section>
  );
}
