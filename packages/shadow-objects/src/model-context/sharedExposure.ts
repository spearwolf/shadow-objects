import type {InspectRequest} from '../inspect/types.js';
import type {NamespaceType} from '../types.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import type {ModelContextLike, ModelContextRegisterOptions} from './ModelContextLike.js';
import {type RedactPredicate, type RedactRule, toRedactPredicate} from './redactProps.js';
import {type NamespaceRule, type ToolContext, toNamespacePredicate} from './toolSupport.js';
import {createTools} from './tools/index.js';

/** What one share of a registration brings: the environments it exposes and the properties it hides. */
export interface ExposureMember {
  /** `undefined` exposes every environment that holds a namespace. */
  namespaces: NamespaceRule | undefined;
  redactProps: RedactRule | undefined;
}

/** What the registration takes from the member that opens it, and from nobody after that. */
export interface ExposureSettings {
  limits: Partial<InspectRequest>;
  exposedTo?: string[];
}

export interface ExposureMembership {
  /**
   * The names the registration ended with -- empty when it was closed while it was still
   * registering. Rejects with what `registerTool()` rejected with; the registration is gone then.
   */
  readonly tools: Promise<string[]>;
  /** Takes this share back. The last share out closes the registration. Idempotent. */
  leave(): void;
}

interface Exposure {
  readonly members: Set<ExposureMember>;
  readonly controller: AbortController;
  readonly settings: ExposureSettings;
  tools: Promise<string[]>;
  closed: boolean;
}

/*
 * One registration per model context and prefix, per copy of the package: the tools carry
 * fixed names and the platform refuses a duplicate, so whoever wants them joins the one that
 * exists. Keyed weakly on the model context, so a fake built in a test goes when the test does.
 */
const registry = new WeakMap<ModelContextLike, Map<string, Exposure>>();

const logger = new ConsoleLogger('ModelContext');

/**
 * The namespaces a registration exposes right now: `undefined` -- every environment -- as soon
 * as one member has no rule, otherwise "any member's rule accepts it".
 */
const unionNamespaces = (members: Iterable<ExposureMember>): ((ns: NamespaceType) => boolean) | undefined => {
  const predicates: ((ns: NamespaceType) => boolean)[] = [];
  for (const member of members) {
    const predicate = toNamespacePredicate(member.namespaces);
    if (predicate === undefined) return undefined;
    predicates.push(predicate);
  }
  return (ns) => predicates.some((accepts) => accepts(ns));
};

/**
 * The redaction a registration applies right now: a value is hidden when any member's rule
 * says so. `undefined` while no member brings a rule, so the walk over the snapshot is skipped.
 */
const unionRedaction = (members: Iterable<ExposureMember>): RedactPredicate | undefined => {
  const predicates: RedactPredicate[] = [];
  for (const member of members) {
    const predicate = toRedactPredicate(member.redactProps);
    if (predicate !== undefined) predicates.push(predicate);
  }
  if (predicates.length === 0) return undefined;
  return (name, uuid) => predicates.some((hides) => hides(name, uuid));
};

/**
 * The registration loop, all-or-nothing: a rejection midway aborts the controller, which takes
 * back what was registered before it, and is rethrown for every member to see.
 */
const registerAll = async (modelContext: ModelContextLike, ctx: ToolContext, exposure: Exposure): Promise<string[]> => {
  const {controller, settings} = exposure;
  const registerOptions: ModelContextRegisterOptions = {signal: controller.signal};
  if (settings.exposedTo !== undefined) registerOptions.exposedTo = settings.exposedTo;

  const registered: string[] = [];
  try {
    for (const tool of createTools(ctx)) {
      if (controller.signal.aborted) break;
      await modelContext.registerTool(tool, registerOptions);
      registered.push(tool.name);
    }
  } catch (error) {
    controller.abort(error);
    logger.error('registering the tools failed', error);
    throw error;
  }

  // closed while registering: the platform has already taken the tools back
  if (controller.signal.aborted) return [];

  logger.info(`registered ${registered.length} tools`, registered);
  return registered;
};

const open = (modelContext: ModelContextLike, prefix: string, settings: ExposureSettings): Exposure => {
  const members = new Set<ExposureMember>();
  const exposure: Exposure = {
    members,
    controller: new AbortController(),
    settings,
    tools: Promise.resolve([]),
    closed: false,
  };
  // getters, not values: the tools read both at the start of every call (`inspectEnvs`), so a
  // member joining or leaving is seen by the next call and nothing has to be re-registered
  const ctx: ToolContext = {
    prefix,
    limits: settings.limits,
    get isExposed() {
      return unionNamespaces(members);
    },
    get redact() {
      return unionRedaction(members);
    },
  };
  exposure.tools = registerAll(modelContext, ctx, exposure);
  // a registration that failed is not kept: the next member to arrive first opens a new one
  exposure.tools.catch(() => close(modelContext, prefix, exposure));
  return exposure;
};

const close = (modelContext: ModelContextLike, prefix: string, exposure: Exposure): void => {
  if (exposure.closed) return;
  exposure.closed = true;
  exposure.controller.abort();
  const byPrefix = registry.get(modelContext);
  if (byPrefix?.get(prefix) === exposure) byPrefix.delete(prefix);
};

const sameSettings = (a: ExposureSettings, b: ExposureSettings): boolean =>
  JSON.stringify(a.limits) === JSON.stringify(b.limits) && JSON.stringify(a.exposedTo) === JSON.stringify(b.exposedTo);

/**
 * Joins the registration under `prefix` on `modelContext`, opening it when there is none. The
 * member's rules count from the next tool call on; `settings` count only for the member that
 * opens -- a later member with other values is reported and joins under the opener's, because
 * `exposedTo` has gone to the platform by then and one set of `limits` is all a tool has.
 */
export function joinSharedExposure(
  modelContext: ModelContextLike,
  prefix: string,
  member: ExposureMember,
  settings: ExposureSettings,
): ExposureMembership {
  let byPrefix = registry.get(modelContext);
  if (byPrefix === undefined) {
    byPrefix = new Map();
    registry.set(modelContext, byPrefix);
  }

  let exposure = byPrefix.get(prefix);
  if (exposure === undefined) {
    exposure = open(modelContext, prefix, settings);
    byPrefix.set(prefix, exposure);
  } else if (!sameSettings(exposure.settings, settings)) {
    logger.warn(
      `the tools under "${prefix}" are already registered with other limits or exposedTo; the values of the first call apply`,
      {inEffect: exposure.settings, ignored: settings},
    );
  }

  const joined = exposure;
  joined.members.add(member);
  let left = false;
  return {
    tools: joined.tools,
    leave() {
      if (left) return;
      left = true;
      joined.members.delete(member);
      if (joined.members.size === 0) close(modelContext, prefix, joined);
    },
  };
}
