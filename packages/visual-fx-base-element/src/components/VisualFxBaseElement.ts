import {LitElement} from 'lit';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';

const DEBUG_ATTR = 'debug';
const UNNAMED = '(unnamed)';

export class VisualFxBaseElement extends LitElement {
  #debug = false;

  get debug(): boolean {
    return this.#debug;
  }

  set debug(value: any) {
    this.#debug = Boolean(value);
    if (!this.#debug && this.#logger != null) {
      this.#logger = undefined;
    }
  }

  #logger?: ConsoleLogger;

  get logger(): ConsoleLogger | undefined {
    if (this.#logger != null) return this.#logger;
    if (this.#debug) {
      this.#logger = ConsoleLogger.getLogger(this.#loggerNS);
    }
    return this.#logger;
  }

  #loggerNS: string = UNNAMED;

  get loggerNS(): string {
    return this.#loggerNS;
  }

  set loggerNS(value: string) {
    this.#loggerNS = String(value).trim() || UNNAMED;
    if (this.logger != null && this.logger.namespace !== this.#loggerNS) {
      this.#logger = undefined;
    }
  }

  constructor() {
    super();
    this.debug = this.hasAttribute(DEBUG_ATTR);
    // TODO react to attribute changes for debug
  }
}
