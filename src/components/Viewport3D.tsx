import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { buildVoxelGeometry, getVoxelIndexFromHit } from '../utils/voxelUtils';
import type { CameraView } from '../features/editor/state/types';
import styles from './Viewport3D.module.css';

interface VoxelMeshProps {
  voxels: Uint8Array;
  colors?: Uint8Array | null;
  palette: string[];
  resolution: number;
  opacity?: number;
  solidColor?: string;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
}

interface SceneContentProps {
  mode: 'model' | 'piece';
  modelVoxels?: Uint8Array;
  editingPieceVoxels?: Uint8Array | null;
  modelColors?: Uint8Array;
  pieceVoxels?: Uint8Array;
  palette: string[];
  resolution: number;
  onVoxelClick?: (event: ThreeEvent<PointerEvent>) => void;
}

interface Props {
  mode: 'model' | 'piece';
  modelVoxels?: Uint8Array;
  editingPieceVoxels?: Uint8Array | null;
  modelColors?: Uint8Array;
  pieceVoxels?: Uint8Array;
  palette: string[];
  resolution: number;
  cameraView: CameraView;
  onVoxelClick?: (index: number) => void;
}

function VoxelMesh({ voxels, colors, palette, resolution, opacity = 1, solidColor, onPointerDown }: VoxelMeshProps) {
  const geometry = useMemo(() => {
    const colorBuffer = solidColor ? null : (colors || voxels);
    return buildVoxelGeometry(voxels, colorBuffer, palette, resolution);
  }, [colors, palette, resolution, solidColor, voxels]);

  if (!geometry.attributes.position?.count) return null;

  return (
    <mesh geometry={geometry} onPointerDown={onPointerDown}>
      <meshStandardMaterial
        vertexColors={!solidColor}
        color={solidColor || '#ffffff'}
        transparent={opacity < 1}
        opacity={opacity}
        roughness={0.48}
        metalness={0}
        depthWrite={opacity >= 1}
      />
    </mesh>
  );
}

function CameraController({ cameraView, resolution, controlsRef }: {
  cameraView: CameraView;
  resolution: number;
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (!controlsRef.current) return;
    const distance = resolution * 2.5;
    const position = {
      front: [0, 0, distance],
      back: [0, 0, -distance],
      right: [distance, 0, 0],
      left: [-distance, 0, 0],
      top: [0, distance, 0],
      bottom: [0, -distance, 0],
      isometric: [distance, distance, distance],
      perspective: [distance * 1.2, distance * 0.8, distance * 1.2],
    };

    const [x, y, z] = position[cameraView] || position.perspective;
    camera.position.set(x, y, z);
    camera.up.set(0, cameraView === 'top' || cameraView === 'bottom' ? 0 : 1, cameraView === 'top' || cameraView === 'bottom' ? -1 : 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }, [camera, cameraView, controlsRef, resolution]);

  return null;
}

function SceneContent({
  mode,
  modelVoxels,
  editingPieceVoxels,
  modelColors,
  pieceVoxels,
  palette,
  resolution,
  onVoxelClick,
}: SceneContentProps) {
  const bounds = useMemo(() => new THREE.BoxGeometry(resolution, resolution, resolution), [resolution]);

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[11, 16, 10]} intensity={0.95} />
      <directionalLight position={[-8, 10, -8]} intensity={0.45} />

      <lineSegments>
        <edgesGeometry args={[bounds]} />
        <lineBasicMaterial color="#35506c" transparent opacity={0.55} />
      </lineSegments>

      <gridHelper args={[resolution, resolution, '#56728f', '#2a4058']} position={[0, -resolution / 2, 0]} />

      {mode === 'model' && modelVoxels && (
        <VoxelMesh
          voxels={modelVoxels}
          colors={modelColors}
          palette={palette}
          resolution={resolution}
          onPointerDown={onVoxelClick}
        />
      )}

      {mode === 'model' && editingPieceVoxels && (
        <VoxelMesh
          voxels={editingPieceVoxels}
          palette={['#000', '#9de6d6']}
          resolution={resolution}
          solidColor="#7ad6c6"
          opacity={0.35}
        />
      )}

      {mode === 'piece' && pieceVoxels && (
        <VoxelMesh
          voxels={pieceVoxels}
          colors={null}
          palette={palette}
          resolution={resolution}
          solidColor="#5ca0d8"
        />
      )}
    </>
  );
}

export default function Viewport3D({
  mode,
  modelVoxels,
  editingPieceVoxels,
  modelColors,
  pieceVoxels,
  palette,
  resolution,
  cameraView,
  onVoxelClick,
}: Props) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const distance = resolution * 2.5;
  const initialPosition = useMemo<[number, number, number]>(
    () => [distance * 1.2, distance * 0.8, distance * 1.2],
    [distance],
  );

  const handleVoxelPointerDown = useMemo(() => {
    if (!onVoxelClick || mode !== 'model' || !modelVoxels) return undefined;
    return (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (event.faceIndex == null) return;
      const voxelIndex = getVoxelIndexFromHit(event.faceIndex, modelVoxels, resolution);
      if (voxelIndex >= 0) onVoxelClick(voxelIndex);
    };
  }, [mode, modelVoxels, onVoxelClick, resolution]);

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <span className={styles.label}>{mode === 'piece' ? 'Piece Preview' : 'Model Preview'}</span>
      </header>
      <div className={styles.canvasWrap}>
        <Canvas gl={{ antialias: true }}>
          <PerspectiveCamera makeDefault fov={45} near={0.5} far={3000} position={initialPosition} />
          <CameraController cameraView={cameraView} resolution={resolution} controlsRef={controlsRef} />

          <SceneContent
            mode={mode}
            modelVoxels={modelVoxels}
            editingPieceVoxels={editingPieceVoxels}
            modelColors={modelColors}
            pieceVoxels={pieceVoxels}
            palette={palette}
            resolution={resolution}
            onVoxelClick={handleVoxelPointerDown}
          />

          <OrbitControls ref={controlsRef} target={[0, 0, 0]} minDistance={2} maxDistance={distance * 5} />
        </Canvas>
      </div>
    </section>
  );
}
