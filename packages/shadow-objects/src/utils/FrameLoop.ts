import {emit, eventize, getSubscriptionCount, type ListenerFuncType, off, on} from '@spearwolf/eventize';

let gUniqInstance: FrameLoop | null = null;

export class FrameLoop {
  static OnFrame = Symbol('onFrame');

  #rafID = 0;

  constructor() {
    if (gUniqInstance) return gUniqInstance;
    eventize(this);
    gUniqInstance = this;
  }

  start(target: object | ListenerFuncType) {
    if (target == null) return;

    if (getSubscriptionCount(this) === 0) {
      this.#requestAnimationFrame();
    }

    on(this as FrameLoop, FrameLoop.OnFrame, target);

    return () => {
      this.stop(target);
    };
  }

  stop(target: object | ListenerFuncType) {
    off(this, FrameLoop.OnFrame, target);

    if (getSubscriptionCount(this) === 0) {
      this.#cancelAnimationFrame();
    }
  }

  #onFrame = (now: number) => {
    emit(this as FrameLoop, FrameLoop.OnFrame, now);
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