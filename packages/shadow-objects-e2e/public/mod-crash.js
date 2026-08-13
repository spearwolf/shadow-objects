function crasher() {
  // The worker catches everything that happens while it applies a change trail and reports it
  // back as a protocol message, so a synchronous throw here would never reach the view as a
  // worker failure. Deferring it takes the throw out of every try/catch on the worker side: it
  // becomes an unhandled error, which is what the browser turns into an `error` event on the
  // Worker object — the failure this page is about.
  setTimeout(() => {
    throw new Error('the shadow object took the worker down');
  }, 0);
}

export const shadowObjects = {
  define: {
    crasher,
  },
};