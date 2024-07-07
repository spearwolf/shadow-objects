import {eventize, getSubscriptionCount, type EventizeApi} from '@spearwolf/eventize';

let gUniqInstance: FrameLoop = null;

export interface FrameLoop extends EventizeApi {}

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

    this.on(FrameLoop.OnFrame, target);

    this.#subscriptionCount++;

    return () => {
      this.stop(target);
    };
  }

  stop(target: object | Function) {
    this.off(FrameLoop.OnFrame, target);

    if (getSubscriptionCount(this) === 0) {
      this.#cancelAnimationFrame();
    }
  }

  #onFrame = (now: number) => {
    this.emit(FrameLoop.OnFrame, now);
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
