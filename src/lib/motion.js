/**
 * Knix motion system.
 * One timing vocabulary, one scroll loop, observers instead of listeners.
 */

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => window.matchMedia('(pointer: fine)').matches;

/** Splits [data-split] headings into masked lines of words. */
export function splitHeadings(root = document) {
  root.querySelectorAll('[data-split]').forEach((el) => {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.append(document.createTextNode(' '));
              return;
            }
            const mask = document.createElement('span');
            mask.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = part;
            mask.append(inner);
            frag.append(mask);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    el.querySelectorAll('.w > span').forEach((span, i) => span.style.setProperty('--i', i));
  });
}

/** Adds .is-in to [data-reveal] once, with group stagger via --i. */
export function initReveals(root = document) {
  root.querySelectorAll('[data-reveal-group]').forEach((group) => {
    group.querySelectorAll(':scope [data-reveal]').forEach((el, i) => el.style.setProperty('--stagger', i));
  });
  const items = root.querySelectorAll('[data-reveal], [data-split]');
  if (reducedMotion() || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  items.forEach((el) => io.observe(el));
}

/** Toggles .is-live on [data-live] so ambient CSS loops only run on screen. */
export function initLiveRegions(root = document) {
  const regions = root.querySelectorAll('[data-live]');
  if (!('IntersectionObserver' in window)) {
    regions.forEach((el) => el.classList.add('is-live'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-live', entry.isIntersecting));
  }, { rootMargin: '10% 0px' });
  regions.forEach((el) => io.observe(el));
}

/** Soft magnetic pull on [data-magnetic]. */
export function initMagnetic(root = document) {
  if (reducedMotion() || !finePointer()) return;
  root.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.25;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength;
      const y = (e.clientY - r.top - r.height / 2) * strength;
      el.style.setProperty('--mx', `${x.toFixed(1)}px`);
      el.style.setProperty('--my', `${y.toFixed(1)}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--mx', '0px');
      el.style.setProperty('--my', '0px');
    });
  });
}

/** Pointer tilt on [data-tilt]; writes --rx / --ry / --px / --py. */
export function initTilt(root = document) {
  if (reducedMotion() || !finePointer()) return;
  root.querySelectorAll('[data-tilt]').forEach((el) => {
    const max = Number(el.dataset.tilt) || 6;
    let frame = 0;
    el.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', `${((px - 0.5) * max * 2).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${((0.5 - py) * max * 2).toFixed(2)}deg`);
        el.style.setProperty('--px', `${(px * 100).toFixed(1)}%`);
        el.style.setProperty('--py', `${(py * 100).toFixed(1)}%`);
      });
    });
    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
}

/**
 * Scroll progress for [data-scroll] sections: writes --p (0 → 1 while the
 * section crosses the viewport). A single rAF loop, idle when nothing moves.
 */
export function initScrollProgress(root = document) {
  const els = [...root.querySelectorAll('[data-scroll]')];
  if (!els.length || reducedMotion()) return;
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    request();
  });
  els.forEach((el) => io.observe(el));

  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    visible.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      el.style.setProperty('--p', p.toFixed(4));
    });
  };
  function request() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
}

export function initMotion(root = document) {
  splitHeadings(root);
  initReveals(root);
  initLiveRegions(root);
  initMagnetic(root);
  initTilt(root);
  initScrollProgress(root);
}

/** Subtle transient message near an element. Returns nothing. */
export function toast(message, { anchor, tone = 'info', duration = 2200 } = {}) {
  let host = document.querySelector('.toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.append(host);
  }
  const node = document.createElement('div');
  node.className = `toast toast--${tone}`;
  node.textContent = message;
  host.append(node);
  if (anchor) anchor.dataset.flash = tone;
  requestAnimationFrame(() => node.classList.add('is-in'));
  setTimeout(() => {
    node.classList.remove('is-in');
    if (anchor) delete anchor.dataset.flash;
    setTimeout(() => node.remove(), 400);
  }, duration);
}
