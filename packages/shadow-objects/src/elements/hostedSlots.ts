import {ComponentContext} from '../view/ComponentContext.js';
import type {ShaeEntElement} from './ShaeEntElement.js';

/**
 * The entity that answers for a `<slot>`, written on either of the two occasions an entity comes
 * to answer for one: the slot reports an assignment and the closest entity above it takes it up,
 * or an entity enters the tree and takes up the slots below it. The reporting writer takes the
 * slot as it finds it: `slotchange` announces every change of an assignment, one that has just
 * become empty included, so an entry can name a slot that projects nothing at this moment. What
 * no entry ever names is a slot that has not reported at all — and the entering writer holds that
 * line by skipping a slot with an empty assignment, because a name put on such a slot would let
 * its first report, under whatever entity it sits below by then, read as a change of hands.
 *
 * `slotchange` fires after the move and therefore at the new location; the place the slot came
 * from cannot be read from there any more — this register is the only place where it still has a
 * name. A `WeakMap` so a slot that is gone holds nothing, and a `WeakRef` as its value so a slot
 * that stays does not hold the entity it left: a slot can outlive its entity, and an entry read
 * back as empty is one more way of saying "not the entity asking now", which is the only thing
 * the register is ever asked.
 *
 * An entry of `null` names no entity and is still an entry: it says that the entity which answered
 * for this slot has let go of it. That is a different statement from `undefined`, which is a slot
 * nobody has ever reported.
 */
const entHostOfSlot = new WeakMap<Element, WeakRef<ShaeEntElement> | null>();

/** The `slotchange` events whose re-request round has already run. */
const reRequestedForSlotChange = new WeakSet<Event>();

/**
 * Everything the slot projects hangs on the entity above the slot, and the slot just took a
 * different one. There is no named counterpart to inform: the projected nodes can sit in any
 * namespace, below any entity, and the entities involved are not reachable from here. So the
 * request goes to every candidate there is, in every namespace: a property binds to the closest
 * entity above it whatever namespace that entity carries, and an entity from another namespace can
 * be projected through the same slot.
 *
 * Both sides of a move see the same event — the entity losing the slot as a listener on the slot
 * itself, the one gaining it while the event bubbles — and the round either of them would start is
 * the same round over the whole document. Whoever gets here first runs it.
 */
const askEveryoneToReRequest = (event: Event): void => {
  if (reRequestedForSlotChange.has(event)) return;
  reRequestedForSlotChange.add(event);
  for (const context of ComponentContext.getContextsMap().values()) {
    context.broadcastEvent(ComponentContext.ReRequestParent);
    context.broadcastEvent(ComponentContext.ReRequestEntHost);
  }
};

/**
 * The `<slot>`s one entity element answers for.
 *
 * The owner asks it to take up what it finds — {@link HostedSlots.collect} on the way into the
 * tree, {@link HostedSlots.takeUp} for a slot that reports — and to let go of everything at
 * once with {@link HostedSlots.releaseAll}. Everything beyond that it decides for itself.
 */
export class HostedSlots {
  readonly #owner: ShaeEntElement;

  // The `<slot>`s this element currently answers for. A listener on the slot itself is the only
  // thing that tells the side losing a slot about the loss: `slotchange` fires at the slot,
  // wherever it has landed, and the ascent from there is the one reading of "is this still mine"
  // that survives the move. `WeakRef` for the same reason as in the register — a slot that is gone
  // is held by nobody here.
  readonly #slots = new Set<WeakRef<Element>>();

  constructor(owner: ShaeEntElement) {
    this.#owner = owner;
  }

  // Whether this element is the closest entity above `slot`. The ascent goes over `parentElement`
  // and nothing else, and both callers stand on the same ground for it: `slotchange` bubbles along
  // the node tree of one shadow root, so the slot and every entity that can hear it sit in the same
  // tree, and a slot found by `querySelectorAll` never leaves the node tree it was searched in
  // either. The flattened parent is not the question here. Without the test every entity of the
  // chain would write the register and the outermost one would win — the answer a projected node
  // gets comes from the closest.
  #isClosestEntAbove(slot: Element): boolean {
    for (let current = slot.parentElement; current != null; current = current.parentElement) {
      if (current === this.#owner) return true;
      if ((current as ShaeEntElement).isShaeEntElement) return false;
    }
    return false;
  }

  #watch(slot: Element) {
    for (const ref of this.#slots) {
      const el = ref.deref();
      if (el === undefined) this.#slots.delete(ref);
      else if (el === slot) return;
    }
    this.#slots.add(new WeakRef(slot));
    slot.addEventListener('slotchange', this.#onSlotChange, {capture: false, passive: false});
  }

  #release(slot: Element) {
    slot.removeEventListener('slotchange', this.#onSlotChange, {capture: false});
    for (const ref of this.#slots) {
      const el = ref.deref();
      if (el === undefined || el === slot) this.#slots.delete(ref);
    }
  }

  // `currentTarget` rather than `target`: a `<slot>` can stand in the fallback content of another
  // slot, and what reports then is the inner one while the slot this listener hangs on is the one
  // in question. The early return on "still mine" hands the whole job — register and round alike —
  // to the bubbling listener, which would otherwise do it a second time. And the `null` entry: a
  // slot that comes back to this entity has changed hands twice, and the round has to run for the
  // second change as well.
  #onSlotChange = (event: Event) => {
    const slot = event.currentTarget as Element;
    if (this.#isClosestEntAbove(slot)) return;

    this.#release(slot);
    if (entHostOfSlot.get(slot)?.deref() === this.#owner) {
      entHostOfSlot.set(slot, null);
    }
    askEveryoneToReRequest(event);
  };

  /**
   * Take up the `<slot>`s below this element that project something.
   *
   * A slot is answered for from the moment it reports an assignment, and an entity leaving the
   * tree lets go of every slot it holds. Entering the tree is the counterpart: the entity takes
   * up the slots below it, because the assignment inside a shadow root does not change while
   * its host is out of the document — nothing reports on the way back in, so the entity has to
   * look for itself.
   *
   * Only inside a shadow root, and that test is exact rather than an optimization: a `<slot>`
   * in a node tree that is not a shadow tree has no assignment and never reports one, so there
   * is nothing below such an element to take up.
   */
  collect() {
    if (this.#owner.findShadowRootHost() == null) return;

    for (const slot of this.#owner.querySelectorAll('slot')) {
      if (slot.assignedNodes().length === 0) continue;
      if (!this.#isClosestEntAbove(slot)) continue;
      entHostOfSlot.set(slot, new WeakRef(this.#owner));
      this.#watch(slot);
    }
  }

  /**
   * Take up the slot a `slotchange` names, if this element is the closest entity above it.
   *
   * `event.target` is the slot that reports, which is what the bubbling channel at the element
   * carries — a different reading from the one {@link HostedSlots} makes of a `slotchange` on a
   * slot it listens to itself, where the slot in question is the one the listener hangs on.
   */
  takeUp(event: Event) {
    const slot = event.target as Element;
    if (this.#isClosestEntAbove(slot)) {
      const previous = entHostOfSlot.get(slot);
      entHostOfSlot.set(slot, new WeakRef(this.#owner));
      this.#watch(slot);
      // the gate in front of the round, and it is closed twice. What a slot reporting for the
      // first time projects is reached by the two calls that frame this block, so the first
      // registration writes the register and pays nothing beyond it. Afterwards a slot whose
      // entity above it is the same one as last time reports changed content, and content moves
      // no binding. What is left is the slot that arrived here from somewhere else — and an entry
      // naming nobody is such an arrival too: that slot stood under no entity in between
      if (previous !== undefined && previous?.deref() !== this.#owner) {
        askEveryoneToReRequest(event);
      }
    }
  }

  releaseAll() {
    for (const ref of this.#slots) {
      ref.deref()?.removeEventListener('slotchange', this.#onSlotChange, {capture: false});
    }
    this.#slots.clear();
  }
}
