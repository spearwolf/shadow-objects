import type {InspectRequest} from '../inspect/types.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {findModelContext, type ModelContextLike} from './ModelContextLike.js';
import type {RedactRule} from './redactProps.js';
import {joinSharedExposure} from './sharedExposure.js';
import type {NamespaceRule} from './toolSupport.js';

export interface ExposeOptions {
  /** Where to register. Default: `document.modelContext`, then `navigator.modelContext`; neither means "not available". */
  modelContext?: ModelContextLike;
  /** Prefix for every tool name. Default `'shae-'`. Together with `modelContext` it names the registration this call shares. */
  toolPrefix?: string;
  /** Aborting it takes this call's share back; the tools leave with the last share. */
  signal?: AbortSignal;
  /** Passed through to `registerTool()` by the call that opens the registration. Default: not set, so the platform default applies. */
  exposedTo?: string[];
  /** Default limits for every tool call, set by the call that opens the registration; a call's own input wins field by field. */
  limits?: Partial<InspectRequest>;
  /** Property names whose values are replaced by `{$type: 'redacted'}` in every answer, on the Kernel's and the View's side alike. Property values only. Cumulates with every other share of the registration. */
  redactProps?: RedactRule;
  /** Which environments this share exposes: a list of namespaces or a predicate over the namespace an environment is registered under. Default: every environment that holds a namespace. The registration exposes the union over its shares; a namespace outside it is refused like an unknown one. */
  namespaces?: NamespaceRule;
}

export interface ExposeHandle {
  /** `false` when no model context was found; then `tools` is empty and nothing was registered. */
  available: boolean;
  /** The tool names of the shared registration, with the prefix. */
  tools: string[];
  /** Takes this call's share back; the tools leave with the last share. Idempotent. The same as aborting `options.signal`. */
  dispose(): void;
}

export const DefaultToolPrefix = 'shae-';

/**
 * Registers the five read-only inspection tools on the platform's model context, so that an
 * agent can see the Shadow Environments on the page. Nothing is exposed without this call or
 * the `expose-to-model-context` attribute of `<shae-worker>`, which goes through it; every value
 * in every answer is application state, and the docs say what that means before they show the
 * first line of code.
 *
 * One registration per model context and prefix, shared: every call and every element is a
 * share of it, the first opens it, the last to go closes it, and the tools answer from the union
 * of what the shares expose and redact. A second call under the same prefix therefore joins
 * rather than fails.
 *
 * Resolves, never rejects, where the platform has no model context -- the same application code
 * runs in every browser. Rejects with what `registerTool()` rejected with -- a `NotAllowedError`
 * under a Permissions Policy that disables `tools` -- and those are the caller's to handle.
 * Registration is all-or-nothing: a rejection midway takes back what was registered before it.
 */
export async function exposeShadowEnvsToModelContext(options: ExposeOptions = {}): Promise<ExposeHandle> {
  const modelContext = options.modelContext ?? findModelContext();

  if (modelContext === undefined) {
    new ConsoleLogger('ModelContext').info('no model context on this platform, nothing registered');
    return {available: false, tools: [], dispose() {}};
  }

  const {signal} = options;
  if (signal?.aborted) return {available: true, tools: [], dispose() {}};

  const settings = {limits: options.limits ?? {}, ...(options.exposedTo !== undefined ? {exposedTo: options.exposedTo} : {})};
  const membership = joinSharedExposure(
    modelContext,
    options.toolPrefix ?? DefaultToolPrefix,
    {namespaces: options.namespaces, redactProps: options.redactProps},
    settings,
  );

  const dispose = () => {
    membership.leave();
    signal?.removeEventListener('abort', dispose);
  };
  signal?.addEventListener('abort', dispose, {once: true});

  try {
    const tools = await membership.tools;
    return {available: true, tools, dispose};
  } catch (error) {
    dispose();
    throw error;
  }
}
