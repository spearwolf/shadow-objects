import {describe, expect, it} from 'vitest';
import {Registry} from './Registry.js';

describe('Registry', () => {
  it('find tokens by routes', () => {
    const registry = new Registry();

    registry.appendRoute('foo', ['bar', 'plah']);
    registry.appendRoute('plah', ['foo', 'xyz', 'abc']);

    expect(registry.findTokensByRoute('foo')).toEqual(['foo', 'bar', 'plah', 'xyz', 'abc']);
  });

  it('overlapping routes', () => {
    const registry = new Registry();

    registry.appendRoute('testA', ['foo', 'bar']);
    registry.appendRoute('testB', ['bar', 'plah']);

    expect(registry.findTokensByRoute('testA'), 'testA').toEqual(['testA', 'foo', 'bar']);
    expect(registry.findTokensByRoute('testB'), 'testB').toEqual(['testB', 'bar', 'plah']);
  });
});
