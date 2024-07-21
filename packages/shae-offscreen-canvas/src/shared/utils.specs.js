/* eslint-env mocha */

import {expect} from '@esm-bundle/chai';
import {FrameLoop} from './FrameLoop.js';

describe('utils', () => {
  it('FrameLoop class exists', () => {
    const frameLoop = new FrameLoop();

    expect(frameLoop).to.be.exist;
  });
});
