import {Kernel} from '../../entities/Kernel.js';
import {Registry} from '../../entities/Registry.js';
import type {IComponentChangeType, SyncEvent} from '../../types.js';
import {BaseEnv} from './BaseEnv.js';

const hasStructuredClone = typeof structuredClone === 'function' ? true : false;
let structuredCloneWarningHasBeenShown = false;

const checkStructuredClone = () => {
  if (!hasStructuredClone && !structuredCloneWarningHasBeenShown) {
    console.warn('LocalEnv: structuredClone() is not available, ignoring useStructuredClone preference');
    structuredCloneWarningHasBeenShown = true;
  }
  return hasStructuredClone;
};

export interface LocalEnvParams {
  namespace?: string | symbol;
  registry?: Registry;
  useStructuredClone?: boolean;
}

const USE_STRUCTURED_CLONE_BY_DEFAULT = true;

/**
 * An _entity environment_ that runs within the same process as the _view components_
 * (which in most cases should be the main thread of the active browser window/tab)
 *
 * To avoid unexpected side effects, all data that is synchronized is cloned using `structuredClone()` by default
 * (this behavior can of course also be deactivated).
 */
export class LocalEnv extends BaseEnv {
  readonly kernel: Kernel;

  useStructuredClone = USE_STRUCTURED_CLONE_BY_DEFAULT;

  constructor(options?: LocalEnvParams) {
    super(options?.namespace);

    this.kernel = new Kernel(options?.registry);
    this.useStructuredClone = options?.useStructuredClone ?? USE_STRUCTURED_CLONE_BY_DEFAULT;

    this.on(BaseEnv.OnSync, (event: SyncEvent) => this.kernel.run(event));
  }

  protected override getChangeTrail(): IComponentChangeType[] {
    const changeTrail = super.getChangeTrail();
    return this.useStructuredClone && checkStructuredClone() ? structuredClone(changeTrail) : changeTrail;
  }
}
