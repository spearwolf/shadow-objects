function refuser() {
  // The kernel builds its shadow objects inside `kernel.run()`, so a throw from here leaves the run
  // and is reported back to the view as the failure of the change trail that carried the entity —
  // which is the whole point of this fixture. Deferring the throw with a `setTimeout` would take it
  // out of exactly the try/catch that reports it, and the view would never hear about it.
  throw new Error('this shadow object refuses to be created');
}

// Modules under `public/` are served as they are and imported inside the worker, where no bare
// specifier resolves — a plain function is all a fixture here can be.
export const shadowObjects = {
  define: {
    refuser,
  },
};
