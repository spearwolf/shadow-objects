/**
 * A throw from a Custom Elements reaction (constructor, attributeChangedCallback) does not
 * reach the caller of `innerHTML`/`setAttribute` — per spec it is reported to the global
 * `error` event instead of propagating synchronously. Without this guard, vitest logs the
 * swallowed reaction as an "Unhandled Error" and the run exits non-zero even though every
 * test is green.
 */
export const withSwallowedErrors = (fn) => {
  const messages = [];
  const onError = (event) => {
    messages.push(event.message);
    event.preventDefault();
  };
  window.addEventListener('error', onError);
  try {
    fn();
  } finally {
    window.removeEventListener('error', onError);
  }
  return messages;
};