import {BaseEnv} from '@spearwolf/shadow-ents';

export const nextSyncEvent = (env) =>
  new Promise((resolve) => {
    env.once(BaseEnv.OnSync, resolve);
  });

export const nextChangeTrail = async (env) => {
  env.sync();
  return (await nextSyncEvent(env)).changeTrail;
};
