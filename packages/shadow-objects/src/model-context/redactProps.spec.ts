import {describe, expect, it} from 'vitest';
import type {EnvSnapshot} from '../inspect/types.js';
import {redactSnapshot, toRedactPredicate} from './redactProps.js';

const snapshot = (): EnvSnapshot => ({
  namespace: 'ns',
  isGlobalNamespace: false,
  kind: 'local',
  state: {viewReady: true, proxyReady: true, isReady: true, isDestroyed: false},
  view: {
    takenAt: 1,
    counts: {components: 2, roots: 1},
    roots: [
      {
        uuid: 'a',
        token: 'a',
        order: 0,
        childCount: 1,
        props: [{name: 'secret', value: 's', routes: true}],
        children: [
          {uuid: 'b', token: 'b', order: 0, parentUuid: 'a', childCount: 0, props: [{name: 'secret', value: 't', routes: true}]},
        ],
      },
    ],
  },
  kernel: {
    takenAt: 1,
    thread: 'main',
    counts: {entities: 2, roots: 1, shadowObjects: 0},
    globalContexts: [],
    roots: [
      {
        uuid: 'a',
        token: 'a',
        order: 0,
        autoDestructionOnParentRemoval: false,
        childCount: 1,
        props: [
          {name: 'secret', value: 's', routes: true},
          {name: 'open', value: 1, routes: true},
        ],
        children: [
          {
            uuid: 'b',
            token: 'b',
            order: 0,
            parentUuid: 'a',
            autoDestructionOnParentRemoval: false,
            childCount: 0,
            props: [{name: 'secret', value: 't', routes: true}],
          },
        ],
      },
    ],
  },
});

describe('redactSnapshot', () => {
  it('replaces the named values on both halves, down the tree, and keeps routes', () => {
    const s = redactSnapshot(snapshot(), toRedactPredicate(['secret'])!);

    expect(s.kernel?.roots[0]?.props).toEqual([
      {name: 'secret', value: {$type: 'redacted'}, routes: true},
      {name: 'open', value: 1, routes: true},
    ]);
    expect(s.kernel?.roots[0]?.children?.[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});
    expect(s.view?.roots[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});
    expect(s.view?.roots[0]?.children?.[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});
  });

  it('hands a predicate the name and the uuid', () => {
    const s = redactSnapshot(snapshot(), toRedactPredicate((name, uuid) => name === 'secret' && uuid === 'b')!);

    expect(s.kernel?.roots[0]?.props?.[0]?.value).toBe('s');
    expect(s.kernel?.roots[0]?.children?.[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});
  });

  it('is a no-op on an environment without halves, and undefined without a rule', () => {
    const bare: EnvSnapshot = {
      namespace: '',
      isGlobalNamespace: false,
      kind: 'none',
      state: {viewReady: false, proxyReady: false, isReady: false, isDestroyed: false},
    };
    expect(redactSnapshot(bare, () => true)).toEqual(bare);
    expect(toRedactPredicate(undefined)).toBeUndefined();
  });
});
