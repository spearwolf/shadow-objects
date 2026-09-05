import type {EnvSnapshot, RegistrySnapshot} from '../../inspect/types.js';
import type {ModelContextToolLike} from '../ModelContextLike.js';
import {
  buildRequest,
  defineTool,
  inspectEnvs,
  NamespaceInputSchema,
  NoEnvironments,
  runTool,
  type ToolContext,
  textResult,
} from '../toolSupport.js';

export interface RegistryEntry {
  namespace: string;
  kind: EnvSnapshot['kind'];
  registry?: RegistrySnapshot;
  error?: {name: string; message: string};
}

export const createGetRegistryTool = (ctx: ToolContext): ModelContextToolLike =>
  defineTool(ctx, 'get-registry', {
    title: 'Get Registry',
    description:
      'The composition rules of one Shadow Environment, or of every one: which Shadow Objects each token defines, which tokens a token routes to, and which property routes exist. The answer to why a Shadow Object is, or is not, on an Entity.',
    inputSchema: {type: 'object', properties: {namespace: NamespaceInputSchema}, additionalProperties: false},
    execute: runTool(async (input, signal) => {
      const envs = await inspectEnvs(
        input.string('namespace'),
        buildRequest(ctx.limits, {maxDepth: 0, maxNodes: 1, include: ['registry']}),
        signal,
        ctx,
      );

      const registries = envs.map((s) => {
        const entry: RegistryEntry = {namespace: s.namespace, kind: s.kind};
        if (s.kernel?.registry !== undefined) entry.registry = s.kernel.registry;
        if (s.error !== undefined) entry.error = s.error;
        return entry;
      });

      const summary = registries
        .map((r) => {
          if (r.registry === undefined)
            return `${r.namespace}: no registry${r.error === undefined ? '' : ` (error: ${r.error.name}: ${r.error.message})`}`;
          const {tokens, routes, propRoutes, isDefault} = r.registry;
          return `${r.namespace}: ${Object.keys(tokens).length} tokens, ${Object.keys(routes).length} routes, ${Object.keys(propRoutes).length} property routes${isDefault ? ', the default registry' : ''}`;
        })
        .join('; ');
      return textResult(summary || NoEnvironments, {registries});
    }),
  });
