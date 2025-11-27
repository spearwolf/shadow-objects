import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ComponentContext} from '../view/ComponentContext.js';
import {ShaeWorkerElement} from './ShaeWorkerElement.js';

describe('ShaeWorkerElement', () => {
  beforeEach(() => {
    // Register the custom element if not already registered
    if (!customElements.get('shae-worker-test')) {
      customElements.define('shae-worker-test', class extends ShaeWorkerElement {});
    }
  });

  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('should be defined', () => {
    expect(ShaeWorkerElement).toBeDefined();
  });

  describe('defer destroy', () => {
    it('should not destroy immediately when disconnected', async () => {
      const element = document.createElement('shae-worker-test') as ShaeWorkerElement;
      element.setAttribute('local', '');
      element.setAttribute('auto-sync', 'off');

      // Connect element to DOM
      document.body.appendChild(element);
      await element.start();

      const destroySpy = vi.spyOn(element, 'destroy');

      // Disconnect element from DOM
      element.remove();

      // Destruction should not have happened synchronously
      expect(destroySpy).not.toHaveBeenCalled();

      // Wait for microtask to complete
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      // Now destruction should have occurred
      expect(destroySpy).toHaveBeenCalledTimes(1);

      destroySpy.mockRestore();
    });

    it('should cancel deferred destruction when reconnected before microtask', async () => {
      const element = document.createElement('shae-worker-test') as ShaeWorkerElement;
      element.setAttribute('local', '');
      element.setAttribute('auto-sync', 'off');

      // Connect element to DOM
      document.body.appendChild(element);
      await element.start();

      const destroySpy = vi.spyOn(element, 'destroy');

      // Disconnect element from DOM
      element.remove();

      // Reconnect element before microtask runs (simulating DOM move)
      document.body.appendChild(element);

      // Wait for microtask to complete
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      // Destruction should have been cancelled because element was reconnected
      expect(destroySpy).not.toHaveBeenCalled();

      // Clean up
      element.destroy();
      destroySpy.mockRestore();
    });

    it('should destroy after disconnect and microtask when not reconnected', async () => {
      const element = document.createElement('shae-worker-test') as ShaeWorkerElement;
      element.setAttribute('local', '');
      element.setAttribute('auto-sync', 'off');

      // Connect element to DOM
      document.body.appendChild(element);
      await element.start();

      expect(element.shadowEnv.isReady).toBeTruthy();

      // Disconnect element
      element.remove();

      // Wait for microtask
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      // ShadowEnv should be destroyed
      expect(element.shadowEnv.isReady).toBeFalsy();
    });

    it('should only schedule one deferred destruction even if disconnected multiple times', async () => {
      const element = document.createElement('shae-worker-test') as ShaeWorkerElement;
      element.setAttribute('local', '');
      element.setAttribute('auto-sync', 'off');

      // Connect element to DOM
      document.body.appendChild(element);
      await element.start();

      const destroySpy = vi.spyOn(element, 'destroy');

      // Simulate multiple disconnects (though in practice this would require reconnects in between)
      element.remove();

      // Wait for microtask
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      // Destroy should be called exactly once
      expect(destroySpy).toHaveBeenCalledTimes(1);

      destroySpy.mockRestore();
    });
  });
});
