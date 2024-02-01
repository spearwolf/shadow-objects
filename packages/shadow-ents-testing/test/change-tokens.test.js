import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext, VoidToken} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {findElementsById} from '../src/findElementsById.js';
import {nextChangeTrail} from '../src/nextSyncEvent.js';
import {render} from '../src/render.js';

describe('change tokens', () => {
  beforeEach(async () => {
    render(`
      <shadow-local-env id="localEnv">
        <shadow-entity id="a" token="a"></shadow-entity>
        <shadow-entity id="b"></shadow-entity>
      </shadow-local-env>`);

    await Promise.all([customElements.whenDefined('shadow-local-env'), customElements.whenDefined('shadow-entity')]);
  });

  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('void-token works as expected', async () => {
    const [a, b, localEnv] = findElementsById('a', 'b', 'localEnv');

    let changeTrail = await nextChangeTrail(localEnv.getLocalEnv());

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

    changeTrail = await nextChangeTrail(localEnv.getLocalEnv());

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
