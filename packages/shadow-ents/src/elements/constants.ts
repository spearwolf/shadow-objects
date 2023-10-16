export const $isElement = Symbol('isShadowEntsElement');

export const $uuid = Symbol('seUuid');
export const $type = Symbol('seType');

export enum ElementType {
  Base = 1,
}

export const RequestContextEventName = 'seRequestContext';
export const ElementContextEventName = 'seElementContext';
