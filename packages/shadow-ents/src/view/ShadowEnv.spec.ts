import {afterEach, describe, expect, it} from 'vitest';
import {ComponentContext} from './ComponentContext.js';
import {LocalShadowObjectEnv} from './LocalShadowObjectEnv.js';
import {ShadowEnv} from './ShadowEnv.js';

describe('ShadowEnv', () => {
  const ctx = ComponentContext.get();

  afterEach(() => {
    ctx.clear();
  });

  it('should be defined', () => {
    expect(ShadowEnv).toBeDefined();
  });

  it('should create', () => {
    const env = new ShadowEnv();
    env.view = ctx;

    expect(env.view).toBeDefined();
    expect(env.isReady).toBeFalsy();
  });

  it('should be ready', () => {
    const env = new ShadowEnv();
    env.view = ctx;
    env.envProxy = new LocalShadowObjectEnv();

    expect(env.view).toBeDefined();
    expect(env.envProxy).toBeDefined();
    expect(env.isReady).toBeTruthy();
  });
});
