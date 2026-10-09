import { useThree } from '@react-three/fiber';
import { useEffect, useEffectEvent } from 'react';
import type { RefObject } from 'react';
import { Box3, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { SceneProps } from './types';
export function ViewportCamera({
  props,
  controls
}: {
  props: SceneProps;
  controls: RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size } = useThree();
  const frameCamera = useEffectEvent(() => {
    if (!controls.current) return;
    const bounds = new Box3();
    for (const id of props.preview ? [] : props.selected) {
      const object = props.objects.get(id);
      if (object) bounds.expandByObject(object);
    }
    if (bounds.isEmpty() && props.root.current) bounds.setFromObject(props.root.current);
    const center = bounds.isEmpty()
      ? new Vector3(0, props.state.resolution / 3, 0)
      : bounds.getCenter(new Vector3());
    const span = bounds.isEmpty() ? props.state.resolution : bounds.getSize(new Vector3()).length();
    const limitingFov =
      camera instanceof PerspectiveCamera
        ? Math.atan(Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, size.width / size.height))
        : Math.PI / 6;
    const distance = Math.max(
      props.state.resolution * 2,
      (span / (2 * Math.sin(limitingFov))) * 1.12
    );
    const view = props.preview ? 'isometric' : props.state.cameraView;
    const direction =
      view === 'front'
        ? new Vector3(0, 0, 1)
        : view === 'back'
          ? new Vector3(0, 0, -1)
          : view === 'right'
            ? new Vector3(1, 0, 0)
            : view === 'left'
              ? new Vector3(-1, 0, 0)
              : view === 'top'
                ? new Vector3(0, 1, 0.001)
                : view === 'bottom'
                  ? new Vector3(0, -1, 0.001)
                  : new Vector3(1, 0.82, 1);
    if (props.preview)
      direction.applyAxisAngle(new Vector3(0, 1, 0), (props.preview.quarter * Math.PI) / 2);
    camera.position.copy(center).add(direction.normalize().multiplyScalar(distance));
    controls.current.target.copy(center);
    camera.lookAt(center);
    if (camera instanceof OrthographicCamera) {
      camera.zoom = Math.min(size.width, size.height) / Math.max(8, span * 1.35);
    }
    camera.updateProjectionMatrix();
    controls.current.update();
  });
  const previewQuarter = props.preview?.quarter;
  const modelIdentity = props.state.parts[0]?.id;
  useEffect(() => {
    frameCamera();
  }, [
    props.state.cameraView,
    props.state.cameraMode,
    props.focusToken,
    props.state.resolution,
    previewQuarter,
    camera,
    modelIdentity
  ]);
  return null;
}
