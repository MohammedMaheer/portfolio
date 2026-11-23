import {
  ACESFilmicToneMapping, AmbientLight, BoxGeometry, CanvasTexture, CircleGeometry, Fog,
  Color, CylinderGeometry, DirectionalLight, ExtrudeGeometry, GridHelper, Group,
  HemisphereLight, Line, LineBasicMaterial, LineLoop, MathUtils, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, PlaneGeometry,
  Scene, Shape, SRGBColorSpace, Vector3, WebGLRenderer, BufferGeometry,
} from 'three';

const poses = {
  home: { base: -.22, shoulder: -.35, elbow: -1.19, wrist: -.53, grip: .16 },
  reach: { base: -.53, shoulder: -.88, elbow: -.52, wrist: -.08, grip: .1 },
  stow: { base: .15, shoulder: -.18, elbow: -2.47, wrist: .6, grip: .21 },
};

function buildRobot() {
  const orange = new MeshStandardMaterial({ color: 0xd95123, metalness: .28, roughness: .32 });
  const orangeLight = new MeshStandardMaterial({ color: 0xef763e, metalness: .18, roughness: .38 });
  const powder = new MeshStandardMaterial({ color: 0x352f2c, metalness: .38, roughness: .53 });
  const graphite = new MeshStandardMaterial({ color: 0x181c1e, metalness: .37, roughness: .42 });
  const alloy = new MeshStandardMaterial({ color: 0xc7bbb1, metalness: .72, roughness: .3 });
  const darkAlloy = new MeshStandardMaterial({ color: 0x68605b, metalness: .72, roughness: .31 });
  const lamp = new MeshBasicMaterial({ color: 0xffae6d });

  function box(parent, material, width, height, depth, x = 0, y = 0, z = 0) {
    const part = new Mesh(new BoxGeometry(width, height, depth), material);
    parent.add(part);
    part.position.set(x, y, z);
    return part;
  }

  function cylinder(parent, material, top, bottom, length, x, y, z, side = false, segments = 40) {
    const part = new Mesh(new CylinderGeometry(top, bottom, length, segments), material);
    parent.add(part);
    part.position.set(x, y, z);
    if (side) part.rotation.x = Math.PI / 2;
    return part;
  }

  function housing(parent, material, outline, depth, bevel) {
    const shape = new Shape();
    shape.moveTo(...outline[0]);
    for (const point of outline.slice(1)) shape.lineTo(...point);
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelThickness: bevel,
      bevelSize: bevel, bevelSegments: 2, steps: 1,
    });
    geometry.translate(0, 0, -depth / 2);
    const part = new Mesh(geometry, material);
    parent.add(part);
    return part;
  }

  function joint(parent, radius, width, outer = orange) {
    cylinder(parent, darkAlloy, radius + .045, radius + .045, width - .1, 0, 0, 0, true);
    for (const side of [-1, 1]) {
      const face = side * width / 2;
      cylinder(parent, outer, radius, radius, .11, 0, 0, face, true);
      cylinder(parent, powder, radius * .78, radius * .78, .041, 0, 0, face + side * .064, true);
      cylinder(parent, alloy, radius * .52, radius * .52, .039, 0, 0, face + side * .09, true);
      cylinder(parent, graphite, radius * .36, radius * .36, .039, 0, 0, face + side * .115, true);
      for (let index = 0; index < 6; index++) {
        const angle = index * Math.PI / 3;
        cylinder(parent, darkAlloy, .023, .023, .028, Math.cos(angle) * radius * .65,
          Math.sin(angle) * radius * .65, face + side * .09, true, 6);
      }
    }
  }

  function pivot(parent, y = 0) {
    const group = new Group();
    group.position.y = y;
    parent.add(group);
    return group;
  }

  const robot = new Group();
  housing(robot, graphite, [[-.81, .07], [.81, .07], [.81, .2], [-.81, .2]], 1.18, .055);
  box(robot, darkAlloy, 1.42, .055, 1.04, 0, .24);
  for (const x of [-.64, .64]) {
    for (const z of [-.45, .45]) cylinder(robot, alloy, .075, .075, .05, x, .28, z, false, 8);
  }
  cylinder(robot, powder, .60, .69, .20, 0, .34, 0);
  cylinder(robot, darkAlloy, .54, .54, .07, 0, .46, 0);
  cylinder(robot, graphite, .5, .54, .11, 0, .54, 0);
  for (let index = 0; index < 18; index++) {
    const angle = index * Math.PI / 9;
    const rib = box(robot, graphite, .035, .095, .06, Math.sin(angle) * .61, .35, Math.cos(angle) * .61);
    rib.rotation.y = angle;
  }

  const base = pivot(robot, .59);
  cylinder(base, orange, .43, .51, .18, 0, .1, 0);
  housing(base, orange, [[-.43, .16], [.43, .16], [.35, .54], [.22, .7], [-.25, .7], [-.39, .51]], .52, .045);
  box(base, powder, .44, .12, .018, 0, .23, .294);
  box(base, lamp, .085, .019, .022, -.12, .23, .31);
  box(base, darkAlloy, .13, .018, .022, .075, .23, .31);

  const shoulder = pivot(base, .54);
  const upper = 1.41;
  housing(shoulder, orange, [[-.25, .09], [.22, .11], [.24, .47], [.14, 1.14], [.16, 1.41],
    [-.19, 1.41], [-.25, 1.17], [-.28, .46]], .43, .047);
  for (const z of [-.266, .266]) {
    const plate = box(shoulder, orangeLight, .19, .74, .027, -.07, .76, z);
    plate.rotation.z = -.085;
    box(shoulder, powder, .075, .57, .033, .11, .8, z);
  }
  joint(shoulder, .31, .56);

  const elbow = pivot(shoulder, upper);
  const forearm = 1.16;
  housing(elbow, orange, [[-.28, .03], [.24, .05], [.21, .54], [.14, 1.16],
    [-.13, 1.16], [-.22, .82], [-.26, .4]], .35, .04);
  joint(elbow, .253, .48);
  for (const z of [-.224, .224]) {
    box(elbow, powder, .22, .45, .03, .016, .62, z);
    for (let line = 0; line < 4; line++) {
      box(elbow, darkAlloy, .13, .019, .034, .016, .48 + line * .083, z * 1.09);
    }
  }

  const wrist = pivot(elbow, forearm);
  joint(wrist, .147, .31, darkAlloy);
  cylinder(wrist, graphite, .14, .18, .2, 0, .17, 0);
  cylinder(wrist, alloy, .18, .18, .055, 0, .285, 0);
  box(wrist, graphite, .37, .13, .34, 0, .371);
  box(wrist, orangeLight, .15, .026, .022, 0, .37, .177);
  const jaws = [-1, 1].map((side) => {
    const jaw = pivot(wrist, .46);
    const inner = box(jaw, darkAlloy, .067, .24, .15, 0, .095);
    inner.rotation.z = side * .1;
    box(jaw, graphite, .11, .075, .145, -side * .025, .235);
    return jaw;
  });

  function move(pose) {
    base.rotation.y = pose.base;
    shoulder.rotation.z = pose.shoulder;
    elbow.rotation.z = pose.elbow;
    wrist.rotation.z = pose.wrist;
    jaws[0].position.x = -pose.grip;
    jaws[1].position.x = pose.grip;
  }

  return { robot, move };
}

function buildStage(scene) {
  const floor = new Mesh(new PlaneGeometry(42, 42), new MeshStandardMaterial({ color: 0x242626, roughness: .92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.041;
  scene.add(floor);

  const grid = new GridHelper(24, 48, 0x85654b, 0x5e5c52);
  grid.position.y = -.02;
  grid.material.transparent = true;
  grid.material.opacity = .42;
  scene.add(grid);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  const shade = context.createRadialGradient(64, 64, 15, 64, 64, 63);
  shade.addColorStop(0, 'rgba(0,0,0,.85)');
  shade.addColorStop(.5, 'rgba(0,0,0,.44)');
  shade.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = shade;
  context.fillRect(0, 0, 128, 128);
  const shadow = new Mesh(new PlaneGeometry(4.8, 3.55), new MeshBasicMaterial({
    map: new CanvasTexture(shadowCanvas), transparent: true, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(.39, -.011, -.35);
  scene.add(shadow);

  const pedestal = new Mesh(new CircleGeometry(1.15, 72), new MeshStandardMaterial({
    color: 0x353632, roughness: .82, metalness: .2,
  }));
  pedestal.rotation.x = -Math.PI / 2;
  scene.add(pedestal);

  for (const radius of [1.2, 1.53]) {
    const dots = Array.from({ length: 96 }, (_, index) => {
      const angle = index * Math.PI / 48;
      return new Vector3(Math.cos(angle) * radius, .002, Math.sin(angle) * radius);
    });
    scene.add(new LineLoop(new BufferGeometry().setFromPoints(dots),
      new LineBasicMaterial({ color: radius === 1.2 ? 0x7c6550 : 0x4f4b42 })));
  }
  for (let index = 0; index < 16; index++) {
    const angle = index * Math.PI / 8;
    const points = [1.6, index % 4 === 0 ? 1.81 : 1.69].map((radius) =>
      new Vector3(Math.cos(angle) * radius, .003, Math.sin(angle) * radius));
    scene.add(new Line(new BufferGeometry().setFromPoints(points), new LineBasicMaterial({ color: 0x8d644b })));
  }
}

export function createArm(canvas, viewport, reduceMotion, onPose) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power', alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x191b1b, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new Scene();
  scene.add(new HemisphereLight(0xffe6c9, 0x575e62, 1.9));
  scene.add(new AmbientLight(0xffffff, .23));
  const key = new DirectionalLight(0xffe1bd, 3.1);
  key.position.set(3.5, 7, 5);
  scene.add(key);
  const rim = new DirectionalLight(0xff8454, 1.8);
  rim.position.set(-3, 3, -5);
  scene.add(rim);
  const fill = new DirectionalLight(0xbad0e3, .95);
  fill.position.set(-4, 2, 3);
  scene.add(fill);
  buildStage(scene);
  scene.fog = new Fog(new Color(0x1e2020), 12, 22);

  const { robot, move } = buildRobot();
  scene.add(robot);
  const camera = new OrthographicCamera(-3, 3, 2.5, -2.5, .1, 32);
  const center = new Vector3(.53, 1.62, 0);
  let current = { ...poses.home };
  let target = poses.home;
  let autoRotate = !reduceMotion;
  const poseNames = Object.keys(poses);
  let poseIndex = 0;
  let playing = false;
  let poseTime = 0;
  let azimuth = .64;
  let elevation = .27;
  let orbitTime = 0;
  let drag = null;
  let frame = 0;
  let lastTime = 0;
  let visible = true;
  let contextReady = true;

  function size() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    const halfHeight = Math.max(2.08, 2.2 * height / width);
    const halfWidth = halfHeight * width / height;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function render() {
    const angle = azimuth + .23 * Math.sin(orbitTime);
    const radius = 10;
    camera.position.set(center.x + Math.sin(angle) * radius, center.y + Math.tan(elevation) * radius,
      center.z + Math.cos(angle) * radius);
    camera.lookAt(center);
    move(current);
    renderer.render(scene, camera);
  }

  function tick(time) {
    frame = 0;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
    lastTime = time;
    if (autoRotate && !drag) orbitTime += delta * .46;
    if (playing) {
      poseTime += delta;
      if (poseTime >= 2.35) selectPose(poseNames[(poseIndex + 1) % poseNames.length]);
    }
    let settling = false;
    for (const key of Object.keys(current)) {
      if (reduceMotion || Math.abs(current[key] - target[key]) < .001) {
        current[key] = target[key];
      } else {
        current[key] = MathUtils.damp(current[key], target[key], 7, delta);
        settling = true;
      }
    }
    render();
    if (autoRotate || playing || settling) schedule();
    else lastTime = 0;
  }

  function schedule() {
    if (!frame && visible && contextReady && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function selectPose(pose) {
    poseIndex = poseNames.indexOf(pose);
    target = poses[pose];
    poseTime = 0;
    onPose(pose);
    schedule();
  }

  function sleep() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  new ResizeObserver(() => {
    size();
    schedule();
  }).observe(viewport);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule();
    else sleep();
  }).observe(viewport);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sleep();
    else schedule();
  });

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextReady = false;
    sleep();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextReady = true;
    size();
    schedule();
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (drag?.id !== event.pointerId) return;
    azimuth -= (event.clientX - drag.x) * .008;
    elevation = MathUtils.clamp(elevation + (event.clientY - drag.y) * .006, .05, .64);
    drag.x = event.clientX;
    drag.y = event.clientY;
    schedule();
  });
  const orbitKeys = {
    ArrowLeft: [.12, 0], ArrowRight: [-.12, 0],
    ArrowUp: [0, .08], ArrowDown: [0, -.08],
  };
  canvas.addEventListener('keydown', (event) => {
    const direction = orbitKeys[event.key];
    if (!direction) return;
    event.preventDefault();
    azimuth += direction[0];
    elevation = MathUtils.clamp(elevation + direction[1], .05, .64);
    schedule();
  });
  const finishDrag = (event) => {
    if (drag?.id !== event.pointerId) return;
    drag = null;
    if (autoRotate) schedule();
  };
  canvas.addEventListener('pointerup', finishDrag);
  canvas.addEventListener('pointercancel', finishDrag);
  canvas.addEventListener('lostpointercapture', finishDrag);

  size();
  render();
  schedule();

  return {
    get rotating() { return autoRotate; },
    get playing() { return playing; },
    setRotation(enabled) {
      autoRotate = enabled;
      schedule();
    },
    setPose: selectPose,
    setSequence(enabled) {
      playing = enabled;
      if (enabled) selectPose(poseNames[(poseIndex + 1) % poseNames.length]);
    },
    setReducedMotion(enabled) {
      reduceMotion = enabled;
      if (enabled) {
        autoRotate = false;
        playing = false;
      }
      schedule();
    },
  };
}
