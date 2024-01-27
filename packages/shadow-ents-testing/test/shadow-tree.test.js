import {expect} from '@esm-bundle/chai';
import {ShadowEntity, ShadowLocalEnv} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {html, render} from 'lit-html';

const queryShadowEntityByToken = (token) => document.querySelector(`[token="${token}"]`);
const queryShadowEntitiesByToken = (...tokens) => tokens.map((token) => queryShadowEntityByToken(token));

describe('shadow-ents-tree', () => {
  before(async () => {
    render(
      html`<shadow-local-env id="localEnv">
        <shadow-entity token="a">
          <shadow-entity token="b">
            <shadow-entity token="c"></shadow-entity>
            <shadow-entity token="d"></shadow-entity>
          </shadow-entity>
        </shadow-entity>
        <shadow-entity token="e">
          <shadow-entity token="f"></shadow-entity>
        </shadow-entity>
      </shadow-local-env>`,
      document.body,
    );

    await Promise.all([customElements.whenDefined('shadow-local-env'), customElements.whenDefined('shadow-entity')]);
  });

  it('localEnv has a component-context', () => {
    const localEnv = document.getElementById('localEnv');
    expect(localEnv.getComponentContext(), 'getComponentContext()').to.exist;
  });

  it('localEnv is a ShadowLocalEnv element', () => {
    const localEnv = document.getElementById('localEnv');
    expect(localEnv).to.be.an.instanceof(ShadowLocalEnv);
  });

  it('a is a ShadowEntity element', () => {
    expect(queryShadowEntityByToken('a')).to.be.an.instanceof(ShadowEntity);
  });

  it('b is a ShadowEntity element', () => {
    expect(queryShadowEntityByToken('b')).to.be.an.instanceof(ShadowEntity);
  });

  it('c is a ShadowEntity element', () => {
    expect(queryShadowEntityByToken('c')).to.be.an.instanceof(ShadowEntity);
  });

  it('d is a ShadowEntity element', () => {
    expect(queryShadowEntityByToken('d')).to.be.an.instanceof(ShadowEntity);
  });

  it('e is a ShadowEntity element', () => {
    expect(queryShadowEntityByToken('e')).to.be.an.instanceof(ShadowEntity);
  });

  it('f is a ShadowEntity element', () => {
    expect(queryShadowEntityByToken('f')).to.be.an.instanceof(ShadowEntity);
  });

  it('a is parent of b', () => {
    const [a, b] = queryShadowEntitiesByToken('a', 'b');

    expect(b.parentEntity).to.equal(a);
  });
});
