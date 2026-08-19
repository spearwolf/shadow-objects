import {emit, eventize, getSubscriptionCount, type ListenerFuncType, off, on} from '@spearwolf/eventize';

let gUniqInstance: FrameLoop | null = null;

/**
 * The payload of every {@link FrameLoop.OnFrame} event. All times are in seconds.
 */
export interface FrameData {
  /** the timestamp of this frame */
  now: number;
  /** the timestamp of the frame before this one — equal to {@link FrameData.now} on the first frame */
  lastNow: number;
  /** the number of this frame, counted from one at the start of every run */
  frameNo: number;
  /** the time elapsed since the frame before this one — zero on the first frame */
  deltaTime: number;
}

/**
 * A loop that emits a frame to all of its targets as long as at least one of them listens.
 *
 * While no target listens, the loop asks for no frames at all.
 */
export class FrameLoop {
  static OnFrame = Symbol('onFrame');

  /**
   * The loop that every caller shares. It is created on first read and answers the same instance
   * afterwards. It has no cap on the frame rate.
   */
  static get(): FrameLoop {
    gUniqInstance ??= new FrameLoop();
    return gUniqInstance;
  }

  /**
   * The share of the nominal frame time after which the next frame is due.
   *
   * Animation frames do not arrive at the nominal distance, and the browsers differ in how coarsely
   * they round the timestamps they hand out. With `D` for the distance between real frames and `j`
   * for the jitter on top of it, the factor has to sit between two bounds:
   *
   * - a cap at or above the refresh rate must lose no frame: `factor <= 1 - j / D`
   * - a cap at half the refresh rate must drop every second frame: `factor > 0.5 + j / (2 * D)`
   *
   * At 60 Hz with the coarsest rounding measured — around 0.6 ms of jitter on a 16.67 ms
   * distance — that leaves the range 0.52 to 0.96, and this value keeps its distance to both ends.
   */
  static #DueFactor = 0.75;

  #rafID = 0;
  #maxFps = 0;
  #frameNo = 0;
  #lastNow: number | undefined = undefined;

  constructor(maxFps = 0) {
    eventize(this);
    this.maxFps = maxFps;
  }

  /** The upper bound on the frame rate. Zero means: no bound. */
  get maxFps(): number {
    return this.#maxFps;
  }

  set maxFps(fps: number) {
    this.#maxFps = Number.isFinite(fps) && fps > 0 ? fps : 0;
  }

  /**
   * How many targets listen for frames.
   *
   * OnFrame is the only event this object knows, so the total number of subscriptions is the
   * number of frame targets.
   */
  get subscriptionCount(): number {
    return getSubscriptionCount(this);
  }

  start(target: object | ListenerFuncType) {
    if (target == null) return;

    on(this as FrameLoop, FrameLoop.OnFrame, target);

    this.#requestAnimationFrame();

    return () => {
      this.stop(target);
    };
  }

  stop(target: object | ListenerFuncType) {
    if (target == null) return;

    off(this, FrameLoop.OnFrame, target);

    if (this.subscriptionCount === 0) {
      this.#cancelAnimationFrame();
      // the next target to arrive starts a fresh run of frames: its first frame is frame one and
      // reports no delta, rather than the whole length of the pause
      this.#lastNow = undefined;
      this.#frameNo = 0;
    }
  }

  #onFrame = (now: number) => {
    // the frame this id stands for has fired, nothing is pending any more — a target that leaves
    // during the emit below must be able to see that
    this.#rafID = 0;

    if (this.#isDue(now)) {
      const lastNow = this.#lastNow ?? now;

      this.#lastNow = now;
      this.#frameNo += 1;

      const frameData: FrameData = {
        now: now / 1000,
        lastNow: lastNow / 1000,
        frameNo: this.#frameNo,
        deltaTime: (now - lastNow) / 1000,
      };

      emit(this as FrameLoop, FrameLoop.OnFrame, frameData);
    }

    if (this.subscriptionCount > 0) {
      // a skipped frame arms again just like an emitted one, otherwise the cap would bring the
      // loop to a halt after the first frame it holds back
      this.#requestAnimationFrame();
    }
  };

  #isDue(now: number): boolean {
    if (this.#maxFps === 0 || this.#lastNow === undefined) return true;

    return now - this.#lastNow >= FrameLoop.#DueFactor * (1000 / this.#maxFps);
  }

  #requestAnimationFrame() {
    // idempotent: two pending frames would mean two loops, and only the second of them could ever
    // be cancelled again
    if (this.#rafID !== 0) return;

    this.#rafID = requestAnimationFrame(this.#onFrame);
  }

  #cancelAnimationFrame() {
    if (this.#rafID === 0) return;

    cancelAnimationFrame(this.#rafID);
    this.#rafID = 0;
  }
}