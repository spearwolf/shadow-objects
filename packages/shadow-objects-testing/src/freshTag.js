let counter = 0;

/**
 * Answers a custom element tag name built from `stem` that no earlier call has answered.
 *
 * One registry serves the whole document and a definition cannot be taken back:
 * `customElements.define` throws `NotSupportedError` the second time it sees a name. A case
 * that registers a written name therefore works exactly once. Run its body again — a retry
 * after a flake, for instance — and it dies on the registration rather than on what it was
 * meant to show, and that is what the run reports instead of the real failure.
 *
 * @param {string} stem the readable half of the name; the hyphen a custom element name needs
 *   is the one this puts in front of the counter, so `stem` may do without
 * @returns {string}
 */
export const freshTag = (stem) => `${stem}-${++counter}`;
