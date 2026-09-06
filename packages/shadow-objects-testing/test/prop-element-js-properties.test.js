import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * A `<shae-prop>` is written to through its JavaScript properties as often as through its
 * attributes: React 19 and Vue 3 assign every prop whose name is `in` the element as a property and
 * fall back to `setAttribute` only for the rest, and both build the subtree first and insert it
 * afterwards. This spec pins what such a write does — `name` reaches the attribute and binds, a
 * `value` written before the first connect survives it — and where the attribute still decides.
 *
 * It runs in real Chromium because the order of the custom element reactions on an inserted
 * subtree is what the framework path depends on: the entity connects before the property under it.
 */

/** The property list the entity would be created with right now — its state, not its last trail. */
const stateOf = (ctx, uuid) => {
  ctx.reCreateChanges();
  const trail = ctx.buildChangeTrails();
  return trail.find((entry) => entry.type === ComponentChangeType.CreateEntities && entry.uuid === uuid)?.properties;
};

const stateMapOf = (ctx, uuid) => Object.fromEntries(stateOf(ctx, uuid) ?? []);

/** A connected `<shae-ent>` in a namespace of its own, and the context it lives in. */
const mountEntity = (ns) => {
  const container = mount(`<shae-ent ns="${ns}" token="probe"></shae-ent>`);
  const ent = container.querySelector('shae-ent');
  return {container, ent, ctx: ComponentContext.get(ns)};
};

before(async () => {
  await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));
});

afterEach(() => {
  unmountAll();
});

describe('shae-prop written to through its JavaScript properties', () => {
  it('a name written as a property lands in the attribute and binds the property', () => {
    const {ent, ctx} = mountEntity('pjs-1');
    const prop = document.createElement('shae-prop');
    prop.name = 'speed';
    prop.value = 5;
    ent.append(prop);

    expect(prop.getAttribute('name'), 'the attribute mirrors the write').to.equal('speed');
    expect(prop.name).to.equal('speed');
    expect(stateMapOf(ctx, ent.uuid)).to.deep.equal({speed: 5});
  });

  it('a name written as a property is trimmed like the attribute is', () => {
    const {ent, ctx} = mountEntity('pjs-2');
    const prop = document.createElement('shae-prop');
    prop.name = '  speed ';
    prop.value = 5;
    ent.append(prop);

    expect(prop.name).to.equal('speed');
    expect(stateMapOf(ctx, ent.uuid)).to.deep.equal({speed: 5});
  });

  it('a name written as undefined removes the attribute and takes the property back', () => {
    const {ent, ctx} = mountEntity('pjs-3');
    const prop = document.createElement('shae-prop');
    prop.setAttribute('name', 'speed');
    prop.value = 5;
    ent.append(prop);
    expect(stateMapOf(ctx, ent.uuid)).to.deep.equal({speed: 5});

    prop.name = undefined;

    expect(prop.hasAttribute('name')).to.be.false;
    expect(prop.name).to.be.undefined;
    expect(stateMapOf(ctx, ent.uuid)).to.deep.equal({});
  });

  it('a value written as a property before the first connect survives it', () => {
    const {ent, ctx} = mountEntity('pjs-4');
    const prop = document.createElement('shae-prop');
    prop.setAttribute('name', 'speed');
    prop.value = 5;
    ent.append(prop);

    expect(prop.value).to.equal(5);
    expect(prop.hasAttribute('value'), 'the write stays off the attribute').to.be.false;
    expect(stateMapOf(ctx, ent.uuid)).to.deep.equal({speed: 5});
  });

  it('a value written as a property survives a move to another entity', async () => {
    const {ent, ctx} = mountEntity('pjs-5');
    const other = document.createElement('shae-ent');
    other.setAttribute('ns', 'pjs-5');
    other.setAttribute('token', 'probe');
    ent.parentElement.append(other);
    const prop = document.createElement('shae-prop');
    prop.setAttribute('name', 'speed');
    prop.value = 5;
    ent.append(prop);

    other.append(prop);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(stateMapOf(ctx, ent.uuid)).to.deep.equal({});
    expect(stateMapOf(ctx, other.uuid)).to.deep.equal({speed: 5});
  });

  it('a value attribute present on connect wins over an earlier property write', () => {
    const {ent, ctx} = mountEntity('pjs-6');
    const prop = document.createElement('shae-prop');
    prop.setAttribute('name', 'speed');
    prop.setAttribute('value', '3');
    prop.setAttribute('type', 'int');
    prop.value = 9;
    ent.append(prop);

    expect(stateMapOf(ctx, ent.uuid)).to.deep.equal({speed: 3});
  });

  it('a string written as a property still goes through the type conversion', () => {
    const {ent, ctx} = mountEntity('pjs-7');
    const prop = document.createElement('shae-prop');
    prop.name = 'speed';
    prop.value = '7';
    prop.setAttribute('type', 'int');
    ent.append(prop);

    expect(stateMapOf(ctx, ent.uuid)).to.deep.equal({speed: 7});
  });

  it('a subtree built through property writes and inserted at once declares its properties', () => {
    // the shape a framework renderer produces: the entity and its properties are built detached,
    // written to as properties where the element has one, and enter the document together
    const container = mount('');
    const ent = document.createElement('shae-ent');
    ent.setAttribute('ns', 'pjs-8');
    ent.token = 'probe';
    const seconds = document.createElement('shae-prop');
    seconds.name = 'seconds';
    seconds.value = '30';
    seconds.setAttribute('type', 'int');
    const running = document.createElement('shae-prop');
    running.name = 'running';
    running.value = false;
    ent.append(seconds, running);

    container.append(ent);

    expect(stateMapOf(ComponentContext.get('pjs-8'), ent.uuid)).to.deep.equal({seconds: 30, running: false});
  });
});
