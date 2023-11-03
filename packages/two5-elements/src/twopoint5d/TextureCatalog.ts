import {eventize, type Eventize} from '@spearwolf/eventize';
import {type TextureOptionClasses, type TileSetOptions} from '@spearwolf/twopoint5d';
import {TextureResource} from './TextureResource.js';

export interface TextureCatalogItem {
  imageUrl?: string;
  atlasUrl?: string;
  tileSet?: TileSetOptions;
  classes?: TextureOptionClasses[];
}

export interface TextureCatalogData {
  baseUrl?: string;
  defaultClasses: TextureOptionClasses[];
  items: Record<string, TextureCatalogItem>;
}

const Ready = 'ready';

export interface TextureCatalog extends Eventize {}

export class TextureCatalog {
  static async load(url: string | URL): Promise<TextureCatalog> {
    return new TextureCatalog().load(url);
  }

  defaultClasses: TextureOptionClasses[] = [];

  #resources = new Map<string, TextureResource>();

  constructor() {
    eventize(this);
    this.retain(Ready);
  }

  whenReady(): Promise<TextureCatalog> {
    return this.onceAsync(Ready).then(() => this);
  }

  async load(url: string | URL) {
    const response = await fetch(url);
    const data: TextureCatalogData = await response.json();
    this.parse(data);
    return this;
  }

  parse(data: TextureCatalogData) {
    if (Array.isArray(data.defaultClasses) && data.defaultClasses.length) {
      this.defaultClasses = data.defaultClasses.splice(0);
    }

    // TODO what should happen if a resource is already created?

    for (const [id, item] of Object.entries(data.items)) {
      const resource = new TextureResource(id);

      if (item.imageUrl) {
        resource.imageUrl = item.imageUrl;
      }

      if (item.atlasUrl) {
        resource.atlasUrl = item.atlasUrl;
      }

      // TODO
      // if (item.tileSet) {
      //   resource.tileSet = new TileSet(item.tileSet);
      // }

      if (Array.isArray(item.classes) && item.classes.length) {
        resource.classes = item.classes.splice(0);
      }

      this.#resources.set(id, resource);
    }

    this.emit(Ready, this);
  }
}
