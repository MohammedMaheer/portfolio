import { createDiagram } from './diagram.js';
import { createMotion } from './motion.js';

const studio = document.querySelector('#arm-studio');
const armView = document.querySelector('#arm-view');
const armCanvas = document.querySelector('#robot-canvas');
const poseControls = studio.querySelector('.pose-controls');
const poseStatus = document.querySelector('#pose-status');
const armMode = document.querySelector('#arm-mode');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const aiControls = document.querySelector('.ai-controls');
const chapters = [...document.querySelectorAll('[data-chapter]')];
const aiButtons = [...aiControls.querySelectorAll('button')];
const diagram = createDiagram(document.querySelector('#flow-canvas'), reducedMotion.matches);
const campusView = document.querySelector('.campus-view');
const campusLeg = document.querySelector('.campus-leg');
let activeChapter = -1;
let arm;
let campus;
let lastArmProgress = -1;
aiControls.hidden = false;

function activateChapter(index, progress) {
  diagram?.setProgress(progress);
  if (activeChapter === index) return;
  activeChapter = index;
  for (const [position, chapter] of chapters.entries()) {
    chapter.classList.toggle('is-active', position === index);
    aiButtons[position].setAttribute('aria-pressed', String(position === index));
  }
}

aiControls.addEventListener('click', (event) => {
  const button = event.target.closest('[data-stage]');
  if (!button) return;
  const index = aiButtons.indexOf(button);
  activateChapter(index, index / 2);
  chapters[index].scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
});

const motion = createMotion({
  reduced: reducedMotion,
  onPipeline: activateChapter,
  onArm(progress, visible) {
    if (!arm || !visible || reducedMotion.matches || progress === lastArmProgress) return;
    lastArmProgress = progress;
    arm.setProgress(progress);
  },
  onCampus(progress, visible) {
    if (!visible || !campus) return;
    campus.setProgress(progress);
    const leg = progress < .31 ? 'Above the grounds' : progress < .91 ? 'Garden approach' : 'Under the portico';
    if (campusLeg.textContent !== leg) campusLeg.textContent = leg;
  },
});
reducedMotion.addEventListener('change', ({ matches }) => diagram?.setReducedMotion(matches));

const armPoseProgress = { home: .04, reach: .49, stow: .94 };
const armPoseLabels = { home: 'Home position', reach: 'Reach and grip', stow: 'Retract and stow' };

async function launchStudio() {
  try {
    const { createArm } = await import('./arm.js');
    const poseButtons = [...poseControls.querySelectorAll('[data-pose]')];
    arm = createArm(armCanvas, armView, reducedMotion.matches, (pose) => {
      armMode.textContent = armPoseLabels[pose];
      for (const button of poseButtons) button.setAttribute('aria-pressed', String(button.dataset.pose === pose));
    });
    function showControls(available) {
      studio.classList.toggle('is-interactive', available);
      poseControls.hidden = !available;
      studio.querySelector('.studio-hint').hidden = !available;
      armCanvas.tabIndex = available ? 0 : -1;
      armCanvas.setAttribute('aria-hidden', String(!available));
    }
    showControls(true);

    poseControls.addEventListener('click', (event) => {
      const button = event.target.closest('[data-pose]');
      if (!button) return;
      const pose = button.dataset.pose;
      if (!motion.scrollToPose(armPoseProgress[pose])) arm.setPose(pose);
      poseStatus.textContent = 'Arm pose: ' + button.textContent;
    });
    reducedMotion.addEventListener('change', ({ matches }) => {
      arm.setReducedMotion(matches);
      lastArmProgress = -1;
      motion.refresh();
    });
    armCanvas.addEventListener('webglcontextlost', () => showControls(false));
    armCanvas.addEventListener('webglcontextrestored', () => showControls(true));
    motion.refresh();
  } catch {
    // Keep the static view available when WebGL cannot initialize.
  }
}

const projectControls = document.querySelector('.project-controls');
const projectCards = [...document.querySelectorAll('.project-card')];
const filterStatus = document.querySelector('#filter-status');
projectControls.hidden = false;

projectControls.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  const filter = button.dataset.filter;
  projectControls.querySelector('[aria-pressed="true"]').setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-pressed', 'true');

  let count = 0;
  for (const card of projectCards) {
    const visible = filter === 'all' || card.dataset.category.split(' ').includes(filter);
    card.hidden = !visible;
    if (visible) count++;
  }
  motion.resetReel();
  filterStatus.textContent = `${count} projects shown`;
});

const archiveInput = document.querySelector('#archive-search');
const archiveStatus = document.querySelector('#archive-status');
const archiveGroups = [...document.querySelectorAll('.archive-grid article')].map((group) => ({
  group,
  rows: [...group.querySelectorAll('li')].map((item) => ({
    item,
    text: `${group.querySelector('h3').textContent} ${item.textContent}`.toLowerCase(),
  })),
}));
archiveInput.closest('.archive-search').hidden = false;
archiveInput.addEventListener('input', () => {
  const terms = archiveInput.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let total = 0;
  for (const { group, rows } of archiveGroups) {
    let count = 0;
    for (const { item, text } of rows) {
      const matches = terms.every((term) => text.includes(term));
      item.hidden = !matches;
      if (matches) count++;
    }
    group.hidden = count === 0;
    total += count;
  }
  archiveStatus.textContent = total === 1 ? '1 project found' : `${total} projects found`;
});

const copyButton = document.querySelector('#copy-email');
const copyStatus = document.querySelector('#copy-status');
if (navigator.clipboard?.writeText) {
  copyButton.hidden = false;
  let resetLabel;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(document.querySelector('.email-link').textContent);
      copyButton.textContent = 'Copied';
      copyStatus.textContent = 'Email address copied';
      clearTimeout(resetLabel);
      resetLabel = setTimeout(() => { copyButton.textContent = 'Copy email'; }, 2400);
    } catch {
      copyStatus.textContent = 'Clipboard unavailable. You can select the email address or use the email link.';
      copyButton.textContent = 'Copy unavailable';
    }
  });
}

function runWhenNear(element, launch, rootMargin = '250px') {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    launch();
  }, { rootMargin });
  observer.observe(element);
}

async function launchCampus() {
  try {
    const { createCampus } = await import('./campus.js');
    campus = createCampus(campusView.querySelector('canvas'), campusView);
    motion.refresh();
  } catch {
    // The architectural image remains available without WebGL.
  }
}
if (typeof window.WebGL2RenderingContext !== 'undefined') {
  runWhenNear(studio, launchStudio);
  runWhenNear(campusView, launchCampus, '520px');
}

const musicTransition = document.querySelector('.music-transition');
const earbuds = document.querySelector('.music-earbuds');
let musicTimer;
window.addEventListener('pageshow', () => {
  clearTimeout(musicTimer);
  musicTransition.hidden = true;
  musicTransition.replaceChildren();
});
for (const link of document.querySelectorAll('[data-music-link]')) {
  link.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reducedMotion.matches) return;
    event.preventDefault();
    if (!musicTransition.hidden) return;

    const art = earbuds.cloneNode(true);
    musicTransition.replaceChildren(art);
    musicTransition.hidden = false;
    function openMusic() {
      clearTimeout(musicTimer);
      art.removeEventListener('animationend', openMusic);
      window.location.assign(link.href);
    }
    art.addEventListener('animationend', openMusic, { once: true });
    musicTimer = setTimeout(openMusic, 780);
  });
}
