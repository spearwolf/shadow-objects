import {eventize} from '@spearwolf/eventize';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {connect, createSignal, value} from '@spearwolf/signalize';

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

export class VfxDisplayElement extends HTMLElement {
  #rafID = 0;

  constructor(initialHTML = InitialHTML) {
    super();
    eventize(this);

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.canvasElement = this.shadow.getElementById('display');

    const [shadowEntityElement, setShadowEntityElement] = createSignal();
    const [viewComponent, setViewComponent] = createSignal();

    Object.defineProperties(this, {
      shadowEntityElement: {
        enumerable: true,
        get() {
          return value(shadowEntityElement);
        },
        set(value) {
          setShadowEntityElement(value);
        },
      },
      viewComponent: {
        enumerable: true,
        get() {
          return value(viewComponent);
        },
        set(value) {
          setViewComponent(value);
        },
      },
    });

    shadowEntityElement((el) => {
      console.debug('[vfx-display] shadowEntityElement=', el);
      if (el) {
        const con = connect(el.viewComponent$, viewComponent);
        return () => {
          console.log('[vfx-display] shadowEntityElement: change-cleanup =>', el);
          con.destroy();
        };
      }
    });

    viewComponent((vc) => {
      if (vc) {
        this.#onViewComponent(vc);
      }
    });

    customElements.whenDefined('shadow-entity').then(() => {
      setShadowEntityElement(this.shadow.getElementById('entity'));
    });
  }

  connectedCallback() {
    this.#requestAnimationFrame();
  }

  disconnectedCallback() {
    this.#cancelAnimationFrame();
  }

  #lastCanvasWidth = 0;
  #lastCanvasHeight = 0;

  #onFrame = () => {
    const clientRect = this.canvasElement.getBoundingClientRect();
    if (this.#lastCanvasWidth !== clientRect.width || this.#lastCanvasHeight !== clientRect.height) {
      this.#lastCanvasWidth = clientRect.width;
      this.#lastCanvasHeight = clientRect.height;
      this.viewComponent.setProperty('canvasWidth', clientRect.width);
      this.viewComponent.setProperty('canvasHeight', clientRect.height);
      this.shadowEntityElement.shadowEnvElement?.update();
    }
    this.#requestAnimationFrame();
  };

  #requestAnimationFrame() {
    this.#rafID = requestAnimationFrame(this.#onFrame);
  }

  #cancelAnimationFrame() {
    cancelAnimationFrame(this.#rafID);
  }

  /**
   * if called, then viewComponent is set and can be used
   *
   * @param {import('@spearwolf/shadow-ents').ViewComponent} vc view component
   */
  #onViewComponent(_vc) {
    // console.debug('[vfx-display] onViewComponent', {viewComponent: vc});

    // XXX maybe we find a better place for this ?
    const offscreen = this.canvasElement.transferControlToOffscreen();
    this.shadowEntityElement.sendShadowEvent('offscreenCanvas', {canvas: offscreen}, [offscreen]);
  }
}
