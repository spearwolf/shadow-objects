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

  document.getElementById('tests').append(nameNode, outputNode);
}
