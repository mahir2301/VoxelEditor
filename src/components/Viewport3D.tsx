import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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
  onCameraViewChange?: (view: CameraView) => void;
}

const DEFAULT_PERSPECTIVE_DIRECTION: [number, number, number] = [1, 0.85, 1];

function CameraOrientationSync({ orientationRef }: { orientationRef: MutableRefObject<THREE.Quaternion> }) {
  const { camera } = useThree();

  useFrame(() => {
    orientationRef.current.copy(camera.quaternion).invert();
  });

  return null;
}

function pickViewFromNormal(normal: THREE.Vector3): CameraView {
  const ax = Math.abs(normal.x);
  const ay = Math.abs(normal.y);
  const az = Math.abs(normal.z);
  if (ax >= ay && ax >= az) return normal.x >= 0 ? 'right' : 'left';
  if (ay >= ax && ay >= az) return normal.y >= 0 ? 'top' : 'bottom';
  return normal.z >= 0 ? 'front' : 'back';
}

function OrientationWidget({
  orientationRef,
  onSelectView,
}: {
  orientationRef: MutableRefObject<THREE.Quaternion>;
  onSelectView?: (view: CameraView) => void;
}) {
  const rootRef = useRef<THREE.Group | null>(null);
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(0.88, 0.88, 0.88)), []);

  useFrame(() => {
    if (!rootRef.current) return;
    rootRef.current.quaternion.copy(orientationRef.current);
  });

  const onCubeClick = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const normal = event.face?.normal;
    if (!normal) return;
    onSelectView?.(pickViewFromNormal(normal));
  };

  const makeArrow = (view: CameraView) => () => onSelectView?.(view);

  return (
    <group ref={rootRef}>
      <mesh onPointerDown={onCubeClick}>
        <boxGeometry args={[0.88, 0.88, 0.88]} />
        <meshStandardMaterial color="#1a314a" transparent opacity={0.82} roughness={0.35} metalness={0.2} />
      </mesh>
      <lineSegments>
        <primitive object={edgeGeometry} attach="geometry" />
        <lineBasicMaterial color="#b8d0e8" />
      </lineSegments>

      <group rotation={[0, 0, -Math.PI / 2]}>
        <mesh position={[0, 0.58, 0]} onPointerDown={makeArrow('right')}>
          <cylinderGeometry args={[0.055, 0.055, 1.16, 12]} />
          <meshStandardMaterial color="#ff5d5d" />
        </mesh>
        <mesh position={[0, 1.3, 0]} onPointerDown={makeArrow('right')}>
          <coneGeometry args={[0.16, 0.34, 14]} />
          <meshStandardMaterial color="#ff5d5d" />
        </mesh>
      </group>

      <group>
        <mesh position={[0, 0.58, 0]} onPointerDown={makeArrow('top')}>
          <cylinderGeometry args={[0.055, 0.055, 1.16, 12]} />
          <meshStandardMaterial color="#5de38a" />
        </mesh>
        <mesh position={[0, 1.3, 0]} onPointerDown={makeArrow('top')}>
          <coneGeometry args={[0.16, 0.34, 14]} />
          <meshStandardMaterial color="#5de38a" />
        </mesh>
      </group>

      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0.58, 0]} onPointerDown={makeArrow('front')}>
          <cylinderGeometry args={[0.055, 0.055, 1.16, 12]} />
          <meshStandardMaterial color="#69a9ff" />
        </mesh>
        <mesh position={[0, 1.3, 0]} onPointerDown={makeArrow('front')}>
          <coneGeometry args={[0.16, 0.34, 14]} />
          <meshStandardMaterial color="#69a9ff" />
        </mesh>
      </group>
    </group>
  );
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
      perspective: [
        distance * DEFAULT_PERSPECTIVE_DIRECTION[0],
        distance * DEFAULT_PERSPECTIVE_DIRECTION[1],
        distance * DEFAULT_PERSPECTIVE_DIRECTION[2],
      ],
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
  onCameraViewChange,
}: Props) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const orientationRef = useRef(new THREE.Quaternion());
  const distance = resolution * 2.5;
  const initialPosition = useMemo<[number, number, number]>(
    () => [
      distance * DEFAULT_PERSPECTIVE_DIRECTION[0],
      distance * DEFAULT_PERSPECTIVE_DIRECTION[1],
      distance * DEFAULT_PERSPECTIVE_DIRECTION[2],
    ],
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
          <CameraOrientationSync orientationRef={orientationRef} />

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

        <div className={styles.orientationOverlay}>
          <Canvas camera={{ position: [0, 0, 5.2], fov: 30 }} gl={{ alpha: true, antialias: true }}>
            <ambientLight intensity={0.85} />
            <directionalLight position={[3, 4, 4]} intensity={0.7} />
            <OrientationWidget orientationRef={orientationRef} onSelectView={onCameraViewChange} />
          </Canvas>
        </div>
      </div>
    </section>
  );
}
