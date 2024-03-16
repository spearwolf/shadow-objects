/* eslint-disable @typescript-eslint/no-unused-vars */

import {actions} from './state-machine.override.js';

// https://stately.ai/registry/editor/7c13ed70-5aa0-4b15-8b82-a5919fd6563d?mode=design&machineId=0f2eeab0-7e63-426d-aebf-796d139012e9
//
// How to apply:
// =============
// - export the generated state-machine source code (javascript, xstate v5, import) from the stately.ai editor
// - copy the source code into this file after this comment
// - override the actions from the stately.ai editor with the actions from the state-machine.override.js file
//---------------------------------------------------------------------------------------------------------------

import {assign, createMachine} from 'xstate';

export const machine = createMachine(
  {
    context: {
      src: '',
      connected: false,
    },
    id: 'vfx-ctx',
    initial: 'new',
    states: {
      new: {
        entry: {
          type: 'initialize',
        },
        on: {
          initialized: [
            {
              target: 'loading',
              guard: 'srcDefined',
            },
            {
              target: 'constructed',
            },
          ],
        },
      },
      loading: {
        entry: [
          {
            type: 'setSrc',
          },
          {
            type: 'loadWorker',
          },
        ],
        on: {
          workerLoaded: [
            {
              target: 'workerInitializing',
              guard: 'connected',
            },
            {
              target: 'workerPreloaded',
            },
          ],
          workerFailed: [
            {
              target: 'idle',
              guard: 'connected',
            },
            {
              target: 'constructed',
            },
          ],
          srcChanged: [
            {
              target: 'loading',
              guard: 'srcDefined',
              reenter: true,
            },
            {
              target: 'constructed',
            },
          ],
        },
      },
      constructed: {
        entry: {
          type: 'setSrc',
          params: {
            src: '',
          },
        },
        on: {
          srcChanged: [
            {
              target: 'loading',
              guard: 'srcDefined',
            },
            {
              target: 'constructed',
            },
          ],
          connectedCallback: {
            target: 'idle',
            actions: {
              type: 'setConnectedState',
              params: {
                connected: true,
              },
            },
          },
        },
      },
      workerInitializing: {
        entry: {
          type: 'initializeWorker',
        },
        on: {
          workerReady: [
            {
              target: 'active',
              guard: 'connected',
            },
            {
              target: 'workerInitialized',
            },
          ],
          workerFailed: [
            {
              target: 'idle',
              guard: 'connected',
            },
            {
              target: 'constructed',
            },
          ],
          disconnectedCallback: {
            target: 'workerInitialized',
            actions: {
              type: 'setConnectedState',
              params: {
                connected: false,
              },
            },
          },
          srcChanged: [
            {
              target: 'loading',
              guard: 'srcDefined',
              actions: {
                type: 'destroyWorker',
              },
            },
            {
              target: 'idle',
              actions: {
                type: 'destroyWorker',
              },
            },
          ],
        },
      },
      workerPreloaded: {
        on: {
          srcChanged: [
            {
              target: 'loading',
              guard: 'srcDefined',
              actions: {
                type: 'destroyWorker',
              },
            },
            {
              target: 'constructed',
              actions: {
                type: 'destroyWorker',
              },
            },
          ],
          connectedCallback: {
            target: 'workerInitializing',
            actions: {
              type: 'setConnectedState',
              params: {
                connected: true,
              },
            },
          },
        },
      },
      idle: {
        on: {
          srcChanged: [
            {
              target: 'loading',
              guard: 'srcDefined',
            },
            {
              target: 'idle',
            },
          ],
        },
      },
      active: {
        entry: {
          type: 'createShadowObjects',
        },
        on: {
          disconnectedCallback: {
            target: 'loading',
            actions: [
              {
                type: 'setConnectedState',
                params: {
                  connected: false,
                },
              },
              {
                type: 'destroyWorker',
              },
            ],
          },
        },
      },
      workerInitialized: {
        on: {
          connectedCallback: {
            target: 'active',
            actions: {
              type: 'setConnectedState',
              params: {
                connected: true,
              },
            },
          },
          srcChanged: [
            {
              target: 'loading',
              guard: 'srcDefined',
              actions: [
                {
                  type: 'destroyWorker',
                },
                {
                  type: 'setSrc',
                },
              ],
            },
            {
              target: 'constructed',
              actions: {
                type: 'destroyWorker',
              },
            },
          ],
        },
      },
    },
    on: {
      updateConnectedState: {
        actions: {
          type: 'setConnectedState',
        },
      },
      updateSrc: {
        actions: {
          type: 'setSrc',
        },
      },
    },
  },
  {
    actions: {
      initialize: ({context, event}) => {},
      loadWorker: ({context, event}) => {},
      destroyWorker: ({context, event}) => {},
      initializeWorker: ({context, event}) => {},
      createShadowObjects: ({context, event}) => {},
      setConnectedState: assign({
        connected: ({event}, params) => Boolean(params?.connected ?? event.connected),
      }),
      setSrc: assign({
        src: ({context, event}, params) => params?.src ?? event.src ?? context.src ?? '',
      }),
      ...actions,
    },
    actors: {},
    guards: {
      connected: function ({context}) {
        return context.connected;
      },
      srcDefined: function ({event}) {
        return Boolean(event.src);
      },
    },
    delays: {},
  },
);
