import {expect} from '@esm-bundle/chai';
import {ComponentContext, ShaeEntElement, ShaeWorkerElement} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shae-ent.js';
import '@spearwolf/shadow-ents/shae-worker.js';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

describe('local env entities', () => {
  beforeEach(async () => {
    render(`
      <shae-worker local auto-sync="off" id="localEnv"></shae-worker>
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

    await Promise.all([customElements.whenDefined('shae-worker'), customElements.whenDefined('shae-ent')]);
  });

  afterEach(() => {
    ComponentContext.get().clear();
    document.getElementById('localEnv').shadowEnv.destroy();
  });

  it('localEnv is a ShaeWorkerEnvElement element', () => {
    expect(document.getElementById('localEnv')).to.be.an.instanceof(ShaeWorkerElement);
  });

  it('localEnv has a component-context', () => {
    const localEnv = document.getElementById('localEnv');
    expect(localEnv.shadowEnv.view, 'localEnv.shadowEnv.view').to.exist;
  });

  it('a is a ShaeEntElement element', () => {
    expect(document.getElementById('a')).to.be.an.instanceof(ShaeEntElement);
  });

  it('b is a ShaeEntElement element', () => {
    expect(document.getElementById('b')).to.be.an.instanceof(ShaeEntElement);
  });

  it('c is a ShaeEntElement element', () => {
    expect(document.getElementById('c')).to.be.an.instanceof(ShaeEntElement);
  });

  it('d is a ShaeEntElement element', () => {
    expect(document.getElementById('d')).to.be.an.instanceof(ShaeEntElement);
  });

  it('e is a ShaeEntElement element', () => {
    expect(document.getElementById('e')).to.be.an.instanceof(ShaeEntElement);
  });

  it('f is a ShaeEntElement element', () => {
    expect(document.getElementById('f')).to.be.an.instanceof(ShaeEntElement);
  });

  it('a is parent of b', () => {
    const [a, b] = findElementsById('a', 'b');

    expect(b.entParentNode, 'b.entParentNode').to.equal(a);
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
    expect(c.componentContext, 'c.componentContext').to.equal(localEnv.shadowEnv.view);
    expect(localEnv.shadowEnv.view.hasComponent(c.viewComponent), 'componentContext.hasComponent(c)').to.be.true;
  });

  it('e.viewComponent is parent of f.viewComponent', () => {
    const [e, f] = findElementsById('e', 'f');

    expect(e.viewComponent, 'e.viewComponent').to.exist;
    expect(f.viewComponent.parent, 'f.viewComponent.parent').to.equal(e.viewComponent);
  });

  it('a and e have no entity-parents', () => {
    const [a, e] = findElementsById('a', 'e');

    expect(a.entParentNode, 'a.entParentNode').to.be.undefined;
    expect(e.entParentNode, 'e.entParentNode').to.be.undefined;
  });

  it('append e to b', () => {
    const [a, b, e, f] = findElementsById('a', 'b', 'e', 'f');

    expect(b.entParentNode, 'b.entParentNode').to.equal(a);
    expect(e.entParentNode, 'e.entParentNode').to.undefined;

    b.append(e);

    expect(e.entParentNode, 'e.entParentNode').to.equal(b);
    expect(e.viewComponent.parent, 'e.viewComponent.parent').to.equal(b.viewComponent);

    expect(f.entParentNode, 'f.entParentNode').to.equal(e);
    expect(f.viewComponent.parent, 'f.viewComponent.parent').to.equal(e.viewComponent);
  });
});
