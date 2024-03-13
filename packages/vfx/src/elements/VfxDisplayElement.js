import {eventize} from '@spearwolf/eventize';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {FrameLoop} from '../shared/FrameLoop.js';
import {OffscreenCanvas, StartFrameLoop, StopFrameLoop} from '../shared/constants.js';
import {attachShadowEntity} from './attachShadowEntity.js';

const InitialHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .frame {
      position: relative;
      height: 100%;
    }
    .content {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  </style>
  <div class="frame">
    <canvas id="display" class="content"></canvas>
    <div class="content">
      <shadow-entity id="entity" token="vfx-display">
        <slot></slot>
      </shadow-entity>
    </div>
  </div>
`;

const DISPLAY_ID = 'display';
const ENTITY_ID = 'entity';

export class VfxDisplayElement extends HTMLElement {
  #frameLoop = new FrameLoop();

  constructor(initialHTML = InitialHTML) {
    super();
    eventize(this);

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.canvas = this.shadow.getElementById(DISPLAY_ID);
    attachShadowEntity(this, this.shadow.getElementById(ENTITY_ID));

    this.on('viewComponent', this.transferCanvasToShadows.bind(this));
  }

  connectedCallback() {
    this.#frameLoop.start(this);
    this.sendEventToShadows(StartFrameLoop);
  }

  disconnectedCallback() {
    this.#frameLoop.stop(this);
    this.sendEventToShadows(StopFrameLoop);
  }

  #lastCanvasWidth = 0;
  #lastCanvasHeight = 0;

  onFrame() {
    const clientRect = this.canvas.getBoundingClientRect();
    if (this.#lastCanvasWidth !== clientRect.width || this.#lastCanvasHeight !== clientRect.height) {
      this.#lastCanvasWidth = clientRect.width;
      this.#lastCanvasHeight = clientRect.height;
      if (this.viewComponent) {
        this.viewComponent.setProperty('canvasWidth', clientRect.width);
        this.viewComponent.setProperty('canvasHeight', clientRect.height);
        this.syncShadowObjects();
      }
    }
  }

  transferCanvasToShadows() {
    const offscreen = this.canvas.transferControlToOffscreen();
    this.sendEventToShadows(OffscreenCanvas, {canvas: offscreen}, [offscreen]);
  }
}
