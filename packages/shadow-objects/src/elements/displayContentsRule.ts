/** What a root already carries: the tag names covered, and the element holding the rule. */
interface DisplayRuleState {
  tags: Set<string>;
  style: HTMLStyleElement;
}

const RuleStatePerRoot = new WeakMap<Document | ShadowRoot, DisplayRuleState>();

// `CSS.escape` guards a tag name that carries a character the selector grammar would otherwise
// read as a combinator — a dot is legal in a custom element name and would parse as a class
// selector instead of naming the tag it belongs to
const buildRule = (tags: Set<string>): string => `${Array.from(tags, (tag) => CSS.escape(tag)).join(',')}{display:contents}`;

/**
 * Whether `node` is a document — across realms.
 *
 * `instanceof Document` reads the constructor of the realm this module was loaded in, so an
 * element adopted into a document from another realm — an iframe, most of all — would fall
 * through it and quietly get no rule at all. The node type is the same number everywhere.
 */
const isDocument = (node: Node): node is Document => node.nodeType === 9;

/** Whether `node` is a shadow root, by the same reasoning — a document fragment carrying a host. */
const isShadowRoot = (node: Node): node is ShadowRoot => node.nodeType === 11 && (node as ShadowRoot).host != null;

/**
 * Makes sure `root` carries a `display: contents` rule for `tagName`, and does so once per root.
 *
 * The elements of this library carry no box of their own: they wire DOM structure into entities
 * and must leave the layout of whatever sits inside them untouched. That is a styling statement,
 * and a stylesheet rule is where it belongs — an element constructor cannot make it, because the
 * Custom Elements specification forbids a constructor from giving its element attributes, and an
 * inline style is written as the `style` attribute. A constructor that writes one makes the
 * browser abort the upgrade and hand back an `HTMLUnknownElement`.
 *
 * The rule is keyed by the tag name the element actually connects under, not by a fixed list:
 * a subclass registered under a tag of its own — the extension point the guides describe — lays
 * out no box either, and is covered the moment one of its instances connects. A tag that joins
 * later widens the selector of the rule already there instead of adding a second one, so the
 * position of the rule in the cascade never moves.
 *
 * The rule goes to the root the element stands in, not to `document`: style rules do not cross a
 * shadow boundary, so an element inside a shadow root needs the rule inside that root.
 *
 * It is prepended rather than appended. Its specificity is 0-0-1, so a rule of the consumer's with
 * the same specificity decides by order — coming later, it wins, and nobody needs `!important` to
 * override the default.
 */
export const ensureDisplayContentsRule = (root: Node, tagName: string): void => {
  let mountPoint: ParentNode;
  let doc: Document;
  let key: Document | ShadowRoot;

  if (isDocument(root)) {
    // `head` is typed non-null but a document can be built without one — an XML document, or a
    // `createDocument()` — so the rule falls back to whatever parent the document offers
    mountPoint = root.head ?? root.documentElement ?? root;
    doc = root;
    key = root;
  } else if (isShadowRoot(root)) {
    mountPoint = root;
    doc = root.ownerDocument;
    key = root;
  } else {
    // an element that has entered neither a document nor a shadow root is its own root: nothing
    // to style yet, and the next connect asks again
    return;
  }

  const state = RuleStatePerRoot.get(key);

  // a root that gets its content replaced wholesale — a shadow root re-filled through `innerHTML`,
  // most of all — takes the `<style>` the rule lives in down with the rest of the markup, so the
  // root can look known while the element carrying its rule is no longer in it. Rebuilding the
  // `<style>` here covers both a root seen for the first time and one whose rule element fell out.
  if (state?.style.isConnected) {
    if (state.tags.has(tagName)) return;
    state.tags.add(tagName);
    state.style.textContent = buildRule(state.tags);
    return;
  }

  const tags = state?.tags ?? new Set();
  tags.add(tagName);
  const style = doc.createElement('style');
  style.textContent = buildRule(tags);
  mountPoint.prepend(style);

  RuleStatePerRoot.set(key, {tags, style});
};