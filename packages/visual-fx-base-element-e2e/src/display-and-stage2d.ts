import {Twopoint5dStage2d} from '@spearwolf/visual-fx-base-element';
import {
  StageRenderFrame,
  StageRenderFrameProps,
  StageResize,
  StageResizeEvent,
  StageResizeProps,
} from '@spearwolf/visual-fx-base-element/events.js';
import '@spearwolf/visual-fx-base-element/twopoint5d-stage2d.js';
import '@spearwolf/visual-fx-base-element/vfx-display.js';
import './style.css';
import './vfx-display.css';

console.log('hej ho!');

const el = await Twopoint5dStage2d.whenDefined(document.querySelector('[data-testid="stage2d"]'));

let renderFrameLogCount = 0;

el.addEventListener(StageResize, (e: StageResizeEvent) => {
  renderFrameLogCount = 0;
  console.debug(StageResize, e.detail);
});

el.once(StageResize, ({stage}: StageResizeProps) => {
  console.debug('TODO init scene', stage);
});

el.on(StageRenderFrame, (props: StageRenderFrameProps) => {
  if (renderFrameLogCount++ < 3) {
    console.debug(StageRenderFrame, props.frameNo, props);
  }
});
