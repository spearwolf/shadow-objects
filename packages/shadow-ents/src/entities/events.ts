import type {Entity} from './Entity.js';

// ----------------------------------------------------------------------------

export const onCreate = 'onCreate';

export interface OnCreate {
  /**
   * Is called when the shadow-object instance has been created and attached to the entity.
   * This happens after the entity instantiation and before the `OnInit` event is called.
   *
   * This is the only event callback that only the shadow-object gets.
   * The entity does not get this event.
   */
  [onCreate](entity: Entity): void;
}

// ----------------------------------------------------------------------------

export const onEntityInitialized = 'onEntityInitialized';

export interface OnEntityInitialized {
  /**
   * Is called when the entity has been created and all the shadow-objects have been attached to it.
   *
   * The `OnInit` is triggered on the entity, therefore all shadow-objects created with the entity receive this event.
   *
   * When the `OnInit` event is triggered, all shadow-objects have been initialized and have already received their individual `OnCreate` event.
   */
  [onEntityInitialized](entity: Entity): void;
}

// ----------------------------------------------------------------------------

export const onEntityTokenChanged = 'onEntityTokenChanged';

export interface OnEntityTokenChanged {
  /**
   * Is called when the token has changed after an entity has been initialized.
   * The shadow-objects for the entity are updated before the call.
   */
  [onEntityTokenChanged](entity: Entity): void;
}

// ----------------------------------------------------------------------------

export const onDestroy = 'onDestroy';

// TODO distinguish between OnDestroy(shadow-object) and OnDestroyOtherShadowObject ?
// TODO OnDestroy should be called before entity is removed from kernel

export interface OnDestroy {
  /**
   * Is called when the shadow-object is about to be destroyed.
   */
  [onDestroy](entity: Entity): void;
}

// ----------------------------------------------------------------------------

export const onAddedToParent = 'onAddToParent';

// TODO call OnAddToParent when an entity is added to a parent as child

export interface OnAddedToParent {
  /**
   * Is called when the entity is added to a parent entity as child.
   *
   * The `OnAddToParent` is triggered on the _entity_, therefore all shadow-objects within the entity receive this event.
   *
   * The `OnAddToParent` event comes _after_ the `OnAddChild` event.
   */
  [onAddedToParent](child: Entity, parent: Entity): void;
}

// ----------------------------------------------------------------------------

export const onRemovedFromParent = 'onRemovedFromParent';

export interface OnRemovedFromParent {
  [onRemovedFromParent](child: Entity, parent: Entity): void;
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
