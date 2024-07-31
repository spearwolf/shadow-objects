import {emit, eventize, getSubscriptionCount, off, on} from '@spearwolf/eventize';

const OnFrame = 'onFrame';

let gUniqInstance = null;

export class FrameLoop {
  #rafID = 0;
  #subscriptionCount = 0;

  constructor() {
    if (gUniqInstance) return gUniqInstance;
    eventize(this);
    gUniqInstance = this;
  }

  start(target) {
    if (target == null) return;

    if (getSubscriptionCount(this) === 0) {
      this.#requestAnimationFrame();
    }

    on(this, OnFrame, target);

    this.#subscriptionCount++;

    return () => {
      this.stop(target);
    };
  }

  stop(target) {
    off(this, OnFrame, target);

    if (getSubscriptionCount(this) === 0) {
      this.#cancelAnimationFrame();
    }
  }

  #onFrame = (now) => {
    emit(this, OnFrame, now);
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
