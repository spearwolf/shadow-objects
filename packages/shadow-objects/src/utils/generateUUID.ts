import {ConsoleLogger} from './ConsoleLogger.js';

// A uuid here names one Entity and nothing else: it is not a credential, it is not a
// capability, and it never leaves the process that made it. That is what makes the last of
// the three sources below tolerable at all, and why it is loud rather than forbidden.

const UUID_BYTE_COUNT = 16;

// Named after `crypto.randomUUID()`'s own return type instead of spelling out the template
// literal a second time: the two stay in lockstep by construction, not by copy-paste.
type UuidV4 = ReturnType<Crypto['randomUUID']>;

/**
 * Stamps the version and variant bits into 16 random bytes and writes them out in the
 * canonical 8-4-4-4-12 form. The bytes are written to in place, so the caller hands over an
 * array it does not keep.
 *
 * RFC 4122 §4.4: version 4 goes into the high nibble of byte 6, the variant `10xx` into the
 * two high bits of byte 8.
 */
const toUuidV4 = (bytes: Uint8Array): UuidV4 => {
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as UuidV4;
};

let mathRandomAnnounced = false;

const mathRandomBytes = (): Uint8Array => {
  if (!mathRandomAnnounced) {
    mathRandomAnnounced = true;
    // Once per realm, not once per uuid: an application that makes thousands of them would
    // bury its console, and what is reported is a property of the realm, not of the call.
    //
    // Through `error` and not `warn`: `logger.error` always prints, where `logger.warn` is
    // gated behind `isWarn`, which is off outside `localhost`. Which source a realm offers is
    // a property of the host the application is served from, so this line has to arrive there
    // -- a loopback host is the one place where it does not matter.
    new ConsoleLogger('generateUUID').error(
      'no Web Crypto API in this realm: entity uuids come from Math.random() and are not unguessable',
    );
  }

  const bytes = new Uint8Array(UUID_BYTE_COUNT);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (Math.random() * 256) | 0;
  }
  return bytes;
};

/**
 * A version-4 uuid in the canonical 8-4-4-4-12 form, from the best source this realm offers.
 *
 * Three of them, in order. `crypto.randomUUID()` is bound to a secure context and is out of
 * reach whenever the page is served over plain http -- a LAN address during development is
 * the usual way to meet that. `crypto.getRandomValues()` carries no such restriction and is
 * the same cryptographic generator, so the step down to it costs four lines of formatting and
 * nothing else. Only a realm with no Web Crypto API at all reaches `Math.random()`, and that
 * one says so on the console, once: the uuids stay unique enough to name an entity, and they
 * stop being unguessable.
 */
// No explicit return-type annotation here: emitDeclarationOnly then prints the inferred
// template-literal form of `UuidV4` rather than the alias name, so callers reading the
// emitted `.d.ts` see the exact shape `crypto.randomUUID()` guarantees, not a reference they
// would have to look up.
export const generateUUID = () => {
  const webCrypto = (globalThis as {crypto?: Crypto}).crypto;

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  if (typeof webCrypto?.getRandomValues === 'function') {
    return toUuidV4(webCrypto.getRandomValues(new Uint8Array(UUID_BYTE_COUNT)));
  }

  return toUuidV4(mathRandomBytes());
};
