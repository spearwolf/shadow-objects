import {createSignal, type SignalFuncs} from '@spearwolf/signalize';
import type {TextureAtlas, TextureCoords, TextureOptionClasses, TileSet} from '@spearwolf/twopoint5d';
import type {Texture} from 'three';

export class TextureResource {
  readonly id: string;
  refCount: number;

  #imageUrl?: SignalFuncs<string | undefined>;
  #imageCoords?: SignalFuncs<TextureCoords | undefined>;
  #atlasUrl?: SignalFuncs<string | undefined>;
  #atlas?: SignalFuncs<TextureAtlas | undefined>;
  #tileSet?: SignalFuncs<TileSet | undefined>;
  #classes?: SignalFuncs<TextureOptionClasses[] | undefined>;
  #texture?: SignalFuncs<Texture | undefined>;

  get imageUrlSignal(): SignalFuncs<string | undefined> {
    if (this.#imageUrl === undefined) {
      this.#imageUrl = createSignal();
    }
    return this.#imageUrl;
  }

  get imageCoordsSignal(): SignalFuncs<TextureCoords | undefined> {
    if (this.#imageCoords === undefined) {
      this.#imageCoords = createSignal();
    }
    return this.#imageCoords;
  }

  get atlasUrlSignal(): SignalFuncs<string | undefined> {
    if (this.#atlasUrl === undefined) {
      this.#atlasUrl = createSignal();
    }
    return this.#atlasUrl;
  }

  get atlasSignal(): SignalFuncs<TextureAtlas | undefined> {
    if (this.#atlas === undefined) {
      this.#atlas = createSignal();
    }
    return this.#atlas;
  }

  get tileSetSignal(): SignalFuncs<TileSet | undefined> {
    if (this.#tileSet === undefined) {
      this.#tileSet = createSignal();
    }
    return this.#tileSet;
  }

  get classesSignal(): SignalFuncs<TextureOptionClasses[] | undefined> {
    if (this.#classes === undefined) {
      this.#classes = createSignal();
    }
    return this.#classes;
  }

  get textureSignal(): SignalFuncs<Texture | undefined> {
    if (this.#texture === undefined) {
      this.#texture = createSignal();
    }
    return this.#texture;
  }

  set imageUrl(value: string | undefined) {
    this.imageUrlSignal[1](value);
  }

  set imageCoords(value: TextureCoords | undefined) {
    this.#imageCoords[1](value);
  }

  set atlasUrl(value: string | undefined) {
    this.atlasUrlSignal[1](value);
  }

  set atlas(value: TextureAtlas | undefined) {
    this.atlasSignal[1](value);
  }

  set tileSet(value: TileSet | undefined) {
    this.tileSetSignal[1](value);
  }

  set classes(value: TextureOptionClasses[] | undefined) {
    this.classesSignal[1](value);
  }

  set texture(value: Texture | undefined) {
    this.textureSignal[1](value);
  }

  constructor(id: string) {
    this.id = id;
    this.refCount = 0;
  }
}
