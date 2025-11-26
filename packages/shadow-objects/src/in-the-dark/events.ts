import type {Entity} from './Entity.js';

// ----------------------------------------------------------------------------

export const onCreate = 'onCreate';

export interface OnCreate {
  /**
   * Is called when the shadow-object instance has been created and attached to the entity.
   *
   * This can be the case when the entity is being initialized, or when the already initialized entity has received a token change.
   *
   * Only the shadow-object gets this event.
   * The entity does not get this event.
   */
  [onCreate](entity: Entity): void;
}

// ----------------------------------------------------------------------------

export const onDestroy = 'onDestroy';

export interface OnDestroy {
  /**
   * Is called when the shadow-object is about to be destroyed.
   * Only the shadow-object gets this event.
   * The entity does not get this event.
   */
  [onDestroy](entity: Entity): void;
}

// ----------------------------------------------------------------------------

export const onParentChanged = 'onParentChanged';

export interface OnParentChangedEvent {
  [onParentChanged](entity: Entity): void;
}

// ----------------------------------------------------------------------------

export const onViewEvent = 'onViewEvent';

export interface OnViewEvent {
  [onViewEvent](type: string, data: unknown): void;
}
