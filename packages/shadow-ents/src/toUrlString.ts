export const toUrlString = (url: URL | string): string => {
  if (typeof url === 'string') {
    url = new URL(url, globalThis.location.href);
  }
  return url.toString();
};
