import {connect} from '@spearwolf/signalize';
import {attachSignal} from '../shared/attachSignal.js';

export function attachShadowEntity(target, element) {
  attachSignal(target, 'viewComponent');
  attachSignal(target, 'shadowEntity', {
    effect: (el) => {
      const con = connect(el.viewComponent$, target.viewComponent$);
      return () => {
        con.destroy();
      };
    },
  });

  if (element) {
    target.shadowEntity = element;
  }

  return target;
}
