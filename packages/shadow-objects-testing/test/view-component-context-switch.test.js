import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext, ViewComponent} from '@spearwolf/shadow-objects';

/**
 * A {@link ViewComponent} outlives a change of its {@link ComponentContext}: it leaves one, joins
 * the other, and keeps its uuid on the way. This spec pins what travels with it.
 *
 * No DOM is involved — the element layer is one of two writers, `ViewComponent.setProperty()` is
 * the other, and both end up here.
 *
 * Every case builds its own contexts under its own namespace names and disposes them afterwards,
 * so nothing a case leaves behind can reach the next one.
 */

const contexts = [];

/** A context under a name nobody else uses, torn down after the case that asked for it. */
const contextFor = (ns) => {
  const ctx = ComponentContext.get(ns);
  contexts.push(ctx);
  return ctx;
};

/** The property list of the entry for `uuid`, whichever change type carries it. */
const propsOf = (trail, uuid) => trail.find((entry) => entry.uuid === uuid)?.properties;

afterEach(() => {
  for (const ctx of contexts) {
    ctx.dispose();
  }
  contexts.length = 0;
});

describe('a view component that changes its component context', () => {
  it('a property survives the move into another context', () => {
    const from = contextFor('vcs-1-from');
    const to = contextFor('vcs-1-to');

    const vc = new ViewComponent('probe', {context: from});
    vc.setProperty('x', 7);

    from.buildChangeTrails();

    vc.context = to;

    expect(propsOf(to.buildChangeTrails(), vc.uuid), 'the entity arrives with its property').to.deep.equal([['x', 7]]);
  });

  it('a property that was never written to a trail survives too', () => {
    // nothing is flushed before the move: the value only exists as an accrued change, and reading
    // the last trail alone would come up empty
    const from = contextFor('vcs-2-from');
    const to = contextFor('vcs-2-to');

    const vc = new ViewComponent('probe', {context: from});
    vc.setProperty('x', 7);

    vc.context = to;

    expect(propsOf(to.buildChangeTrails(), vc.uuid), 'the entity arrives with its property').to.deep.equal([['x', 7]]);
  });

  it('the value it arrives with is what the new context compares against', () => {
    // the property is not only in the trail, it is the state the next comparison starts from.
    // Whether the equality function itself made the trip is not observable from outside: the
    // context stores one per key, and every `setProperty` overwrites that entry with whatever the
    // caller passed. This case pins the half that can be seen
    const from = contextFor('vcs-3-from');
    const to = contextFor('vcs-3-to');

    const sameLength = (a, b) => a?.length === b?.length;

    const vc = new ViewComponent('probe', {context: from});
    vc.setProperty('x', [1, 2, 3], sameLength);

    from.buildChangeTrails();

    vc.context = to;
    to.buildChangeTrails();

    expect(vc.setProperty('x', [4, 5, 6], sameLength), 'an equal value in the new context is no change').to.be.false;
  });

  it('an equality function does not decide about the arrival', () => {
    // the target holds nothing for this key yet, so a comparison there is one against `undefined`.
    // A function that calls that equal — comparing by a field neither side has is enough — would
    // answer "no change" and drop the property on the way in
    const from = contextFor('vcs-6-from');
    const to = contextFor('vcs-6-to');

    const sameId = (a, b) => a?.id === b?.id;

    const vc = new ViewComponent('probe', {context: from});
    vc.setProperty('x', {label: 'kept'});

    from.buildChangeTrails();

    // from here the key is compared by `id`, and no value involved has one. Nothing further is
    // written, and the rule stays registered for the key
    vc.setProperty('x', {label: 'ignored'}, sameId);

    from.buildChangeTrails();

    vc.context = to;

    expect(propsOf(to.buildChangeTrails(), vc.uuid), 'the property arrives regardless').to.deep.equal([['x', {label: 'kept'}]]);
  });

  it('the equality rule registered for a key travels with it', () => {
    // `reCreateChanges()` is the one place that reads a registered rule, so it is also the one
    // place the transfer of that rule can be seen. It rebuilds every component from the memory and
    // compares each property against the empty state — a rule that calls the value equal to
    // `undefined` says "no change" and leaves it out. The new context therefore has to answer the
    // rebuild exactly as the old one would, and an unregistered rule would answer differently
    const from = contextFor('vcs-9-from');
    const to = contextFor('vcs-9-to');

    const sameId = (a, b) => a?.id === b?.id;

    const vc = new ViewComponent('probe', {context: from});
    vc.setProperty('x', {label: 'kept'});

    from.buildChangeTrails();

    vc.setProperty('x', {label: 'ignored'}, sameId);

    from.buildChangeTrails();

    vc.context = to;
    to.buildChangeTrails();

    to.reCreateChanges();

    expect(propsOf(to.buildChangeTrails(), vc.uuid), 'the rule decides the rebuild, as it did before').to.be.undefined;
  });

  it('a property removed since the last trail does not come back', () => {
    // what travels is the state right now, and a removal that has not been flushed is part of it
    const from = contextFor('vcs-7-from');
    const to = contextFor('vcs-7-to');

    const vc = new ViewComponent('probe', {context: from});
    vc.setProperty('x', 7);
    vc.setProperty('keep', 1);

    from.buildChangeTrails();

    vc.removeProperty('x');
    vc.context = to;

    expect(propsOf(to.buildChangeTrails(), vc.uuid), 'only what the component still holds').to.deep.equal([['keep', 1]]);
  });

  it('a destroyed component reports no property change', () => {
    // the cleanup of a property binding is allowed to run late, after the entity it belonged to is
    // already on its way out. It has to be harmless there: the entity carries its properties off
    // by itself, and an update about one of them would arrive for something that no longer exists.
    // Two paths are closed, and both are asked here — the component turns the call away because it
    // has no context left, and the context keeps the change out of the trail even when the call
    // reaches it directly
    const from = contextFor('vcs-8-from');

    const vc = new ViewComponent('probe', {context: from});
    vc.setProperty('x', 7);

    from.buildChangeTrails();

    vc.destroy();
    vc.removeProperty('x');
    from.removeProperty(vc, 'x');

    expect(
      from.buildChangeTrails().map((entry) => entry.type),
      'the destruction is all there is',
    ).to.deep.equal([ComponentChangeType.DestroyEntities]);
  });

  it('the old context still reports the destroy', () => {
    const from = contextFor('vcs-4-from');
    const to = contextFor('vcs-4-to');

    const vc = new ViewComponent('probe', {context: from});
    vc.setProperty('x', 7);

    from.buildChangeTrails();

    vc.context = to;

    expect(
      from.buildChangeTrails().map((entry) => entry.type),
      'the context it left tears the entity down',
    ).to.deep.equal([ComponentChangeType.DestroyEntities]);
  });

  it('a component that leaves its context without joining another carries nothing back', () => {
    // there is no receiver for the state at the moment the component leaves, and holding it
    // somewhere in between would be a third place where the same truth lives
    const from = contextFor('vcs-5-from');
    const to = contextFor('vcs-5-to');

    const vc = new ViewComponent('probe', {context: from});
    vc.setProperty('x', 7);

    from.buildChangeTrails();

    vc.context = undefined;
    vc.context = to;

    expect(propsOf(to.buildChangeTrails(), vc.uuid), 'the entity arrives as a bare token').to.be.undefined;
  });
});