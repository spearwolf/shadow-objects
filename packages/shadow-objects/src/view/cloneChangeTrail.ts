import type {ChangeTrailType} from '../types.js';

export function cloneChangeTrail(trails: ChangeTrailType): ChangeTrailType {
  return trails.map((trail) => {
    if (trail.transferables && trail.transferables.length > 0) {
      const {transferables, ...data} = trail;
      return structuredClone(data, {transfer: transferables as any});
    } else {
      return structuredClone(trail);
    }
  });
}
