import {expect} from '@esm-bundle/chai';
import {ComponentContext, LocalShadowObjectEnv, ShaeWorkerElement} from '@spearwolf/shadow-objects';
import {ConsoleLogger} from '@spearwolf/shadow-objects/ConsoleLogger.js';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {mount, unmountAll} from '../src/mount.js';
import {withSwallowedErrors} from '../src/withSwallowedErrors.js';

/**
 * Covers `ShaeWorkerElement`'s five observed attributes, the `autoSync` property setter, and the
 * element lifecycle from connect to teardown. Runs in real Chromium — the Custom Elements upgrade
 * order and reaction queue these paths depend on are not something happy-dom reproduces reliably.
 *
 * A few blocks below describe a sequence of mutations applied to one element, in order. Each of
 * those rows gets its own `it`, which replays every step up to and including its own from a
 * fresh element rather than continuing where a previous `it` left off — that keeps the file
 * shuffle-safe while still exercising the same sequence the row describes.
 */

let nsCounter = 0;
/** Every case that starts an environment gets its own namespace: two live environments sharing
 * one namespace log an "overwrite a namespace already in use" warning instead of staying isolated. */
const nextNs = () => `worker-element-attributes-${nsCounter++}`;

let previousLoggerEnable;
let previousLoggerWarn;

before(() => {
  // `warn` is gated behind `ConsoleLogger.sharedConfig.enable`, which defaults to
  // `location.host.startsWith('localhost')` — true under the Vitest browser provider, but a
  // silent dependency on the dev server's bind address. Set both explicitly instead of relying
  // on it, and restore afterwards.
  previousLoggerEnable = ConsoleLogger.sharedConfig.enable;
  previousLoggerWarn = ConsoleLogger.sharedConfig.warn;
  ConsoleLogger.sharedConfig.enable = true;
  ConsoleLogger.sharedConfig.warn = true;
});

after(() => {
  ConsoleLogger.sharedConfig.enable = previousLoggerEnable;
  ConsoleLogger.sharedConfig.warn = previousLoggerWarn;
});

afterEach(() => {
  unmountAll();
});

describe('shae-worker auto-sync attribute values', () => {
  // four families the effect turns an auto-sync value into: frame-loop keywords, an "fps"
  // suffix, a millisecond number, and everything else read as "off".
  const cases = [
    ['no', 'no', 'no'],
    ['off', 'off', 'off'],
    ['false', 'false', 'false'],
    ['0', '0', '0'],
    ['-5', '-5', '-5'],
    ['25', '25', '25'],
    ['0fps', '0fps', '0fps'],
    ['20fps', '20fps', '20fps'],
    ['nonsense', 'nonsense', 'nonsense'],
    ['auto-sync', 'auto-sync', 'auto-sync'],
    ['YES', 'yes', 'yes'],
  ];

  for (const [value, expectedAutoSync, expectedAttr] of cases) {
    it(`auto-sync="${value}"`, () => {
      // console.error/console.warn are captured around the mount itself: the auto-sync effect
      // reacts to isConnected$ becoming true, which happens synchronously during upgrade.
      const originalError = console.error;
      const originalWarn = console.warn;
      const errors = [];
      const warns = [];
      console.error = (...args) => errors.push(args);
      console.warn = (...args) => warns.push(args);

      let container;
      try {
        container = mount(`<shae-worker local no-autostart auto-sync="${value}"></shae-worker>`);
      } finally {
        console.error = originalError;
        console.warn = originalWarn;
      }

      const el = container.querySelector('shae-worker');
      expect(el.autoSync).to.equal(expectedAutoSync);
      expect(el.getAttribute('auto-sync')).to.equal(expectedAttr);

      // only "0fps" and "nonsense" are genuinely invalid; -5, 0, false, off and no are valid
      // ways to switch sync off and log nothing.
      if (value === '0fps') {
        expect(warns).to.have.lengthOf(1);
        expect(errors).to.have.lengthOf(0);
      } else if (value === 'nonsense') {
        expect(errors).to.have.lengthOf(1);
        expect(warns).to.have.lengthOf(0);
      } else {
        expect(errors).to.have.lengthOf(0);
        expect(warns).to.have.lengthOf(0);
      }

      el.destroy();
    });
  }
});

describe('invalid auto-sync values are reported, not thrown', () => {
  it('auto-sync="nonsense" logs exactly one console.error naming the value', () => {
    const originalError = console.error;
    const calls = [];
    console.error = (...args) => calls.push(args);

    let container;
    let thrown;
    try {
      thrown = withSwallowedErrors(() => {
        container = mount('<shae-worker local no-autostart auto-sync="nonsense"></shae-worker>');
      });
    } finally {
      console.error = originalError;
    }

    // the error path prints even with the logger disabled — logger.error is called ungated,
    // unlike logger.warn below, which is why the before/after pair above only forces `warn`.
    expect(thrown).to.deep.equal([]);
    expect(calls).to.have.lengthOf(1);
    expect(calls[0]).to.include('invalid auto-sync value: nonsense');

    container.querySelector('shae-worker').destroy();
  });

  it('auto-sync="0fps" logs exactly one console.warn naming the value', () => {
    const originalWarn = console.warn;
    const calls = [];
    console.warn = (...args) => calls.push(args);

    let container;
    let thrown;
    try {
      thrown = withSwallowedErrors(() => {
        container = mount('<shae-worker local no-autostart auto-sync="0fps"></shae-worker>');
      });
    } finally {
      console.warn = originalWarn;
    }

    expect(thrown).to.deep.equal([]);
    expect(calls).to.have.lengthOf(1);
    expect(calls[0]).to.include('invalid auto-sync value: 0fps');

    container.querySelector('shae-worker').destroy();
  });
});

describe('the autoSync property setter', () => {
  // a chain of assignments on one element, starting from "99" — a value distinct from every
  // step's expected result (including "no", the first and third row's target). Starting from
  // "no" itself would leave a setter that silently no-ops on a non-string value undetected for
  // those two rows, since the untouched default already matches what they expect. Row N replays
  // rows 0..N on a fresh element rather than continuing from the previous `it`.
  const steps = [
    [
      '= false',
      (el) => {
        el.autoSync = false;
      },
      'no',
      'no',
    ],
    [
      '= true',
      (el) => {
        el.autoSync = true;
      },
      'frame',
      'frame',
    ],
    [
      '= 0',
      (el) => {
        el.autoSync = 0;
      },
      'no',
      'no',
    ],
    [
      '= 30',
      // pins the current behaviour: any truthy non-string value becomes the frame default, a
      // plain number is never read as a millisecond interval through the property.
      (el) => {
        el.autoSync = 30;
      },
      'frame',
      'frame',
    ],
    [
      "= '  30FPS '",
      (el) => {
        el.autoSync = '  30FPS ';
      },
      '30fps',
      '30fps',
    ],
    [
      "= 'off'",
      (el) => {
        el.autoSync = 'off';
      },
      'off',
      'off',
    ],
  ];

  for (let i = 0; i < steps.length; i++) {
    const [label, , expectedAutoSync, expectedAttr] = steps[i];
    it(`autoSync ${label}`, () => {
      const container = mount('<shae-worker local no-autostart auto-sync="99"></shae-worker>');
      const el = container.querySelector('shae-worker');

      for (let j = 0; j <= i; j++) {
        steps[j][1](el);
      }

      expect(el.autoSync).to.equal(expectedAutoSync);
      expect(el.getAttribute('auto-sync')).to.equal(expectedAttr);
      el.destroy();
    });
  }

  it('removeAttribute("auto-sync") resets to the frame default without writing the attribute back', () => {
    const container = mount('<shae-worker local no-autostart auto-sync="no"></shae-worker>');
    const el = container.querySelector('shae-worker');

    el.removeAttribute('auto-sync');
    expect(el.autoSync).to.equal('frame');
    expect(el.hasAttribute('auto-sync')).to.be.false;
    el.destroy();
  });

  it('an element without an auto-sync attribute defaults to "frame" and stays unwritten', () => {
    const container = mount('<shae-worker local no-autostart></shae-worker>');
    const el = container.querySelector('shae-worker');

    expect(el.autoSync).to.equal('frame');
    expect(ShaeWorkerElement.DefaultAutoSync).to.equal('frame');
    expect(el.hasAttribute('auto-sync')).to.be.false;
    el.destroy();
  });
});

describe('no-autostart', () => {
  it('a bare no-autostart attribute turns shouldAutostart off', () => {
    const container = mount(`<shae-worker local auto-sync="no" no-autostart ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');
    expect(el.shouldAutostart).to.be.false;
    el.destroy();
  });

  it('no-autostart="false" is not a truthy value, so autostart stays on', () => {
    const container = mount(`<shae-worker local auto-sync="no" no-autostart="false" ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');
    expect(el.shouldAutostart).to.be.true;
    el.destroy();
  });

  it('no-autostart="0" is not a truthy value either, so autostart stays on', () => {
    const container = mount(`<shae-worker local auto-sync="no" no-autostart="0" ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');
    expect(el.shouldAutostart).to.be.true;
    el.destroy();
  });

  it('without the attribute at all, shouldAutostart defaults to true', () => {
    const container = mount(`<shae-worker local auto-sync="no" ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');
    expect(el.shouldAutostart).to.be.true;
    el.destroy();
  });

  it('el.autostart = false turns shouldAutostart off even without the attribute', () => {
    const container = mount(`<shae-worker local auto-sync="no" ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');
    el.autostart = false;
    expect(el.shouldAutostart).to.be.false;
    el.destroy();
  });

  it('observes exactly ns, local, src, no-structured-clone and auto-sync', () => {
    // no-autostart is read on every access instead, which is what the five cases above pin
    // down — this only fixes the set the browser calls attributeChangedCallback for.
    expect(customElements.get('shae-worker').observedAttributes).to.deep.equal([
      'ns',
      'local',
      'src',
      'no-structured-clone',
      'auto-sync',
    ]);
  });
});

describe('local, no-structured-clone, src', () => {
  it('a started local element exposes a LocalShadowObjectEnv proxy', async () => {
    const container = mount(`<shae-worker local no-autostart ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');

    await el.start();
    expect(el.shadowEnv.envProxy).to.be.instanceOf(LocalShadowObjectEnv);
    expect(el.shadowEnv.envProxy.isLocalEnv).to.be.true;
    el.destroy();
  });

  it('removing "local" after start() throws inside the reaction, reported as a global error', async () => {
    const container = mount(`<shae-worker local no-autostart ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');
    await el.start();

    const messages = withSwallowedErrors(() => {
      el.removeAttribute('local');
    });
    expect(messages).to.have.lengthOf(1);
    expect(messages[0]).to.contain('Changing the "local" attribute after the shadowEnv has been created is not supported.');
    el.destroy();
  });

  it('the no-structured-clone attribute toggles envProxy.disableStructuredClone', async () => {
    const container = mount(`<shae-worker local no-autostart ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');
    await el.start();
    expect(el.shadowEnv.envProxy.disableStructuredClone).to.be.false;

    el.setAttribute('no-structured-clone', '');
    expect(el.shadowEnv.envProxy.disableStructuredClone).to.be.true;

    el.removeAttribute('no-structured-clone');
    expect(el.shadowEnv.envProxy.disableStructuredClone).to.be.false;

    el.destroy();
  });

  // The four src cases below stay on an unstarted element on purpose: on a started element,
  // setAttribute('src', …) triggers the import effect, Chromium actually tries to fetch
  // "/nope.js", and the failure lands on console.error via #onUnobservedRejection.
  it('setAttribute("src", …) on an unstarted element trims into src$ and leaves the attribute alone', () => {
    const container = mount('<shae-worker local no-autostart></shae-worker>');
    const el = container.querySelector('shae-worker');
    expect(el.shadowEnv.envProxy).to.be.undefined;

    el.setAttribute('src', '  /nope.js  ');
    expect(el.src$.value).to.equal('/nope.js');
    expect(el.getAttribute('src')).to.equal('  /nope.js  ');
    el.destroy();
  });

  it('removeAttribute("src") on an unstarted element empties src$', () => {
    const container = mount('<shae-worker local no-autostart src="  /nope.js  "></shae-worker>');
    const el = container.querySelector('shae-worker');
    expect(el.shadowEnv.envProxy).to.be.undefined;

    el.removeAttribute('src');
    expect(el.src$.value).to.equal('');
    el.destroy();
  });

  it('el.importScript("") rejects with "src is blank"', async () => {
    const container = mount('<shae-worker local no-autostart></shae-worker>');
    const el = container.querySelector('shae-worker');

    let caught;
    try {
      await el.importScript('');
    } catch (error) {
      caught = error;
    }
    expect(caught).to.be.instanceOf(Error);
    expect(caught.message).to.equal('src is blank');
    el.destroy();
  });

  it('shadowEnv.view stays undefined until start() looks the namespace up', async () => {
    // ShaeWorkerElement registers its ns$.onChange handler after super() has already read the
    // ns attribute once, so that first value is never observed as a change — start() catches up
    // with `??=`.
    const ns = nextNs();
    const container = mount(`<shae-worker local no-autostart ns="${ns}"></shae-worker>`);
    const el = container.querySelector('shae-worker');
    expect(el.shadowEnv.view).to.be.undefined;

    await el.start();
    expect(el.shadowEnv.view).to.equal(ComponentContext.get(ns));
    el.destroy();
  });
});

describe('shae-worker lifecycle', () => {
  const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('connectedCallback autostarts on its own without no-autostart', () => {
    const container = mount(`<shae-worker local auto-sync="no" ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');
    expect(el.shadowEnv.envProxy).to.exist;
    el.destroy();
  });

  it('removing the element flips isConnected$ immediately, tears the envProxy down after a microtask', async () => {
    // the teardown is deferred by one microtask so a same-task reconnect is not torn down —
    // this case pins the delay for an element that stays out of the tree, the cases below take
    // the reconnect from both sides.
    const container = mount(`<shae-worker local auto-sync="no" ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');

    el.remove();
    expect(el.isConnected$.value).to.be.false;
    expect(el.shadowEnv.envProxy).to.exist;

    await nextTask();
    expect(el.shadowEnv.envProxy).to.be.undefined;
  });

  it('a reconnect within the same task calls the deferred teardown off', async () => {
    const container = mount(`<shae-worker local auto-sync="no" ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');

    await el.shadowEnv.ready();
    const envProxy = el.shadowEnv.envProxy;

    el.remove();
    container.append(el);

    await nextTask();

    expect(el.shadowEnv.isDestroyed, 'the element is back in the tree, so nothing was torn down').to.be.false;
    expect(el.shadowEnv.envProxy, 'and it is the very same proxy').to.equal(envProxy);
    expect(el.shadowEnv.isReady, 'the environment is usable without a restart').to.be.true;

    // the environment survived, so this resolves instead of rejecting with a ShadowEnvDestroyedError
    await el.start();

    el.destroy();
  });

  it('the entities survive a reconnect within the same task', async () => {
    const ns = nextNs();
    const container = mount(
      `<shae-worker local auto-sync="no" ns="${ns}"></shae-worker><shae-ent ns="${ns}" token="probe"></shae-ent>`,
    );
    await Promise.all(['shae-worker', 'shae-ent'].map((name) => customElements.whenDefined(name)));

    const el = container.querySelector('shae-worker');
    const ent = container.querySelector('shae-ent');

    await el.shadowEnv.ready();
    await el.shadowEnv.syncWait();

    const kernel = el.shadowEnv.envProxy.kernel;
    const entity = kernel.getEntity(ent.uuid);

    el.remove();
    container.append(el);

    await nextTask();

    expect(el.shadowEnv.isDestroyed, 'the premise: the teardown was called off').to.be.false;
    expect(el.shadowEnv.envProxy.kernel, 'the kernel is the one from before').to.equal(kernel);
    expect(kernel.getEntity(ent.uuid), 'and it holds the very same entity').to.equal(entity);
    expect(ComponentContext.get(ns).hasComponent(ent.viewComponent), 'the view side never let go either').to.be.true;

    // a cycle after the move: the environment is usable, not merely undestroyed
    await el.shadowEnv.syncWait();

    el.destroy();
  });

  it('a reconnect after the teardown does not bring the entities back', async () => {
    const ns = nextNs();
    const container = mount(
      `<shae-worker local auto-sync="no" ns="${ns}"></shae-worker><shae-ent ns="${ns}" token="probe"></shae-ent>`,
    );
    await Promise.all(['shae-worker', 'shae-ent'].map((name) => customElements.whenDefined(name)));

    const el = container.querySelector('shae-worker');
    const ent = container.querySelector('shae-ent');

    await el.shadowEnv.ready();
    await el.shadowEnv.syncWait();

    const kernel = el.shadowEnv.envProxy.kernel;
    expect(kernel.hasEntity(ent.uuid), 'the premise: the entity reached the kernel').to.be.true;

    el.remove();
    await nextTask();

    expect(el.shadowEnv.isDestroyed, 'one task out of the tree is enough').to.be.true;
    expect(kernel.hasEntity(ent.uuid), 'and the entities go with the kernel').to.be.false;
    expect(() => kernel.getEntity(ent.uuid), 'asking for one names the uuid').to.throw(
      `entity with uuid "${ent.uuid}" not found!`,
    );

    container.append(el);

    expect(el.shadowEnv.envProxy, 'putting the element back starts nothing').to.be.undefined;
    expect(kernel.hasEntity(ent.uuid), 'and brings no entity back').to.be.false;

    let caught;
    try {
      await el.start();
    } catch (error) {
      caught = error;
    }
    expect(caught?.name, 'a caller who waits for it is told').to.equal('ShadowEnvDestroyedError');

    expect(
      ComponentContext.get(ns).hasComponent(ent.viewComponent),
      'the view side keeps its entity — only the environment behind it is gone',
    ).to.be.true;
  });

  it('a remove, append and remove within the same task tears down exactly once', async () => {
    const container = mount(`<shae-worker local auto-sync="no" ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');

    await el.shadowEnv.ready();

    let destroyCount = 0;
    const destroy = el.destroy.bind(el);
    el.destroy = () => {
      destroyCount += 1;
      destroy();
    };

    el.remove();
    container.append(el);
    el.remove();

    await nextTask();

    expect(destroyCount, 'the element ends up out of the tree, so it is torn down — once').to.equal(1);
    expect(el.shadowEnv.isDestroyed, 'and it is gone').to.be.true;
  });

  it('a departure after the teardown has already run does not tear down a second time', async () => {
    const container = mount(`<shae-worker local auto-sync="no" ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');

    await el.shadowEnv.ready();

    // counts how often the teardown reaches the environment, which is as far as `destroy()` gets
    // once it is past its own guard
    let teardownCount = 0;
    const envDestroy = el.shadowEnv.destroy.bind(el.shadowEnv);
    el.shadowEnv.destroy = () => {
      teardownCount += 1;
      envDestroy();
    };

    el.remove();
    await nextTask();

    // the deferral window closed on an element that was out of the tree, so what follows is a
    // fresh departure and not a second one inside the same window
    expect(teardownCount, 'the first departure tears the environment down').to.equal(1);
    expect(el.shadowEnv.isDestroyed, 'and it is gone').to.be.true;

    container.append(el);
    el.remove();
    await nextTask();

    expect(teardownCount, 'the second departure finds nothing left to tear down').to.equal(1);
  });

  it('destroy() a second time does not throw', () => {
    const container = mount(`<shae-worker local no-autostart ns="${nextNs()}"></shae-worker>`);
    const el = container.querySelector('shae-worker');

    el.destroy();
    expect(() => el.destroy()).to.not.throw();
  });
});