import {eventize} from '@spearwolf/eventize';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {connect} from '@spearwolf/signalize';
import {FrameLoop} from '../shared/FrameLoop.js';
import {attachSignal} from '../shared/attachSignal.js';

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

const _shadowEntity_ = 'shadowEntity';
const _viewComponent_ = 'viewComponent';

const DISPLAY_ID = 'display';
const ENTITY_ID = 'entity';

export class VfxDisplayElement extends HTMLElement {
  #frameLoop = new FrameLoop();

  constructor(initialHTML = InitialHTML) {
    super();
    eventize(this);

    attachSignal(this, _viewComponent_);
    attachSignal(this, _shadowEntity_, {
      effect: (el) => {
        const con = connect(el.viewComponent$, this.viewComponent$);
        return () => {
          con.destroy();
        };
      },
    });

    this.on(_viewComponent_, this.transferCanvasToWorker.bind(this));

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.canvas = this.shadow.getElementById(DISPLAY_ID);
    this.shadowEntity = this.shadow.getElementById(ENTITY_ID);
  }

  connectedCallback() {
    this.#frameLoop.start(this);

    this.once(_shadowEntity_, (el) => {
      el.sendShadowEvent('start');
    });
  }

  disconnectedCallback() {
    this.#frameLoop.stop(this);

    this.once(_shadowEntity_, (el) => {
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
