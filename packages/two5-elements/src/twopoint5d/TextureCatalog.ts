import {eventize, type Eventize} from '@spearwolf/eventize';
import {createSignal, value, type SignalReader} from '@spearwolf/signalize';
import {type TextureOptionClasses, type TileSetOptions} from '@spearwolf/twopoint5d';
import type {WebGLRenderer} from 'three';
import {TextureResource, type TextureResourceSubType} from './TextureResource.js';

export interface TextureCatalogItem {
  imageUrl?: string;
  atlasUrl?: string;
  tileSet?: TileSetOptions;
  texture?: TextureOptionClasses[];
}

export interface TextureCatalogData {
  defaultTextureClasses: TextureOptionClasses[];
  items: Record<string, TextureCatalogItem>;
}

const ready = 'ready';

const joinTextureClasses = (...classes: TextureOptionClasses[][] | undefined): TextureOptionClasses[] | undefined => {
  const all = classes?.filter((c) => c != null);
  if (all && all.length) {
    return Array.from(new Set(all.flat()).values());
  }
  return undefined;
};

export interface TextureCatalog extends Eventize {}

export class TextureCatalog {
  static RendererChanged = 'rendererChanged';

  static async load(url: string | URL): Promise<TextureCatalog> {
    return new TextureCatalog().load(url);
  }

  defaultTextureClasses: TextureOptionClasses[] = [];

  #renderer = createSignal<WebGLRenderer | undefined>();

  get renderer(): WebGLRenderer | undefined {
    return value(this.#renderer[0]);
  }

  get renderer$(): SignalReader<WebGLRenderer | undefined> {
    return this.#renderer[0];
  }

  set renderer(value: WebGLRenderer | undefined) {
    this.#renderer[1](value);
  }

  #resources = new Map<string, TextureResource>();

  constructor() {
    eventize(this);
    this.retain(ready);

    this.renderer$((renderer) => {
      this.emit(TextureCatalog.RendererChanged, renderer);
    });
  }

  async whenReady(): Promise<TextureCatalog> {
    await this.onceAsync(ready);
    return this;
  }

  load(url: string | URL) {
    fetch(url).then(async (response) => {
      const data: TextureCatalogData = await response.json();
      this.parse(data);
    });
    return this;
  }

  parse(data: TextureCatalogData) {
    if (Array.isArray(data.defaultTextureClasses) && data.defaultTextureClasses.length) {
      this.defaultTextureClasses = data.defaultTextureClasses.splice(0);
    }

    // TODO what should happen if a resource is already created?

    for (const [id, item] of Object.entries(data.items)) {
      let resource: TextureResource | undefined;

      const textureClasses = joinTextureClasses(item.texture, this.defaultTextureClasses);

      if (item.tileSet) {
        resource = TextureResource.fromTileSet(id, item.imageUrl, item.tileSet, textureClasses);
      }
      // TODO atlasUrl
      else if (item.imageUrl) {
        resource = TextureResource.fromImage(id, item.imageUrl, textureClasses);
      }

      if (resource) {
        this.#resources.set(id, resource);
        this.on(resource);
        // TODO off(resource)
      }
    }

    this.emit(ready, this);
  }

  get(id: string, type: TextureResourceSubType, callback: (val: any) => void): () => void {
    // TODO get with multiple types

    let isActive = true;
    let unsubscribe: () => void = () => {
      isActive = false;
    };

    // TODO reload catalog data

    this.whenReady().then(() => {
      if (isActive) {
        const resource = this.#resources.get(id);
        if (resource) {
          resource.activate();
          resource.renderer = this.renderer;
          // TODO refCount
          unsubscribe = resource.on(type, callback);
        }
      }
    });

    return unsubscribe;
  }
}
