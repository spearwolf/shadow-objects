import {describe, expect, it} from 'vitest';
import type {ComponentPropertiesType} from '../types.js';
import {applyPropsChanges, filterUndefinedProps, propsEqual} from './props-utils.js';

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
  });

  describe('propsEqual', () => {
    it('should be defined', () => {
      expect(propsEqual).toBeDefined();
    });

    it('both are undefined', () => {
      expect(propsEqual(undefined, undefined)).toBeTruthy();
    });

    it('both are empty', () => {
      expect(propsEqual([], [])).toBeTruthy();
    });

    it('both equal', () => {
      const props: ComponentPropertiesType = [
        ['foo', 'bar'],
        ['abc', 123],
      ];
      expect(propsEqual(props, props)).toBeTruthy();
    });

    it('both are deep equal', () => {
      const a: ComponentPropertiesType = [
        ['foo', 'bar'],
        ['abc', 123],
      ];
      const b: ComponentPropertiesType = [
        ['foo', 'bar'],
        ['abc', 123],
      ];
      expect(propsEqual(a, b)).toBeTruthy();
    });

    it('both are different', () => {
      const a: ComponentPropertiesType = [
        ['foo', 'plah'],
        ['abc', 123],
      ];
      const b: ComponentPropertiesType = [['xxy', 777]];
      expect(propsEqual(a, b)).toBeFalsy();
    });

    it('one is undefined', () => {
      const a: ComponentPropertiesType = [
        ['foo', 'plah'],
        ['abc', 123],
      ];
      expect(propsEqual(a, undefined)).toBeFalsy();
      expect(propsEqual(undefined, a)).toBeFalsy();
    });

    it('ignore undefined props', () => {
      const a: ComponentPropertiesType = [
        ['foo', 'bar'],
        ['xyz', undefined],
        ['abc', 123],
      ];
      const b: ComponentPropertiesType = [
        ['foo', 'bar'],
        ['abc', 123],
        ['666', undefined],
      ];
      expect(propsEqual(a, b)).toBeTruthy();
    });
  });
});
