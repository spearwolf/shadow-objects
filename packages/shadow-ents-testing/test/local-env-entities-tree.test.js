import {expect} from '@esm-bundle/chai';
import {ShadowEntity, ShadowLocalEnv} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {html, render} from 'lit-html';

const findElementsById = (...ids) => ids.map((id) => document.getElementById(id));

describe('local-env entities tree', () => {
  before(async () => {
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

    await Promise.all([customElements.whenDefined('shadow-local-env'), customElements.whenDefined('shadow-entity')]);
  });

  it('localEnv is a ShadowLocalEnv element', () => {
    expect(document.getElementById('localEnv')).to.be.an.instanceof(ShadowLocalEnv);
  });

  it('localEnv has a component-context', () => {
    const localEnv = document.getElementById('localEnv');
    expect(localEnv.getComponentContext(), 'localEnv.getComponentContext()').to.exist;
  });

  it('a is a ShadowEntity element', () => {
    expect(document.getElementById('a')).to.be.an.instanceof(ShadowEntity);
  });

  it('b is a ShadowEntity element', () => {
    expect(document.getElementById('b')).to.be.an.instanceof(ShadowEntity);
  });

  it('c is a ShadowEntity element', () => {
    expect(document.getElementById('c')).to.be.an.instanceof(ShadowEntity);
  });

  it('d is a ShadowEntity element', () => {
    expect(document.getElementById('d')).to.be.an.instanceof(ShadowEntity);
  });

  it('e is a ShadowEntity element', () => {
    expect(document.getElementById('e')).to.be.an.instanceof(ShadowEntity);
  });

  it('f is a ShadowEntity element', () => {
    expect(document.getElementById('f')).to.be.an.instanceof(ShadowEntity);
  });

  it('a is parent of b', () => {
    const [a, b] = findElementsById('a', 'b');

    expect(b.parentEntity, 'b.parentEntity').to.equal(a);
  });

  it('a has a token', () => {
    expect(document.getElementById('a').token).to.equal('a');
  });

  it('d has no token', () => {
    expect(document.getElementById('d').token).to.be.undefined;
  });

  it('b has a view-component', () => {
    expect(document.getElementById('b').viewComponent).to.exist;
  });

  it('c has component-component-ref to local-env', () => {
    const [c, localEnv] = findElementsById('c', 'localEnv');

    expect(c.viewComponent, 'c.viewComponent').to.exist;
    expect(c.componentContext, 'c.componentContext').to.equal(localEnv.getComponentContext());
    expect(localEnv.getComponentContext().hasComponent(c.viewComponent), 'componentContext.hasComponent(c)').to.be.true;
  });

  it('e.viewComponent is parent of f.viewComponent', () => {
    const [e, f] = findElementsById('e', 'f');

    expect(e.viewComponent, 'e.viewComponent').to.exist;
    expect(f.viewComponent.parent, 'f.viewComponent.parent').to.equal(e.viewComponent);
    expect(f.parentViewComponent, 'f.parentViewComponent').to.equal(e.viewComponent);
  });

  it('a and e have no entity-parents', () => {
    const [a, e] = findElementsById('a', 'e');

    expect(a.parentEntity, 'a.parentEntity').to.be.undefined;
    expect(e.parentEntity, 'e.parentEntity').to.be.undefined;
  });
});
