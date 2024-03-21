
# @spearwolf/vfx

> a multi threaded renderer 🚀 for your browser using web workers and shared offscreen canvases

_Caution‼️ this is a highly experimental setup, but with a damn high awesomeness factor!_ 😉

Using the [shadow-ents](../shadow-ents/) library, the vfx package provides several web components that can be used to create a shadow-objects scenario that supports general offscreen canvas rendering as well as a shared three.js offscreen renderer.

## Integrate the web components in your page

_thinktank_

```html
<html>
  <body>
    <vfx-ctx src="my-vfx-shadow-objects.js">
    
      <t.5d-assets-store src="textures.json" />
    
      <!-- somewhere in your layout -->
      
      <vfx-display>
        <spw-starfield star-count="10000" />
      </vfx-display>

      <!-- somewhere else in your layout -->
      
      <vfx-display>
        <t.5d-bouncing-sprites count="500" />
      </vfx-display>

    </vfx-ctx>

    <script type="module" src="vfx.js"></script>
  </body>
</html>
```

## Local Development Setup

Run the tests with ..

```sh
➜ pnpm watch  # or just use `pnpm test`
```

Run the local test server/scenario with ..

```sh
➜ pnpm dev  # or use `pnpm nx dev vfx`
```
