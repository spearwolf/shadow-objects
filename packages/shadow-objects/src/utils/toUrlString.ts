/**
 * Turn a module url into the string a dynamic `import()` takes.
 *
 * A `URL` is handed back as its own string. A string is resolved against the base url of
 * the realm -- `globalThis.location.href`, the document on the main thread and the worker
 * script inside a worker -- so an absolute url and a `data:` url come back unchanged,
 * while a relative path becomes absolute against the page or worker that asked for it.
 *
 * The realm therefore has to have a `location`, and every environment this library runs in
 * has one: a document, a dedicated worker, a service worker. A bare Node process has none,
 * and a string handed in there is refused with a `TypeError`.
 */
export const toUrlString = (url: URL | string): string => {
  if (typeof url === 'string') {
    url = new URL(url, globalThis.location.href);
  }
  return url.toString();
};
