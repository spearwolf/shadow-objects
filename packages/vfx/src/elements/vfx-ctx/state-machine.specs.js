/* eslint-env mocha */

import {expect} from '@esm-bundle/chai';
import sinon from 'sinon';
import {createActor} from 'xstate';

import {machine} from './state-machine.js';

const getState = (actor) => actor.getSnapshot().value;
const getContext = (actor) => actor.getSnapshot().context;

describe('vfx-ctx/state-machine', () => {
  it('createActor', () => {
    const actor = createActor(machine);

    expect(actor).to.be.ok;
    expect(actor.start).to.be.a('function');

    expect(getContext(actor).src).to.equal('');
    expect(getContext(actor).connected).to.be.false;
  });

  it('updateConnectedState', () => {
    const actor = createActor(machine);
    actor.start();

    expect(getContext(actor).connected).to.be.false;

    actor.send({type: 'updateConnectedState', connected: true});

    expect(getContext(actor).connected).to.be.true;
  });

  it('start', () => {
    const actor = createActor(machine);
    actor.start();

    expect(getState(actor)).to.equal('new');
  });

  describe('new', () => {
    it('initialized :src -> loading', () => {
      const actor = createActor(machine);
      const loadWorker = sinon.spy();

      actor.on('loadWorker', loadWorker);
      actor.start();
      actor.send({type: 'initialized', src: 'foo.js'});

      expect(getState(actor)).to.equal('loading');
      expect(getContext(actor).src).to.equal('foo.js');

      expect(loadWorker.calledOnce).to.be.true;
      expect(loadWorker.lastCall.args).to.deep.equal([{type: 'loadWorker', src: 'foo.js'}]);
    });

    it('initialized -> constructed', () => {
      const actor = createActor(machine);
      const loadWorker = sinon.spy();

      actor.on('loadWorker', loadWorker);
      actor.start();
      actor.send({type: 'initialized'});

      expect(getState(actor)).to.equal('constructed');
      expect(loadWorker.notCalled).to.be.true;
    });
  });
});
