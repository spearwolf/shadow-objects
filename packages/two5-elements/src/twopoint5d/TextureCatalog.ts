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
const rendererChanged = 'rendererChanged';

const joinTextureClasses = (...classes: TextureOptionClasses[][] | undefined): TextureOptionClasses[] | undefined => {
  const all = classes?.filter((c) => c != null);
  if (all && all.length) {
    return Array.from(new Set(all.flat()).values());
  }
  return undefined;
};

export interface TextureCatalog extends Eventize {}

export class TextureCatalog {
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
    this.retain([ready, rendererChanged]);

    this.renderer$((renderer) => {
      this.emit(rendererChanged, renderer);
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

  get(id: string, type: TextureResourceSubType | TextureResourceSubType[], callback: (val: any) => void): () => void {
    const multipleTypes = Array.isArray(type);
    const values = multipleTypes ? new Map<TextureResourceSubType, any>() : undefined;
    const unsubscribeCallbacks: (() => void)[] = [];

    let isActive = true;

    const unsubscribe: () => void = () => {
      isActive = false;
      values.clear();
      unsubscribeCallbacks.forEach((cb) => cb());
    };

    // TODO reload catalog data

    this.once(ready, () => {
      if (isActive) {
        // TODO subscribe to resource
        const resource = this.#resources.get(id);
        if (resource) {
          resource.load();
          resource.renderer = this.renderer;
          // TODO refCount
          if (multipleTypes) {
            (type as Array<TextureResourceSubType>).forEach((t) => {
              unsubscribeCallbacks.push(
                resource.on(t, (val) => {
                  values.set(t, val);
                  const valuesArg = (type as Array<TextureResourceSubType>).map((t) => values.get(t)).filter((v) => v != null);
                  if (valuesArg.length === type.length) {
                    callback(valuesArg);
                  }
                }),
              );
            });
          } else {
            unsubscribeCallbacks.push(
              resource.on(type, (val) => {
                callback(val);
              }),
            );
          }
        }
      }
    });

    return unsubscribe;
  }
}
