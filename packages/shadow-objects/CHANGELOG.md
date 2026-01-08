# CHANGELOG

All notable changes to [@spearwolf/shadow-objects](https://github.com/spearwolf/shadow-objects/tree/main/packages/shadow-objects) will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
