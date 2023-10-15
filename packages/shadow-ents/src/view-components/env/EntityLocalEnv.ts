import {Kernel} from '../../entities/Kernel.js';
import {Registry} from '../../entities/Registry.js';
import type {EntitiesSyncEvent, EntityChangeEntryType} from '../../types.js';
import {EntityEnv} from './EntityEnv';

const hasStructuredClone = typeof structuredClone === 'function' ? true : false;
let structuredCloneWarningHasBeenShown = false;

const checkStructuredClone = () => {
  if (!hasStructuredClone && !structuredCloneWarningHasBeenShown) {
    console.warn('EntityLocalEnv: structuredClone() is not available, ignoring useStructuredClone preference');
    structuredCloneWarningHasBeenShown = true;
  }
  return hasStructuredClone;
};

export interface EntityLocalEnvParams {
  namespace?: string | symbol;
  registry?: Registry;
  useStructuredClone?: boolean;
}

/**
 * An _entity environment_ that runs within the same process as the _entity view objects_.
 * (which in most cases should be the main/local thread of the active browser window/tab)
 *
 * To avoid unexpected side effects, all data that is synchronized is cloned using `structuredClone()` by default
 * (this behavior can of course also be deactivated).
 */
export class EntityLocalEnv extends EntityEnv {
  readonly kernel: Kernel;

  useStructuredClone = true;

  constructor(options?: EntityLocalEnvParams) {
    super(options?.namespace);

    this.kernel = new Kernel(options?.registry);
    this.useStructuredClone = options?.useStructuredClone ?? true;

    this.on(EntityEnv.OnSync, (event: EntitiesSyncEvent) => this.kernel.run(event));
  }

  public override start(): EntityLocalEnv {
    super.start();
    return this;
  }

  protected override getChangeTrail(): EntityChangeEntryType[] {
    const changeTrail = super.getChangeTrail();
    return this.useStructuredClone && checkStructuredClone() ? structuredClone(changeTrail) : changeTrail;
  }
}
