import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CameraMode, CameraView } from '../features/editor/state/types';
import { buildVoxelGeometry, getVoxelIndexFromHit } from '../utils/voxelUtils';
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
  cameraMode: CameraMode;
  cameraView: CameraView;
  onVoxelClick?: (index: number) => void;
  onCameraViewChange?: (view: CameraView) => void;
}

const DEFAULT_PERSPECTIVE_DIRECTION: [number, number, number] = [1, 0.85, 1];
const MAIN_CANVAS_GL = { antialias: true };
const ORIENTATION_CANVAS_GL = { alpha: true, antialias: true };
const ORBIT_TARGET: [number, number, number] = [0, 0, 0];
const MINI_CAMERA_POSITION: [number, number, number] = [0, 0, 5.2];
const MINI_LIGHT_POSITION: [number, number, number] = [3, 4, 4];
const SCENE_LIGHT_POSITION_PRIMARY: [number, number, number] = [11, 16, 10];
const SCENE_LIGHT_POSITION_SECONDARY: [number, number, number] = [-8, 10, -8];
const OUTLINE_PALETTE = ['#000', '#9de6d6'];
const ORIENTATION_CUBE_ARGS: [number, number, number] = [0.88, 0.88, 0.88];
const RIGHT_AXIS_ROTATION: [number, number, number] = [0, 0, -Math.PI / 2];
const FRONT_AXIS_ROTATION: [number, number, number] = [Math.PI / 2, 0, 0];
const ORIENTATION_ARROW_BODY_POSITION: [number, number, number] = [0, 0.58, 0];
const ORIENTATION_ARROW_HEAD_POSITION: [number, number, number] = [0, 1.3, 0];
const ORIENTATION_ARROW_BODY_ARGS: [number, number, number, number] = [0.055, 0.055, 1.16, 12];
const ORIENTATION_ARROW_HEAD_ARGS: [number, number, number] = [0.16, 0.34, 14];

function CameraOrientationSync({
  orientationRef
}: {
  orientationRef: MutableRefObject<THREE.Quaternion>;
}) {
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
  if (ax >= ay && ax >= az) {
    return normal.x >= 0 ? 'right' : 'left';
  }
  if (ay >= ax && ay >= az) {
    return normal.y >= 0 ? 'top' : 'bottom';
  }
  return normal.z >= 0 ? 'front' : 'back';
}

function OrientationWidget({
  orientationRef,
  onSelectView
}: {
  orientationRef: MutableRefObject<THREE.Quaternion>;
  onSelectView?: (view: CameraView) => void;
}) {
  const rootRef = useRef<THREE.Group | null>(null);
  const edgeGeometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(0.88, 0.88, 0.88)),
    []
  );

  useFrame(() => {
    if (!rootRef.current) {
      return;
    }
    rootRef.current.quaternion.copy(orientationRef.current);
  });

  const handlers = useMemo(
    () => ({
      onCubeClick: (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        const normal = event.face?.normal;
        if (!normal) {
          return;
        }
        onSelectView?.(pickViewFromNormal(normal));
      },
      onSelectFront: () => {
        onSelectView?.('front');
      },
      onSelectRight: () => {
        onSelectView?.('right');
      },
      onSelectTop: () => {
        onSelectView?.('top');
      }
    }),
    [onSelectView]
  );

  return (
    <group ref={rootRef}>
      <mesh onPointerDown={handlers.onCubeClick}>
        <boxGeometry args={ORIENTATION_CUBE_ARGS} />
        <meshStandardMaterial
          color="#1a314a"
          transparent
          opacity={0.82}
          roughness={0.35}
          metalness={0.2}
        />
      </mesh>
      <lineSegments>
        <primitive object={edgeGeometry} attach="geometry" />
        <lineBasicMaterial color="#b8d0e8" />
      </lineSegments>

      <group rotation={RIGHT_AXIS_ROTATION}>
        <mesh position={ORIENTATION_ARROW_BODY_POSITION} onPointerDown={handlers.onSelectRight}>
          <cylinderGeometry args={ORIENTATION_ARROW_BODY_ARGS} />
          <meshStandardMaterial color="#ff5d5d" />
        </mesh>
        <mesh position={ORIENTATION_ARROW_HEAD_POSITION} onPointerDown={handlers.onSelectRight}>
          <coneGeometry args={ORIENTATION_ARROW_HEAD_ARGS} />
          <meshStandardMaterial color="#ff5d5d" />
        </mesh>
      </group>

      <group>
        <mesh position={ORIENTATION_ARROW_BODY_POSITION} onPointerDown={handlers.onSelectTop}>
          <cylinderGeometry args={ORIENTATION_ARROW_BODY_ARGS} />
          <meshStandardMaterial color="#5de38a" />
        </mesh>
        <mesh position={ORIENTATION_ARROW_HEAD_POSITION} onPointerDown={handlers.onSelectTop}>
          <coneGeometry args={ORIENTATION_ARROW_HEAD_ARGS} />
          <meshStandardMaterial color="#5de38a" />
        </mesh>
      </group>

      <group rotation={FRONT_AXIS_ROTATION}>
        <mesh position={ORIENTATION_ARROW_BODY_POSITION} onPointerDown={handlers.onSelectFront}>
          <cylinderGeometry args={ORIENTATION_ARROW_BODY_ARGS} />
          <meshStandardMaterial color="#69a9ff" />
        </mesh>
        <mesh position={ORIENTATION_ARROW_HEAD_POSITION} onPointerDown={handlers.onSelectFront}>
          <coneGeometry args={ORIENTATION_ARROW_HEAD_ARGS} />
          <meshStandardMaterial color="#69a9ff" />
        </mesh>
      </group>
    </group>
  );
}

function VoxelMesh({
  voxels,
  colors,
  palette,
  resolution,
  opacity = 1,
  solidColor,
  onPointerDown
}: VoxelMeshProps) {
  const geometry = useMemo(() => {
    const colorBuffer = solidColor ? null : colors || voxels;
    return buildVoxelGeometry(voxels, colorBuffer, palette, resolution);
  }, [colors, palette, resolution, solidColor, voxels]);

  if (!geometry.attributes.position?.count) {
    return null;
  }

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

function VoxelOutline({
  voxels,
  resolution,
  color = '#9de6d6'
}: {
  voxels: Uint8Array;
  resolution: number;
  color?: string;
}) {
  const geometry = useMemo(
    () => buildVoxelGeometry(voxels, null, ['#000000', '#ffffff'], resolution),
    [voxels, resolution]
  );

  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  if (!geometry.attributes.position?.count) {
    return null;
  }

  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color={color} transparent opacity={0.95} />
    </lineSegments>
  );
}

function CameraController({
  cameraView,
  resolution,
  controlsRef
}: {
  cameraView: CameraView;
  resolution: number;
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
}) {
  useEffect(() => {
    if (!controlsRef.current) {
      return;
    }
    const camera = controlsRef.current.object;
    const distance = resolution * 2.5;
    const epsilon = distance * 0.001;
    const position = {
      back: [0, 0, -distance],
      bottom: [0, -distance, epsilon],
      front: [0, 0, distance],
      isometric: [distance, distance, distance],
      left: [-distance, 0, 0],
      perspective: [
        distance * DEFAULT_PERSPECTIVE_DIRECTION[0],
        distance * DEFAULT_PERSPECTIVE_DIRECTION[1],
        distance * DEFAULT_PERSPECTIVE_DIRECTION[2]
      ],
      right: [distance, 0, 0],
      top: [0, distance, epsilon]
    };

    const [x, y, z] = position[cameraView] || position.perspective;
    camera.position.set(x, y, z);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }, [cameraView, controlsRef, resolution]);

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
  onVoxelClick
}: SceneContentProps) {
  const bounds = useMemo(
    () => new THREE.BoxGeometry(resolution, resolution, resolution),
    [resolution]
  );
  const boundsArgs = useMemo<[THREE.BoxGeometry]>(() => [bounds], [bounds]);
  const gridArgs = useMemo<[number, number, string, string]>(
    () => [resolution, resolution, '#56728f', '#2a4058'],
    [resolution]
  );
  const gridPosition = useMemo<[number, number, number]>(
    () => [0, -resolution / 2, 0],
    [resolution]
  );

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={SCENE_LIGHT_POSITION_PRIMARY} intensity={0.95} />
      <directionalLight position={SCENE_LIGHT_POSITION_SECONDARY} intensity={0.45} />

      <lineSegments>
        <edgesGeometry args={boundsArgs} />
        <lineBasicMaterial color="#35506c" transparent opacity={0.55} />
      </lineSegments>

      <gridHelper args={gridArgs} position={gridPosition} />

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
        <>
          <VoxelMesh
            voxels={editingPieceVoxels}
            palette={OUTLINE_PALETTE}
            resolution={resolution}
            solidColor="#7ad6c6"
            opacity={0.35}
          />
          <VoxelOutline voxels={editingPieceVoxels} resolution={resolution} />
        </>
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
  cameraMode,
  cameraView,
  onVoxelClick,
  onCameraViewChange
}: Props) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const orientationRef = useRef(new THREE.Quaternion());
  const distance = resolution * 2.5;
  const initialPosition = useMemo<[number, number, number]>(
    () => [
      distance * DEFAULT_PERSPECTIVE_DIRECTION[0],
      distance * DEFAULT_PERSPECTIVE_DIRECTION[1],
      distance * DEFAULT_PERSPECTIVE_DIRECTION[2]
    ],
    [distance]
  );

  const handleVoxelPointerDown = useMemo(() => {
    if (!onVoxelClick || mode !== 'model' || !modelVoxels) {
      return undefined;
    }
    return (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (event.faceIndex == null) {
        return;
      }
      const voxelIndex = getVoxelIndexFromHit(event.faceIndex, modelVoxels, resolution);
      if (voxelIndex >= 0) {
        onVoxelClick(voxelIndex);
      }
    };
  }, [mode, modelVoxels, onVoxelClick, resolution]);

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <span className={styles.label}>{mode === 'piece' ? 'Piece Preview' : 'Model Preview'}</span>
      </header>
      <div className={styles.canvasWrap}>
        <Canvas gl={MAIN_CANVAS_GL}>
          {cameraMode === 'isometric' ? (
            <OrthographicCamera
              makeDefault
              near={0.5}
              far={3000}
              position={initialPosition}
              zoom={Math.max(1.2, 72 / resolution)}
            />
          ) : (
            <PerspectiveCamera
              makeDefault
              fov={45}
              near={0.5}
              far={3000}
              position={initialPosition}
            />
          )}
          <CameraController
            cameraView={cameraView}
            resolution={resolution}
            controlsRef={controlsRef}
          />
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

          <OrbitControls
            ref={controlsRef}
            target={ORBIT_TARGET}
            minDistance={2}
            maxDistance={distance * 5}
          />
        </Canvas>

        <div className={styles.orientationOverlay}>
          <Canvas gl={ORIENTATION_CANVAS_GL}>
            {cameraMode === 'isometric' ? (
              <OrthographicCamera
                makeDefault
                near={0.1}
                far={100}
                position={MINI_CAMERA_POSITION}
                zoom={26}
              />
            ) : (
              <PerspectiveCamera
                makeDefault
                near={0.1}
                far={100}
                position={MINI_CAMERA_POSITION}
                fov={30}
              />
            )}
            <ambientLight intensity={0.85} />
            <directionalLight position={MINI_LIGHT_POSITION} intensity={0.7} />
            <OrientationWidget orientationRef={orientationRef} onSelectView={onCameraViewChange} />
          </Canvas>
        </div>
      </div>
    </section>
  );
}
