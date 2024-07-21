import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

describe('remove and append e', () => {
  beforeEach(async () => {
    render(`
      <shae-worker local no-autostart auto-sync="off" id="localEnv"></shae-worker>

      <shae-ent id="a" token="a">
        <shae-ent id="b" token="b">
          <shae-ent id="c" token="c"></shae-ent>
          <shae-ent id="d"></shae-ent>
        </shae-ent>
      </shae-ent>
      <shae-ent id="e" token="e">
        <shae-ent id="f" token="f"></shae-ent>
      </shae-ent>
    `);

    await Promise.all(['shae-worker', 'shae-ent'].map((name) => customElements.whenDefined(name)));
  });

  afterEach(() => {
    ComponentContext.get().clear();
    document.getElementById('localEnv').shadowEnv.destroy();
  });

  it('remove and append e', async () => {
    const [b, e, localEnv] = findElementsById('b', 'e', 'localEnv');

    await localEnv.start();
    await localEnv.shadowEnv.syncWait();

    e.remove();

    e.token = 'tick';

    b.append(e);

    const changeTrail = await localEnv.shadowEnv.syncWait();

    expect(changeTrail, 'changeTrail').to.deep.equal([
      {
        type: ComponentChangeType.SetParent,
        uuid: e.uuid,
        parentUuid: b.uuid,
      },
      {
        type: ComponentChangeType.ChangeToken,
        uuid: e.uuid,
        token: 'tick',
      },
    ]);
  });
});
