import type {ComponentPropertiesType} from '../types.js';

export const filterUndefinedProps = (props: ComponentPropertiesType | undefined) => {
  if (props === undefined || props.length === 0) return undefined;
  return props.filter((entry) => (entry as Array<any>).length === 1 || entry[1] !== undefined);
};

/**
 * Maybe `curProps` will be modified and returned. But it can also return a newly created array. `changes` will never be modified.
 */
export const applyPropsChanges = (
  curProps: ComponentPropertiesType | undefined,
  changes: ComponentPropertiesType | undefined,
): ComponentPropertiesType | undefined => {
  if (curProps === changes) return curProps;
  if (changes === undefined) return curProps;
  if (curProps === undefined) return filterUndefinedProps(changes);

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
