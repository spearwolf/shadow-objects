# CHANGELOG

All notable changes to [@spearwolf/shadow-objects](https://github.com/spearwolf/shadow-objects/tree/main/packages/shadow-objects) will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

- improve `useProperties()` type inference with key-to-type maps
- **API Update:** `on()` and `once()` in `ShadowObjectCreationAPI` now support an implicit event source.
    - If the first argument is a `string`, `symbol`, or `[]`, the `entity` is automatically used as the event source.
    - Example: `on('eventName', callback)` is equivalent to `on(entity, 'eventName', callback)`.
    - This simplifies the common case of listening to entity events.
- **Refactor** the `EntityApi` type
- **Documentation:** Comprehensive update to the documentation structure and content.

## [0.27.0] - 2026-01-19

### ⚠️ Breaking Changes

- **API Update:** `dispatchMessageToView` has been moved from the `entity` instance to the `ShadowObjectCreationAPI`.
    - **Before:** `entity.dispatchMessageToView(...)`
    - **After:** `dispatchMessageToView(...)` (available as an argument in the constructor/factory function)
- **Type Definitions:** Removed `dispatchMessageToView` from `EntityApi` interface.

## [0.26.4] - 2026-01-15

- fix return type definitions for `provideContext()` and `provideGlobalContext()`

## [0.26.3] - 2026-01-15

- fix type definitions for `provideContext()`, `provideGlobalContext()`, `useContext()`, `useParentContext()` and `useProperty()` when using the deprecated third argument as `isEqual` callback
- improve type definitions for `createResource()`
  - resource is set to `undefined` after entity destruction

## [0.26.2] - 2026-01-12

- fix the check for when the deprecation warning is shown in `provideContext()` and `provideGlobalContext()`

## [0.26.1] - 2026-01-08

- automatic clearing of the context value is now performed by default _after_ the user-defined `onDestroy()` hooks

## [0.26.0] - 2026-01-08

- `provideContext()` and `provideGlobalContext()` expect as third argument now an option object `{compare?, clearOnDestroy?}`
  - the old way (third argument as `isEqual` callback) will continue to work but is now deprecated!
- both `provide*Context()` features will now clear the context value to _undefined_ on shadow-object destruction by default
  - opt out via `{clearOnDestroy: false}`

## [0.25.0] - 2025-12-31

- use `display: contents` style for all shadow object host elements to avoid layout issues

## [0.24.0] - 2025-11-27

- renamed interface `ShadowObjectParams` to `ShadowObjectCreationAPI` for clarity and consistency with the concept of the _Shadow Object Creation API_
- renamed `useResource()` to `createResource()` in `ShadowObjectCreationAPI` interface

## [0.23.0] - 2025-11-26

- enhance the shadow-objects creation api _aka_ `ShadowObjectParams`
  - added the `useProperties()` function
  - added the `useResource()` function
- added lots of new tests and improved code coverage
