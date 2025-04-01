import {describe, expect, it} from 'vitest';
import {Registry} from './Registry.js';

describe('Registry', () => {
  it('find tokens by routes', () => {
    const registry = new Registry();

    registry.appendRoute('foo', ['bar', 'plah']);
    registry.appendRoute('plah', ['foo', 'xyz', 'abc']);

    expect(Array.from(registry.findTokensByRoute('foo')).sort()).toEqual(['abc', 'bar', 'foo', 'plah', 'xyz']);
  });

  it('overlapping routes', () => {
    const registry = new Registry();

    registry.appendRoute('testA', ['foo', 'bar']);
    registry.appendRoute('testB', ['bar', 'plah']);

    expect(Array.from(registry.findTokensByRoute('testA')).sort(), 'testA').toEqual(['bar', 'foo', 'testA']);
    expect(Array.from(registry.findTokensByRoute('testB')).sort(), 'testB').toEqual(['bar', 'plah', 'testB']);
  });

  it('prop based routings - simple', () => {
    const registry = new Registry();

    registry.appendRoute('foo', ['bar', 'plah']);
    registry.appendRoute('@x', ['xyz', 'abc']);
    registry.appendRoute('@y', ['abc']);

    expect(Array.from(registry.findTokensByRoute('foo', new Set('x'))).sort()).toEqual(['abc', 'bar', 'foo', 'plah', 'xyz']);
  });

  it('prop based routings - advanced', () => {
    const registry = new Registry();

    registry.appendRoute('foo', ['bar', 'plah']);
    registry.appendRoute('plah@y', ['abc']);
    registry.appendRoute('abc@x', ['xyz']);

    expect(Array.from(registry.findTokensByRoute('foo', new Set(['x', 'y']))).sort()).toEqual([
      'abc',
      'bar',
      'foo',
      'plah',
      'xyz',
    ]);
  });
});
