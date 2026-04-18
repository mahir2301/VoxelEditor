import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { buildVoxelGeometry, getVoxelIndexFromHit } from '../utils/voxelUtils';
import './Viewport3D.css';

function VoxelMesh({ voxels, colors, palette, resolution, opacity = 1.0, color = null, onPointerDown }) {
  const geometry = useMemo(() => {
    const useColors = color ? null : (colors || voxels);
    return buildVoxelGeometry(voxels, useColors, palette, resolution);
  }, [voxels, colors, palette, color]);

  if (geometry.attributes.position.count === 0) return null;

  return (
    <mesh geometry={geometry} onPointerDown={onPointerDown}>
      <meshStandardMaterial
        vertexColors={!color}
        color={color || '#ffffff'}
        transparent={opacity < 1.0}
        opacity={opacity}
        roughness={0.5}
        metalness={0.0}
      />
    </mesh>
  );
}

function EditingOverlay({ voxels, resolution }) {
  const geometry = useMemo(() => {
    const colors = new Uint8Array(voxels.length).fill(1);
    const palette = ['#000', '#00cccc'];
    return buildVoxelGeometry(voxels, colors, palette, resolution);
  }, [voxels, resolution]);

  if (geometry.attributes.position.count === 0) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#00cccc"
        transparent
        opacity={0.4}
        roughness={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}

function CameraController({ cameraView, resolution, controlsRef }) {
  const { camera } = useThree();
  const dist = resolution * 2.5;

  useEffect(() => {
    if (!controlsRef.current) return;

    let x, y, z;
    let lookTarget;

    switch (cameraView) {
      case 'front':
        x = 0; y = 0; z = dist;
        break;
      case 'back':
        x = 0; y = 0; z = -dist;
        break;
      case 'right':
        x = dist; y = 0; z = 0;
        break;
      case 'left':
        x = -dist; y = 0; z = 0;
        break;
      case 'top':
        x = 0; y = dist; z = 0;
        break;
      case 'bottom':
        x = 0; y = -dist; z = 0;
        break;
      case 'isometric':
        x = dist; y = dist; z = dist;
        break;
      case 'perspective':
      default:
        x = dist * 1.2; y = dist * 0.8; z = dist * 1.2;
        break;
    }

    camera.position.set(x, y, z);

    if (cameraView === 'top' || cameraView === 'bottom') {
      camera.up.set(0, 0, -1);
    } else {
      camera.up.set(0, 1, 0);
    }

    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }, [cameraView, resolution, camera, controlsRef, dist]);

  return null;
}

function SceneContent({ mode, modelVoxels, editingPieceVoxels, modelColors, pieceVoxels, palette, resolution, onVoxelClick }) {
  const boxGeo = useMemo(() => new THREE.BoxGeometry(resolution, resolution, resolution), [resolution]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.0} />
      <directionalLight position={[-10, 10, -10]} intensity={0.4} />

      <lineSegments position={[0, 0, 0]}>
        <edgesGeometry args={[boxGeo]} />
        <lineBasicMaterial color="#333355" transparent opacity={0.3} />
      </lineSegments>

      <gridHelper
        args={[resolution, resolution, '#666', '#444']}
        position={[0, -resolution / 2, 0]}
      />

      <group position={[0, -resolution / 2, 0]}>
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, 0, 0, resolution, 0, 0])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ff4444" />
        </line>
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, 0, 0, 0, resolution, 0])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#44ff44" />
        </line>
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, 0, 0, 0, 0, resolution])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4444ff" />
        </line>
      </group>

      {mode === 'model' && (
        <VoxelMesh
          voxels={modelVoxels}
          colors={modelColors}
          palette={palette}
          resolution={resolution}
          onPointerDown={onVoxelClick}
        />
      )}

      {mode === 'model' && editingPieceVoxels && (
        <EditingOverlay voxels={editingPieceVoxels} resolution={resolution} />
      )}

      {mode === 'piece' && (
        <VoxelMesh
          voxels={pieceVoxels}
          colors={null}
          palette={palette}
          resolution={resolution}
          color="#4a9eff"
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
}) {
  const controlsRef = useRef();
  const dist = resolution * 2.5;

  const initialPos = useMemo(() => {
    switch (cameraView) {
      case 'front': return [0, 0, dist];
      case 'back': return [0, 0, -dist];
      case 'right': return [dist, 0, 0];
      case 'left': return [-dist, 0, 0];
      case 'top': return [0, dist, 0];
      case 'bottom': return [0, -dist, 0];
      case 'isometric': return [dist, dist, dist];
      default: return [dist * 1.2, dist * 0.8, dist * 1.2];
    }
  }, [cameraView, dist]);

  const handleVoxelPointerDown = (e) => {
    e.stopPropagation();
    const faceIndex = e.faceIndex;
    if (faceIndex < 0) return;

    const voxelIdx = getVoxelIndexFromHit(faceIndex, modelVoxels, resolution);
    if (voxelIdx >= 0) {
      onVoxelClick(voxelIdx);
    }
  };

  return (
    <div className="viewport3d">
      <div className="viewport3d-header">
        <span className="viewport3d-label">
          {mode === 'piece' ? 'Piece Preview' : 'Model Preview'}
        </span>
      </div>
      <div className="viewport3d-canvas-wrap">
        <Canvas
          camera={{
            fov: 45,
            near: 0.5,
            far: 3000,
            position: initialPos,
          }}
          gl={{ antialias: true }}
        >
          <PerspectiveCamera
            makeDefault
            position={initialPos}
            fov={45}
            near={0.5}
            far={3000}
          />

          <CameraController
            cameraView={cameraView}
            resolution={resolution}
            controlsRef={controlsRef}
          />

          <SceneContent
            mode={mode}
            modelVoxels={modelVoxels}
            editingPieceVoxels={editingPieceVoxels}
            modelColors={modelColors}
            pieceVoxels={pieceVoxels}
            palette={palette}
            resolution={resolution}
            onVoxelClick={mode === 'model' && onVoxelClick ? handleVoxelPointerDown : null}
          />

          <OrbitControls
            ref={controlsRef}
            target={[0, 0, 0]}
            minDistance={2}
            maxDistance={dist * 5}
            enableDamping={false}
          />
        </Canvas>
      </div>
    </div>
  );
}
