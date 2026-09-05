import type {EntityFilter, EntityMatch} from '../../inspect/types.js';
import type {ModelContextToolLike} from '../ModelContextLike.js';
import {
  buildRequest,
  defineTool,
  inspectEnvs,
  NamespaceInputSchema,
  NoEnvironments,
  runTool,
  type ToolContext,
  ToolError,
  textResult,
} from '../toolSupport.js';

export interface FindEntitiesEntry {
  namespace: string;
  matches: EntityMatch[];
  /** How many matched before the limit. */
  total: number;
  error?: {name: string; message: string};
}

export const createFindEntitiesTool = (ctx: ToolContext): ModelContextToolLike =>
  defineTool(ctx, 'find-entities', {
    title: 'Find Entities',
    description:
      'Search the Entity Tree of one Shadow Environment, or of every one, so that the answer stays small: every Entity that meets all given criteria, as uuid, token and the token path from the root. At least one criterion. The search runs where the Kernel runs and ships the matches, not the tree.',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: NamespaceInputSchema,
        token: {type: 'string', description: 'The token of the Entity, exact.'},
        propName: {type: 'string', description: 'A property name the Entity carries.'},
        shadowObject: {type: 'string', description: 'The display name of a Shadow Object attached to the Entity.'},
        contextName: {type: 'string', description: 'A string Entity Context name the Entity uses or provides.'},
        limit: {
          type: 'integer',
          minimum: 1,
          description: 'How many matches to carry. Default 50; total counts every match regardless.',
        },
      },
      additionalProperties: false,
    },
    execute: runTool(async (input, signal) => {
      const filter: EntityFilter = {};
      const token = input.string('token');
      if (token !== undefined) filter.token = token;
      const propName = input.string('propName');
      if (propName !== undefined) filter.propName = propName;
      const shadowObject = input.string('shadowObject');
      if (shadowObject !== undefined) filter.shadowObject = shadowObject;
      const contextName = input.string('contextName');
      if (contextName !== undefined) filter.contextName = contextName;
      const limit = input.number('limit');
      if (limit !== undefined) filter.limit = limit;

      if (token === undefined && propName === undefined && shadowObject === undefined && contextName === undefined) {
        throw new ToolError('at least one of token, propName, shadowObject, contextName is required');
      }

      // the Kernel side ignores the walk limits under a filter; they cut the View half, which
      // this tool does not report, to the least the request allows
      const envs = await inspectEnvs(
        input.string('namespace'),
        buildRequest(ctx.limits, {filter, maxDepth: 0, maxNodes: 1, include: []}),
        signal,
        ctx,
      );

      const results = envs.map((s) => {
        const entry: FindEntitiesEntry = {
          namespace: s.namespace,
          matches: s.kernel?.search?.matches ?? [],
          total: s.kernel?.search?.total ?? 0,
        };
        if (s.error !== undefined) entry.error = s.error;
        return entry;
      });

      const summary = results
        .map((r) => {
          const carried = r.matches.length < r.total ? `, ${r.matches.length} carried` : '';
          const failed = r.error === undefined ? '' : ` (error: ${r.error.name}: ${r.error.message})`;
          return `${r.namespace}: ${r.total} match${r.total === 1 ? '' : 'es'}${carried}${failed}`;
        })
        .join('; ');
      return textResult(summary || NoEnvironments, {results});
    }),
  });
