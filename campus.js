import {
  ACESFilmicToneMapping, BoxGeometry, CanvasTexture, Color, CylinderGeometry, DirectionalLight,
  ExtrudeGeometry, Fog, Group, HemisphereLight, InstancedMesh, Matrix4, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, Scene, Shape,
  SphereGeometry, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';

function makeCampus() {
  const campus = new Group();
  const palette = {
    plaster: 0xeaddbb, trim: 0xcfb888, glass: 0x303a48, brass: 0xe2c978,
    stone: 0xbdb0a5, asphalt: 0x817771, grass: 0x60784e, soil: 0x35473a,
    ivy: 0x435e36, leaves: 0x69844a, flowers: 0x9f4f57,
  };
  const materials = Object.fromEntries(Object.entries(palette).map(([name, color]) =>
    [name, new MeshStandardMaterial({ color, roughness: .78 })]));
  const block = new BoxGeometry(1, 1, 1);
  const plant = new SphereGeometry(1, 8, 5);

  function put(geometry, material, size, position) {
    const mesh = new Mesh(geometry, material);
    mesh.scale.set(...size);
    mesh.position.set(...position);
    campus.add(mesh);
    return mesh;
  }

  const box = (material, size, position) => put(block, materials[material], size, position);
  const shrub = (material, size, position) => put(plant, materials[material], size, position);

  box('soil', [12, .46, 8.1], [0, -.26, 1.71]);
  box('grass', [11.86, .13, 7.94], [0, -.07, 1.71]);
  box('asphalt', [11.8, .045, 1.1], [0, .015, 2.78]);
  box('stone', [1.5, .055, 4.2], [0, .025, 3.39]);
  box('stone', [2.6, .1, .8], [0, .05, 2.03]);

  box('plaster', [10, 3.94, 2.9], [0, 1.97, -.6]);
  box('trim', [10.23, .17, 3.07], [0, 4, -.6]);
  box('plaster', [1.75, 3.78, 2.65], [4.39, 1.89, .2]);
  box('trim', [1.83, .15, 2.76], [4.39, 3.85, .2]);

  const windows = [];
  for (let floor = 0; floor < 5; floor++) {
    const y = .55 + floor * .715;
    box('trim', [10.02, .103, .1], [0, y + .39, .9]);
    for (let column = 0; column < 17; column++) {
      windows.push([-.12 + (column - 8) * .56, y, .861]);
    }
    for (let column = 0; column < 4; column++) {
      windows.push([3.77 + column * .405, y, 1.539]);
    }
    box('trim', [1.75, .08, .078], [4.39, y + .345, 1.56]);
  }
  const glass = new InstancedMesh(block, materials.glass, windows.length);
  for (const [index, [x, y, z]] of windows.entries()) {
    const transform = new Matrix4().makeScale(.33, .43, .045);
    transform.setPosition(x, y, z);
    glass.setMatrixAt(index, transform);
  }
  campus.add(glass);

  for (const x of [-.99, .99]) {
    box('ivy', [.79, 2.38, 1.16], [x, 1.19, 1.29]);
    for (let i = 0; i < 11; i++) {
      shrub(i % 2 ? 'ivy' : 'leaves', [.14, .2, .08],
        [x + Math.sin(i * 1.6) * .27, .23 + i * .18, 1.88]);
    }
  }
  box('glass', [1.09, 1.2, .08], [0, .62, 1.37]);
  box('trim', [1.12, .11, .8], [0, 1.38, 1.55]);
  const shape = new Shape();
  shape.moveTo(-1.45, 2.28);
  shape.lineTo(0, 2.94);
  shape.lineTo(1.45, 2.28);
  shape.lineTo(1.45, 2.14);
  shape.lineTo(0, 2.76);
  shape.lineTo(-1.45, 2.14);
  shape.closePath();
  put(new ExtrudeGeometry(shape, { depth: 1.43, bevelEnabled: false }), materials.trim,
    [1, 1, 1], [0, 0, .57]);

  const sign = document.createElement('canvas');
  sign.width = 768;
  sign.height = 82;
  const signContext = sign.getContext('2d');
  signContext.fillStyle = '#293348';
  signContext.fillRect(0, 0, sign.width, sign.height);
  signContext.fillStyle = '#fff1d3';
  signContext.font = '600 47px sans-serif';
  signContext.textAlign = 'center';
  signContext.textBaseline = 'middle';
  signContext.fillText('NMAM INSTITUTE OF TECHNOLOGY', 384, 41);
  const signTexture = new CanvasTexture(sign);
  signTexture.colorSpace = SRGBColorSpace;
  put(block, new MeshBasicMaterial({ map: signTexture }), [4.9, .42, .07], [0, 4.2, .84]);

  for (const side of [-1, 1]) {
    for (let index = 0; index < 7; index++) {
      const x = side * (1.2 + index * .62);
      shrub('ivy', [.39, .24, .26], [x, .19, 3.6]);
      shrub(index % 2 ? 'flowers' : 'grass', [.38, .13, .26], [x, .11, 4.38]);
    }
    for (const z of [.87, 2.14, 4.78]) {
      const x = side * (4.94 + .21 * Math.sin(z));
      box('trim', [.14, 1.15, .15], [x, .53, z]);
      shrub('ivy', [.46, .77, .49], [x, 1.32, z]);
      shrub('leaves', [.38, .54, .4], [x - side * .13, 1.65, z + .13]);
    }
  }
  const pole = new CylinderGeometry(.016, .02, 1, 8);
  const flags = [0xf2ddd0, 0x819fcb, 0xdfc671, 0xf1e8db, 0xac586e];
  for (let index = 0; index < flags.length; index++) {
    const x = (index - 2) * 1.08;
    const height = index === 2 ? 2.27 : 1.63;
    put(pole, materials.stone, [1, height, 1], [x, height / 2, 2.63]);
    put(block, new MeshStandardMaterial({ color: flags[index] }), [.28, .15, .035],
      [x + .12, height - .12, 2.63]).rotation.y = -.21;
  }
  return campus;
}

export function createCampus(canvas, viewport, reducedMotion) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x20182e, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new Scene();
  scene.fog = new Fog(new Color(0x30243c), 20, 39);
  scene.add(new HemisphereLight(0xeeeaff, 0x725743, 2.15));
  const sun = new DirectionalLight(0xffe1b7, 3.1);
  sun.position.set(-4, 9, 6);
  scene.add(sun);
  const backlight = new DirectionalLight(0xb8a0ef, 1.65);
  backlight.position.set(5, 3, -4);
  scene.add(backlight);
  scene.add(makeCampus());

  const camera = new OrthographicCamera(-7, 7, 4, -4, .1, 45);
  const target = new Vector3(0, 1.2, 1.2);
  const duration = 4600;
  let elapsed = reducedMotion ? duration : 0;
  let lastTime = 0;
  let running = 0;
  let visible = false;
  let contextAvailable = true;

  function draw() {
    const progress = elapsed / duration;
    const ease = progress * progress * (3 - 2 * progress);
    const azimuth = .77 - ease * .58;
    const length = 17;
    camera.position.set(Math.sin(azimuth) * length, 11.4 - ease * 3.2, Math.cos(azimuth) * length);
    target.y = 1.03 + ease * .38;
    camera.lookAt(target);
    camera.zoom = 1 + ease * .08;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  function tick(time) {
    running = 0;
    elapsed = Math.min(duration, elapsed + (lastTime ? Math.min(time - lastTime, 50) : 0));
    lastTime = time;
    draw();
    start();
  }

  function start() {
    if (!running && visible && contextAvailable && !document.hidden && elapsed < duration) running = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(running);
    running = 0;
    lastTime = 0;
  }

  function resize() {
    if (!contextAvailable) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    const halfHeight = Math.max(4.85, 9.1 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    renderer.setSize(width, height, false);
    draw();
  }

  new ResizeObserver(resize).observe(viewport);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  }, { threshold: .2 }).observe(viewport);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextAvailable = false;
    stop();
    viewport.classList.remove('has-campus');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextAvailable = true;
    resize();
    start();
    viewport.classList.add('has-campus');
  });

  resize();
  viewport.classList.add('has-campus');
  return {
    replay() {
      elapsed = 0;
      stop();
      start();
    },
    setReducedMotion(enabled) {
      if (enabled) {
        elapsed = duration;
        stop();
        if (contextAvailable) draw();
      }
    },
  };
}
