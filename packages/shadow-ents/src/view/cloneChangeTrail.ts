import type {ChangeTrailType, IComponentChangeType} from '../types.js';

const cloneData = (data: any, transferables: Set<object>): any => {
  if (Array.isArray(data)) {
    return data.map((item) => cloneData(item, transferables));
  }

  if (typeof data === 'object' && data !== null) {
    if (transferables.has(data)) {
      return data;
    }
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, cloneData(value, transferables)]));
  }

  if (typeof data === 'function') {
    return undefined;
  }

  return data;
};

function partialClone({transferables, ...trail}: IComponentChangeType): IComponentChangeType {
  const allTransferables = new Set(transferables);
  const dolly = cloneData(trail, allTransferables);
  allTransferables.clear();
  return dolly;
}

export function cloneChangeTrail(trails: ChangeTrailType): ChangeTrailType {
  return trails.map((trail) => {
    if (trail.transferables && trail.transferables.length > 0) {
      return partialClone(trail);
    } else {
      return structuredClone(trail);
    }
  });
}
