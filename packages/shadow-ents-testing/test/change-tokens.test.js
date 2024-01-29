import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, VoidToken} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {findElementsById} from '../src/findElementsById.js';
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

  it('void-token works as expected', () => {
    const [a, b, localEnv] = findElementsById('a', 'b', 'localEnv');

    let changeTrail = localEnv.getComponentContext().buildChangeTrails();

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

    changeTrail = localEnv.getComponentContext().buildChangeTrails();

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
