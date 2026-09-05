import type {ShadowObjectConstructor} from '../types.js';

/** The name the Kernel reports a Shadow Object under: the constructor's `displayName`, or its `name`. */
export const getDisplayName = (construct: ShadowObjectConstructor): string => construct.displayName || construct.name;
