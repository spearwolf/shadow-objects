import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {type FrameData, FrameLoop} from './FrameLoop.js';

// A hand-driven requestAnimationFrame. The one happy-dom provides hangs on real timers and keeps no
// record of how often it was asked for a frame — this file needs both: it measures when the loop
// arms, and it decides when a frame fires. The class reaches for the global functions unqualified,
// so replacing them reaches it at call time.
let requestCount = 0;
let nextRafID = 0;
let pendingFrames: Map<number, (now: number) => void>;

beforeEach(() => {
  requestCount = 0;
  nextRafID = 0;
  pendingFrames = new Map();

  vi.stubGlobal('requestAnimationFrame', (callback: (now: number) => void) => {
    requestCount += 1;
    // ids start at 1: the loop keeps 0 as its "nothing is pending" marker
    const rafID = ++nextRafID;
    pendingFrames.set(rafID, callback);
    return rafID;
  });

  vi.stubGlobal('cancelAnimationFrame', (rafID: number) => {
    pendingFrames.delete(rafID);
  });
});

// The shared loop is module state and outlives every case in this file — vitest isolates per file,
// not per case. Every target therefore comes off again at the end of its own case, and it does so
// even when an assertion in the middle of that case ends it early.
const cleanUpAfterCase: Array<() => void> = [];

afterEach(() => {
  while (cleanUpAfterCase.length > 0) {
    cleanUpAfterCase.pop()!();
  }
  vi.unstubAllGlobals();
});

const startTracked = (loop: FrameLoop, target: object | ((frame: FrameData) => void)) => {
  cleanUpAfterCase.push(() => {
    loop.stop(target);
  });
  return loop.start(target);
};

/** Fire everything that is armed, exactly once, with the given timestamp in milliseconds. */
const runFrame = (now: number) => {
  const callbacks = [...pendingFrames.values()];
  pendingFrames.clear();
  for (const callback of callbacks) {
    callback(now);
  }
};

/**
 * The timestamps of a 60 Hz display as the coarsest rounding hands them out: they alternate around
 * the nominal 16.667 ms instead of landing on it. This is the sequence the cap has to survive.
 */
const jitteredFrames = (count: number) => {
  const timestamps: number[] = [];
  let now = 0;

  for (let i = 0; i < count; i += 1) {
    timestamps.push(now);
    now += i % 2 === 0 ? 16.06 : 17.06;
  }

  return timestamps;
};

const collectFrames = (loop: FrameLoop) => {
  const frames: FrameData[] = [];
  const unsubscribe = startTracked(loop, (frame: FrameData) => {
    frames.push(frame);
  });
  return {frames, unsubscribe};
};

describe('FrameLoop', () => {
  describe('arming and idling', () => {
    it('arms a frame as soon as the first target subscribes', () => {
      const loop = new FrameLoop();
      const target = {[FrameLoop.OnFrame]() {}};

      startTracked(loop, target);

      expect(requestCount).toBe(1);
      expect(pendingFrames.size).toBe(1);
    });

    it('arms one frame for two targets', () => {
      const loop = new FrameLoop();
      const first = {[FrameLoop.OnFrame]() {}};
      const second = {[FrameLoop.OnFrame]() {}};

      startTracked(loop, first);
      startTracked(loop, second);

      expect(requestCount).toBe(1);
      expect(pendingFrames.size).toBe(1);
    });

    it('keeps arming as long as a target listens', () => {
      const loop = new FrameLoop();
      const target = {[FrameLoop.OnFrame]() {}};

      startTracked(loop, target);
      runFrame(0);

      expect(requestCount).toBe(2);
      expect(pendingFrames.size).toBe(1);
    });

    it('stops arming when the last target leaves between two frames', () => {
      const loop = new FrameLoop();
      const target = {[FrameLoop.OnFrame]() {}};

      startTracked(loop, target);
      runFrame(0);
      loop.stop(target);

      expect(pendingFrames.size).toBe(0);
    });

    it('stops arming when the last target leaves inside the frame', () => {
      const loop = new FrameLoop();
      // The target leaves while the frame it asked for is being delivered — every syncShadowObjects()
      // that takes an element out of the document can do this.
      const target = {
        [FrameLoop.OnFrame]() {
          loop.stop(target);
        },
      };

      startTracked(loop, target);
      runFrame(0);

      expect(requestCount).toBe(1);
      expect(pendingFrames.size).toBe(0);
    });

    it('arms exactly one frame when a target arrives while the last one leaves inside the frame', () => {
      const loop = new FrameLoop();
      const arriving = {[FrameLoop.OnFrame]() {}};
      const leaving = {
        [FrameLoop.OnFrame]() {
          loop.stop(leaving);
          startTracked(loop, arriving);
        },
      };

      startTracked(loop, leaving);
      runFrame(0);

      // Two requests would leave one of them beyond reach of cancelAnimationFrame: an orphaned loop
      // that nobody can stop again.
      expect(requestCount).toBe(2);
      expect(pendingFrames.size).toBe(1);
    });

    it('picks up again after it has gone idle', () => {
      const loop = new FrameLoop();
      const target = {[FrameLoop.OnFrame]() {}};

      startTracked(loop, target);
      loop.stop(target);
      startTracked(loop, target);

      expect(requestCount).toBe(2);
      expect(pendingFrames.size).toBe(1);
    });

    it('hands back an unsubscribe function that takes the target off', () => {
      const loop = new FrameLoop();
      const target = {[FrameLoop.OnFrame]() {}};

      const unsubscribe = startTracked(loop, target);
      unsubscribe?.();

      expect(pendingFrames.size).toBe(0);
    });
  });

  describe('frame data', () => {
    it('reports the timestamp in seconds and counts its frames from one', () => {
      const loop = new FrameLoop();
      const {frames} = collectFrames(loop);

      runFrame(1000);

      expect(frames.length).toBe(1);
      expect(frames[0]!.now).toBe(1);
      expect(frames[0]!.frameNo).toBe(1);
    });

    it('reports no delta on the first frame and the elapsed seconds afterwards', () => {
      const loop = new FrameLoop();
      const {frames} = collectFrames(loop);

      runFrame(1000);
      runFrame(1016);

      expect(frames.length).toBe(2);
      // Nobody can compute a span from a single point in time, so the first frame reports none —
      // a subtraction against an empty predecessor would hand every listener a NaN.
      expect(frames[0]!.deltaTime).toBe(0);
      expect(frames[0]!.lastNow).toBe(frames[0]!.now);
      expect(frames[1]!.deltaTime).toBeCloseTo(0.016, 10);
      expect(frames[1]!.lastNow).toBe(1);
    });

    it('starts over with no delta after it has been idle', () => {
      const loop = new FrameLoop();
      const first = collectFrames(loop);

      runFrame(1000);
      first.unsubscribe?.();

      const second = collectFrames(loop);
      runFrame(2000);

      // Without the reset the whole pause would arrive as the delta of a single frame.
      expect(second.frames.length).toBe(1);
      expect(second.frames[0]!.deltaTime).toBe(0);
      expect(second.frames[0]!.lastNow).toBe(second.frames[0]!.now);
    });

    it('counts from one again after it has been idle', () => {
      const loop = new FrameLoop();
      const first = collectFrames(loop);

      runFrame(1000);
      runFrame(1016);
      first.unsubscribe?.();

      const second = collectFrames(loop);
      runFrame(2000);

      // A run begins at frame one with no delta, or at neither: the two say the same thing about
      // where the series starts, and a reader that trusts one of them may trust the other.
      expect(first.frames.map((frame) => frame.frameNo)).toEqual([1, 2]);
      expect(second.frames[0]!.frameNo).toBe(1);
      expect(second.frames[0]!.deltaTime).toBe(0);
    });
  });

  describe('the frames-per-second cap', () => {
    it('lets every frame through without a cap', () => {
      const loop = new FrameLoop();
      const {frames} = collectFrames(loop);

      runFrame(0);
      runFrame(1);
      runFrame(2);

      expect(frames.map((frame) => frame.frameNo)).toEqual([1, 2, 3]);
    });

    it('skips the frames that arrive before the cap allows the next one', () => {
      const loop = new FrameLoop(30);
      const {frames} = collectFrames(loop);

      runFrame(0);
      runFrame(10);
      runFrame(40);

      expect(frames.length).toBe(2);
      expect(frames.map((frame) => frame.now)).toEqual([0, 0.04]);
    });

    it('keeps arming while it skips a frame', () => {
      const loop = new FrameLoop(30);
      const {frames} = collectFrames(loop);

      runFrame(0);
      runFrame(10);

      // A skipped frame arms like an emitted one — otherwise the cap brings the loop to a halt.
      expect(frames.length).toBe(1);
      expect(requestCount).toBe(3);
      expect(pendingFrames.size).toBe(1);
    });

    it('takes a new cap while it runs', () => {
      const loop = new FrameLoop(30);
      const {frames} = collectFrames(loop);

      runFrame(0);
      runFrame(10);

      loop.maxFps = 0;
      runFrame(20);

      expect(frames.length).toBe(2);
      expect(loop.maxFps).toBe(0);
    });

    it('loses no frame at a cap on the refresh rate', () => {
      const loop = new FrameLoop(60);
      const {frames} = collectFrames(loop);
      const timestamps = jitteredFrames(10);

      for (const now of timestamps) {
        runFrame(now);
      }

      // The upper bound on the threshold: a frame that arrives a hair early is the frame the cap
      // asks for, and turning it away costs half the rate that was asked for.
      expect(frames.length).toBe(timestamps.length);
    });

    it('drops every second frame at a cap on half the refresh rate', () => {
      const loop = new FrameLoop(30);
      const {frames} = collectFrames(loop);
      const timestamps = jitteredFrames(10);

      for (const now of timestamps) {
        runFrame(now);
      }

      // The lower bound on the threshold: the cap has to hold back the frame in between, however
      // late it arrives.
      expect(frames.map((frame) => frame.now)).toEqual([0, 2, 4, 6, 8].map((i) => timestamps[i]! / 1000));
    });
  });

  describe('a target that throws', () => {
    // The loop is a singleton per realm: `<shae-worker>` hangs its auto-sync on it and
    // `<shae-offscreen-canvas>` its rendering. A frame delivered with the plain `emit()` ends at the
    // first target that throws and carries the error into the `requestAnimationFrame()` callback,
    // past the line that asks for the next frame — one bad target would freeze the page. These three
    // cases hold the guarded delivery that answers it.
    // What these cases do not assert is the report. eventize binds its `console.warn` reference when
    // the module is evaluated, so a `vi.spyOn(console, 'warn')` in a case never sees the call. What
    // the guarded delivery is here for is what still runs, and that is what is asserted.
    it('delivers the frame to the targets behind the one that throws', () => {
      const loop = new FrameLoop();
      const seen: string[] = [];

      startTracked(loop, () => {
        seen.push('first');
        throw new Error('a target that cannot cope');
      });
      startTracked(loop, () => {
        seen.push('second');
      });

      runFrame(0);

      expect(seen).toEqual(['first', 'second']);
    });

    it('asks for the next frame after a target threw', () => {
      const loop = new FrameLoop();

      startTracked(loop, () => {
        throw new Error('a target that cannot cope');
      });

      const requestsBeforeTheFrame = requestCount;
      runFrame(0);

      // the frame that fired has to be replaced by a new one, or nothing ever asks again
      expect(requestCount).toBe(requestsBeforeTheFrame + 1);
      expect(pendingFrames.size).toBe(1);
    });

    it('keeps the throwing target subscribed and delivers the frame behind it', () => {
      const loop = new FrameLoop();
      let calls = 0;

      startTracked(loop, () => {
        calls += 1;
        throw new Error('a target that cannot cope');
      });

      runFrame(0);
      runFrame(100);

      expect(calls).toBe(2);
      expect(loop.subscriptionCount).toBe(1);
    });
  });

  describe('the shared loop', () => {
    it('FrameLoop.get() answers the same loop every time', () => {
      expect(FrameLoop.get()).toBe(FrameLoop.get());
    });

    it('a loop built with new is not the shared one', () => {
      const one = new FrameLoop();
      const other = new FrameLoop();

      // A capped loop has to be able to run next to an uncapped one in the same realm — which it
      // cannot, as long as every construction answers one and the same object.
      expect(one).not.toBe(other);
      expect(one).not.toBe(FrameLoop.get());
      expect(other).not.toBe(FrameLoop.get());
    });
  });
});
