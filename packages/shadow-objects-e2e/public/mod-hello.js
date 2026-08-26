function foo({useProperty, createEffect, dispatchMessageToView}) {
  const xyz = useProperty('xyz');

  console.log('ShadowObject "foo" created: xyz=', xyz());

  createEffect(() => {
    const val = xyz();
    console.log('foo.xyz changed to', val);
    dispatchMessageToView('fooEcho', val);
  }, [xyz]);

  dispatchMessageToView('helloFromFoo', {xyz: xyz()});
}

export const shadowObjects = {
  define: {
    foo,
  },

  initialize(...args) {
    console.log('initialize shadowObjects from', import.meta.url, {args});
  },
};
