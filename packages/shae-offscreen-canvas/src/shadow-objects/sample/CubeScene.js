import {createEffect} from '@spearwolf/signalize';
import {BoxGeometry, Mesh, MeshNormalMaterial, PerspectiveCamera, Scene} from 'three';
import {OnFrame, ThreeRenderViewContext} from '../../shared/constants.js';

export function CubeScene({useContext}) {
  const scene = new Scene();

  const box = new Mesh(new BoxGeometry(), new MeshNormalMaterial());
  scene.add(box);

  const getRenderView = useContext(ThreeRenderViewContext);

  const [, unsubscribe] = createEffect(() => {
    const view = getRenderView();

    if (view) {
      view.scene = scene;

      view.camera = new PerspectiveCamera(70, view.width / view.height, 0.1, 100);
      view.camera.position.z = 2;

      console.log('[CubeScene] setup renderView', view);
    }
  });

  return {
    [OnFrame]() {
      const view = getRenderView();
      if (view == null) return;

      view.camera.aspect = view.width / view.height;
      view.camera.updateProjectionMatrix();

      box.rotation.x += 0.005;
      box.rotation.y += 0.01;
    },

    onDestroy() {
      console.log('[CubeScene] destroy', this);
      unsubscribe();
    },
  };
}