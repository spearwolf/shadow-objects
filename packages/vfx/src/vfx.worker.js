console.log('hej @spearwolf/vfx/worker.js 🚀');

onmessage = (event) => {
  console.log('worker got message', event.data);

  if ('importVfxSrc' in event.data) {
    import(event.data.importVfxSrc).then((module) => {
      console.log('imported', module);
    });
  }
};
