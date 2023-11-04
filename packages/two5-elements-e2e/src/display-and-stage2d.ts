import {Stage2DElement, TextureCatalog} from '@spearwolf/two5-elements';
import {StageFirstFrameProps} from '@spearwolf/two5-elements/events.js';
import '@spearwolf/two5-elements/two5-display.js';
import '@spearwolf/two5-elements/two5-stage2d.js';
import {Color, Scene, Sprite, SpriteMaterial, Texture} from 'three';
import './style.css';
import './two5-display.css';

console.log('hej ho!');

const textures = new TextureCatalog().load('/assets/textures.json');

Stage2DElement.whenDefined(document.getElementById('stage2d')).then((el) => {
  // let renderFrameLogCount = 0;

  // el.addEventListener(StageResize, (e: StageResizeEvent) => {
  //   renderFrameLogCount = 0;
  //   console.debug(StageResize, e.detail);
  // });

  el.sceneReady().then((scene: Scene) => {
    scene.background = new Color(0x212121);
  });

  el.firstFrame().then(({renderer, stage: {scene}}: StageFirstFrameProps) => {
    textures.renderer = renderer;

    const material = new SpriteMaterial({map: new Texture()});
    const sprite = new Sprite(material);

    textures.get('ballPatternRot', ['texture', 'imageCoords'], ([texture, imageCoords]) => {
      console.log('texture', {texture, imageCoords});
      sprite.material.dispose();
      sprite.material = new SpriteMaterial({map: texture});
    });

    sprite.scale.set(197, 205, 1);
    scene.add(sprite);
  });

  // el.on(StageRenderFrame, (props: StageRenderFrameProps) => {
  //   if (renderFrameLogCount++ < 3) {
  //     console.debug(StageRenderFrame, props.frameNo, props);
  //   }
  // });
});
