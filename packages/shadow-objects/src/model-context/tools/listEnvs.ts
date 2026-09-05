import type {EnvSnapshot} from '../../inspect/types.js';
import type {ModelContextToolLike} from '../ModelContextLike.js';
import {
  buildRequest,
  defineTool,
  describeEnv,
  inspectEnvs,
  NoEnvironments,
  runTool,
  type ToolContext,
  textResult,
} from '../toolSupport.js';

/** An environment reduced to what a first call needs: identity, state, counts. No tree. */
export interface EnvSummary {
  namespace: string;
  isGlobalNamespace: boolean;
  kind: EnvSnapshot['kind'];
  state: EnvSnapshot['state'];
  view?: {takenAt: number; counts: {components: number; roots: number}};
  kernel?: {takenAt: number; thread: 'main' | 'worker'; counts: {entities: number; roots: number; shadowObjects: number}};
  error?: {name: string; message: string};
}

export const toEnvSummary = (s: EnvSnapshot): EnvSummary => {
  const summary: EnvSummary = {namespace: s.namespace, isGlobalNamespace: s.isGlobalNamespace, kind: s.kind, state: s.state};
  if (s.view !== undefined) summary.view = {takenAt: s.view.takenAt, counts: s.view.counts};
  if (s.kernel !== undefined) summary.kernel = {takenAt: s.kernel.takenAt, thread: s.kernel.thread, counts: s.kernel.counts};
  if (s.error !== undefined) summary.error = s.error;
  return summary;
};

export const createListEnvsTool = (ctx: ToolContext): ModelContextToolLike =>
  defineTool(ctx, 'list-envs', {
    title: 'List Shadow Environments',
    description:
      'Every Shadow Environment on the page: its namespace, kind (local, worker, custom, none), state, and the counts of View components and Kernel Entities. Carries no tree. The cheapest call and the one to make first; every other tool takes a namespace from this list.',
    inputSchema: {type: 'object', properties: {}, additionalProperties: false},
    execute: runTool(async (_input, signal) => {
      // the counts are computed over the whole kernel regardless of the walk, so the walk is cut to nothing
      const snapshots = await inspectEnvs(
        undefined,
        buildRequest(ctx.limits, {maxDepth: 0, maxNodes: 1, include: []}),
        signal,
        ctx,
      );
      const envs = snapshots.map(toEnvSummary);
      const summary =
        envs.length === 0
          ? NoEnvironments
          : `${envs.length} Shadow Environment${envs.length === 1 ? '' : 's'}: ${snapshots.map(describeEnv).join('; ')}`;
      return textResult(summary, {envs});
    }),
  });
