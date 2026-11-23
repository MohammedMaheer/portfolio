const studio = document.querySelector('#arm-studio');
const armView = document.querySelector('#arm-view');
const armCanvas = document.querySelector('#robot-canvas');
const poseControls = studio.querySelector('.pose-controls');
const poseStatus = document.querySelector('#pose-status');
const motionButton = document.querySelector('#arm-motion');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const precisePointer = matchMedia('(hover: hover) and (pointer: fine)');

const aiControls = document.querySelector('.ai-controls');
const aiResults = document.querySelectorAll('[data-result]');
aiControls.hidden = false;
aiControls.addEventListener('click', (event) => {
  const button = event.target.closest('[data-stage]');
  if (!button) return;
  aiControls.querySelector('[aria-pressed="true"]').setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-pressed', 'true');
  for (const result of aiResults) result.hidden = result.dataset.result !== button.dataset.stage;
});

async function launchStudio() {
  try {
    const { createArm } = await import('./arm.js');
    const arm = createArm(armCanvas, armView, reducedMotion.matches);
    function showControls(available) {
      studio.classList.toggle('is-interactive', available);
      poseControls.hidden = !available;
      motionButton.hidden = !available;
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

    reducedMotion.addEventListener('change', ({ matches }) => {
      arm.setReducedMotion(matches);
      updateMotionButton();
    });

    poseControls.addEventListener('click', (event) => {
      const button = event.target.closest('[data-pose]');
      if (!button) return;
      arm.setPose(button.dataset.pose);
      poseControls.querySelector('[aria-pressed="true"]').setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
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

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('motion-ok');
  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.dataset.reveal = 'visible';
      revealObserver.unobserve(entry.target);
    }
  }, { threshold: .12 });

  for (const element of document.querySelectorAll('.section-heading, .timeline > li, .about-intro, .profile-grid, .contact-inner')) {
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

if (typeof window.WebGL2RenderingContext !== 'undefined') {
  const studioObserver = new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    launchStudio();
  }, { rootMargin: '250px' });
  studioObserver.observe(studio);
}
