// import {name} from './package.json';

const displayName = 'visual-fx-base-element'; //name.split('/').pop();

console.log('LOCAL JEST CONFIG', displayName);

export default {
  displayName,
  // preset: '../../jest.preset.js',
  roots: ['./tests/src'],
  transformIgnorePatterns: ['node_modules'],
};
