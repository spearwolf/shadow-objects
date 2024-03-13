import type {Entity} from './Entity.js';

// ----------------------------------------------------------------------------

export const onCreate = 'onCreate';

// TODO do we need the OnCreate really? maybe the constructor is enough?
// TODO test if OnCreate is called when an entity token is changed

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

export const onEntityCreate = 'onEntityCreate';

// TODO maybe we should remove the OnEntityCreate event?

export interface OnEntityCreate {
  /**
   * Is called when the entity has been created and all the shadow-objects have been attached to it.
   *
   * The event is triggered on the entity, therefore all shadow-objects created with the entity receive this event.
   *
   * When the event is triggered, all shadow-objects have been initialized and have already received their individual `OnCreate` event.
   */
  [onEntityCreate](entity: Entity, token: string): void;
}

// ----------------------------------------------------------------------------

export const onEntityTokenChange = 'onEntityTokenChange';

// TODO test if OnEntityTokenChange is called when an entity token is changed

export interface OnEntityTokenChange {
  /**
   * Is called when the token has changed after an entity has been initialized.
   * The shadow-objects for the entity are updated before the call.
   */
  [onEntityTokenChange](entity: Entity, token: string, previousToken: string): void;
}

// ----------------------------------------------------------------------------

export const onDestroy = 'onDestroy';

// TODO distinguish between OnDestroy(shadow-object) and OnDestroyOtherShadowObject ?
// TODO test if OnDestroy is called when an entity is destroyed
// TODO test if OnDestroy is called when a shadow-object is removed from an entity

export interface OnDestroy {
  /**
   * Is called when the shadow-object is about to be destroyed.
   */
  [onDestroy](entity: Entity): void;
}

// ----------------------------------------------------------------------------

export const onAddToParent = 'onAddToParent';

// TODO call OnAddToParent when an entity is added to a parent as child

export interface OnAddToParent {
  /**
   * Is called when the entity is added to a parent entity as child.
   *
   * The `OnAddToParent` is triggered on the _entity_, therefore all shadow-objects within the entity receive this event.
   *
   * The `OnAddToParent` event comes _after_ the `OnAddChild` event.
   */
  [onAddToParent](child: Entity, parent: Entity): void;
}

// ----------------------------------------------------------------------------

export const onRemoveFromParent = 'onRemoveFromParent';

export interface OnRemoveFromParent {
  [onRemoveFromParent](child: Entity, parent: Entity): void;
}

// ----------------------------------------------------------------------------

export const onAddChild = 'onAddChild';

// TODO call OnAddChild when when the entity gets a new child added

export interface OnAddChild {
  [onAddChild](parent: Entity, child: Entity): void;
}

// ----------------------------------------------------------------------------

export const onRemoveChild = 'onRemoveChild';

// TODO call OnRemoveChild when a child is removed from the entity

export interface OnRemoveChild {
  [onRemoveChild](parent: Entity, child: Entity): void;
}

// ----------------------------------------------------------------------------

export const onViewEvent = 'onViewEvent';

export interface OnViewEvent {
  [onViewEvent](type: string, data: unknown): void;
}
