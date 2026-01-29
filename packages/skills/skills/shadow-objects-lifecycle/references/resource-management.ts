// @ts-nocheck
/**
 * Resource Management with createResource
 *
 * createResource is the recommended way to manage external resources
 * that depend on reactive state. It automatically handles cleanup
 * when dependencies change or the Entity is destroyed.
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';

// ============================================
// BASIC createResource USAGE
// ============================================

/**
 * Simple Resource Creation
 */
export function BasicResourceDemo({useProperty, createResource, createEffect}: ShadowObjectCreationAPI) {
  const size = useProperty<number>('size');

  // createResource(factory, cleanup)
  const buffer = createResource(
    // Factory: creates the resource
    () => {
      const s = size() ?? 1024;
      console.log(`Creating buffer of size ${s}`);
      return new ArrayBuffer(s);
    },
    // Cleanup: disposes the resource
    (buf) => {
      console.log(`Disposing buffer of size ${buf.byteLength}`);
      // ArrayBuffer doesn't need explicit disposal, but others do
    },
  );

  // buffer() returns the current resource (or undefined)
  createEffect(() => {
    const b = buffer();
    if (b) {
      console.log(`Buffer ready: ${b.byteLength} bytes`);
    }
  });

  // When size changes:
  // 1. Cleanup runs for old buffer
  // 2. Factory runs to create new buffer
  // 3. Effect runs with new buffer
}

// ============================================
// THREE.JS RESOURCE MANAGEMENT
// ============================================

/**
 * Three.js Mesh with createResource
 *
 * Proper management of Three.js objects that need disposal.
 */
export function ThreeMeshDemo({useContext, useProperty, createResource, createEffect}: ShadowObjectCreationAPI) {
  // Get scene from context
  const getScene = useContext<() => THREE.Scene>('three-scene');

  // Mesh properties
  const color = useProperty<string>('color');
  const scale = useProperty<number>('scale');

  // Managed mesh resource
  const mesh = createResource(
    () => {
      const scene = getScene?.();
      const c = color() ?? '#ff0000';

      // Guard: return undefined if dependencies not ready
      if (!scene) {
        console.log('Scene not ready, skipping mesh creation');
        return undefined;
      }

      console.log(`Creating mesh with color ${c}`);

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({color: c});
      const mesh = new THREE.Mesh(geometry, material);

      scene.add(mesh);
      return mesh;
    },
    (mesh) => {
      console.log('Disposing mesh');
      mesh.removeFromParent();
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    },
  );

  // Scale can change without recreating mesh
  createEffect(() => {
    const m = mesh();
    const s = scale() ?? 1;
    if (m) {
      m.scale.setScalar(s);
    }
  });

  // Mesh is recreated when color changes
  // Mesh is disposed when Entity is destroyed
}

// Three.js type stubs for example
declare namespace THREE {
  class Scene {
    add(obj: Object3D): void;
  }
  class Object3D {
    scale: {setScalar(s: number): void};
    removeFromParent(): void;
  }
  class Mesh extends Object3D {
    constructor(geometry: BufferGeometry, material: Material);
    geometry: BufferGeometry;
    material: Material;
  }
  class BufferGeometry {
    dispose(): void;
  }
  class BoxGeometry extends BufferGeometry {
    constructor(w: number, h: number, d: number);
  }
  class Material {
    dispose(): void;
  }
  class MeshStandardMaterial extends Material {
    constructor(params: {color: string});
  }
}

// ============================================
// WEBSOCKET RESOURCE
// ============================================

/**
 * WebSocket Connection with createResource
 */
export function WebSocketResourceDemo({
  useProperty,
  createSignal,
  createResource,
  createEffect,
  dispatchMessageToView,
}: ShadowObjectCreationAPI) {
  const serverUrl = useProperty<string>('server-url');
  const isConnected = createSignal(false);
  const messages = createSignal<string[]>([]);

  const socket = createResource(
    () => {
      const url = serverUrl();
      if (!url) return undefined;

      console.log(`Connecting to ${url}`);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        isConnected.set(true);
        dispatchMessageToView('ws-connected', {});
      };

      ws.onmessage = (event) => {
        messages.set((m) => [...m, event.data]);
        dispatchMessageToView('ws-message', {data: event.data});
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected.set(false);
        dispatchMessageToView('ws-disconnected', {});
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        dispatchMessageToView('ws-error', {});
      };

      return ws;
    },
    (ws) => {
      console.log('Closing WebSocket');
      ws.close();
    },
  );

  // Connection status effect
  createEffect(() => {
    dispatchMessageToView('connection-status', {
      connected: isConnected(),
      messageCount: messages().length,
    });
  });

  // If serverUrl changes, old socket is closed, new one is opened
}

// ============================================
// CANVAS CONTEXT RESOURCE
// ============================================

/**
 * Canvas 2D Context with createResource
 */
export function CanvasResourceDemo({useProperty, createResource, createEffect, onViewEvent}: ShadowObjectCreationAPI) {
  const width = useProperty<number>('width');
  const height = useProperty<number>('height');

  const canvas = createResource(
    () => {
      const w = width() ?? 800;
      const h = height() ?? 600;

      console.log(`Creating canvas ${w}x${h}`);

      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error('Failed to get 2D context');
        return undefined;
      }

      return {canvas, ctx};
    },
    ({canvas, ctx}) => {
      console.log('Disposing canvas');
      // OffscreenCanvas doesn't need explicit disposal
      // but we clear any references
    },
  );

  // Drawing doesn't need to recreate canvas
  onViewEvent((type, data) => {
    const c = canvas();
    if (!c || type !== 'draw') return;

    const {ctx} = c;
    ctx.fillStyle = data?.color ?? 'red';
    ctx.fillRect(data?.x ?? 0, data?.y ?? 0, data?.w ?? 50, data?.h ?? 50);
  });
}

// ============================================
// AUDIO RESOURCE
// ============================================

/**
 * Web Audio with createResource
 */
export function AudioResourceDemo({
  useProperty,
  createSignal,
  createResource,
  createEffect,
  onViewEvent,
  onDestroy,
}: ShadowObjectCreationAPI) {
  const audioUrl = useProperty<string>('audio-url');
  const volume = useProperty<number>('volume');
  const isPlaying = createSignal(false);

  // Audio context (created once)
  const audioContext = new AudioContext();
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);

  // Audio buffer source (recreated per track)
  const audioSource = createResource(
    () => {
      const url = audioUrl();
      if (!url) return undefined;

      // Note: In real app, you'd load the audio file here
      console.log(`Loading audio from ${url}`);

      const source = audioContext.createBufferSource();
      source.connect(gainNode);

      return source;
    },
    (source) => {
      console.log('Disposing audio source');
      try {
        source.stop();
      } catch {
        // May already be stopped
      }
      source.disconnect();
    },
  );

  // Volume doesn't recreate source
  createEffect(() => {
    const v = volume() ?? 1;
    gainNode.gain.value = Math.max(0, Math.min(1, v));
  });

  onViewEvent((type) => {
    const source = audioSource();
    if (!source) return;

    if (type === 'play') {
      source.start();
      isPlaying.set(true);
    }
    if (type === 'stop') {
      source.stop();
      isPlaying.set(false);
    }
  });

  // Clean up audio context
  onDestroy(() => {
    audioContext.close();
  });
}

// ============================================
// COMPLEX DEPENDENT RESOURCES
// ============================================

/**
 * Resources with Multiple Dependencies
 */
export function DependentResourcesDemo({useProperty, useContext, createResource, createEffect}: ShadowObjectCreationAPI) {
  // Multiple dependencies
  const textureUrl = useProperty<string>('texture');
  const shaderType = useProperty<string>('shader');
  const getRenderer = useContext<() => WebGLRenderer>('renderer');

  // Resource 1: Texture (depends on textureUrl)
  const texture = createResource(
    () => {
      const url = textureUrl();
      if (!url) return undefined;

      console.log(`Loading texture: ${url}`);
      return loadTexture(url);
    },
    (tex) => {
      console.log('Disposing texture');
      tex.dispose();
    },
  );

  // Resource 2: Shader (depends on shaderType)
  const shader = createResource(
    () => {
      const type = shaderType();
      if (!type) return undefined;

      console.log(`Creating shader: ${type}`);
      return createShader(type);
    },
    (sh) => {
      console.log('Disposing shader');
      sh.dispose();
    },
  );

  // Resource 3: Material (depends on texture AND shader)
  const material = createResource(
    () => {
      const tex = texture();
      const sh = shader();

      // Need both to create material
      if (!tex || !sh) return undefined;

      console.log('Creating material');
      return createMaterial(tex, sh);
    },
    (mat) => {
      console.log('Disposing material');
      mat.dispose();
    },
  );

  createEffect(() => {
    const mat = material();
    if (mat) {
      console.log('Material ready for rendering');
    }
  });
}

// Stub types and functions
interface WebGLRenderer {}
interface Texture {
  dispose(): void;
}
interface Shader {
  dispose(): void;
}
interface Material {
  dispose(): void;
}
function loadTexture(url: string): Texture {
  return {dispose: () => {}};
}
function createShader(type: string): Shader {
  return {dispose: () => {}};
}
function createMaterial(tex: Texture, sh: Shader): Material {
  return {dispose: () => {}};
}

// ============================================
// REGISTRY
// ============================================

export default {
  define: {
    'basic-resource': BasicResourceDemo,
    'three-mesh': ThreeMeshDemo,
    'websocket-resource': WebSocketResourceDemo,
    'canvas-resource': CanvasResourceDemo,
    'audio-resource': AudioResourceDemo,
    'dependent-resources': DependentResourcesDemo,
  },
};
