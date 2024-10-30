import {emit, eventize, off, on} from '@spearwolf/eventize';

const OnFrame = Symbol.for('onFrame');

const MEASURE_FPS_AFTER_NTH_FRAME = 25;
const MEASURE_COLLECTION_SIZE = 10;

class RAF {
  static singelton = null;

  static get() {
    if (!RAF.singelton) {
      RAF.singelton = new RAF();
    }
    return RAF.singelton;
  }

  #rafID = 0;

  frameNo = 0;

  measureOnFrame = 0;
  measureTimeBegin = 0;
  measureTimeEnd = 0;

  measuredFps = 0;
  measuredFpsCollection = [];

  constructor() {
    eventize(this);
    this.start();
    //setInterval(() => {
    //  console.debug('measured fps', this.measuredFps);
    //}, 10000);
  }

  #onFrame = (now) => {
    if (this.frameNo === 0 || this.frameNo >= this.measureOnFrame) {
      this.measureTimeEnd = now;
      const measuredFps = Math.round(1000 / ((this.measureTimeEnd - this.measureTimeBegin) / MEASURE_FPS_AFTER_NTH_FRAME));
      this.measureOnFrame = this.frameNo + MEASURE_FPS_AFTER_NTH_FRAME;
      this.measureTimeBegin = now;

      this.measuredFpsCollection.push(measuredFps);

      if (this.measuredFpsCollection.length >= MEASURE_COLLECTION_SIZE) {
        this.measuredFps = Math.round(
          this.measuredFpsCollection.reduce((sum, fps) => sum + fps, 0) / this.measuredFpsCollection.length,
        );
        while (this.measuredFpsCollection.length > MEASURE_COLLECTION_SIZE) {
          this.measuredFpsCollection.shift();
        }
      } else {
        this.measuredFps = measuredFps;
      }
    }

    ++this.frameNo;

    emit(this, OnFrame, now, this.frameNo, this.measuredFps);

    this.#rafID = requestAnimationFrame(this.#onFrame);
  };

  start() {
    if (this.#rafID !== 0) return;
    this.#rafID = requestAnimationFrame(this.#onFrame);
  }

  stop() {
    cancelAnimationFrame(this.#rafID);
    this.#rafID = 0;
  }
}

export class FrameLoop {
  static OnFrame = OnFrame;

  constructor() {
    eventize(this);
  }

  // TODO(feat) FrameLoop#setFps(fps: number)

  start(target) {
    if (target == null) return;

    on(RAF.get(), FrameLoop.OnFrame, target);

    return () => {
      this.stop(target);
    };
  }

  stop(target) {
    off(RAF.get(), FrameLoop.OnFrame, target);
  }
}
