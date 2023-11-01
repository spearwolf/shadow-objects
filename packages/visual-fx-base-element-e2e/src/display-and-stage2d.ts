import {StageResize, StageResizeEvent} from '@spearwolf/visual-fx-base-element/events.js';
import '@spearwolf/visual-fx-base-element/twopoint5d-stage2d.js';
import '@spearwolf/visual-fx-base-element/vfx-display.js';
import './style.css';
import './vfx-display.css';

console.log('hej ho!');

const el = document.querySelector('[data-testid="stage2d"]');

el.addEventListener(StageResize, (e: StageResizeEvent) => {
  console.debug(StageResize, e.detail, e);
});
