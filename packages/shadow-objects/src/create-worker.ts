export default () => new Worker(new URL('./shadow-objects.worker.js', import.meta.url), {type: 'module'});
