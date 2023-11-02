import {Twopoint5dStage2d} from '@spearwolf/visual-fx-base-element';
import {
  StageFirstFrame,
  StageFirstFrameProps,
  StageRenderFrame,
  StageRenderFrameProps,
  StageResize,
  StageResizeEvent,
} from '@spearwolf/visual-fx-base-element/events.js';
import '@spearwolf/visual-fx-base-element/twopoint5d-stage2d.js';
import '@spearwolf/visual-fx-base-element/vfx-display.js';
import {Color, Scene} from 'three';
import './style.css';
import './vfx-display.css';

console.log('hej ho!');

const el = await Twopoint5dStage2d.whenDefined(document.querySelector('[data-testid="stage2d"]'));

let renderFrameLogCount = 0;

el.addEventListener(StageResize, (e: StageResizeEvent) => {
  renderFrameLogCount = 0;
  console.debug(StageResize, e.detail);
});

el.sceneReady().then((scene: Scene) => {
  scene.background = new Color(0x102030);
});

el.once(StageFirstFrame, (props: StageFirstFrameProps) => {
  console.log('firstFrame', props);
});

el.firstFrame().then((props: StageFirstFrameProps) => {
  console.log('firstFrame (promise)', props);
});

el.on(StageRenderFrame, (props: StageRenderFrameProps) => {
  if (renderFrameLogCount++ < 3) {
    console.debug(StageRenderFrame, props.frameNo, props);
  }
});
