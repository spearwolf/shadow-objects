import {GlobalNS} from '../constants.js';
import type {EnvSnapshot, InspectInclude, InspectRequest} from '../inspect/types.js';
import type {NamespaceType} from '../types.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import type {ModelContextToolAnnotations, ModelContextToolLike, ModelContextToolResult} from './ModelContextLike.js';
import {type RedactPredicate, redactSnapshot} from './redactProps.js';

/** What every tool shares: the name prefix, the defaults of the exposure, and the redaction rule. */
export interface ToolContext {
  prefix: string;
  /** Defaults for every call; the call's own input wins field by field. */
  limits: Partial<InspectRequest>;
  redact: RedactPredicate | undefined;
}

/** Every tool declares both: nothing here writes, and every value may be what a user typed. */
export const ReadOnlyAnnotations: Readonly<ModelContextToolAnnotations> = Object.freeze({
  readOnlyHint: true,
  untrustedContentHint: true,
});

const namespaceName = (ns: NamespaceType): string => (typeof ns === 'symbol' ? (ns.description ?? '') : ns);

/** The global namespace as a tool names it: the description of its symbol, the same string `EnvSnapshot.namespace` carries. */
export const GlobalNamespaceName: string = namespaceName(GlobalNS);

/** The namespace a tool input names, as `ShadowEnv.get()` takes it. */
export const toNamespace = (name: string): NamespaceType => (name === GlobalNamespaceName ? GlobalNS : name);

export const NamespaceInputSchema = Object.freeze({
  type: 'string',
  description: `The namespace of one Shadow Environment, as the list-envs tool reports it; the global namespace is "${GlobalNamespaceName}". Without it, every environment answers.`,
});

/** A refusal the tool can phrase. `runTool()` turns it into an error result with the bare message. */
export class ToolError extends Error {
  override name = 'ToolError';
}

/**
 * A typed reader over whatever the platform handed to `execute`: anything but an object reads as
 * empty, a missing or `null` field is `undefined`, a field of the wrong type is a `ToolError`.
 */
export class ToolInput {
  readonly #raw: Record<string, unknown>;

  constructor(input: unknown) {
    this.#raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  }

  string(key: string): string | undefined {
    const val = this.#raw[key];
    if (val === undefined || val === null) return undefined;
    if (typeof val !== 'string') throw new ToolError(`"${key}" must be a string`);
    return val;
  }

  requiredString(key: string): string {
    const val = this.string(key);
    if (val === undefined || val === '') throw new ToolError(`"${key}" is required`);
    return val;
  }

  number(key: string): number | undefined {
    const val = this.#raw[key];
    if (val === undefined || val === null) return undefined;
    if (typeof val !== 'number' || Number.isNaN(val)) throw new ToolError(`"${key}" must be a number`);
    return val;
  }

  stringList(key: string): string[] | undefined {
    const val = this.#raw[key];
    if (val === undefined || val === null) return undefined;
    if (!Array.isArray(val) || !val.every((item) => typeof item === 'string')) {
      throw new ToolError(`"${key}" must be a list of strings`);
    }
    return val as string[];
  }
}

const Includes: readonly InspectInclude[] = ['props', 'shadowObjects', 'contexts', 'registry'];

export const readInclude = (input: ToolInput): InspectInclude[] | undefined => {
  const list = input.stringList('include');
  if (list === undefined) return undefined;
  for (const item of list) {
    if (!(Includes as readonly string[]).includes(item)) {
      throw new ToolError(`"include" knows only ${Includes.join(', ')}; got "${item}"`);
    }
  }
  return list as InspectInclude[];
};

export const textResult = (summary: string, structured: Record<string, unknown>): ModelContextToolResult => ({
  content: [{type: 'text', text: `${summary}\n\n${JSON.stringify(structured)}`}],
  structuredContent: structured,
});

export const errorResult = (message: string): ModelContextToolResult => ({
  content: [{type: 'text', text: message}],
  isError: true,
});

const describeFailure = (error: unknown): string => {
  if (error instanceof ToolError) return error.message;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
};

/**
 * Wraps a tool body. The input is read through `ToolInput`; a refused input and a failure inside
 * the environment come back as an error result, so the wording reaches the agent -- a platform
 * that sees a rejection reports a generic failure and drops the message. Only the caller's own
 * abort rejects.
 */
export const runTool =
  (body: (input: ToolInput, signal: AbortSignal | undefined) => Promise<ModelContextToolResult>) =>
  async (input: unknown, options?: {signal?: AbortSignal}): Promise<ModelContextToolResult> => {
    const signal = options?.signal;
    try {
      return await body(new ToolInput(input), signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      return errorResult(describeFailure(error));
    }
  };

/** The request of one call: the exposure's defaults under the call's own fields, `values` merged one level down. */
export const buildRequest = (limits: Partial<InspectRequest>, own: InspectRequest): InspectRequest => {
  const request: InspectRequest = {...limits, ...own};
  if (limits.values !== undefined || own.values !== undefined) request.values = {...limits.values, ...own.values};
  return request;
};

/**
 * The environments a call addresses -- one by namespace, or every one that holds a namespace --
 * each described by `ShadowEnv.inspect()` and redacted where the exposure asks for it. An
 * unknown namespace is a `ToolError`; an environment that cannot answer costs its own entry,
 * with the reason under `error`, exactly as `inspectAll()` reports it.
 */
export const inspectEnvs = async (
  namespace: string | undefined,
  request: InspectRequest,
  signal: AbortSignal | undefined,
  ctx: ToolContext,
): Promise<EnvSnapshot[]> => {
  let snapshots: EnvSnapshot[];
  if (namespace === undefined) {
    snapshots = await ShadowEnv.inspectAll(request, signal);
  } else {
    const env = ShadowEnv.get(toNamespace(namespace));
    if (env === undefined) throw new ToolError(`no Shadow Environment holds the namespace "${namespace}"`);
    snapshots = [await env.inspect(request, signal)];
  }
  if (ctx.redact !== undefined) {
    for (const snapshot of snapshots) redactSnapshot(snapshot, ctx.redact);
  }
  return snapshots;
};

/** One line per environment, for the text half of a result. */
export const describeEnv = (s: EnvSnapshot): string => {
  const parts = [s.kind, s.state.isReady ? 'ready' : 'not ready'];
  if (s.kernel !== undefined) parts.push(`${s.kernel.counts.entities} entities`);
  if (s.error !== undefined) parts.push(`error: ${s.error.name}: ${s.error.message}`);
  return `${s.namespace} (${parts.join(', ')})`;
};

export const NoEnvironments = 'no Shadow Environment holds a namespace';

export const defineTool = (
  ctx: ToolContext,
  name: string,
  tool: Omit<ModelContextToolLike, 'name' | 'annotations'>,
): ModelContextToolLike => ({
  name: `${ctx.prefix}${name}`,
  annotations: {...ReadOnlyAnnotations},
  ...tool,
});
