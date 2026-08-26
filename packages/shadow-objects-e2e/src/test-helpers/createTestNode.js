const getTestsContainer = () => {
  let container = document.getElementById('tests');
  if (container == null) {
    container = document.createElement('section');
    container.id = 'tests';
    document.body.append(container);
  }
  return container;
};

export function createTestNode(id, result, text) {
  const nameNode = document.createElement('span');
  nameNode.classList.add('test-name');
  nameNode.textContent = `${result === 'ok' ? '✅' : '❌'} ${id}`;

  nameNode.setAttribute('data-testid', id);
  nameNode.setAttribute('data-testresult', result);
  nameNode.setAttribute('data-testoutput', text);

  const outputNode = document.createElement('span');
  outputNode.classList.add('test-output');
  outputNode.textContent = text;

  getTestsContainer().append(nameNode, outputNode);
}
