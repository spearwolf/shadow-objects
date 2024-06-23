export default () => new Worker(new URL('./shadow-ents.worker.js', import.meta.url), {type: 'module'});
