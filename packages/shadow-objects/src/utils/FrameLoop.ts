import {emit, eventize, getSubscriptionCount, off, on} from '@spearwolf/eventize';

let gUniqInstance: FrameLoop = null;

export class FrameLoop {
  static OnFrame = 'onFrame';

  #rafID = 0;
  #subscriptionCount = 0;

  constructor() {
    if (gUniqInstance) return gUniqInstance;
    eventize(this);
    gUniqInstance = this;
  }

  start(target: object | Function) {
    if (target == null) return;

    if (getSubscriptionCount(this) === 0) {
      this.#requestAnimationFrame();
    }

    on(this, FrameLoop.OnFrame, target);

    this.#subscriptionCount++;

    return () => {
      this.stop(target);
    };
  }

  stop(target: object | Function) {
    off(this, FrameLoop.OnFrame, target);

    if (getSubscriptionCount(this) === 0) {
      this.#cancelAnimationFrame();
    }
  }

  #onFrame = (now: number) => {
    emit(this, FrameLoop.OnFrame, now);
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
