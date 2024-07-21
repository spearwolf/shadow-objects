import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext, VoidToken} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shae-ent.js';
import '@spearwolf/shadow-ents/shae-worker.js';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

describe('change tokens', () => {
  beforeEach(async () => {
    render(`
      <shae-worker local no-autostart auto-sync="no" id="localEnv"></shae-worker>

      <shae-ent id="a" token="a"></shae-ent>
      <shae-ent id="b"></shae-ent>
    `);

    await Promise.all([customElements.whenDefined('shae-worker'), customElements.whenDefined('shae-ent')]);
  });

  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('void-token works as expected', async () => {
    const [a, b, localEnv] = findElementsById('a', 'b', 'localEnv');

    await localEnv.start();

    let changeTrail = await localEnv.shadowEnv.syncWait();

    expect(changeTrail, 'changeTrail:before').to.deep.equal([
      {
        type: ComponentChangeType.CreateEntities,
        uuid: a.uuid,
        token: 'a',
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: b.uuid,
        token: VoidToken,
      },
    ]);

    a.token = undefined;
    b.token = 'B';

    changeTrail = await localEnv.shadowEnv.syncWait();

    expect(changeTrail, 'changeTrail:after').to.deep.equal([
      {
        type: ComponentChangeType.ChangeToken,
        uuid: a.uuid,
        token: VoidToken,
      },
      {
        type: ComponentChangeType.ChangeToken,
        uuid: b.uuid,
        token: 'B',
      },
    ]);
  });
});
