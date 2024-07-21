import {ComponentContext} from '@spearwolf/shadow-ents';

export function render(html) {
  document.body.style.backgroundColor = '#212123';

  document.querySelector('main')?.remove();

  ComponentContext.get().clear();

  const main = document.createElement('main');
  main.innerHTML = html;
  document.body.append(main);
}
