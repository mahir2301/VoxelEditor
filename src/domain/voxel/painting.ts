export function fill2DGrid(
  grid: Uint8Array,
  size: number,
  startIndex: number,
  value: number
): Uint8Array | null {
  const target = grid[startIndex];
  if (target === value) {
    return null;
  }

  const result = new Uint8Array(grid);
  const queue = [startIndex];
  result[startIndex] = value;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % size;
    const y = Math.floor(index / size);

    if (x > 0) {
      const left = index - 1;
      if (result[left] === target) {
        result[left] = value;
        queue.push(left);
      }
    }
    if (x < size - 1) {
      const right = index + 1;
      if (result[right] === target) {
        result[right] = value;
        queue.push(right);
      }
    }
    if (y > 0) {
      const up = index - size;
      if (result[up] === target) {
        result[up] = value;
        queue.push(up);
      }
    }
    if (y < size - 1) {
      const down = index + size;
      if (result[down] === target) {
        result[down] = value;
        queue.push(down);
      }
    }
  }

  return result;
}

export function fillModelColor(
  modelVoxels: Uint8Array,
  modelColors: Uint8Array,
  size: number,
  startIndex: number,
  colorIndex: number
): Uint8Array | null {
  if (!modelVoxels[startIndex]) {
    return null;
  }

  const planeSize = size * size;
  const surfaceVoxels = new Uint8Array(modelVoxels.length);

  for (let index = 0; index < modelVoxels.length; index += 1) {
    if (!modelVoxels[index]) {
      continue;
    }

    const x = index % size;
    const y = Math.floor(index / size) % size;
    const z = Math.floor(index / planeSize);

    const left = x === 0 || !modelVoxels[index - 1];
    const right = x === size - 1 || !modelVoxels[index + 1];
    const up = y === 0 || !modelVoxels[index - size];
    const down = y === size - 1 || !modelVoxels[index + size];
    const back = z === 0 || !modelVoxels[index - planeSize];
    const front = z === size - 1 || !modelVoxels[index + planeSize];

    if (left || right || up || down || back || front) {
      surfaceVoxels[index] = 1;
    }
  }

  if (!surfaceVoxels[startIndex]) {
    return null;
  }

  const targetColor = modelColors[startIndex];
  if (targetColor === colorIndex) {
    return null;
  }

  const result = new Uint8Array(modelColors);
  const queue = [startIndex];
  result[startIndex] = colorIndex;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % size;
    const y = Math.floor(index / size) % size;
    const z = Math.floor(index / planeSize);

    const visit = (nextIndex: number) => {
      if (
        !surfaceVoxels[nextIndex] ||
        !modelVoxels[nextIndex] ||
        result[nextIndex] !== targetColor
      ) {
        return;
      }
      result[nextIndex] = colorIndex;
      queue.push(nextIndex);
    };

    if (x > 0) {
      visit(index - 1);
    }
    if (x < size - 1) {
      visit(index + 1);
    }
    if (y > 0) {
      visit(index - size);
    }
    if (y < size - 1) {
      visit(index + size);
    }
    if (z > 0) {
      visit(index - planeSize);
    }
    if (z < size - 1) {
      visit(index + planeSize);
    }
  }

  return result;
}
