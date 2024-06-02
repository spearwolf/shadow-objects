# ShadowEnv

![ShadowEnv](./ShadowEnv.drawio.svg)

The _ShadowEnv_ class connects the _view_ with the _shadow object environment_ and is responsible for synchronizing the states.

The _view_ consists of the [ComponentContext](./ComponentContext.md) and the [view components](./ViewComponent.md) contained within it.

The [shadow object environment](#shadow-object-environment) is the runtime environment for all _shadow objects_ and consists of the _MessageRouter_, the _Kernel_, and the _Registry_.

The [shadow object environment](#shadow-object-environment) can be in the same browser main thread "local" or alternatively a remote environment, e.g. in a separate web worker.

## API

### ShadowEnv

The _ShadowEnv_ class API is simple, consisting of a few properties, methods and events.


#### Properties

> **.view:** [ComponentContext](./ComponentContext.ts)

The [component context](./ComponentContext.md) with the [view components](./ViewComponent.md).

> **.envProxy:** [IShadowObjectEnvProxy](./IShadowObjectEnvProxy.ts)

A proxy that acts as a gateway between the _document main thread_ and the [shadow object environment](#shadow-object-environment).


#### Methods

> **.sync():** _Promise&lt;void&gt;_


#### Events

| type | description |
|-|-|
| `afterSync` | A _change trail_ has been transferred to the _shadow object environment_. |
| `contextCreated` | A new environment has been created. |
| `contextLost` | An existing environment has been destroyed. |


### Shadow Object Environment

Whether it is local or remote, a _shadow object environment_ always you to import user-defined scripts, configure the routing and apply the change trails.

<table>
<thead>
<tr>
<td><em><small>Domain</small></em></td>
<td><em><small>API</small></em></td>
<td><em><small>Description</small></em></td>
</tr>
</thead>

<tr>
<td>
<b>APPLY</b><br><small>change trail</small>
</td>
<td>

```ts
.applyChangeTrail(data): Promise<void>
```

</td>
<td>

Apply the _change trail_ in the _shadow object environment_. the _change trail_ is interpreted by the _Kernel_ and as a result the _shadow objects_ are created, updated or destroyed. based on the _routing_ rules.

</td>
</tr>

<tr>
<td>
<b>CONFIGURE</b><br><small>routing and import scripts</small>
</td>
<td>

```ts
.importScript(url): Promise<void>
```

</td>
<td>

Import a javascript module into the _shadow object environment_. the module can register _shadow objects_ components using the _token_ or define _routing_ rules for the _MessageRouter_.

</td>
</tr>

<tr>
<td>
<b>LIFECYCLE</b><br><small>of shadow objects</small>
</td>
<td>

```ts
.destroy()
```

</td>
<td>

Destroy the entire environment with all instances of shadow objects.
Reset the routing rules and forget about the modules that were imported.

</td>
</tr>

</table>
