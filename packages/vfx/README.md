
# @spearwolf/vfx

_thinktank_

## Integrate the web components in your page

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