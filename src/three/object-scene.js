/**
 * Dimensional object scenes for the landing page.
 *   hero: two interlocked frames (the twofold mark) inside a field of shards
 *   cta:  a shard field that frames the headline
 * Renders only while visible, caps pixel ratio, disposes on teardown.
 */
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  Shape,
  SRGBColorSpace,
  TetrahedronGeometry,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundedSquare(half, r) {
  const s = new Shape();
  s.moveTo(-half + r, -half);
  s.lineTo(half - r, -half);
  s.quadraticCurveTo(half, -half, half, -half + r);
  s.lineTo(half, half - r);
  s.quadraticCurveTo(half, half, half - r, half);
  s.lineTo(-half + r, half);
  s.quadraticCurveTo(-half, half, -half, half - r);
  s.lineTo(-half, -half + r);
  s.quadraticCurveTo(-half, -half, -half + r, -half);
  return s;
}

function frameGeometry(low) {
  const shape = roundedSquare(1.1, 0.26);
  shape.holes.push(roundedSquare(0.72, 0.1));
  const geo = new ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: low ? 2 : 4,
    curveSegments: low ? 4 : 10,
  });
  geo.center();
  return geo;
}

function materials() {
  return {
    iris: new MeshPhysicalMaterial({
      color: '#a89eff', metalness: 1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08,
      iridescence: 0.85, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 720],
    }),
    silver: new MeshPhysicalMaterial({ color: '#dadce8', metalness: 1, roughness: 0.24, clearcoat: 0.6 }),
    graphite: new MeshPhysicalMaterial({ color: '#2a2938', metalness: 0.85, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 }),
    pearl: new MeshPhysicalMaterial({
      color: '#f1f0fa', metalness: 0.05, roughness: 0.14, clearcoat: 1,
      sheen: 1, sheenColor: new Color('#c4bdff'), sheenRoughness: 0.4,
    }),
    glacier: new MeshPhysicalMaterial({
      color: '#7fdcf0', metalness: 0.4, roughness: 0.2, clearcoat: 1, emissive: '#1b6f82', emissiveIntensity: 0.4,
    }),
  };
}

export function mountObjectScene(container, { variant = 'hero', reduced = false } = {}) {
  const small = window.matchMedia('(max-width: 720px)').matches;
  const isHero = variant === 'hero';
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: !small, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.append(renderer.domElement);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();

  const key = new DirectionalLight('#ffffff', 1.6);
  key.position.set(3, 4, 5);
  const rim = new PointLight('#968cff', 40, 14);
  rim.position.set(-3.5, 1.5, -2);
  const cool = new PointLight('#7fdcf0', 16, 10);
  cool.position.set(3, -2.5, 2.5);
  scene.add(key, rim, cool);

  const camera = new PerspectiveCamera(30, 1, 0.1, 60);
  const world = new Group();
  scene.add(world);
  const mats = materials();
  const geometries = [];
  const track = (g) => (geometries.push(g), g);

  /* centerpiece: two interlocked frames */
  let core = null;
  if (isHero) {
    const frame = track(frameGeometry(small));
    const linkA = new Mesh(frame, mats.iris);
    const linkB = new Mesh(frame, mats.silver);
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

  /* shard field */
  const shapes = [
    track(new OctahedronGeometry(0.34, 0)),
    track(new TetrahedronGeometry(0.38, 0)),
    track(new RoundedBoxGeometry(0.44, 0.44, 0.44, 2, 0.06)),
    track(new BoxGeometry(0.09, 0.09, 1.15)),
    track(new OctahedronGeometry(0.2, 0)),
  ];
  const palette = [mats.pearl, mats.graphite, mats.iris, mats.silver, mats.glacier, mats.graphite];
  const random = rng(isHero ? 7 : 19);
  const count = isHero ? (small ? 9 : 15) : small ? 10 : 18;
  const shards = [];
  for (let i = 0; i < count; i++) {
    const mesh = new Mesh(shapes[i % shapes.length], palette[i % palette.length]);
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
    mesh.scale.setScalar(0.7 + random() * (isHero ? 0.8 : 1.1));
    mesh.position.set(x, y, z);
    mesh.rotation.set(random() * 6, random() * 6, random() * 6);
    world.add(mesh);
    shards.push({
      mesh, x, y,
      rx: mesh.rotation.x, ry: mesh.rotation.y,
      sx: (random() - 0.5) * 0.5, sy: (random() - 0.5) * 0.6,
      phase: random() * 6, amp: 0.08 + random() * 0.14,
      depth: 0.6 + (z + 1.5) * 0.25,
    });
  }

  /* fine dust for depth */
  const dustCount = small ? 140 : 320;
  const dust = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dust[i * 3] = (random() - 0.5) * 12;
    dust[i * 3 + 1] = (random() - 0.5) * 7;
    dust[i * 3 + 2] = (random() - 0.5) * 6 - 1;
  }
  const dustGeo = track(new BufferGeometry());
  dustGeo.setAttribute('position', new BufferAttribute(dust, 3));
  const dustMat = new PointsMaterial({ color: '#c4bdff', size: 0.018, transparent: true, opacity: 0.55, depthWrite: false });
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
    Object.values(mats).forEach((m) => m.dispose());
    dustMat.dispose();
    envTarget.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
