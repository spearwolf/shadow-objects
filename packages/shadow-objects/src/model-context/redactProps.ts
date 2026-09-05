import type {EnvSnapshot, PropSnapshot} from '../inspect/types.js';

/** Property names whose values are hidden: a list of names, or a predicate over name and Entity uuid. */
export type RedactRule = string[] | ((name: string, uuid: string) => boolean);

export type RedactPredicate = (name: string, uuid: string) => boolean;

export const toRedactPredicate = (rule: RedactRule | undefined): RedactPredicate | undefined => {
  if (rule === undefined) return undefined;
  if (typeof rule === 'function') return rule;
  const names = new Set(rule);
  return (name) => names.has(name);
};

interface NodeWithProps {
  uuid: string;
  props?: PropSnapshot[];
  children?: NodeWithProps[];
}

const redactNode = (node: NodeWithProps, redact: RedactPredicate): void => {
  for (const prop of node.props ?? []) {
    // `routes` stays: whether a value routes is not the value
    if (redact(prop.name, node.uuid)) prop.value = {$type: 'redacted'};
  }
  for (const child of node.children ?? []) redactNode(child, redact);
};

/**
 * Replaces the value of every property the rule names by `{$type: 'redacted'}`, on the Kernel's
 * Entities and the View's components alike, in place. Property values only: an Entity Context
 * that carries the same secret is not covered, and the docs say so. In place is safe because a
 * snapshot is built fresh for every call -- plain data from the builder, or a structured clone
 * from the worker -- and nobody else holds it.
 */
export function redactSnapshot(snapshot: EnvSnapshot, redact: RedactPredicate): EnvSnapshot {
  for (const root of snapshot.kernel?.roots ?? []) redactNode(root, redact);
  for (const root of snapshot.view?.roots ?? []) redactNode(root, redact);
  return snapshot;
}
