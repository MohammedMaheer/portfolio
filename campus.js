import {
  ACESFilmicToneMapping, CatmullRomCurve3, Color, DirectionalLight, Fog, HemisphereLight,
  MathUtils, PCFShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { buildCampus } from './campus-model.js';

const curve = (points) => new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
const flight = curve([
  [-11.9, 10.5, 18.0], [-8.1, 8.2, 15.8], [-3.9, 5.0, 13.0],
  [-.47, 2.45, 9.1], [.025, 1.53, 5.32], [.02, 1.25, 3.05], [.025, 1.18, 2.10],
]);
const gaze = curve([
  [.8, 1.9, 2], [.45, 2.04, 1.8], [.2, 2.32, 1.45],
  [.01, 2.34, 1.19], [.01, 1.85, 1.13], [.03, 1.18, .98], [.045, .91, .97],
]);

export function createCampus(canvas, viewport) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  const compact = matchMedia('(max-width: 800px)');
  const background = new Color(0x241930);
  renderer.setClearColor(background, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new Scene();
  scene.fog = new Fog(background, 17, 34);
  scene.add(new HemisphereLight(0xe2dbff, 0x655440, 1.56));
  const sun = new DirectionalLight(0xffd6ac, 2.48);
  sun.position.set(-7, 9.5, 9.2);
  sun.target.position.set(0, .45, 4.7);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: .5, far: 33 });
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.normalBias = .023;
  sun.shadow.bias = -.00016;
  scene.add(sun, sun.target);
  const rim = new DirectionalLight(0xa498ff, 1.7);
  rim.position.set(6, 4, -4);
  scene.add(rim, buildCampus());

  const camera = new PerspectiveCamera(46, 1, .045, 58);
  const target = new Vector3();
  let progress = 0;
  let contextAvailable = true;

  function draw() {
    if (!contextAvailable) return;
    const p = MathUtils.clamp(progress, 0, 1);
    flight.getPoint(p, camera.position);
    gaze.getPoint(p, target);
    camera.lookAt(target);
    const signApproach = MathUtils.smoothstep(p, .12, .6);
    const porticoEntry = MathUtils.smoothstep(p, .73, 1);
    camera.rotateZ(.024 * (1 - signApproach));
    camera.fov = (compact.matches ? 61 : 44) - 3 * signApproach + 25 * porticoEntry;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  function resize() {
    if (!contextAvailable) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact.matches ? 1.3 : 1.6));
    camera.aspect = width / height;
    renderer.setSize(width, height, false);
    draw();
  }

  new ResizeObserver(resize).observe(viewport);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextAvailable = false;
    viewport.classList.remove('has-campus');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextAvailable = true;
    renderer.shadowMap.needsUpdate = true;
    resize();
    viewport.classList.add('has-campus');
  });

  renderer.shadowMap.needsUpdate = true;
  resize();
  viewport.classList.add('has-campus');

  return {
    setProgress(value) {
      if (progress === value) return;
      progress = value;
      draw();
    },
  };
}
