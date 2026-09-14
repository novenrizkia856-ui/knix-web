/**
 * Hero and CTA renders on their own canvases (they sit behind headline text).
 *   hero: interlocked lacquer and chrome links inside a field of real materials
 *   cta:  a material field that frames the headline
 * Renders only while visible and disposes on teardown.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Clock,
  DirectionalLight,
  Group,
  Mesh,
  OctahedronGeometry,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  TetrahedronGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createMaterials, createRenderer, frameGeometry, rng, studioEnvironment } from './look.js';

export function mountObjectScene(container, { variant = 'hero', reduced = false } = {}) {
  const small = window.matchMedia('(max-width: 720px)').matches;
  const isHero = variant === 'hero';
  let renderer;
  try {
    renderer = createRenderer({ small, shadows: isHero });
  } catch {
    return null;
  }
  container.append(renderer.domElement);

  const scene = new Scene();
  const envTarget = studioEnvironment(renderer);
  scene.environment = envTarget.texture;
  const kit = createMaterials({ small, transmission: true });
  const { mats } = kit;

  const key = new DirectionalLight('#fff3ec', 2.4);
  key.position.set(3, 5, 4);
  if (isHero) {
    key.castShadow = true;
    const size = small ? 1024 : 2048;
    key.shadow.mapSize.set(size, size);
    Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.5, far: 20 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
  }
  const rim = new PointLight('#ff1f36', 60, 16);
  rim.position.set(-3.5, 1.5, -2.5);
  const warm = new PointLight('#ffb48a', 12, 12);
  warm.position.set(3, -2.5, 3);
  scene.add(key, rim, warm);

  const camera = new PerspectiveCamera(30, 1, 0.1, 60);
  const world = new Group();
  scene.add(world);
  const geometries = [];
  const track = (g) => (geometries.push(g), g);

  let core = null;
  if (isHero) {
    const frame = track(frameGeometry(small));
    const linkA = new Mesh(frame, mats.lacquer);
    const linkB = new Mesh(frame, mats.chrome);
    [linkA, linkB].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    linkB.rotation.x = Math.PI / 2;
    linkB.position.x = 1.2;
    const links = new Group();
    links.add(linkA, linkB);
    links.position.x = -0.6;
    core = new Group();
    core.add(links);
    core.scale.setScalar(small ? 0.9 : 0.78);
    world.add(core);
  }

  const shapes = [
    track(new OctahedronGeometry(0.34, 0)),
    track(new RoundedBoxGeometry(0.46, 0.46, 0.46, 5, 0.08)),
    track(new TetrahedronGeometry(0.38, 0)),
    track(new RoundedBoxGeometry(0.1, 1.15, 0.1, 3, 0.04)),
    track(new OctahedronGeometry(0.2, 0)),
  ];
  const palette = isHero
    ? [mats.glass, mats.chrome, mats.lacquer, mats.aluminum, mats.gold, mats.graphite]
    : [mats.chrome, mats.lacquer, mats.glass, mats.graphite, mats.gold, mats.aluminum];
  const random = rng(isHero ? 7 : 19);
  const count = isHero ? (small ? 9 : 14) : small ? 10 : 16;
  const shards = [];
  for (let i = 0; i < count; i++) {
    const mesh = new Mesh(shapes[i % shapes.length], palette[i % palette.length]);
    mesh.castShadow = isHero;
    let x;
    let y;
    let z;
    if (isHero) {
      const a = (i / count) * Math.PI * 2 + random() * 0.5;
      const r = 2.3 + random() * 1.4;
      x = Math.cos(a) * r * 1.15;
      y = Math.sin(a) * r * 0.75;
      z = (random() - 0.5) * 2.6 - 0.3;
    } else {
      const side = i % 2 ? 1 : -1;
      x = side * (2.6 + random() * (small ? 1.2 : 3));
      y = (random() - 0.5) * (small ? 5.5 : 3.6);
      z = (random() - 0.5) * 3;
    }
    mesh.scale.setScalar(0.75 + random() * (isHero ? 0.8 : 1.1));
    mesh.position.set(x, y, z);
    mesh.rotation.set(random() * 6, random() * 6, random() * 6);
    world.add(mesh);
    shards.push({
      mesh, x, y,
      rx: mesh.rotation.x, ry: mesh.rotation.y,
      sx: (random() - 0.5) * 0.45, sy: (random() - 0.5) * 0.55,
      phase: random() * 6, amp: 0.08 + random() * 0.12,
      depth: 0.6 + (z + 1.5) * 0.25,
    });
  }

  const dustCount = small ? 120 : 260;
  const dust = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dust[i * 3] = (random() - 0.5) * 12;
    dust[i * 3 + 1] = (random() - 0.5) * 7;
    dust[i * 3 + 2] = (random() - 0.5) * 6 - 1;
  }
  const dustGeo = track(new BufferGeometry());
  dustGeo.setAttribute('position', new BufferAttribute(dust, 3));
  const dustMat = new PointsMaterial({ color: '#ffb0a6', size: 0.016, transparent: true, opacity: 0.4, depthWrite: false });
  const dustPoints = new Points(dustGeo, dustMat);
  world.add(dustPoints);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

  let scrollP = 0;
  const onScroll = () => {
    const h = container.getBoundingClientRect().height || 1;
    scrollP = Math.min(1, Math.max(0, window.scrollY / h));
  };
  if (isHero && !reduced) window.addEventListener('scroll', onScroll, { passive: true });

  function render(t) {
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    if (core) {
      core.rotation.y = -0.65 + Math.sin(t * 0.22) * 0.55 + pointer.x * 0.45;
      core.rotation.x = 0.38 + Math.sin(t * 0.31) * 0.14 + pointer.y * 0.25;
      core.rotation.z = 0.18 + Math.sin(t * 0.17) * 0.08;
      core.position.y = Math.sin(t * 0.5) * 0.08;
    }
    for (const s of shards) {
      s.mesh.rotation.x = s.rx + t * s.sx;
      s.mesh.rotation.y = s.ry + t * s.sy;
      s.mesh.position.x = s.x + pointer.x * s.depth * 0.35;
      s.mesh.position.y = s.y + Math.sin(t * 0.55 + s.phase) * s.amp - pointer.y * s.depth * 0.2;
    }
    dustPoints.rotation.y = t * 0.012 + pointer.x * 0.05;
    world.rotation.x = scrollP * 0.35;
    world.position.y = scrollP * 1.1;
    renderer.render(scene, camera);
  }

  const clock = new Clock();
  let elapsed = 4;
  let running = false;
  let raf = 0;

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const narrow = camera.aspect < 0.9;
    camera.position.set(0, isHero ? 0.25 : 0, isHero ? (narrow ? 11.5 : 10) : narrow ? 13 : 9.5);
    camera.updateProjectionMatrix();
    if (!running) render(elapsed);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function loop() {
    raf = requestAnimationFrame(loop);
    elapsed += Math.min(clock.getDelta(), 0.05);
    render(elapsed);
  }
  const start = () => {
    if (running || reduced) return;
    running = true;
    clock.getDelta();
    loop();
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  let visible = false;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !document.hidden) start();
    else stop();
  });
  io.observe(container);
  const onVisibility = () => (document.hidden ? stop() : visible && start());
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  render(elapsed);
  container.classList.add('is-ready');

  return function destroy() {
    stop();
    io.disconnect();
    ro.disconnect();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    geometries.forEach((g) => g.dispose());
    kit.dispose();
    dustMat.dispose();
    envTarget.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
