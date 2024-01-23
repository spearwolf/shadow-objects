import type {Entity} from './Entity.js';

export const OnCreate = 'onCreate';
export const OnInit = 'onInit';
export const OnDestroy = 'onDestroy'; // TODO OnDestroy should be called before entity is removed from kernel

export const OnAddToParent = 'onAddToParent'; // TODO call OnAddToParent when an entity is added to a parent as child
export const OnRemoveFromParent = 'onRemoveFromParent';

export const OnAddChild = 'onAddChild'; // TODO call OnAddChild when when the entity gets a new child added
export const OnRemoveChild = 'onRemoveChild'; // TODO call OnRemoveChild when a child is removed from the entity

// TODO add Entity or ShadowObject prefix to all events

/**
 * Is called when the shadow-object instance has been created and attached to the entity (instance).
 * This happens after the entity instantiation and before the `OnInit` event is called.
 *
 * This is the only event callback that only the shadow-object gets.
 * The _entity_ does not get this event.
 */
export interface OnCreate {
  onCreate(entity: Entity): void;
}

/**
 * Is called when the entity has been created and all the shadow-objects have been attached to it.
 *
 * The `OnInit` is triggered on the entity, therefore all shadow-objects created with the entity receive this event.
 *
 * When the `OnInit` event is triggered, all shadow-objects have been initialized and have already received their individual `OnCreate` event.
 */
export interface OnInit {
  onInit(entity: Entity): void;
}

/**
 * Is called when the entity is about to be destroyed.
 *
 * The `OnDestroy` is triggered on the entity, therefore all shadow-objects created for this entity receive this event.
 *
 * This is the last event in the lifecycle of an entity component.
 */
export interface OnDestroy {
  onDestroy(entity: Entity): void;
}

/**
 * Is called when the entity is added to a parent entity as child.
 *
 * The `OnAddToParent` is triggered on the _entity_, therefore all shadow-objects within the entity receive this event.
 *
 * The `OnAddToParent` event comes _after_ the `OnAddChild` event.
 */
export interface OnAddToParent {
  onAddToParent(child: Entity, parent: Entity): void;
}

export interface OnRemoveFromParent {
  onRemoveFromParent(child: Entity, parent: Entity): void;
}

export interface OnAddChild {
  onAddChild(parent: Entity, child: Entity): void;
}

export interface OnRemoveChild {
  onRemoveChild(parent: Entity, child: Entity): void;
}
