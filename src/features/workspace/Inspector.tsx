import { useState } from 'react';
import Button from '../../components/ui/Button';
import { Choice, NumberInput, TextInput } from '../../components/ui/Fields';
import { rigRoles, socketRoles } from '../../domain/assembly/profiles';
import { descendants } from '../../domain/assembly/transforms';
import type { AssetProfile, PoseName } from '../editor/state/types';
import type { MotionKind, SocketRole, Transform } from '../editor/state/types';
import AuthoringControls from './AuthoringControls';
import type { WorkspaceProps } from './types';
import styles from './Workspace.module.css';
interface Props extends WorkspaceProps {
  id: string | null;
  disabled: boolean;
  pivot: boolean;
  editPiece: (id: string) => void;
}
function motionKind(value: string): MotionKind {
  return value === 'yaw' || value === 'pitch' || value === 'recoil' || value === 'spin'
    ? value
    : 'none';
}
function motionAxis(value: string): 'x' | 'y' | 'z' {
  return value === 'x' || value === 'z' ? value : 'y';
}
function socketRole(value: string): SocketRole {
  return socketRoles.find((role) => role === value) ?? 'None';
}
export default function Inspector({
  state,
  dispatch,
  id: selectedId,
  disabled,
  pivot,
  editPiece
}: Props) {
  const [pose, setPose] = useState<PoseName>('hold');
  const part = state.parts.find((p) => p.id === selectedId),
    piece = state.pieces.find((p) => p.id === selectedId),
    node = part ?? piece;
  const changeTransform = (key: keyof Transform, axis: number, value: number) => {
    if (!node) return;
    const transform = structuredClone(node.transform);
    transform[key][axis] = key === 'rotation' ? (value * Math.PI) / 180 : value;
    dispatch({ type: 'TRANSFORM', id: node.id, transform, pivot: pivot && Boolean(part) });
  };
  return (
    <section className={styles.panel}>
      <div className={styles.panelTitle}>INSPECTOR</div>
      <div className={styles.inspector}>
        {!node ? (
          <>
            <Choice
              label="Model profile"
              value={state.profile}
              options={['generic', 'tower', 'player', 'weapon'].map((id) => ({ id, label: id }))}
              onChange={(profile) =>
                dispatch({
                  type: 'SET_PROJECT',
                  profile:
                    (['generic', 'tower', 'player', 'weapon'] satisfies AssetProfile[]).find(
                      (value) => value === profile
                    ) ?? 'generic'
                })
              }
            />
            <TextInput
              label="Project name / export filename"
              value={state.name}
              onChange={(name) => dispatch({ type: 'SET_PROJECT', name })}
            />
            <NumberInput
              label="Voxels per world unit"
              value={state.voxelsPerUnit}
              min={1}
              max={1024}
              onChange={(voxelsPerUnit) => dispatch({ type: 'SET_PROJECT', voxelsPerUnit })}
            />
          </>
        ) : (
          <fieldset disabled={disabled} className={styles.fieldset}>
            <span className={styles.badge}>
              {part?.kind === 'socket' ? 'SOCKET' : piece ? 'GEOMETRY PIECE' : 'RIGID PART'}
            </span>
            <TextInput
              label="Name"
              value={node.name}
              onChange={(name) => {
                if (!name.trim()) return;
                dispatch(
                  part
                    ? { type: 'UPDATE_PART', partId: node.id, changes: { name } }
                    : { type: 'RENAME_PIECE', pieceId: node.id, name }
                );
              }}
            />
            <Choice
              label="Parent"
              value={part?.parentId ?? piece?.partId ?? 'root'}
              options={[
                ...(part ? [{ id: 'root', label: 'Model root' }] : []),
                ...state.parts
                  .filter(
                    (p) =>
                      p.kind === 'part' && (!part || !descendants(part.id, state.parts).has(p.id))
                  )
                  .map((p) => ({ id: p.id, label: p.name }))
              ]}
              onChange={(parentId) =>
                dispatch({
                  type: 'REPARENT',
                  id: node.id,
                  parentId: parentId === 'root' ? null : parentId
                })
              }
            />
            {(['position', 'rotation'] as const).map((key) => (
              <div key={key}>
                <div className={styles.subheading}>
                  {key === 'position' ? 'Position (voxels)' : 'Rotation (degrees)'}
                </div>
                <div className={styles.vector}>
                  {node.transform[key].map((v, axis) => (
                    <NumberInput
                      key={'XYZ'[axis]}
                      label={'XYZ'[axis]}
                      value={key === 'rotation' ? (v * 180) / Math.PI : v}
                      step={key === 'position' ? 0.5 : 1}
                      onChange={(value) => changeTransform(key, axis, value)}
                    />
                  ))}
                </div>
              </div>
            ))}
            {part && part.kind === 'part' && (
              <>
                <Choice
                  label="Rig role"
                  value={part.rigRole}
                  options={rigRoles.map((id) => ({ id, label: id }))}
                  onChange={(rigRole) =>
                    dispatch({
                      type: 'UPDATE_PART',
                      partId: part.id,
                      changes: { rigRole: rigRoles.find((value) => value === rigRole) ?? 'None' }
                    })
                  }
                />
                <Choice
                  label="Team color"
                  value={part.teamColor ? 'yes' : 'no'}
                  options={[
                    { id: 'no', label: 'Authored colors' },
                    { id: 'yes', label: 'Team tint' }
                  ]}
                  onChange={(v) =>
                    dispatch({
                      type: 'UPDATE_PART',
                      partId: part.id,
                      changes: { teamColor: v === 'yes' }
                    })
                  }
                />
                {state.profile === 'player' && (
                  <>
                    <Choice
                      label="Pose offset"
                      value={pose}
                      options={['hold', 'fire', 'knockout'].map((id) => ({ id, label: id }))}
                      onChange={(v) =>
                        setPose(v === 'fire' ? 'fire' : v === 'knockout' ? 'knockout' : 'hold')
                      }
                    />
                    <div className={styles.vector}>
                      {part.poses[pose].map((v, a) => (
                        <NumberInput
                          key={'XYZ'[a]}
                          label={`${'XYZ'[a]} degrees`}
                          value={v}
                          min={-360}
                          max={360}
                          onChange={(angle) => {
                            const poses = structuredClone(part.poses);
                            poses[pose][a] = angle;
                            dispatch({ type: 'UPDATE_PART', partId: part.id, changes: { poses } });
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
                <Choice
                  label="Motion"
                  value={part.motion.kind}
                  options={['none', 'yaw', 'pitch', 'recoil', 'spin'].map((kind) => ({
                    id: kind,
                    label: kind
                  }))}
                  onChange={(kind) =>
                    dispatch({
                      type: 'UPDATE_PART',
                      partId: part.id,
                      changes: {
                        motion: {
                          ...part.motion,
                          kind: motionKind(kind),
                          axis: kind === 'pitch' ? 'x' : kind === 'recoil' ? 'z' : 'y'
                        }
                      }
                    })
                  }
                />
                {part.motion.kind !== 'none' && (
                  <>
                    <Choice
                      label="Local motion axis"
                      value={part.motion.axis}
                      options={['x', 'y', 'z'].map((axis) => ({
                        id: axis,
                        label: axis.toUpperCase()
                      }))}
                      onChange={(axis) =>
                        dispatch({
                          type: 'UPDATE_PART',
                          partId: part.id,
                          changes: { motion: { ...part.motion, axis: motionAxis(axis) } }
                        })
                      }
                    />
                    {(part.motion.kind === 'yaw' || part.motion.kind === 'pitch') && (
                      <div className={styles.vector}>
                        {(['min', 'max'] as const).map((key) => (
                          <NumberInput
                            key={key}
                            label={`${key} degrees`}
                            value={part.motion[key]}
                            onChange={(value) =>
                              dispatch({
                                type: 'UPDATE_PART',
                                partId: part.id,
                                changes: {
                                  motion: {
                                    ...part.motion,
                                    [key]:
                                      key === 'min'
                                        ? Math.min(value, part.motion.max)
                                        : Math.max(value, part.motion.min)
                                  }
                                }
                              })
                            }
                          />
                        ))}
                      </div>
                    )}
                    {part.motion.kind === 'recoil' && (
                      <>
                        <NumberInput
                          label="Recoil distance (voxels)"
                          value={part.motion.distance}
                          min={0}
                          step={0.5}
                          onChange={(distance) =>
                            dispatch({
                              type: 'UPDATE_PART',
                              partId: part.id,
                              changes: { motion: { ...part.motion, distance } }
                            })
                          }
                        />
                        <NumberInput
                          label="Return duration (seconds)"
                          value={part.motion.duration}
                          min={0.01}
                          max={10}
                          step={0.01}
                          onChange={(duration) =>
                            dispatch({
                              type: 'UPDATE_PART',
                              partId: part.id,
                              changes: { motion: { ...part.motion, duration } }
                            })
                          }
                        />
                      </>
                    )}
                    {part.motion.kind === 'spin' && (
                      <NumberInput
                        label="Spin speed (degrees / second)"
                        value={part.motion.speed}
                        min={-3600}
                        max={3600}
                        onChange={(speed) =>
                          dispatch({
                            type: 'UPDATE_PART',
                            partId: part.id,
                            changes: { motion: { ...part.motion, speed } }
                          })
                        }
                      />
                    )}
                  </>
                )}
                <Choice
                  label="Power-responsive appearance"
                  value={part.energy ? 'yes' : 'no'}
                  options={[
                    { id: 'no', label: 'Authored appearance' },
                    { id: 'yes', label: 'Energy glow / dim' }
                  ]}
                  onChange={(value) =>
                    dispatch({
                      type: 'UPDATE_PART',
                      partId: part.id,
                      changes: { energy: value === 'yes' }
                    })
                  }
                />
              </>
            )}
            {part?.kind === 'socket' &&
              part.role === 'PrimaryGrip' &&
              state.profile === 'weapon' && (
                <>
                  <Choice
                    label="Hand pose offset"
                    value={pose}
                    options={['hold', 'fire'].map((id) => ({ id, label: id }))}
                    onChange={(v) =>
                      setPose(v === 'fire' ? 'fire' : v === 'knockout' ? 'knockout' : 'hold')
                    }
                  />
                  <div className={styles.vector}>
                    {part.poses[pose].map((v, a) => (
                      <NumberInput
                        key={'XYZ'[a]}
                        label={`${'XYZ'[a]} degrees`}
                        value={v}
                        min={-360}
                        max={360}
                        onChange={(angle) => {
                          const poses = structuredClone(part.poses);
                          poses[pose][a] = angle;
                          dispatch({ type: 'UPDATE_PART', partId: part.id, changes: { poses } });
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            {part?.kind === 'socket' && (
              <Choice
                label="Socket role"
                value={part.role}
                options={socketRoles.map((role) => ({ id: role, label: role }))}
                onChange={(role) =>
                  dispatch({
                    type: 'UPDATE_PART',
                    partId: part.id,
                    changes: { role: socketRole(role) }
                  })
                }
              />
            )}
            {node && (
              <Choice
                label="Include subtree in export"
                value={node.exportEnabled ? 'yes' : 'no'}
                options={[
                  { id: 'yes', label: 'Include' },
                  { id: 'no', label: 'Exclude' }
                ]}
                onChange={(value) =>
                  dispatch({
                    type: 'SET_EXPORT',
                    id: node.id,
                    enabled: value === 'yes'
                  })
                }
              />
            )}
            <AuthoringControls state={state} dispatch={dispatch} node={node} />
            {piece && <Button onPress={() => editPiece(piece.id)}>Edit projection shape</Button>}
            <div className={styles.actions}>
              <Button onPress={() => dispatch({ type: 'DUPLICATE_NODE', id: node.id })}>
                Duplicate
              </Button>
              <Button
                variant="danger"
                onPress={() => dispatch({ type: 'DELETE_NODE', id: node.id })}
              >
                Delete
              </Button>
            </div>
          </fieldset>
        )}
      </div>
    </section>
  );
}
