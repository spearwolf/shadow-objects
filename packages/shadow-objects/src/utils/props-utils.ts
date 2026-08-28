import type {ComponentPropertiesType} from '../types.js';

export const filterUndefinedProps = (props: ComponentPropertiesType | undefined) => {
  if (props === undefined || props.length === 0) return undefined;
  // an entry that names only the key survives the filter: it means "set, without a value", while
  // `[key, undefined]` means the value is gone. See ComponentPropertiesType for the whole rule
  return props.filter((entry) => entry.length === 1 || entry[1] !== undefined);
};

/**
 * Maybe `curProps` will be modified and returned. But it can also return a newly created array. `changes` will never be modified.
 * The result never shares a tuple with `changes` — except when `curProps === changes`, where `changes`, tuples included, comes back as-is.
 */
export const applyPropsChanges = (
  curProps: ComponentPropertiesType | undefined,
  changes: ComponentPropertiesType | undefined,
): ComponentPropertiesType | undefined => {
  if (curProps === changes) return curProps;
  if (changes === undefined) return curProps;
  // the tuples belong to `changes` — a change trail that has been handed out is a value, and
  // the loop below writes through `entry[1] = value` on every later call
  if (curProps === undefined)
    return filterUndefinedProps(changes)?.map((entry) => (entry.length === 1 ? [entry[0]] : [entry[0], entry[1]]));

  for (const [key, value] of changes) {
    const entry = curProps.find(([k]) => k === key);
    if (entry === undefined) {
      curProps.push([key, value]);
    } else {
      entry[1] = value;
    }
  }
  return filterUndefinedProps(curProps);
};

export const propsEqual = (a: ComponentPropertiesType | undefined, b: ComponentPropertiesType | undefined) => {
  if (a === b) return true;
  a = filterUndefinedProps(a);
  b = filterUndefinedProps(b);
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a.length !== b.length) return false;
  for (const [aKey, value] of a) {
    const bEntry = b.find(([bKey]) => aKey === bKey);
    if (bEntry === undefined) return false;
    if (bEntry[1] !== value) return false;
  }
  return true;
};
