import {describe, expect, it} from 'vitest';
import type {ComponentPropertiesType} from '../types.js';
import {applyPropsChanges, filterUndefinedProps} from './props-utils.js';

describe('props-utils', () => {
  describe('filterUndefinedProps', () => {
    it('should be defined', () => {
      expect(filterUndefinedProps).toBeDefined();
    });

    it('props undefined', () => {
      expect(filterUndefinedProps(undefined)).toBeUndefined();
    });

    it('props are empty', () => {
      expect(filterUndefinedProps([])).toBeUndefined();
    });

    it('should work as expected', () => {
      expect(
        filterUndefinedProps([
          ['foo', 'bar'],
          ['plah', undefined],
          ['xyz', null],
          ['abc', ''],
        ]),
      ).toEqual([
        ['foo', 'bar'],
        ['xyz', null],
        ['abc', ''],
      ]);
    });

    it('keeps a bare key', () => {
      const props: ComponentPropertiesType = [['foo'], ['bar', undefined], ['baz', 1]];
      expect(filterUndefinedProps(props)).toEqual([['foo'], ['baz', 1]]);
    });

    it('reports nothing as undefined when the filter empties the list', () => {
      expect(filterUndefinedProps([['foo', undefined]])).toBeUndefined();
      expect(
        filterUndefinedProps([
          ['foo', undefined],
          ['bar', undefined],
        ]),
      ).toBeUndefined();
    });
  });

  describe('applyPropsChanges', () => {
    it('should be defined', () => {
      expect(applyPropsChanges).toBeDefined();
    });

    it('curProps and changes are equal', () => {
      const props: ComponentPropertiesType = [['foo', 'bar']];
      expect(applyPropsChanges(props, props)).toBe(props);
    });

    it('curProps and changes are undefined', () => {
      expect(applyPropsChanges(undefined, undefined)).toBeUndefined();
    });

    it('should return all defined props from changes if curProps is undefined', () => {
      const changes: ComponentPropertiesType = [
        ['foo', 'bar'],
        ['abc', undefined],
        ['plah', 'xyz'],
      ];
      expect(applyPropsChanges(undefined, changes)).toEqual([
        ['foo', 'bar'],
        ['plah', 'xyz'],
      ]);
    });

    it('should work as expected', () => {
      const curProps: ComponentPropertiesType = [
        ['foo', 'bar'],
        ['abc', 123],
      ];
      const changes: ComponentPropertiesType = [
        ['foo', 'plah'],
        ['abc', undefined],
        ['plah', 'xyz'],
      ];
      expect(applyPropsChanges(curProps, changes)).toEqual([
        ['foo', 'plah'],
        ['plah', 'xyz'],
      ]);
    });

    it('leaves the tuples of changes to their owner', () => {
      const changes: ComponentPropertiesType = [['foo', 'bar']];
      const props = applyPropsChanges(undefined, changes)!;

      applyPropsChanges(props, [['foo', 'baz']]);

      expect(changes).toEqual([['foo', 'bar']]);
      expect(props[0]).not.toBe(changes[0]);
    });

    it('copies a bare key as a bare key', () => {
      const changes: ComponentPropertiesType = [['foo'], ['bar', 2]];
      const result = applyPropsChanges(undefined, changes);
      expect(result).toEqual([['foo'], ['bar', 2]]);
    });

    it('keeps a bare key that lands on a standing list', () => {
      const curProps: ComponentPropertiesType = [['abc', 1]];
      const changes: ComponentPropertiesType = [['foo'], ['bar', 2]];
      expect(applyPropsChanges(curProps, changes)).toEqual([['abc', 1], ['foo'], ['bar', 2]]);
    });

    it('takes the value off an entry a bare key names', () => {
      const curProps: ComponentPropertiesType = [['foo', 'bar']];
      expect(applyPropsChanges(curProps, [['foo']])).toEqual([['foo']]);
    });

    it('reads a bare key the same way with and without curProps', () => {
      const changes: ComponentPropertiesType = [['foo'], ['bar', 2]];
      expect(applyPropsChanges([], changes)).toEqual(applyPropsChanges(undefined, changes));
    });

    it('drops an entry a change names with an explicit undefined', () => {
      const curProps: ComponentPropertiesType = [['foo'], ['bar', 2]];
      expect(applyPropsChanges(curProps, [['foo', undefined]])).toEqual([['bar', 2]]);
    });

    it('reports nothing as undefined when a create leaves no property standing', () => {
      expect(applyPropsChanges(undefined, [['foo', undefined]])).toBeUndefined();
    });

    it('reports nothing as undefined when the changes empty a standing list', () => {
      const curProps: ComponentPropertiesType = [['foo', 'bar']];
      expect(applyPropsChanges(curProps, [['foo', undefined]])).toBeUndefined();
    });
  });
});
