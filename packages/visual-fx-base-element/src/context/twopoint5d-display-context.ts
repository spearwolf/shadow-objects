import {createContext} from '@lit/context';
import type {Display} from '@spearwolf/twopoint5d';

export const twopoint5dDisplayContext = createContext<Display | undefined>(Symbol('twopoint5d-display'));
