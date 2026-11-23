const clamp = (value) => Math.min(1, Math.max(0, value));

function cue(bounds, start = .92, end = .34) {
  return clamp((innerHeight * start - bounds.top) / (innerHeight * (start - end)));
}

function pinProgress(bounds, pin) {
  if (getComputedStyle(pin).position !== 'sticky') {
    return clamp((innerHeight * .76 - bounds.top) / (innerHeight * .76 + Math.min(bounds.height * .4, innerHeight * .35)));
  }
  const top = parseFloat(getComputedStyle(pin).top) || 0;
  return clamp((top - bounds.top) / Math.max(1, bounds.height - pin.offsetHeight));
}

export function createMotion({ reduced, onPipeline, onArm, onCampus }) {
  const root = document.documentElement;
  const hero = document.querySelector('.hero-shell');
  const robot = document.querySelector('.robot-chapter');
  const campus = document.querySelector('.education-section');
  const story = document.querySelector('.ai-story');
  const chapters = [...story.querySelectorAll('[data-chapter]')];
  const reel = document.querySelector('.work-reel');
  const board = reel.querySelector('.work-board');
  const workWindow = reel.querySelector('.work-window');
  const grid = reel.querySelector('.work-grid');
  const cards = [...grid.children];
  const pin = hero.querySelector('.hero-pin');
  const robotPin = robot.querySelector('.robot-feature');
  const campusPin = campus.querySelector('.campus-pin');
  const career = document.querySelector('.timeline');
  const viewport = matchMedia('(min-width: 801px) and (min-height: 730px)');
  const scenes = [...document.querySelectorAll('.specialty-rail, .about-section, .music-section, .site-footer')];
  const reveals = [...document.querySelectorAll('.section-heading, .ai-chapter, .timeline li, .profile-grid article, .project-archive, .project-card')];
  const navigation = [...document.querySelectorAll('.main-nav a, .header-contact')].map((link) => ({
    link, section: document.querySelector(link.hash),
  }));
  let currentLink;
  let frame = 0;
  let railExtent = 0;
  let railRun = 0;
  let railCards = [];
  let robotProgress = 0;
  let campusProgress = 0;

  function queue() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function measureRail() {
    const animateRail = viewport.matches && !reduced.matches;
    reel.classList.toggle('has-reel', animateRail);
    railExtent = animateRail ? Math.max(0, grid.scrollWidth - workWindow.clientWidth) : 0;
    railRun = railExtent ? Math.max(300, railExtent * .66) : 0;
    railCards = railExtent ? cards.filter((card) => !card.hidden).map((card) => ({
      card, center: card.offsetLeft + card.offsetWidth / 2,
    })) : [];
    reel.style.setProperty('--reel-space', `${board.offsetHeight + railRun}px`);
    reel.classList.toggle('can-travel', railExtent > 0);
    queue();
  }

  function update() {
    frame = 0;
    const height = innerHeight;
    const available = root.scrollHeight - height;
    const heroBounds = hero.getBoundingClientRect();
    const robotBounds = robot.getBoundingClientRect();
    const campusBounds = campus.getBoundingClientRect();
    const reelBounds = reel.getBoundingClientRect();
    const careerBounds = career.getBoundingClientRect();
    const chapterBounds = chapters.map((element) => element.getBoundingClientRect());
    const sceneBounds = scenes.map((element) => element.getBoundingClientRect());
    const revealBounds = reveals.map((element) => element.getBoundingClientRect());
    let activeLink;
    for (const item of navigation) {
      if (item.section.getBoundingClientRect().top <= height * .26) activeLink = item.link;
    }

    const viewLine = height * .56;
    const chapterCenters = chapterBounds.map(({ top, height }) => top + height / 2);
    const chapterIndex = Math.max(0, chapterBounds.findLastIndex(({ top }) => top <= viewLine));
    const interval = viewLine <= chapterCenters[1] ? 0 : 1;
    const start = chapterCenters[interval];
    const end = chapterCenters[interval + 1];
    const pipelineProgress = (interval + clamp((viewLine - start) / Math.max(1, end - start))) / 2;

    robotProgress = reduced.matches ? 0 : pinProgress(robotBounds, robotPin);
    campusProgress = reduced.matches ? 1 : pinProgress(campusBounds, campusPin);

    if (activeLink !== currentLink) {
      currentLink?.removeAttribute('aria-current');
      activeLink?.setAttribute('aria-current', 'location');
      currentLink = activeLink;
    }

    root.style.setProperty('--reading-progress', available > 0 ? clamp(scrollY / available) : 0);
    if (!reduced.matches) {
      const heroProgress = getComputedStyle(pin).position === 'sticky' ? pinProgress(heroBounds, pin)
        : clamp(-heroBounds.top / Math.min(height, heroBounds.height));
      hero.style.setProperty('--scene', heroProgress);
      robot.style.setProperty('--scene', robotProgress);
      campus.style.setProperty('--scene', campusProgress);
      story.style.setProperty('--scene', pipelineProgress);
      career.style.setProperty('--career-travel', clamp((height * .63 - careerBounds.top) / Math.max(1, careerBounds.height)));
      scenes.forEach((element, index) => element.style.setProperty('--scene', cue(sceneBounds[index])));
      reveals.forEach((element, index) => element.style.setProperty('--entry', cue(revealBounds[index], .96, .52)));
      if (railExtent) {
        const top = parseFloat(getComputedStyle(board).top) || 0;
        const position = clamp((top - reelBounds.top) / railRun);
        const offset = position * railExtent;
        reel.style.setProperty('--reel-offset', `${-offset}px`);
        reel.style.setProperty('--scene', position);
        const center = workWindow.clientWidth / 2;
        for (const { card, center: cardCenter } of railCards) {
          const distance = (cardCenter - offset - center) / center;
          card.style.setProperty('--turn', Math.max(-1, Math.min(1, distance)));
        }
      }
    }
    onPipeline(chapterIndex, reduced.matches ? chapterIndex / 2 : pipelineProgress);
    onArm(robotProgress, robotBounds.bottom > 0 && robotBounds.top < height);
    onCampus(campusProgress, campusBounds.bottom > 0 && campusBounds.top < height);
  }

  function setMotionMode() {
    root.classList.toggle('scroll-motion', !reduced.matches);
    measureRail();
  }

  board.addEventListener('focusin', (event) => {
    const card = event.target.closest('.project-card');
    if (!railExtent || !card || !event.target.matches(':focus-visible')) return;
    const area = workWindow.getBoundingClientRect();
    const bounds = card.getBoundingClientRect();
    if (bounds.left >= area.left - 2 && bounds.right <= area.right + 2) return;
    const target = clamp((card.offsetLeft - (area.width - card.offsetWidth) / 2) / railExtent);
    const top = parseFloat(getComputedStyle(board).top) || 0;
    window.scrollTo({ top: scrollY + reel.getBoundingClientRect().top - top + target * railRun, behavior: 'instant' });
  });
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', measureRail, { passive: true });
  viewport.addEventListener('change', measureRail);
  reduced.addEventListener('change', setMotionMode);
  new ResizeObserver(measureRail).observe(board);
  setMotionMode();

  return {
    refresh: queue,
    resetReel() {
      const top = parseFloat(getComputedStyle(board).top) || 0;
      const start = reel.getBoundingClientRect().top - top;
      measureRail();
      if (start < 0 && top > 0) window.scrollTo({ top: scrollY + start, behavior: 'instant' });
    },
    scrollToPose(progress) {
      const bounds = robot.getBoundingClientRect();
      if (getComputedStyle(robotPin).position !== 'sticky') return false;
      const top = parseFloat(getComputedStyle(robotPin).top) || 0;
      const target = scrollY + bounds.top - top + (bounds.height - robotPin.offsetHeight) * progress;
      window.scrollTo({ top: target, behavior: 'smooth' });
      return true;
    },
  };
}
