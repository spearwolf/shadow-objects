import type {InspectRequest} from '../../inspect/types.js';
import type {ModelContextToolLike} from '../ModelContextLike.js';
import {
  buildRequest,
  defineTool,
  describeEnv,
  inspectEnvs,
  NamespaceInputSchema,
  NoEnvironments,
  readInclude,
  runTool,
  type ToolContext,
  textResult,
} from '../toolSupport.js';

export const createGetEntityTreeTool = (ctx: ToolContext): ModelContextToolLike =>
  defineTool(ctx, 'get-entity-tree', {
    title: 'Get Entity Tree',
    description:
      "The Entity Tree of one Shadow Environment, or of every one: per Entity its token, properties, Shadow Objects and Entity Contexts, next to the View's component tree of the same namespace. A cut walk carries truncation notes naming the uuids where it stopped; descend from there with rootUuid.",
    inputSchema: {
      type: 'object',
      properties: {
        namespace: NamespaceInputSchema,
        rootUuid: {type: 'string', description: 'Descend from this Entity instead of the roots.'},
        maxDepth: {type: 'integer', minimum: 0, description: 'Tree depth below each root that is walked. Default 4.'},
        maxNodes: {type: 'integer', minimum: 1, description: 'Total number of Entities across the walk. Default 250.'},
        include: {
          type: 'array',
          items: {type: 'string', enum: ['props', 'shadowObjects', 'contexts', 'registry']},
          description: 'What to carry per Entity. Default: all four.',
        },
        valueDepth: {
          type: 'integer',
          minimum: 0,
          description: 'How deep nested property and context values are followed. Default 3.',
        },
      },
      additionalProperties: false,
    },
    execute: runTool(async (input, signal) => {
      const own: InspectRequest = {};
      const rootUuid = input.string('rootUuid');
      if (rootUuid !== undefined) own.rootUuids = [rootUuid];
      const maxDepth = input.number('maxDepth');
      if (maxDepth !== undefined) own.maxDepth = maxDepth;
      const maxNodes = input.number('maxNodes');
      if (maxNodes !== undefined) own.maxNodes = maxNodes;
      const include = readInclude(input);
      if (include !== undefined) own.include = include;
      const valueDepth = input.number('valueDepth');
      if (valueDepth !== undefined) own.values = {maxDepth: valueDepth};

      const envs = await inspectEnvs(input.string('namespace'), buildRequest(ctx.limits, own), signal, ctx);

      const summary = envs
        .map((s) => {
          const cut = s.kernel?.truncation?.length ?? 0;
          return cut === 0 ? describeEnv(s) : `${describeEnv(s)}, ${cut} truncation note${cut === 1 ? '' : 's'}`;
        })
        .join('; ');
      return textResult(summary || NoEnvironments, {envs});
    }),
  });
