import { createDiagram } from './diagram.js';

const studio = document.querySelector('#arm-studio');
const armView = document.querySelector('#arm-view');
const armCanvas = document.querySelector('#robot-canvas');
const poseControls = studio.querySelector('.pose-controls');
const poseStatus = document.querySelector('#pose-status');
const motionButton = document.querySelector('#arm-motion');
const sequenceButton = document.querySelector('#arm-sequence');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const precisePointer = matchMedia('(hover: hover) and (pointer: fine)');

const aiControls = document.querySelector('.ai-controls');
const chapters = [...document.querySelectorAll('[data-chapter]')];
const aiButtons = [...aiControls.querySelectorAll('button')];
const diagram = createDiagram(document.querySelector('#flow-canvas'), reducedMotion.matches);
let activeChapter = -1;
aiControls.hidden = false;

function activateChapter(index) {
  if (activeChapter === index) return;
  activeChapter = index;
  for (const [position, chapter] of chapters.entries()) {
    chapter.classList.toggle('is-active', position === index);
    aiButtons[position].setAttribute('aria-pressed', String(position === index));
  }
  diagram?.showStage(index);
}

aiControls.addEventListener('click', (event) => {
  const button = event.target.closest('[data-stage]');
  if (!button) return;
  const index = aiButtons.indexOf(button);
  activateChapter(index);
  chapters[index].scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
});

const hero = document.querySelector('.hero-shell');
const navigation = [...document.querySelectorAll('.main-nav a, .header-contact')].map((link) => ({
  link,
  section: document.querySelector(link.hash),
}));
let scrollFrame = 0;

function updateScroll() {
  scrollFrame = 0;
  const available = document.documentElement.scrollHeight - innerHeight;
  document.documentElement.style.setProperty('--reading-progress', available > 0 ? scrollY / available : 0);
  const heroBounds = hero.getBoundingClientRect();
  hero.classList.toggle('is-on-screen', heroBounds.bottom > 0);
  if (heroBounds.bottom > 0) {
    hero.style.setProperty('--hero-scroll', Math.max(0, -heroBounds.top) / heroBounds.height);
  }

  let current = null;
  for (const item of navigation) {
    if (item.section.getBoundingClientRect().top <= innerHeight * .27) current = item;
  }
  for (const item of navigation) {
    if (item === current) item.link.setAttribute('aria-current', 'location');
    else item.link.removeAttribute('aria-current');
  }

  const position = innerHeight * .56;
  const index = chapters.findLastIndex((chapter) => chapter.getBoundingClientRect().top < position);
  activateChapter(Math.max(0, index));
}

function queueScroll() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
}

window.addEventListener('scroll', queueScroll, { passive: true });
window.addEventListener('resize', queueScroll);
reducedMotion.addEventListener('change', ({ matches }) => diagram?.setReducedMotion(matches));
updateScroll();

hero.addEventListener('pointermove', (event) => {
  if (!precisePointer.matches || reducedMotion.matches) return;
  const rect = hero.getBoundingClientRect();
  hero.style.setProperty('--hero-pan-x', `${((event.clientX - rect.left) / rect.width - .5) * 22}px`);
  hero.style.setProperty('--hero-pan-y', `${((event.clientY - rect.top) / rect.height - .5) * 18}px`);
});
hero.addEventListener('pointerleave', () => {
  hero.style.removeProperty('--hero-pan-x');
  hero.style.removeProperty('--hero-pan-y');
});

async function launchStudio() {
  try {
    const { createArm } = await import('./arm.js');
    const poseButtons = [...poseControls.querySelectorAll('[data-pose]')];
    const arm = createArm(armCanvas, armView, reducedMotion.matches, (pose) => {
      for (const button of poseButtons) button.setAttribute('aria-pressed', String(button.dataset.pose === pose));
    });
    function showControls(available) {
      studio.classList.toggle('is-interactive', available);
      poseControls.hidden = !available;
      motionButton.hidden = !available;
      sequenceButton.hidden = !available;
      studio.querySelector('.studio-hint').hidden = !available;
      armCanvas.tabIndex = available ? 0 : -1;
      armCanvas.setAttribute('aria-hidden', String(!available));
    }
    showControls(true);

    const updateMotionButton = () => {
      motionButton.classList.toggle('is-paused', !arm.rotating);
      motionButton.setAttribute('aria-label', arm.rotating ? 'Pause auto-rotate' : 'Start auto-rotate');
      motionButton.title = motionButton.getAttribute('aria-label');
    };

    updateMotionButton();
    motionButton.addEventListener('click', () => {
      arm.setRotation(!arm.rotating);
      updateMotionButton();
    });

    function updateSequenceButton() {
      sequenceButton.textContent = arm.playing ? 'Pause poses' : 'Play poses';
    }
    sequenceButton.addEventListener('click', () => {
      arm.setSequence(!arm.playing);
      updateSequenceButton();
    });

    reducedMotion.addEventListener('change', ({ matches }) => {
      arm.setReducedMotion(matches);
      updateMotionButton();
      updateSequenceButton();
    });

    poseControls.addEventListener('click', (event) => {
      const button = event.target.closest('[data-pose]');
      if (!button) return;
      arm.setSequence(false);
      updateSequenceButton();
      arm.setPose(button.dataset.pose);
      poseStatus.textContent = `Arm pose: ${button.textContent}`;
    });

    armCanvas.addEventListener('webglcontextlost', () => showControls(false));
    armCanvas.addEventListener('webglcontextrestored', () => showControls(true));
  } catch {
    // The preview stays visible on devices without WebGL.
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
  filterStatus.textContent = `${count} projects shown`;
});

for (const card of projectCards) {
  card.addEventListener('pointermove', (event) => {
    if (!precisePointer.matches || reducedMotion.matches) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    card.style.setProperty('--tilt-x', `${(-y * 6).toFixed(1)}deg`);
    card.style.setProperty('--tilt-y', `${(x * 6).toFixed(1)}deg`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.removeProperty('--tilt-x');
    card.style.removeProperty('--tilt-y');
  });
}

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

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('motion-ok');
  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.dataset.reveal = 'visible';
      revealObserver.unobserve(entry.target);
    }
  }, { threshold: .12 });

  for (const element of document.querySelectorAll('.section-heading, .timeline > li, .education-copy, .about-intro, .profile-grid, .music-card, .contact-inner')) {
    if (element.getBoundingClientRect().top < innerHeight) continue;
    element.dataset.reveal = 'waiting';
    revealObserver.observe(element);
  }
}

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

function runWhenNear(element, launch) {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    launch();
  }, { rootMargin: '250px' });
  observer.observe(element);
}

const campusView = document.querySelector('.campus-view');
const campusReplay = document.querySelector('#campus-replay');
async function launchCampus() {
  try {
    const { createCampus } = await import('./campus.js');
    const canvas = campusView.querySelector('canvas');
    const campus = createCampus(canvas, campusView, reducedMotion.matches);
    const updateReplay = () => {
      campusReplay.hidden = reducedMotion.matches || !campusView.classList.contains('has-campus');
    };
    campusReplay.addEventListener('click', campus.replay);
    canvas.addEventListener('webglcontextlost', updateReplay);
    canvas.addEventListener('webglcontextrestored', updateReplay);
    reducedMotion.addEventListener('change', ({ matches }) => {
      campus.setReducedMotion(matches);
      updateReplay();
    });
    updateReplay();
  } catch {
    // Keep the still model visible when the 3D renderer cannot initialize.
  }
}
if (typeof window.WebGL2RenderingContext !== 'undefined') {
  runWhenNear(studio, launchStudio);
  runWhenNear(campusView, launchCampus);
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
