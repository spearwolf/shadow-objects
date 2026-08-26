import type {Maybe} from '../types.js';

export const toMaybe = <T = unknown>(value: T): Maybe<T> => value ?? undefined;
