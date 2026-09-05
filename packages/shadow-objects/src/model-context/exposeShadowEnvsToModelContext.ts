import type {InspectRequest} from '../inspect/types.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {findModelContext, type ModelContextLike, type ModelContextRegisterOptions} from './ModelContextLike.js';
import {type RedactRule, toRedactPredicate} from './redactProps.js';
import type {ToolContext} from './toolSupport.js';
import {createTools} from './tools/index.js';

export interface ExposeOptions {
  /** Where to register. Default: `document.modelContext`, then `navigator.modelContext`; neither means "not available". */
  modelContext?: ModelContextLike;
  /** Prefix for every tool name. Default `'shae-'`. */
  toolPrefix?: string;
  /** Aborting it unregisters every tool. */
  signal?: AbortSignal;
  /** Passed through to `registerTool()`. Default: not set, so the platform default applies. */
  exposedTo?: string[];
  /** Default limits for every tool call; a call's own input wins field by field. */
  limits?: Partial<InspectRequest>;
  /** Property names whose values are replaced by `{$type: 'redacted'}` in every answer, on the Kernel's and the View's side alike. Property values only. */
  redactProps?: RedactRule;
}

export interface ExposeHandle {
  /** `false` when no model context was found; then `tools` is empty and nothing was registered. */
  available: boolean;
  /** The registered tool names, with the prefix. */
  tools: string[];
  /** Unregisters every tool. Idempotent. The same as aborting `options.signal`. */
  dispose(): void;
}

export const DefaultToolPrefix = 'shae-';

/**
 * Registers the five read-only inspection tools on the platform's model context, so that an
 * agent can see every Shadow Environment on the page. Nothing is exposed without this call;
 * every value in every answer is application state, and the docs say what that means before
 * they show the first line of code.
 *
 * Resolves, never rejects, where the platform has no model context -- the same application code
 * runs in every browser. Rejects with what `registerTool()` rejected with: a `NotAllowedError`
 * under a Permissions Policy that disables `tools`, an `InvalidStateError` on a name that is
 * already taken, are the caller's to handle. Registration is all-or-nothing: a rejection midway
 * takes back what was registered before it.
 */
export async function exposeShadowEnvsToModelContext(options: ExposeOptions = {}): Promise<ExposeHandle> {
  const logger = new ConsoleLogger('ModelContext');
  const modelContext = options.modelContext ?? findModelContext();

  if (modelContext === undefined) {
    logger.info('no model context on this platform, nothing registered');
    return {available: false, tools: [], dispose() {}};
  }

  // one controller for every tool: `dispose()` and the caller's signal both end here
  const controller = new AbortController();
  const {signal} = options;
  if (signal !== undefined) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', () => controller.abort(signal.reason), {once: true});
  }

  const ctx: ToolContext = {
    prefix: options.toolPrefix ?? DefaultToolPrefix,
    limits: options.limits ?? {},
    redact: toRedactPredicate(options.redactProps),
  };
  const registerOptions: ModelContextRegisterOptions = {signal: controller.signal};
  if (options.exposedTo !== undefined) registerOptions.exposedTo = options.exposedTo;

  const registered: string[] = [];
  try {
    for (const tool of createTools(ctx)) {
      if (controller.signal.aborted) break;
      await modelContext.registerTool(tool, registerOptions);
      registered.push(tool.name);
    }
  } catch (error) {
    // takes back what was registered before the one that failed
    controller.abort(error);
    logger.error('registering the tools failed', error);
    throw error;
  }

  const dispose = () => controller.abort();

  // aborted while registering: the platform has already taken the tools back
  if (controller.signal.aborted) return {available: true, tools: [], dispose};

  logger.info(`registered ${registered.length} tools`, registered);
  return {available: true, tools: registered, dispose};
}
