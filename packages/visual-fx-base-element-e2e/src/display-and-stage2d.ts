import {Twopoint5dStage2d} from '@spearwolf/visual-fx-base-element';
import {
  StageRenderFrame,
  StageRenderFrameProps,
  StageResize,
  StageResizeEvent,
} from '@spearwolf/visual-fx-base-element/events.js';
import '@spearwolf/visual-fx-base-element/twopoint5d-stage2d.js';
import '@spearwolf/visual-fx-base-element/vfx-display.js';
import './style.css';
import './vfx-display.css';

console.log('hej ho!');

const el = document.querySelector('[data-testid="stage2d"]') as Twopoint5dStage2d;

let renderFrameLogCount = 0;

el.addEventListener(StageResize, (e: StageResizeEvent) => {
  renderFrameLogCount = 0;
  console.debug(StageResize, e.detail);
});

el.on(StageRenderFrame, (props: StageRenderFrameProps) => {
  if (renderFrameLogCount++ < 3) {
    console.debug(StageRenderFrame, props.frameNo, props);
  }
});
