import {eventize, getSubscriptionCount} from '@spearwolf/eventize';

const OnFrame = 'onFrame';

let gUniqInstance = null;

export class FrameLoop {
  #rafID = 0;
  #subscriptionCount = 0;

  constructor() {
    if (gUniqInstance) return gUniqInstance;
    eventize(this);
    console.log('[FrameLoop] new', this);
    gUniqInstance = this;
  }

  subscribe(target) {
    if (target == null) return;

    if (getSubscriptionCount(this) === 0) {
      this.#requestAnimationFrame();
      console.log('[FrameLoop] start frame loop');
    }

    this.on(OnFrame, target);

    this.#subscriptionCount++;

    return () => {
      this.unsubscribe(target);
    };
  }

  unsubscribe(target) {
    this.off(OnFrame, target);

    if (getSubscriptionCount(this) === 0) {
      this.#cancelAnimationFrame();
      console.log('[FrameLoop] stop frame loop');
    }
  }

  #onFrame = (now) => {
    this.emit(OnFrame, now);
    this.#requestAnimationFrame();
  };

  #requestAnimationFrame() {
    this.#rafID = requestAnimationFrame(this.#onFrame);
  }

  #cancelAnimationFrame() {
    cancelAnimationFrame(this.#rafID);
    this.#rafID = 0;
  }
}
