import {GlobalNS} from '../constants.js';
import {ComponentContext, LocalShadowObjectEnv, RemoteWorkerEnv, ShadowEnv} from '../core.js';
import {ShadowEntityElement} from './ShadowEntityElement.js';
import {ShadowElementType} from './constants.js';

export class ShadowEnvElement extends ShadowEntityElement {
  override readonly contextTypes: ShadowElementType[] = [];
  override readonly shadowTypes = new Set([ShadowElementType.ShadowEnv]);

  readonly shadowEnv = new ShadowEnv();

  constructor() {
    super();

    this.ns = GlobalNS;
    this.stopContextRequestPropagation = true;

    this.ns$((ns) => {
      this.shadowEnv.view = ComponentContext.get(ns);
    });
  }

  override syncShadowObjects() {
    this.shadowEnv.sync();
  }

  override connectedCallback(): void {
    if (!this.shadowEnv.isReady) {
      this.start();
    }

    super.connectedCallback();
  }

  async start() {
    this.shadowEnv.view ??= ComponentContext.get(this.ns);
    this.shadowEnv.envProxy ??= this.hasAttribute('local') ? new LocalShadowObjectEnv() : new RemoteWorkerEnv();
    await this.shadowEnv.ready();
    await this.shadowEnv.sync();
  }
}
