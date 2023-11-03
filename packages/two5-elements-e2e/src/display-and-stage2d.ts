import {TextureFactory} from '@spearwolf/twopoint5d';
import {Twopoint5dStage2d} from '@spearwolf/two5-elements';
import {StageFirstFrameProps} from '@spearwolf/two5-elements/events.js';
import '@spearwolf/two5-elements/two5-stage2d.js';
import '@spearwolf/two5-elements/two5-display.js';
import {Color, Scene, Sprite, SpriteMaterial} from 'three';
import './style.css';
import './two5-display.css';

console.log('hej ho!');

Twopoint5dStage2d.whenDefined(document.getElementById('stage2d')).then((el) => {
  // let renderFrameLogCount = 0;

  // el.addEventListener(StageResize, (e: StageResizeEvent) => {
  //   renderFrameLogCount = 0;
  //   console.debug(StageResize, e.detail);
  // });

  el.sceneReady().then((scene: Scene) => {
    scene.background = new Color(0x212121);
  });

  el.firstFrame().then(({renderer, stage: {scene}}: StageFirstFrameProps) => {
    const texFactory = new TextureFactory(renderer, ['nearest', 'flipy', 'srgb']);
    const texImage = texFactory.load('/assets/ball-pattern-rot--not-power-of-2.png');

    const material = new SpriteMaterial({map: texImage});
    const sprite = new Sprite(material);

    sprite.scale.set(197, 205, 1);
    scene.add(sprite);
  });

  // el.on(StageRenderFrame, (props: StageRenderFrameProps) => {
  //   if (renderFrameLogCount++ < 3) {
  //     console.debug(StageRenderFrame, props.frameNo, props);
  //   }
  // });
});
