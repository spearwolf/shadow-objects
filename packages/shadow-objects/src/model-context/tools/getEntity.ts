import type {EntityNodeSnapshot, TruncationNote, ViewComponentSnapshot} from '../../inspect/types.js';
import type {ModelContextToolLike} from '../ModelContextLike.js';
import {
  buildRequest,
  defineTool,
  describeEnv,
  inspectEnvs,
  NamespaceInputSchema,
  runTool,
  type ToolContext,
  ToolError,
  textResult,
} from '../toolSupport.js';

/** One Entity in one environment, with the chain above it and the View's component of the same uuid. */
export interface EntityMatchEntry {
  namespace: string;
  entity: Omit<EntityNodeSnapshot, 'ancestors'>;
  ancestors: {uuid: string; token: string}[];
  view?: ViewComponentSnapshot;
  truncation?: TruncationNote[];
}

export const createGetEntityTool = (ctx: ToolContext): ModelContextToolLike =>
  defineTool(ctx, 'get-entity', {
    title: 'Get Entity',
    description:
      "One Entity in full -- token, properties, Shadow Objects, Entity Contexts, its children one level down -- with the chain of ancestors above it and the View's component of the same uuid next to it, which is where a divergence between View and Kernel becomes visible. Without a namespace every environment is asked; a uuid held in more than one comes back once per environment.",
    inputSchema: {
      type: 'object',
      properties: {
        uuid: {type: 'string', description: 'The uuid of the Entity, as the tree and the search report it.'},
        namespace: NamespaceInputSchema,
      },
      required: ['uuid'],
      additionalProperties: false,
    },
    execute: runTool(async (input, signal) => {
      const uuid = input.requiredString('uuid');
      // the depth is this tool's, not the exposure's: one level of children, and the chain above
      const envs = await inspectEnvs(
        input.string('namespace'),
        buildRequest(ctx.limits, {rootUuids: [uuid], maxDepth: 1}),
        signal,
        ctx,
      );

      const matches: EntityMatchEntry[] = [];
      for (const s of envs) {
        const node = s.kernel?.roots[0];
        if (node === undefined) continue;
        const {ancestors = [], ...entity} = node;
        const entry: EntityMatchEntry = {namespace: s.namespace, entity, ancestors};
        const view = s.view?.roots[0];
        if (view !== undefined) entry.view = view;
        if (s.kernel?.truncation !== undefined) entry.truncation = s.kernel.truncation;
        matches.push(entry);
      }

      if (matches.length === 0) {
        const failed = envs.filter((s) => s.error !== undefined).map(describeEnv);
        throw new ToolError(
          `no Shadow Environment holds an Entity "${uuid}"${failed.length > 0 ? ` (${failed.join('; ')})` : ''}`,
        );
      }

      const errors: {namespace: string; error: {name: string; message: string}}[] = [];
      for (const s of envs) {
        if (s.error !== undefined) errors.push({namespace: s.namespace, error: s.error});
      }

      let summary = matches
        .map((m) => {
          const where = m.ancestors.length === 0 ? 'a root' : `under ${m.ancestors.map((a) => a.token).join(' > ')}`;
          return `${m.namespace}: ${m.entity.token} "${m.entity.uuid}", ${where}, ${m.entity.childCount} children`;
        })
        .join('; ');
      if (errors.length > 0) {
        summary += `; failed: ${errors.map((e) => `${e.namespace} (${e.error.name}: ${e.error.message})`).join(', ')}`;
      }
      return textResult(summary, errors.length > 0 ? {matches, errors} : {matches});
    }),
  });
