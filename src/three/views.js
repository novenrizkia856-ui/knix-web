/**
 * Section renders on one shared WebGL context.
 *
 * Every element with [data-gl="name"] gets a photographic 3D render. One offscreen
 * renderer draws each visible view, then copies the pixels into a 2D canvas that
 * lives inside the element. Because that canvas is part of the page, the render
 * scrolls, reveals and tilts together with its section instead of trailing it
 * like a fixed overlay would.
 *
 * Shaders are compiled up front (in parallel where the driver allows), so a view
 * never stalls the page the first time it scrolls in. Scroll driven motion is
 * damped so wheel steps do not make subjects jump.
 *
 *   data-gl-align="end"  shifts the subject right on wide boxes
 */
import { createMaterials, createRenderer, hasWebGL, studioEnvironment } from './look.js';
import { BUILDERS } from './section-scenes.js';

const damp = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));

export async function initViews(root = document) {
  const nodes = [...root.querySelectorAll('[data-gl]')].filter((el) => BUILDERS[el.dataset.gl]);
  if (!nodes.length || !hasWebGL()) return null;

  const small = window.matchMedia('(max-width: 720px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = window.matchMedia('(min-width: 1100px)');

  let renderer;
  try {
    renderer = createRenderer({ small, shadows: true, maxDpr: 1.5 });
  } catch {
    return null;
  }
  renderer.autoClear = false;
  const dpr = renderer.getPixelRatio();
  const glCanvas = renderer.domElement;
  let glW = 0;
  let glH = 0;

  const env = studioEnvironment(renderer);
  const kit = createMaterials({ small, transmission: false });

  const views = nodes.map((el) => {
    const view = BUILDERS[el.dataset.gl]({ kit, small });
    view.scene.environment = env.texture;
    view.el = el;
    view.visible = false;
    view.progress = null;
    view.w = 0;
    view.h = 0;
    return view;
  });

  // Compile every program before the first frame so no view hitches on entry.
  await Promise.all(
    views.map((v) => renderer.compileAsync(v.scene, v.camera).catch(() => renderer.compile(v.scene, v.camera))),
  );

  document.documentElement.classList.add('has-gl');
  for (const v of views) {
    const canvas = document.createElement('canvas');
    canvas.className = 'gl-view';
    canvas.setAttribute('aria-hidden', 'true');
    if (getComputedStyle(v.el).position === 'static') v.el.style.position = 'relative';
    v.el.append(canvas);
    v.el.classList.add('is-gl');
    v.canvas = canvas;
    v.ctx = canvas.getContext('2d');
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let t = 3;
  let last = performance.now();
  let raf = 0;
  let running = false;

  function ensureGlSize(w, h) {
    if (w <= glW && h <= glH) return;
    glW = Math.max(glW, w);
    glH = Math.max(glH, h);
    renderer.setSize(glW, glH, false);
  }

  function blank(v) {
    if (v.w) v.ctx.clearRect(0, 0, v.canvas.width, v.canvas.height);
  }

  function draw(v, dt) {
    const w = v.el.clientWidth;
    const h = v.el.clientHeight;
    if (w < 2 || h < 2) return;
    const card = v.el.closest('.deck__card');
    if (card && wide.matches && !card.classList.contains('is-active')) {
      blank(v);
      return;
    }
    if (w !== v.w || h !== v.h) {
      v.w = w;
      v.h = h;
      v.canvas.width = Math.round(w * dpr);
      v.canvas.height = Math.round(h * dpr);
    }
    ensureGlSize(w, h);

    const H = window.innerHeight;
    const rect = v.el.getBoundingClientRect();
    const target = Math.min(1, Math.max(0, (H - rect.top) / (H + rect.height)));
    v.progress = v.progress == null || reduced ? target : damp(v.progress, target, 6, dt);

    const aspect = w / h;
    v.camera.aspect = aspect;
    // pull back on boxes narrower than the subject needs so nothing is cropped
    v.camera.zoom = Math.min(1, aspect / (v.fitAspect || 1.2));
    if (v.el.dataset.glAlign === 'end' && wide.matches && aspect > 1.3) {
      v.camera.setViewOffset(w, h, -0.2 * w, 0, w, h);
    } else {
      v.camera.clearViewOffset();
    }
    v.camera.updateProjectionMatrix();
    v.update(t, { pointer, progress: v.progress, aspect });

    renderer.setViewport(0, glH - h, w, h);
    renderer.setScissor(0, glH - h, w, h);
    renderer.setScissorTest(true);
    renderer.clear();
    renderer.render(v.scene, v.camera);

    const pw = v.canvas.width;
    const ph = v.canvas.height;
    v.ctx.clearRect(0, 0, pw, ph);
    v.ctx.drawImage(glCanvas, 0, 0, pw, ph, 0, 0, pw, ph);
  }

  function frame(now = performance.now()) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduced) t += dt;
    pointer.x = damp(pointer.x, pointer.tx, 3.5, dt);
    pointer.y = damp(pointer.y, pointer.ty, 3.5, dt);
    for (const v of views) if (v.visible) draw(v, dt);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    frame(now);
  }
  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  let pending = false;
  function request() {
    const anyVisible = views.some((v) => v.visible);
    if (reduced) {
      if (pending || !anyVisible) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        frame();
      });
      return;
    }
    if (anyVisible && !document.hidden) start();
    else stop();
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const v = views.find((view) => view.el === entry.target);
      if (v) v.visible = entry.isIntersecting;
    }
    request();
  }, { rootMargin: '20% 0px' });
  views.forEach((v) => io.observe(v.el));

  const onPointer = (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    if (reduced) request();
  };
  const onChange = () => reduced && request();
  const onVisibility = () => request();
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('resize', onChange, { passive: true });
  window.addEventListener('scroll', onChange, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  return function destroy() {
    stop();
    io.disconnect();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('resize', onChange);
    window.removeEventListener('scroll', onChange);
    document.removeEventListener('visibilitychange', onVisibility);
    views.forEach((v) => {
      v.el.classList.remove('is-gl');
      v.canvas.remove();
      v.scene.traverse((obj) => obj.geometry?.dispose());
    });
    kit.dispose();
    env.dispose();
    renderer.dispose();
  };
}
