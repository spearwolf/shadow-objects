import {expect} from '@esm-bundle/chai';
import {ComponentChangeType} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

describe('remove and append e', () => {
  beforeEach(async () => {
    render(`
      <shadow-local-env id="localEnv">
        <shadow-entity id="a" token="a">
          <shadow-entity id="b" token="b">
            <shadow-entity id="c" token="c"></shadow-entity>
            <shadow-entity id="d"></shadow-entity>
          </shadow-entity>
        </shadow-entity>
        <shadow-entity id="e" token="e">
          <shadow-entity id="f" token="f"></shadow-entity>
        </shadow-entity>
      </shadow-local-env>`);

    await Promise.all([customElements.whenDefined('shadow-local-env'), customElements.whenDefined('shadow-entity')]);
  });

  it('remove and append e', () => {
    const [b, e, localEnv] = findElementsById('b', 'e', 'localEnv');

    let changeTrail = localEnv.getComponentContext().buildChangeTrails();

    console.log('A', changeTrail);

    e.remove();

    e.token = 'tick';

    b.append(e);

    changeTrail = localEnv.getComponentContext().buildChangeTrails();

    console.log('B', changeTrail);

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
