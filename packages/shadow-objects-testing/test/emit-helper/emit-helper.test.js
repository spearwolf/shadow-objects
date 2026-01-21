import {expect} from '@esm-bundle/chai';
import {on, once} from '@spearwolf/eventize';
import {ComponentContext} from '@spearwolf/shadow-objects';
import {shadowObjects} from '@spearwolf/shadow-objects/shadow-objects.js';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {findElementsById} from '../../src/findElementsById.js';
import {render} from '../../src/render.js';

describe('ShadowObjectCreationAPI.emit helper', () => {
  beforeEach(async () => {
    render(`
      <shae-worker local no-autostart auto-sync="no" id="localEnv" no-structured-clone></shae-worker>

      <shae-ent id="a" token="A"></shae-ent>
      <shae-ent id="b" token="B"></shae-ent>
    `);

    await Promise.all(['shae-worker', 'shae-ent'].map((name) => customElements.whenDefined(name)));
  });

  afterEach(() => {
    ComponentContext.get().clear();
    const localEnv = document.getElementById('localEnv');
    if (localEnv && localEnv.shadowEnv) {
      localEnv.shadowEnv.destroy();
    }
  });

  it('emits events on the entity by default', async () => {
    let emitted = false;

    class MyShadowObject {
      constructor({entity, emit}) {
        once(entity, 'foo', () => {
          emitted = true;
        });
        emit('foo');
      }
    }

    shadowObjects.define('A', MyShadowObject);

    const [localEnv] = findElementsById('localEnv');
    await localEnv.start();
    await localEnv.shadowEnv.syncWait();

    expect(emitted).to.be.true;
  });

  it('emits events on a specific target if provided', async () => {
    let emitted = false;

    class MyShadowObject {
      constructor({emit}) {
        const otherObj = {};
        on(otherObj, 'bar', () => {
          emitted = true;
        });
        emit(otherObj, 'bar');
      }
    }

    shadowObjects.define('B', MyShadowObject);

    const [localEnv] = findElementsById('localEnv');
    await localEnv.start();
    await localEnv.shadowEnv.syncWait();

    expect(emitted).to.be.true;
  });
});
