import {expect} from '@esm-bundle/chai';
import {ComponentChangeType} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {html, render} from 'lit-html';
import {findElementsById} from '../src/findElementsById.js';

describe('build-change-trail', () => {
  beforeEach(async () => {
    render(
      html`<shadow-local-env id="localEnv">
        <shadow-entity id="a" token="a">
          <shadow-entity id="b" token="b">
            <shadow-entity id="c" token="c"></shadow-entity>
            <shadow-entity id="d"></shadow-entity>
          </shadow-entity>
        </shadow-entity>
        <shadow-entity id="e" token="e">
          <shadow-entity id="f" token="f"></shadow-entity>
        </shadow-entity>
      </shadow-local-env>`,
      document.body,
    );

    document.body.style.backgroundColor = '#142';

    await Promise.all([customElements.whenDefined('shadow-local-env'), customElements.whenDefined('shadow-entity')]);
  });

  it('append e to b', () => {
    console.group('append e to b');

    const [b, e, localEnv] = findElementsById('b', 'e', 'localEnv');

    console.log('before', localEnv.getComponentContext().buildChangeTrails());

    e.token = 'bee';

    b.append(e);

    const changeTrail = localEnv.getComponentContext().buildChangeTrails();

    console.log('after(append e to b)', changeTrail);

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

    console.groupEnd();
  });

  it('a: set properties', () => {
    console.group('a: set properties');

    const [a, localEnv] = findElementsById('a', 'localEnv');

    a.viewComponent.setProperty('foo', 'bar');
    a.viewComponent.setProperty('plah', [1, 2, 3]);

    const changeTrail = localEnv.getComponentContext().buildChangeTrails();

    console.log('after(a: set properties)', changeTrail);

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

    console.groupEnd();
  });

  it('destroy a', () => {
    console.group('destroy a');

    const [a, b, c, d, e, f, localEnv] = findElementsById('a', 'b', 'c', 'd', 'e', 'f', 'localEnv');

    localEnv.getComponentContext().buildChangeTrails();

    expect(b.parentEntity).to.equal(a);

    a.viewComponent.setProperty('foo', 'bar');
    d.viewComponent.setProperty('plah', 'plah!');
    localEnv.remove(a);

    const changeTrail = localEnv.getComponentContext().buildChangeTrails();

    console.log('after(destroy a)', changeTrail);

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
      {
        type: ComponentChangeType.DestroyEntities,
        uuid: e.uuid,
      },
      {
        type: ComponentChangeType.DestroyEntities,
        uuid: f.uuid,
      },
    ]);

    console.groupEnd();
  });
});
