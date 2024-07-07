function foo({entity, useProperty}) {
  const xyz = useProperty('xyz');

  console.log('ShadowObject "foo" created: xyz=', xyz());

  xyz((val) => {
    console.log('foo.xyz changed to', val);
    entity.dispatchMessageToView('fooEcho', xyz());
  });

  entity.dispatchMessageToView('helloFromFoo', {xyz: xyz()});
}

export const shadowObjects = {
  define: {
    foo,
  },

  initialize(...args) {
    console.log('initialize shadowObjects from', import.meta.url, {args});
  },
};
