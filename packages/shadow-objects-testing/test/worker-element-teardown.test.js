import {expect} from '@esm-bundle/chai';
import {ComponentContext} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-worker.js';

/**
 * `<shae-worker>` autostarts on connect and destroys its environment on disconnect. Both can
 * happen within the same task — a framework that mounts and immediately unmounts, a page that
 * replaces its markup — and `ShadowEnv.ready()` then rejects with a `ShadowEnvDestroyedError`.
 *
 * Nothing inside the element waits on that promise, so the rejection has to be absorbed. If it
 * is not, every such element leaves an unhandled rejection behind.
 */
describe('shae-worker teardown race', () => {
  const NS = 'worker-element-teardown';

  let rejections;
  let onUnhandledRejection;

  beforeEach(() => {
    rejections = [];
    onUnhandledRejection = (event) => {
      rejections.push(event.reason);
      event.preventDefault();
    };
    window.addEventListener('unhandledrejection', onUnhandledRejection);
  });

  afterEach(() => {
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    document.getElementById('teardown-host')?.remove();
    ComponentContext.get(NS).clear();
  });

  /** Unhandled rejections are reported at the end of a task, so let one pass. */
  const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('a destroyed environment leaves no unhandled rejection behind', async () => {
    const host = document.createElement('div');
    host.id = 'teardown-host';
    document.body.append(host);

    // connectedCallback autostarts and discards the promise `start()` returns
    host.innerHTML = `<shae-worker local auto-sync="off" ns="${NS}"></shae-worker>`;

    const el = host.querySelector('shae-worker');
    expect(el.isShaeWorkerElement, 'the element must have been upgraded').to.be.true;

    // still in the same task, so the environment cannot have come up yet: this is what a
    // connect/disconnect pair within one task boils down to, without racing a microtask
    el.shadowEnv.destroy();
    el.remove();

    await nextTask();
    await nextTask();

    expect(
      rejections.map((error) => `${error?.name}: ${error?.message}`),
      'the discarded ready() promise must not reject into nowhere',
    ).to.eql([]);
  });

  it('start() still rejects for a caller that does wait for it', async () => {
    const host = document.createElement('div');
    host.id = 'teardown-host';
    document.body.append(host);

    host.innerHTML = `<shae-worker local no-autostart auto-sync="off" ns="${NS}"></shae-worker>`;

    const el = host.querySelector('shae-worker');
    const ready = el.start();

    el.shadowEnv.destroy();

    let caught;
    try {
      await ready;
    } catch (error) {
      caught = error;
    }

    expect(caught?.name).to.equal('ShadowEnvDestroyedError');
    expect(rejections).to.eql([]);
  });
});
