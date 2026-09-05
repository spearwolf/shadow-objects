/**
 * What this package needs from the platform's model context, named structurally so that the
 * rest of the code never sees `document.modelContext`. WebMCP is a moving specification: the
 * registration method changed name and semantics within six months of this file being written.
 * When it moves again, this file and `findModelContext()` are where the change lands.
 */

/**
 * The envelope every tool of this package returns. `content` is the compatibility floor every
 * agent reads; `structuredContent` is the same data for an agent that reads structured results.
 * `isError` marks a refusal the tool could phrase -- an unknown namespace, a missing criterion --
 * so that the wording reaches the agent instead of being flattened into a generic failure.
 */
export interface ModelContextToolResult {
  content: {type: 'text'; text: string}[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface ModelContextToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  consequentialHint?: boolean;
}

export interface ModelContextToolLike {
  name: string;
  title?: string;
  description: string;
  /** A JSON Schema object. */
  inputSchema: object;
  annotations?: ModelContextToolAnnotations;
  /** `input` is whatever the platform parsed -- an object for the tools here, but nothing forces that. */
  execute(input: unknown, options?: {signal?: AbortSignal}): Promise<unknown> | unknown;
}

export interface ModelContextRegisterOptions {
  /** Aborting it takes the tool back. */
  signal?: AbortSignal;
  /** Passed through as the platform defines it; absent means the platform default. */
  exposedTo?: string[];
}

export interface ModelContextLike {
  /**
   * `unknown` rather than a promise on purpose: an early Chrome preview returned nothing, the
   * specification returns a promise, and the caller awaits whatever it gets.
   */
  registerTool(tool: ModelContextToolLike, options?: ModelContextRegisterOptions): Promise<unknown> | unknown;
}

export const isModelContextLike = (value: unknown): value is ModelContextLike =>
  typeof value === 'object' && value !== null && typeof (value as {registerTool?: unknown}).registerTool === 'function';

/**
 * The platform's model context, or `undefined` where there is none: a worker, Node, a browser
 * without WebMCP, an insecure context. `document.modelContext` is the current name and is read
 * first; `navigator.modelContext` is the older one, and reading it where the document carries
 * the object logs a deprecation warning in Chromium, so it is touched only as the fallback.
 */
export function findModelContext(): ModelContextLike | undefined {
  const doc = (globalThis as {document?: {modelContext?: unknown}}).document;
  const fromDocument = doc?.modelContext;
  if (isModelContextLike(fromDocument)) return fromDocument;
  const nav = (globalThis as {navigator?: {modelContext?: unknown}}).navigator;
  const fromNavigator = nav?.modelContext;
  if (isModelContextLike(fromNavigator)) return fromNavigator;
  return undefined;
}
