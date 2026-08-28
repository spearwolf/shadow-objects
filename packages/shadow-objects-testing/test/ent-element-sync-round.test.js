import {expect} from '@esm-bundle/chai';
import {ComponentContext, ShadowEnv} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * `syncShadowObjects()` collects the namespaces asked for in one task and syncs them one microtask
 * later, in one round. This spec pins what a namespace whose `sync()` throws costs: itself, and
 * nothing else — the namespaces waiting behind it in the same round are synced regardless, and the
 * round behind that one carries only what was asked for anew.
 *
 * It runs in real Chromium because the round goes through the elements: `<shae-ent>` is what
 * reaches the module-wide collector, and its connect reactions are part of what fills the first
 * round.
 *
 * A live `ShadowEnv` is not frozen — `Object.freeze` runs in `destroy()` — so `env.sync` can be
 * replaced by a recording stub. The environments here never become ready, and they do not need to:
 * the stub is the whole delivery.
 */
describe('shae-ent sync round', () => {
  const NS_A = 'sync-round-a';
  const NS_B = 'sync-round-b';

  let consoleError;
  let reports;

  beforeEach(() => {
    reports = [];
    consoleError = console.error;
    console.error = (...args) => {
      reports.push(args);
    };
  });

  afterEach(() => {
    console.error = consoleError;
    unmountAll();
  });

  /** Resolves once every microtask queued before it has run. */
  const nextMicrotask = () => new Promise((resolve) => queueMicrotask(resolve));

  /** The elements sync on connect by themselves, and those rounds are none of this spec's business. */
  const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('a namespace whose sync throws costs itself and no other namespace of the round', async () => {
    const syncs = [];

    const envA = new ShadowEnv();
    envA.view = ComponentContext.get(NS_A);
    envA.sync = () => {
      syncs.push(NS_A);
      throw new Error('the sync of a failed');
    };

    const envB = new ShadowEnv();
    envB.view = ComponentContext.get(NS_B);
    envB.sync = () => {
      syncs.push(NS_B);
    };

    const container = mount(`<shae-ent id="sync-round-ent-a" ns="${NS_A}"></shae-ent>
      <shae-ent id="sync-round-ent-b" ns="${NS_B}"></shae-ent>`);

    const elA = container.querySelector('#sync-round-ent-a');
    const elB = container.querySelector('#sync-round-ent-b');
    expect(elA.isShaeElement, 'the elements must have been upgraded').to.be.true;

    await nextTask();

    syncs.length = 0;
    reports.length = 0;

    // both in the same task, so both stand in one round, with the throwing one in front
    elA.syncShadowObjects();
    elB.syncShadowObjects();

    await nextMicrotask();

    expect(syncs, 'the namespace behind the failing one must be synced as well').to.eql([NS_A, NS_B]);
    expect(reports.length, 'the failure must be reported').to.equal(1);
    expect(reports[0].join(' '), 'the report must name the namespace').to.contain(NS_A);

    syncs.length = 0;

    // the round behind it carries what was asked for anew and nothing that a failure left standing
    elB.syncShadowObjects();

    await nextMicrotask();

    expect(syncs, 'the failed namespace must not be synced a second time').to.eql([NS_B]);
  });
});
