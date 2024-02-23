# visual-fx-web-components 👀

![spearwolf](spearwolf.svg)

> Home of a variety of _custom elements_ and _npm packages_ to create visually spectacular websites :boom:
> 
> ‼️ But dear user, be warned: while some packages are stable and usable, other things here are highly experimental. this is more of an active sketchbook than a polished end product

## ⚙️ Local Dev Setup

This is a monorepo based on [nx](https://nx.dev/) and [pnpm](https://pnpm.io/).


Just use ...

```sh
$ pnpm install
```

... to install or refresh all the dependencies. After that you can simply build and test all packages with ..

```sh
$ pnpm cbt  # => clean build test
```

## 📖 Content

| package | description |
|-|-|
| [`offscreen-display`](packages/offscreen-display/) | Helpers for creating custom offscreen canvas elements |
| [`rainbow-line`](packages/rainbow-line/) | A custom element that displays a cut line animated with rainbow colors |
| [`shadow-ents`](packages/shadow-ents/) | Shadow-ents moves your components into WebWorker |
| [`shadow-ents-testing`](packages/shadow-ents-testing/) | functional tests for _shadow-ents_ |
| [`shadow-ents-e2e`](packages/shadow-ents-e2e/) | blackbox tests for _shadow-ents_ |

---

<small>Thank you and have a nice day</small> 😄

🚀🌱
