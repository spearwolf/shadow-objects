# @spearwolf/offscreen-display

A minimal javascript library that makes it pretty easy for you to create a _custom element_ that creates an _offline canvas_ in a _web worker_ and renders it in the _animation frame_ loop of the browser.

Whether webgl, webgpu or 2d context is up to the user, the class takes care of the synchronization of the element dimension and rendering of the frames.

## 📖 How To

### 1. Install

```sh
➜ npm i -D @spearwolf/offscreen-display
```

To get started quickly, [vite](https://vitejs.dev/) is recommended, but this is purely optional and a matter of taste.


### 2. Create custom element

`awesome-display.js`

```javascript
import {OffscreenDisplay} from '@spearwolf/offscreen-display';

class AwesomeDisplay extends OffscreenDisplay {
  createWorker() {
    return new Worker(new URL('awesome-display-worker.js', import.meta.url), {
      type: 'module',
    });
  }

  // override or leave as it is ..
  // getContextAttributes() {
  //   if (this.hasAttribute('no-alpha')) {
  //     return {alpha: false};
  //   }
  //   return {alpha: true};
  // }
}

customElements.define('awesome-display', AwesomeDisplay);
```

### 3. Integrate the element in your page

`index.html`

```html
<html>
  <body>
    <awesome-display></awesome-display>
    <script type="module" src="awesome-display.js"></script>
  </body>
</html>
```

### 3. Create your worker

`awesome-display-worker.js`

``` javascript
import {OffscreenWorkerDisplay} from '@spearwolf/offscreen-display/worker.js';

const display = new OffscreenWorkerDisplay();

let ctx = null;

display.on({
  onCanvas({canvas}, contextAttributes) {
    ctx = canvas.getContext('2d', contextAttributes);
  },

  onFrame({now, canvasWidth: w, canvasHeight: h}) {
    ctx.clearRect(0, 0, w, h);
  },
});

self.addEventListener('message', (evt) => {
  display.parseMessageData(data);
});

```

### 4. More features available

There are other features not listed here. For a complete example, see the [rainbow line element](https://github.com/spearwolf/visual-fx-web-components/tree/main/packages/rainbow-line).


## Copyright and License

Copyright &copy; 2024 by [Wolfger Schramm](mailto:wolfger@spearwolf.de?subject=[GitHub]%20@spearwolf/offscreen-display).

The source code is licensed under the [Apache-2.0 License](./LICENSE).


<small>have fun!</small>
🚀🌱
