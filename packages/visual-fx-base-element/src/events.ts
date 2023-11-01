import type {Stage2D} from '@spearwolf/twopoint5d';

export const StageResize = 'stageresize';

export interface StageResizeProps {
  name?: string;
  width: number;
  height: number;
  containerWidth: number;
  containerHeight: number;
  stage?: Stage2D;
}

export interface StageResizeEvent extends Event {
  detail?: StageResizeProps;
}

// https://github.com/microsoft/TypeScript/issues/28357#issuecomment-748550734
// https://github.com/microsoft/TypeScript/issues/28357#issuecomment-789392956

declare global {
  interface GlobalEventHandlersEventMap {
    [StageResize]: StageResizeEvent;
  }
}
