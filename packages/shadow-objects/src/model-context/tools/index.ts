import type {ModelContextToolLike} from '../ModelContextLike.js';
import type {ToolContext} from '../toolSupport.js';
import {createFindEntitiesTool} from './findEntities.js';
import {createGetEntityTool} from './getEntity.js';
import {createGetEntityTreeTool} from './getEntityTree.js';
import {createGetRegistryTool} from './getRegistry.js';
import {createListEnvsTool} from './listEnvs.js';

export type {FindEntitiesEntry} from './findEntities.js';
export type {EntityMatchEntry} from './getEntity.js';
export type {RegistryEntry} from './getRegistry.js';
export type {EnvSummary} from './listEnvs.js';

/** The five read-only tools, in the order they are registered. */
export const createTools = (ctx: ToolContext): ModelContextToolLike[] => [
  createListEnvsTool(ctx),
  createGetEntityTreeTool(ctx),
  createGetEntityTool(ctx),
  createFindEntitiesTool(ctx),
  createGetRegistryTool(ctx),
];
