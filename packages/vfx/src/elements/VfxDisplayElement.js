import {eventize} from '@spearwolf/eventize';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {FrameLoop} from '../shared/FrameLoop.js';
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

    this.on('viewComponent', this.transferCanvasToWorker.bind(this));
  }

  connectedCallback() {
    this.#frameLoop.start(this);

    this.once('shadowEntity', (el) => {
      el.sendShadowEvent('start');
    });
  }

  disconnectedCallback() {
    this.#frameLoop.stop(this);

    this.once('shadowEntity', (el) => {
      el.sendShadowEvent('stop');
    });
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
        this.syncViewComponent();
      }
    }
  }

  syncViewComponent() {
    this.shadowEntity?.shadowEnvElement?.update();
  }

  transferCanvasToWorker() {
    const offscreen = this.canvas.transferControlToOffscreen();
    this.shadowEntity.sendShadowEvent('offscreenCanvas', {canvas: offscreen}, [offscreen]);
  }
}
