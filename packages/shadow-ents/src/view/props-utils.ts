import type {ComponentPropertiesType} from '../types.js';

export const filterUndefinedProps = (props: ComponentPropertiesType | undefined) => {
  if (props === undefined) return props;
  return props.filter((entry) => (entry as Array<any>).length === 1 || entry[1] === undefined);
};

export const applyPropsChanges = (
  props: ComponentPropertiesType | undefined,
  changes: ComponentPropertiesType | undefined,
): ComponentPropertiesType | undefined => {
  if (props === changes) return props;
  if (changes === undefined) return props;
  changes = filterUndefinedProps(changes);
  if (props === undefined) return changes;
  for (const [key, value] of changes) {
    const entry = props.find(([k]) => k === key);
    if (entry === undefined) {
      props.push([key, value]);
    } else {
      entry[1] = value;
    }
  }
  return props;
};

export const propsEqual = (a: ComponentPropertiesType | undefined, b: ComponentPropertiesType | undefined) => {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  a = filterUndefinedProps(a);
  b = filterUndefinedProps(b);
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  for (const [aKey, value] of a) {
    const bEntry = b.find(([bKey]) => aKey === bKey);
    if (bEntry === undefined) return false;
    if (bEntry[1] !== value) return false;
  }
  return true;
};
