// @ts-nocheck
/**
 * View to Shadow Event Communication
 *
 * This file demonstrates how to send events from the View Layer (DOM)
 * to Shadow Objects running in the Shadow World.
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';
import {onViewEvent as viewEvent} from '@spearwolf/shadow-objects';

// =============================================================================
// SHADOW OBJECT: Using onViewEvent() convenience method
// =============================================================================

/**
 * A form handler that processes user input from the DOM.
 * Uses the convenient onViewEvent() method from the creation API.
 */
export function FormHandler({onViewEvent, createSignal}: ShadowObjectCreationAPI) {
  const [formData, setFormData] = createSignal<Record<string, unknown>>({});
  const [errors, setErrors] = createSignal<string[]>([]);

  // Listen for all events from the View
  onViewEvent((type, data) => {
    switch (type) {
      case 'field-change':
        // Update form data reactively
        setFormData((current) => ({
          ...current,
          [data.field]: data.value,
        }));
        break;

      case 'submit': {
        // Validate and process
        const validationErrors = validateForm(formData());
        if (validationErrors.length > 0) {
          setErrors(validationErrors);
        } else {
          processForm(formData());
        }
        break;
      }

      case 'reset':
        setFormData({});
        setErrors([]);
        break;
    }
  });

  function validateForm(data: Record<string, unknown>): string[] {
    const errors: string[] = [];
    if (!data.email) errors.push('Email is required');
    if (!data.name) errors.push('Name is required');
    return errors;
  }

  function processForm(data: Record<string, unknown>) {
    console.log('Processing form:', data);
    // Send to API, update state, etc.
  }
}

// =============================================================================
// SHADOW OBJECT: Using on() with event symbol
// =============================================================================

/**
 * An alternative approach using the on() method with the viewEvent symbol.
 * This gives you more control and is consistent with other event listening.
 */
export function InputController({on, entity}: ShadowObjectCreationAPI) {
  // Listen using the imported symbol
  on(viewEvent, (type, data) => {
    console.log(`Received ${type} from view:`, data);
  });

  // You can also be explicit about the entity target
  on(entity, viewEvent, (type, data) => {
    // Same as above, but explicitly shows entity is the source
  });
}

// =============================================================================
// SHADOW OBJECT: Handling Transferable Objects
// =============================================================================

/**
 * Demonstrates receiving large binary data efficiently using Transferables.
 * The ArrayBuffer ownership is transferred, not copied.
 */
export function ImageProcessor({onViewEvent, dispatchMessageToView}: ShadowObjectCreationAPI) {
  onViewEvent((type, data) => {
    if (type === 'process-image') {
      const {width, height, buffer} = data;

      // buffer is an ArrayBuffer that was transferred (zero-copy)
      const pixels = new Uint8ClampedArray(buffer);

      // Process the image data
      applyGrayscaleFilter(pixels);

      // Send processed data back (also with transfer)
      dispatchMessageToView(
        'image-processed',
        {width, height, buffer: pixels.buffer},
        [pixels.buffer], // Transfer back to View
      );
    }
  });

  function applyGrayscaleFilter(pixels: Uint8ClampedArray) {
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
    }
  }
}

// =============================================================================
// SHADOW OBJECT: Event-driven Game Input
// =============================================================================

/**
 * A game input handler that processes keyboard and mouse events from the View.
 */
export function GameInput({onViewEvent, createSignal, provideContext}: ShadowObjectCreationAPI) {
  // Track input state
  const [keysPressed, setKeysPressed] = createSignal<Set<string>>(new Set());
  const [mousePosition, setMousePosition] = createSignal({x: 0, y: 0});
  const [mouseButtons, setMouseButtons] = createSignal<Set<number>>(new Set());

  // Provide input state as context for child entities
  provideContext('input', {
    isKeyPressed: (key: string) => keysPressed().has(key),
    getMousePosition: () => mousePosition(),
    isMouseButtonPressed: (btn: number) => mouseButtons().has(btn),
  });

  onViewEvent((type, data) => {
    switch (type) {
      case 'keydown':
        setKeysPressed((keys) => {
          const next = new Set(keys);
          next.add(data.key);
          return next;
        });
        break;

      case 'keyup':
        setKeysPressed((keys) => {
          const next = new Set(keys);
          next.delete(data.key);
          return next;
        });
        break;

      case 'mousemove':
        setMousePosition({x: data.clientX, y: data.clientY});
        break;

      case 'mousedown':
        setMouseButtons((btns) => {
          const next = new Set(btns);
          next.add(data.button);
          return next;
        });
        break;

      case 'mouseup':
        setMouseButtons((btns) => {
          const next = new Set(btns);
          next.delete(data.button);
          return next;
        });
        break;
    }
  });
}

// =============================================================================
// VIEW LAYER: HTML Setup Example
// =============================================================================

/**
 * Example HTML showing how to dispatch events from the View to Shadow Objects.
 *
 * <shae-worker src="./kernel.js">
 *   <shae-ent token="form-handler" id="my-form">
 *     <form onsubmit="event.preventDefault(); dispatchToShadow('submit')">
 *       <input
 *         type="text"
 *         name="email"
 *         oninput="dispatchFieldChange(this)"
 *       />
 *       <input
 *         type="text"
 *         name="name"
 *         oninput="dispatchFieldChange(this)"
 *       />
 *       <button type="submit">Submit</button>
 *       <button type="button" onclick="dispatchToShadow('reset')">Reset</button>
 *     </form>
 *   </shae-ent>
 * </shae-worker>
 *
 * <script>
 *   const formEnt = document.getElementById('my-form');
 *
 *   function dispatchToShadow(eventType, data = {}) {
 *     formEnt.viewComponent.dispatchShadowObjectsEvent(eventType, data);
 *   }
 *
 *   function dispatchFieldChange(input) {
 *     dispatchToShadow('field-change', {
 *       field: input.name,
 *       value: input.value
 *     });
 *   }
 * </script>
 */

// =============================================================================
// VIEW LAYER: Typed Helper Function
// =============================================================================

/**
 * A typed helper for dispatching events from the View Layer.
 * Use this in your View code for better type safety.
 */
interface ShaeEntElement extends HTMLElement {
  viewComponent: {
    dispatchShadowObjectsEvent(type: string, data?: unknown, transferables?: Transferable[]): void;
  };
}

function createEventDispatcher(elementId: string) {
  const element = document.getElementById(elementId) as ShaeEntElement | null;

  if (!element?.viewComponent) {
    throw new Error(`Element ${elementId} not found or not a <shae-ent>`);
  }

  return {
    dispatch(type: string, data?: unknown) {
      element.viewComponent.dispatchShadowObjectsEvent(type, data);
    },

    dispatchWithTransfer(type: string, data: unknown, transferables: Transferable[]) {
      element.viewComponent.dispatchShadowObjectsEvent(type, data, transferables);
    },
  };
}

// Usage:
// const formDispatcher = createEventDispatcher('my-form');
// formDispatcher.dispatch('submit', { email: 'test@example.com' });
