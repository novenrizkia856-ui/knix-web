/**
 * Section renders on one shared WebGL context.
 *
 * Every element with [data-gl="name"] gets a photographic 3D render drawn into
 * its box on a fixed overlay canvas (scissored viewports). Views render only
 * while near the viewport; the loop stops when nothing is visible.
 *
 *   data-gl-clip   on an ancestor clips the render to that ancestor's box
 *   data-gl-align="end"  shifts the subject right on wide boxes
 */
import { Clock } from 'three';
import { createMaterials, createRenderer, hasWebGL, studioEnvironment } from './look.js';
import { BUILDERS } from './section-scenes.js';

export function initViews(root = document) {
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
  const canvas = renderer.domElement;
  canvas.className = 'gl-overlay';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  renderer.autoClear = false;

  const env = studioEnvironment(renderer);
  const kit = createMaterials({ small, transmission: false });

  const views = nodes.map((el) => {
    const view = BUILDERS[el.dataset.gl]({ kit, small });
    view.scene.environment = env.texture;
    view.el = el;
    view.visible = false;
    el.classList.add('is-gl');
    return view;
  });

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const clock = new Clock();
  let t = 3;
  let raf = 0;
  let running = false;

  const viewportWidth = () => document.documentElement.clientWidth;
  const resize = () => renderer.setSize(viewportWidth(), window.innerHeight, false);
  resize();

  function clear() {
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
  }

  function clipFor(el, rect) {
    let l = Math.max(rect.left, 0);
    let top = Math.max(rect.top, 0);
    let r = Math.min(rect.right, viewportWidth());
    let b = Math.min(rect.bottom, window.innerHeight);
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (!p.hasAttribute('data-gl-clip')) continue;
      const c = p.getBoundingClientRect();
      l = Math.max(l, c.left);
      top = Math.max(top, c.top);
      r = Math.min(r, c.right);
      b = Math.min(b, c.bottom);
    }
    return { l, top, w: r - l, h: b - top };
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduced) t += dt;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    const H = window.innerHeight;
    clear();

    for (const v of views) {
      if (!v.visible) continue;
      const card = v.el.closest('.deck__card');
      if (card && wide.matches && !card.classList.contains('is-active')) continue;
      const rect = v.el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const clip = clipFor(v.el, rect);
      if (clip.w <= 0 || clip.h <= 0) continue;

      renderer.setViewport(rect.left, H - rect.bottom, rect.width, rect.height);
      renderer.setScissor(clip.l, H - clip.top - clip.h, clip.w, clip.h);

      const aspect = rect.width / rect.height;
      v.camera.aspect = aspect;
      // pull back on boxes narrower than the subject needs so nothing is cropped
      v.camera.zoom = Math.min(1, aspect / (v.fitAspect || 1.2));
      if (v.el.dataset.glAlign === 'end' && wide.matches && aspect > 1.3) {
        v.camera.setViewOffset(rect.width, rect.height, -0.2 * rect.width, 0, rect.width, rect.height);
      } else {
        v.camera.clearViewOffset();
      }
      v.camera.updateProjectionMatrix();

      const progress = Math.min(1, Math.max(0, (H - rect.top) / (H + rect.height)));
      v.update(t, { pointer, progress, aspect });
      renderer.render(v.scene, v.camera);
    }
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    frame();
  }
  function start() {
    if (running) return;
    running = true;
    clock.getDelta();
    loop();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    clear();
  }

  let pending = false;
  function request() {
    const anyVisible = views.some((v) => v.visible);
    if (reduced) {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        anyVisible ? frame() : clear();
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
  const onResize = () => {
    resize();
    request();
  };
  const onScroll = () => reduced && request();
  const onVisibility = () => request();
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  return function destroy() {
    stop();
    io.disconnect();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    views.forEach((v) => {
      v.el.classList.remove('is-gl');
      v.scene.traverse((obj) => obj.geometry?.dispose());
    });
    kit.dispose();
    env.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
