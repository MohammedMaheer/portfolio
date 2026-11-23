import {
  BoxGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, InstancedMesh, Matrix4,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, Shape, SphereGeometry, SRGBColorSpace,
} from 'three';

function scatter(geometry, material, placements) {
  const mesh = new InstancedMesh(geometry, material, placements.length);
  for (const [index, { size, at, color }] of placements.entries()) {
    const matrix = new Matrix4().makeScale(...size);
    matrix.setPosition(...at);
    mesh.setMatrixAt(index, matrix);
    if (color) mesh.setColorAt(index, color);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function drawSurface(color, speckle, tile = false) {
  const surface = document.createElement('canvas');
  surface.width = surface.height = 256;
  const context = surface.getContext('2d');
  context.fillStyle = color;
  context.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 760; i++) {
    const x = (i * 127 + Math.floor(i / 13) * 21) % 256;
    const y = (i * 73 + Math.floor(i / 11) * 33) % 256;
    context.globalAlpha = .09 + (i % 14) * .011;
    context.fillStyle = i % 3 ? speckle : '#fff4ce';
    context.fillRect(x, y, i % 4 + 1, i % 3 + 1);
  }
  context.globalAlpha = 1;
  if (tile) {
    context.strokeStyle = '#6b62596e';
    context.lineWidth = 1;
    for (let step = 0; step <= 256; step += 64) {
      context.beginPath();
      context.moveTo(step, 0);
      context.lineTo(step, 256);
      context.moveTo(0, step);
      context.lineTo(256, step);
      context.stroke();
    }
  }
  const texture = new CanvasTexture(surface);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function collegeSign() {
  const plate = document.createElement('canvas');
  plate.width = 1536;
  plate.height = 156;
  const context = plate.getContext('2d');
  context.fillStyle = '#1b2a4b';
  context.fillRect(0, 0, plate.width, plate.height);
  context.strokeStyle = '#899bbc';
  context.lineWidth = 3;
  context.strokeRect(5, 5, plate.width - 10, plate.height - 10);
  context.fillStyle = '#fff3db';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '700 76px Arial';
  context.fillText('N.M.A.M. INSTITUTE OF TECHNOLOGY', 768, 57);
  context.font = '700 37px Arial';
  context.fillText('N I T T E', 768, 119);
  const texture = new CanvasTexture(plate);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function buildCampus() {
  const group = new Group();
  const boxGeometry = new BoxGeometry(1, 1, 1);
  const leaves = new SphereGeometry(1, 10, 6);
  const pole = new CylinderGeometry(.018, .022, 1, 7);
  const material = (color, options = {}) => new MeshStandardMaterial({ color, roughness: .76, ...options });
  const cream = material(0xffffff, { map: drawSurface('#e3d5b8', '#918164') });
  const ochre = material(0xc5a575);
  const roof = material(0xffffff, { map: drawSurface('#aba094', '#6b5a4f') });
  const frame = material(0x3b3942, { metalness: .31, roughness: .63 });
  const window = material(0xffffff, { metalness: .26, roughness: .29, emissive: 0x302414, emissiveIntensity: .31 });
  const entranceGlass = material(0x867991, {
    metalness: .16, roughness: .22, transparent: true, opacity: .28, depthWrite: false,
  });
  const ivy = material(0xffffff, { flatShading: true, roughness: .94 });
  const hedges = material(0xffffff, { flatShading: true, roughness: .88 });
  const lawn = material(0xffffff, { map: drawSurface('#4c6738', '#273b27') });
  const earth = material(0x374735);
  const path = material(0xffffff, { map: drawSurface('#a49d8f', '#605a59', true) });
  const road = material(0x645e62);
  const timber = material(0x4c443a);
  const steel = material(0xbabcb7, { metalness: .52, roughness: .4 });
  const lamp = new MeshBasicMaterial({ color: 0xffd4a7 });

  function mesh(geometry, surface, size, at) {
    const object = new Mesh(geometry, surface);
    object.scale.set(...size);
    object.position.set(...at);
    object.castShadow = true;
    object.receiveShadow = true;
    group.add(object);
    return object;
  }

  const box = (surface, size, at) => mesh(boxGeometry, surface, size, at);
  const glass = [];
  const mullions = [];
  const sills = [];
  function windows(z, x0, columns, step) {
    for (let row = 0; row < 5; row++) {
      const y = .68 + row * .73;
      for (let col = 0; col < columns; col++) {
        const x = x0 + col * step;
        if (row < 2 && Math.abs(x) < .9) continue;
        const lit = (row * 7 + col * 5) % 13 <= 1;
        glass.push({ size: [.395, .46, .075], at: [x, y, z], color: new Color(lit ? 0xd6a16d : 0x374659) });
        mullions.push({ size: [.021, .46, .084], at: [x, y, z + .016] });
        sills.push({ size: [.465, .045, .17], at: [x, y - .243, z + .04] });
      }
    }
  }

  // West block, the adjacent wing, and the deep centre portico visible from the approach.
  box(cream, [11.55, 2.45, 3.2], [0, 2.975, -.7]);
  for (const side of [-1, 1]) {
    box(cream, [4.89, 1.76, 3.2], [side * 3.33, .88, -.7]);
  }
  box(roof, [11.69, .17, 3.33], [0, 4.24, -.7]);
  box(ochre, [11.73, .15, .15], [0, 4.2, 1]);
  box(cream, [2.4, 4.02, 3.1], [5.63, 2.01, .17]);
  box(roof, [2.49, .14, 3.2], [5.63, 4.09, .17]);
  windows(.929, -5.38, 19, .59);
  windows(1.743, 4.61, 4, .59);
  const bands = [];
  const dividers = [];
  for (let floor = 0; floor < 5; floor++) {
    const y = .34 + floor * .73;
    if (floor >= 2) bands.push({ size: [11.58, .081, .16], at: [0, y, .966] });
    else {
      for (const side of [-1, 1]) bands.push({ size: [4.89, .081, .16], at: [side * 3.33, y, .966] });
    }
    bands.push({ size: [2.45, .081, .16], at: [5.63, y, 1.773] });
  }
  for (let column = 0; column < 20; column++) {
    const x = -5.67 + column * .59;
    const opening = Math.abs(x) < .9;
    dividers.push({ size: [.073, opening ? 2.22 : 3.79, .085], at: [x, opening ? 2.95 : 2.17, .97] });
  }
  group.add(scatter(boxGeometry, window, glass), scatter(boxGeometry, frame, mullions),
    scatter(boxGeometry, cream, sills), scatter(boxGeometry, ochre, [...bands, ...dividers]));
  const sign = box(new MeshBasicMaterial({ map: collegeSign() }), [5.85, .55, .12], [0, 4.58, .96]);
  sign.castShadow = false;

  box(cream, [3.31, .13, 1.94], [0, .12, 1.83]);
  for (let step = 0; step < 4; step++) {
    box(path, [2.78 - step * .05, .05 + step * .047, .29], [0, .025 + step * .023, 3.15 - step * .25]);
  }
  for (const side of [-1, 1]) {
    box(cream, [.73, 2.54, 1.62], [side * 1.22, 1.27, 1.51]);
    box(ochre, [.77, .12, 1.69], [side * 1.22, 2.53, 1.53]);
    box(cream, [.13, 2.49, .14], [side * .845, 1.32, 2.39]);
    box(frame, [.055, 1.23, .055], [side * .47, .84, .961]);
  }
  const gable = new Shape();
  gable.moveTo(-1.83, 2.5);
  gable.lineTo(0, 3.2);
  gable.lineTo(1.83, 2.5);
  gable.lineTo(1.51, 2.35);
  gable.lineTo(0, 2.99);
  gable.lineTo(-1.51, 2.35);
  gable.closePath();
  mesh(new ExtrudeGeometry(gable, { depth: 1.78, bevelEnabled: false }), roof, [1, 1, 1], [0, 0, .78]);
  box(cream, [1.8, .15, 1.57], [0, 1.78, 1.48]);
  box(path, [1.71, .051, 3.16], [0, .184, -.55]);
  box(cream, [1.75, 1.6, .13], [0, .92, -2.14]);
  box(timber, [1.15, 1.11, .06], [0, .78, -2.055]);
  box(entranceGlass, [1.48, 1.38, .028], [0, .89, 1.015]).castShadow = false;
  for (const x of [-.75, 0, .75]) box(frame, [.047, 1.36, .064], [x, .89, 1.04]);
  for (const y of [.199, 1.26, 1.58]) box(frame, [1.51, .05, .064], [0, y, 1.04]);
  for (const z of [.48, -.39, -1.24]) box(lamp, [.48, .017, .054], [0, 1.72, z]);
  for (const side of [-1, 1]) {
    box(lamp, [.055, .028, .11], [side * .33, 1.685, 1.85]);
    box(lamp, [.072, .12, .022], [side * .42, .8, 1.05]);
  }
  const entryLight = new PointLight(0xffbe79, 4.3, 5, 2);
  entryLight.position.set(0, 1.55, 1.94);
  const interiorLight = new PointLight(0xffd1a7, 7.1, 6, 2);
  interiorLight.position.set(0, 1.46, -.82);
  group.add(entryLight, interiorLight);

  // The garden and open forecourt continue beyond the first camera position.
  box(earth, [25, .28, 29], [0, -.21, 7.3]);
  box(lawn, [18.1, .13, 19.6], [0, -.045, 7.22]);
  box(road, [18.12, .028, 1.05], [0, .027, 4.49]);
  box(path, [2.05, .04, 11], [0, .047, 8.18]);
  box(path, [6.84, .036, 1.24], [0, .042, 3.7]);
  for (const side of [-1, 1]) {
    box(ochre, [.11, .062, 9.7], [side * 1.09, .07, 9.05]);
    box(path, [5.2, .036, .24], [side * 3.55, .05, 7.6]);
  }

  const ivyLeaves = [];
  const garden = [];
  const shades = [0x30492a, 0x526238, 0x607448, 0x394e32, 0x798556].map((value) => new Color(value));
  const blooms = [0x9b4b57, 0x773d50, 0xbb6263, 0xb88d61].map((value) => new Color(value));
  for (const side of [-1, 1]) {
    for (let i = 0; i < 200; i++) {
      const x = side * 1.22 + (((i * 31) % 101) / 100 - .5) * .76;
      const y = .17 + ((i * 49) % 97) / 96 * 2.25;
      const z = 2.33 + Math.sin(i * 8.3) * .055;
      ivyLeaves.push({ size: [.11, .08 + (i % 4) * .016, .075], at: [x, y, z], color: shades[i % 5] });
    }
    for (let i = 0; i < 20; i++) {
      const x = side * (1.35 + i * .275);
      garden.push({ size: [.22, .22, .25], at: [x, .22 + i % 3 * .01, 5.17], color: shades[i % 5] });
      garden.push({ size: [.18, .12, .2], at: [x, .145, 5.68], color: blooms[i % 4] });
    }
    for (let i = 0; i < 10; i++) {
      const z = 6.85 + i * .62;
      garden.push({ size: [.39, .25, .405], at: [side * 2.25, .234, z], color: shades[(i + 2) % 5] });
    }
    for (const [i, z] of [.78, 3.25, 7.55, 11.2, 14.3].entries()) {
      const x = side * (5.65 + i % 3 * .68);
      const height = 1.47 + i % 3 * .35;
      box(timber, [.16, height, .18], [x, height / 2, z]).rotation.z = side * .04;
      for (let crown = 0; crown < 4; crown++) {
        const spread = crown * 1.58;
        garden.push({ size: [.62, .65 + i % 2 * .14, .63],
          at: [x + Math.sin(spread) * .45, height + .24 + (crown % 2) * .47, z + Math.cos(spread) * .4],
          color: shades[(i + crown) % 5] });
      }
    }
    for (const z of [4.01, 7.08, 10.12]) {
      const x = side * 1.25;
      box(frame, [.04, .36, .04], [x, .27, z]);
      box(lamp, [.15, .048, .15], [x, .48, z]);
    }
  }
  group.add(scatter(leaves, ivy, ivyLeaves), scatter(leaves, hedges, garden));

  const flags = [0xe7dbce, 0x678eb8, 0xcd9d52, 0xd6cebe, 0x9b596e];
  for (const [index, x] of [-3.67, -2.8, -2.03, 2.77, 3.63].entries()) {
    const height = index === 2 ? 2.58 : 1.83;
    mesh(pole, steel, [1, height, 1], [x, height / 2, 3.67]);
    mesh(new PlaneGeometry(.31, .18, 1, 1), material(flags[index], { side: DoubleSide }),
      [1, 1, 1], [x + .152, height - .16, 3.67]).rotation.y = -.31;
  }
  return group;
}
