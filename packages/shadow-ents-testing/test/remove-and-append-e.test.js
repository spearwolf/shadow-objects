import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext} from '@spearwolf/shadow-ents';
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

  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('remove and append e', () => {
    const [b, e, localEnv] = findElementsById('b', 'e', 'localEnv');

    let changeTrail = localEnv.getComponentContext().buildChangeTrails();

    e.remove();

    e.token = 'tick';

    b.append(e);

    changeTrail = localEnv.getComponentContext().buildChangeTrails();

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
