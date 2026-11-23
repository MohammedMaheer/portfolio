import {
  ACESFilmicToneMapping, BoxGeometry, CanvasTexture, Color, CylinderGeometry, DirectionalLight,
  EdgesGeometry, ExtrudeGeometry, Fog, GridHelper, Group, HemisphereLight, InstancedMesh, LineBasicMaterial, LineSegments, MathUtils, Matrix4, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Scene, Shape,
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
  const plant = new SphereGeometry(1, 12, 8);
  const outline = new EdgesGeometry(block);
  const edges = new LineBasicMaterial({ color: 0xc2a5ff, transparent: true, opacity: .63 });

  function put(geometry, material, size, position) {
    const mesh = new Mesh(geometry, material);
    mesh.scale.set(...size);
    mesh.position.set(...position);
    campus.add(mesh);
    return mesh;
  }

  function box(material, size, position) {
    const mesh = put(block, materials[material], size, position);
    if (size[0] >= 1 && size[1] >= .08) mesh.add(new LineSegments(outline, edges));
    return mesh;
  }
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
  sign.width = 1536;
  sign.height = 152;
  const signContext = sign.getContext('2d');
  signContext.fillStyle = '#293348';
  signContext.fillRect(0, 0, sign.width, sign.height);
  signContext.fillStyle = '#fff1d3';
  signContext.font = '700 80px Arial';
  signContext.textAlign = 'center';
  signContext.textBaseline = 'middle';
  signContext.fillText('N.M.A.M. INSTITUTE OF TECHNOLOGY', 768, 58);
  signContext.font = '700 39px Arial';
  signContext.fillText('NITTE', 768, 117);
  const signTexture = new CanvasTexture(sign);
  signTexture.colorSpace = SRGBColorSpace;
  put(block, new MeshBasicMaterial({ map: signTexture }), [5.38, .53, .095], [0, 4.26, .87]);

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
  return { campus, edges };
}

export function createCampus(canvas, viewport) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x131026, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.17;
  const scene = new Scene();
  scene.fog = new Fog(new Color(0x211a34), 19, 44);
  const ambient = new HemisphereLight(0xd6d5ff, 0x493854, 1.35);
  scene.add(ambient);
  const sun = new DirectionalLight(0xffd4a6, 2.74);
  sun.position.set(-5, 9, 5);
  scene.add(sun);
  const backlight = new DirectionalLight(0xb5a2ff, 2.8);
  backlight.position.set(5, 3, -4);
  scene.add(backlight);
  const { campus, edges } = makeCampus();
  scene.add(campus);

  const grid = new GridHelper(42, 42, 0x675291, 0x392d5a);
  grid.position.y = -.48;
  grid.material.transparent = true;
  grid.material.opacity = .38;
  scene.add(grid);

  const camera = new PerspectiveCamera(39, 1, .1, 62);
  const target = new Vector3(0, 1.5, 1.45);
  let progress = -1;
  let contextAvailable = true;

  function draw() {
    if (!contextAvailable) return;
    const p = MathUtils.smoothstep(progress, 0, .76);
    const wide = camera.aspect > 1.15;
    const azimuth = .83 - p * .75;
    const radius = (wide ? 19.8 : 23.9) - p * 6.9;
    camera.position.set(-Math.sin(azimuth) * radius, 13.4 - p * 9.45, Math.cos(azimuth) * radius);
    target.set(wide ? -1.18 : 0, 1.45 + p * .86, .96 + p * .9);
    camera.lookAt(target);
    sun.intensity = 1.48 + p * 2.14;
    ambient.intensity = 1.69 - .25 * p;
    edges.opacity = .63 - .5 * p;
    grid.material.opacity = .5 - .39 * p;
    renderer.render(scene, camera);
  }

  function resize() {
    if (!contextAvailable) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1 ? 58 : 39;
    camera.updateProjectionMatrix();
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
    resize();
    viewport.classList.add('has-campus');
  });

  progress = 0;
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
