import {eventize, type Eventize} from '@spearwolf/eventize';
import {Display} from '@spearwolf/twopoint5d';
import type {WebGLRenderer} from 'three';
import {StageAdded, StageRemoved, type StageAddedProps, type StageRemovedProps} from '../events.js';
import type {IStageRenderer, StageParentType, StageType} from './IStageRenderer.js';

export interface SimpleStageRenderer extends Eventize {}

type UnsubscribeFn = () => void;

interface StageItem {
  stage: StageType;
  width: number;
  height: number;
}

export class SimpleStageRenderer implements IStageRenderer {
  #parent?: StageParentType;
  #unsubscribeFromParent: UnsubscribeFn[] = [];

  width: number = 0;
  height: number = 0;

  get parent(): StageParentType | undefined {
    return this.#parent;
  }

  set parent(parent: StageParentType | undefined) {
    if (this.#parent !== parent) {
      if (this.#parent) {
        this.#removeFromParent();
      }
      this.#parent = parent;
      if (this.#parent) {
        this.#addToParent();
      }
    }
  }

  #removeFromParent(): void {
    this.#unsubscribeFromParent.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribeFromParent.length = 0;

    if (!(this.#parent instanceof Display)) {
      this.#parent!.removeStage(this);
    }
  }

  #addToParent(): void {
    if (this.#parent instanceof Display) {
      this.#addToDisplay(this.#parent);
    } else {
      this.#parent!.addStage(this);
    }
  }

  #addToDisplay(display: Display): void {
    this.#unsubscribeFromParent.push(
      ...[
        display.on('resize', ({width, height}: {width: number; height: number}) => {
          this.resize(width, height);
        }),
        display.on('frame', ({renderer}: {renderer: WebGLRenderer}) => {
          this.renderFrame(renderer);
        }),
      ],
    );
  }

  readonly #stages: StageItem[] = [];

  constructor() {
    eventize(this);
  }

  attach(parent: StageParentType): void {
    this.parent = parent;
  }

  detach(): void {
    this.parent = undefined;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    this.#stages.forEach((stage) => this.#resizeStage(stage, width, height));
  }

  #resizeStage(stage: StageItem, width: number, height: number): void {
    if (stage.width !== width || stage.height !== height) {
      stage.width = width;
      stage.height = height;
      stage.stage.resize(width, height);
    }
  }

  renderFrame(renderer: WebGLRenderer): void {
    this.#stages.forEach((stage) => {
      this.#resizeStage(stage, this.width, this.height);
      stage.stage.renderFrame(renderer);
    });
  }

  #getIndex(stage: StageType): number {
    return this.#stages.findIndex((item) => item.stage === stage);
  }

  hasStage(stage: StageType): boolean {
    return this.#getIndex(stage) !== -1;
  }

  addStage(stage: StageType): void {
    if (!this.hasStage(stage)) {
      this.#stages.push({
        stage,
        width: 0,
        height: 0,
      });
      this.emit(StageAdded, {stage, renderer: this} as StageAddedProps);
    }
  }

  removeStage(stage: StageType): void {
    const index = this.#getIndex(stage);
    if (index !== -1) {
      this.#stages.splice(index, 1);
      this.emit(StageRemoved, {stage, renderer: this} as StageRemovedProps);
    }
  }
}
