import {connect} from '@spearwolf/signalize';
import {attachSignal} from './attachSignal.js';

export function attachShadowEntity(target: any, element?: object) {
  attachSignal(target, 'viewComponent');
  attachSignal(target, 'shadowEntity', {
    effect: (el: any) => {
      const con = connect(el.viewComponent$, (target as any).viewComponent$);
      return () => {
        con.destroy();
      };
    },
  });

  target.syncShadowObjects = () => {
    target.shadowEntity?.syncShadowObjects();
  };

  target.sendEventToShadows = (...args: unknown[]) => {
    target.once('shadowEntity', (el: any) => el.sendEventToShadows(...args));
  };

  target.sendEventsToShadows = (...args: unknown[]) => {
    target.once('shadowEntity', (el: any) => el.sendEventsToShadows(...args));
  };

  if (element) {
    target.shadowEntity = element;
  }

  return target;
}
