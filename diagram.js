const nodes = [
  { name: 'Query', x: -.76, y: 0, z: .1, color: '#c6b3ff' },
  { name: 'Safety rules', x: 0, y: -.52, z: .06, color: '#fe9ac7' },
  { name: 'Routing rules', x: 0, y: .49, z: -.12, color: '#afafff' },
  { name: 'Handoff', x: .76, y: 0, z: .1, color: '#ffb782' },
];
const links = [[0, 1], [0, 2], [1, 3], [2, 3]];
const stages = [
  { angle: -.18, links: [1, 1, .16, .16], points: [1, 1, 1, .32] },
  { angle: .04, links: [1, .5, .25, .16], points: [.56, 1, .55, .32] },
  { angle: .19, links: [.24, .24, 1, 1], points: [.42, .85, .85, 1] },
];

export function createDiagram(canvas, reducedMotion) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const viewport = canvas.parentElement;
  let width = 0;
  let height = 0;
  let ratio = 1;
  let angle = stages[0].angle;
  let progress = 0;
  const strengths = [...stages[0].links];
  const light = [...stages[0].points];
  const dust = Array.from({ length: 36 }, (_, index) => [
    ((index * 16807 + 2027) % 113) / 113,
    ((index * 48271 + 19) % 107) / 107,
    (index % 3 + 1) / 3,
  ]);

  function project(node) {
    const tilt = angle + Math.sin(progress * Math.PI) * .18;
    const x = node.x * Math.cos(tilt) + node.z * Math.sin(tilt);
    const z = node.z * Math.cos(tilt) - node.x * Math.sin(tilt);
    const perspective = 1 / (1 - z * .26);
    return {
      x: width / 2 + x * width * .45 * perspective,
      y: height / 2 - 9 + node.y * height * .39 * perspective,
      radius: (width > 460 ? 14 : 10) * perspective,
    };
  }

  function paint() {
    if (!width || !height) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const glow = context.createRadialGradient(width * .52, height * .45, 0, width * .52, height * .45, width * .52);
    glow.addColorStop(0, '#59438270');
    glow.addColorStop(1, '#17142500');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.save();
    context.strokeStyle = '#b59de838';
    context.lineWidth = 1;
    for (let row = -3; row <= 3; row++) {
      const y = height / 2 + row * height * .105;
      context.beginPath();
      context.moveTo(0, y + row * 9);
      context.quadraticCurveTo(width * (.5 - angle), y + 22 * Math.sin(progress * Math.PI), width, y - row * 9);
      context.stroke();
    }
    context.restore();

    context.fillStyle = '#bdb2e6';
    for (const [x, y, brightness] of dust) {
      context.globalAlpha = .14 + brightness * .24;
      context.fillRect(x * width, y * height, 1.2, 1.2);
    }

    const points = nodes.map(project);
    for (let index = 0; index < links.length; index++) {
      const [left, right] = links[index];
      const start = points[left];
      const end = points[right];
      const mid = (start.x + end.x) / 2;
      const gradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
      gradient.addColorStop(0, nodes[left].color);
      gradient.addColorStop(1, nodes[right].color);
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.bezierCurveTo(mid, start.y, mid, end.y, end.x, end.y);
      context.globalAlpha = .22 + .68 * strengths[index];
      context.strokeStyle = gradient;
      context.lineWidth = 1 + strengths[index];
      context.stroke();
      if (reducedMotion || strengths[index] < .36) continue;
      context.fillStyle = nodes[right].color;
      context.shadowBlur = 12;
      context.shadowColor = nodes[right].color;
      for (let packet = 0; packet < 3; packet++) {
        const t = (progress * 3.5 + index * .19 + packet * .12) % 1;
        const u = 1 - t;
        const x = u ** 3 * start.x + 3 * u * t * mid + t ** 3 * end.x;
        const y = u * u * (u + 3 * t) * start.y + t * t * (t + 3 * u) * end.y;
        context.beginPath();
        context.arc(x, y, 2.8 - packet * .55, 0, Math.PI * 2);
        context.fill();
      }
      context.shadowBlur = 0;
    }

    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      const point = points[index];
      context.globalAlpha = 1;
      context.fillStyle = '#261f3a';
      context.strokeStyle = node.color;
      context.lineWidth = 1.4;
      context.shadowBlur = light[index] * 22;
      context.shadowColor = node.color;
      context.beginPath();
      context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = node.color;
      context.globalAlpha = .48 + light[index] * .52;
      context.beginPath();
      context.arc(point.x, point.y, 2.9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#f1e7ff';
      context.textAlign = 'center';
      context.font = `500 ${width > 430 ? 13 : 11}px "IBM Plex Mono", monospace`;
      context.fillText(node.name, point.x, point.y + point.radius + 16);
    }
    context.globalAlpha = 1;
  }

  function resize() {
    width = viewport.clientWidth;
    height = viewport.clientHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    paint();
  }

  function setProgress(next) {
    if (next === progress) return;
    progress = next;
    const first = Math.min(1, Math.floor(progress * 2));
    const amount = progress * 2 - first;
    const start = stages[first];
    const end = stages[first + 1];
    const mix = (a, b) => a + (b - a) * amount;
    angle = mix(start.angle, end.angle);
    for (let index = 0; index < links.length; index++) {
      strengths[index] = mix(start.links[index], end.links[index]);
      light[index] = mix(start.points[index], end.points[index]);
    }
    paint();
  }

  new ResizeObserver(resize).observe(viewport);

  resize();
  viewport.classList.add('has-canvas');
  return {
    setProgress,
    setReducedMotion(enabled) {
      reducedMotion = enabled;
      paint();
    },
  };
}
