import {BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene} from 'three';

export function CubeScene({useContext}) {
  const scene = new Scene();

  const box = new Mesh(new BoxGeometry(), new MeshBasicMaterial({color: 0x00ff00}));
  scene.add(box);

  const getRenderView = useContext('three.renderView');

  getRenderView((view) => {
    view.scene = scene;

    view.camera = new PerspectiveCamera(70, view.width / view.height, 0.1, 100);
    view.camera.position.z = 2;

    console.log('CubeScene renderView initialize', view);
  });

  return {
    onRenderFrame() {
      const view = getRenderView();
      if (view == null) return;

      view.camera.aspect = view.width / view.height;
      view.camera.updateProjectionMatrix();

      box.rotation.x += 0.005;
      box.rotation.y += 0.01;
    },
  };
}
