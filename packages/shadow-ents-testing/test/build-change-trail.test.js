import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

describe('build-change-trail', () => {
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

  it('append e to b', () => {
    const [b, e, localEnv] = findElementsById('b', 'e', 'localEnv');

    let changeTrail = localEnv.getComponentContext().buildChangeTrails();

    e.token = 'bee';

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
        token: 'bee',
      },
    ]);
  });

  it('a: set properties', () => {
    const [a, localEnv] = findElementsById('a', 'localEnv');

    localEnv.getComponentContext().buildChangeTrails();

    a.viewComponent.setProperty('foo', 'bar');
    a.viewComponent.setProperty('plah', [1, 2, 3]);

    const changeTrail = localEnv.getComponentContext().buildChangeTrails();

    expect(changeTrail, 'changeTrail').to.deep.equal([
      {
        type: ComponentChangeType.ChangeProperties,
        uuid: a.uuid,
        properties: [
          ['foo', 'bar'],
          ['plah', [1, 2, 3]],
        ],
      },
    ]);
  });

  it('destroy a', () => {
    const [a, b, c, d, localEnv] = findElementsById('a', 'b', 'c', 'd', 'localEnv');

    localEnv.getComponentContext().buildChangeTrails();

    expect(b.parentEntity).to.equal(a);

    a.viewComponent.setProperty('foo', 'bar');
    d.viewComponent.setProperty('plah', 'plah!');
    a.remove();

    const changeTrail = localEnv.getComponentContext().buildChangeTrails();

    expect(changeTrail, 'changeTrail').to.deep.equal([
      {
        type: ComponentChangeType.DestroyEntities,
        uuid: a.uuid,
      },
      {
        type: ComponentChangeType.DestroyEntities,
        uuid: b.uuid,
      },
      {
        type: ComponentChangeType.DestroyEntities,
        uuid: c.uuid,
      },
      {
        type: ComponentChangeType.DestroyEntities,
        uuid: d.uuid,
      },
    ]);
  });
});
