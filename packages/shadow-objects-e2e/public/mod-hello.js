function foo({useProperty, dispatchMessageToView}) {
  const xyz = useProperty('xyz');

  console.log('ShadowObject "foo" created: xyz=', xyz());

  xyz((val) => {
    console.log('foo.xyz changed to', val);
    dispatchMessageToView('fooEcho', xyz());
  });

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
