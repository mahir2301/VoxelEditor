import { OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo, useRef, useEffect } from 'react';
import { Group, Object3D } from 'three';
import { AssemblyScene } from './AssemblyScene';
import type { ViewportProps } from './types';
import styles from '../workspace/Workspace.module.css';
export default function AssemblyViewport(props: ViewportProps) {
  const objects = useMemo(() => new Map<string, Object3D>(), []),
    root = useRef<Group>(null);
  const { dispatch } = props;
  useEffect(() => {
    const end = () => dispatch({ type: 'END_TRANSACTION' });
    window.addEventListener('pointerup', end);
    window.addEventListener('blur', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('blur', end);
    };
  }, [dispatch]);
  const isometric = Boolean(props.preview) || props.state.cameraMode === 'isometric';
  return (
    <div
      className={styles.viewport}
      onContextMenu={(e) => e.preventDefault()}
      onPointerUp={() => props.dispatch({ type: 'END_TRANSACTION' })}
      onPointerCancel={() => props.dispatch({ type: 'END_TRANSACTION' })}
    >
      <Canvas
        onPointerMissed={(event) => {
          if (event.button === 0 && !props.preview) props.clearSelection?.();
        }}
      >
        <>
          {isometric ? (
            <OrthographicCamera
              makeDefault
              position={[30, 30, 30]}
              zoom={16}
              near={0.1}
              far={1000}
            />
          ) : (
            <PerspectiveCamera makeDefault position={[30, 30, 30]} fov={40} near={0.1} far={1000} />
          )}
          <AssemblyScene {...props} objects={objects} root={root} />
        </>
      </Canvas>
      <div className={styles.viewportHint}>
        Right drag orbit · Middle / Shift-right drag pan · Scroll zoom
      </div>
    </div>
  );
}
