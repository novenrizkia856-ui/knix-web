/**
 * Hero surface: a black red lacquer liquid in slow motion, reflecting a dark
 * studio (red strip lights, one softbox). One displaced plane, no objects.
 * It fills the lower band of the hero so copy and controls stay clear.
 * Renders only while visible and disposes on teardown.
 */
import {
  Clock,
  Color,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Vector2,
} from 'three';
import { createRenderer, hasWebGL } from './look.js';

const HEIGHT = /* glsl */ `
uniform float uTime;
float knixHeight(vec2 p) {
  float t = uTime;
  float h = 0.0;
  h += sin(p.x * 0.30 + t * 0.40) * 0.085;
  h += sin(p.y * 0.50 - t * 0.55 + p.x * 0.18) * 0.060;
  h += sin((p.x + p.y) * 0.95 + t * 0.85) * 0.022;
  h += sin((p.x * 0.6 - p.y) * 1.90 - t * 1.25) * 0.008;
  h += sin((p.x * 1.3 + p.y * 0.7) * 2.6 + t * 1.6) * 0.012;
  h += sin((p.y * 1.4 - p.x * 0.8) * 3.4 - t * 1.9) * 0.007;
  return h;
}`;

/** Dark studio: reflections read as black lacquer with red and warm streaks. */
function darkStudio(renderer) {
  const env = new Scene();
  env.background = new Color('#020101');
  const panel = (w, h, color, intensity, x, y, z) => {
    const mesh = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide }),
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  panel(40, 0.35, '#ff1f36', 2.2, 0, 0.8, -18); // thin red horizon strip, far
  panel(14, 0.5, '#ffe4dc', 3, 0, 6, -12); // warm top softbox for crest highlights
  panel(1.2, 8, '#ff2a2a', 0.8, -14, 2, -4); // dim side red strips
  panel(1.2, 8, '#ff2a2a', 0.8, 14, 2, -4);

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, 0.02);
  pmrem.dispose();
  env.traverse((obj) => {
    obj.geometry?.dispose();
    obj.material?.dispose?.();
  });
  return target;
}

export function mountLiquidScene(container, { reduced = false } = {}) {
  if (!hasWebGL()) return null;
  const small = window.matchMedia('(max-width: 720px)').matches;
  let renderer;
  try {
    renderer = createRenderer({ small, shadows: false });
  } catch {
    return null;
  }
  renderer.toneMappingExposure = 1;
  container.append(renderer.domElement);

  const scene = new Scene();
  const envTarget = darkStudio(renderer);
  scene.environment = envTarget.texture;

  // low warm sun behind the surface draws a glint path toward the viewer
  const sun = new DirectionalLight('#ffd9cf', 1.2);
  sun.position.set(0.8, 0.9, -12);
  scene.add(sun);

  const size = new Vector2(40, 36);
  const uniforms = { uTime: { value: 0 }, uHalf: { value: size.clone().multiplyScalar(0.5) } };

  const material = new MeshPhysicalMaterial({
    color: '#050102',
    metalness: 0,
    roughness: 0.06,
    specularIntensity: 1,
    ior: 1.45,
    transparent: true,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uHalf = uniforms.uHalf;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${HEIGHT}\nvarying vec2 vPlane;`)
      .replace(
        '#include <beginnormal_vertex>',
        `float eps = 0.04;
        float h0 = knixHeight(position.xy);
        float hx = knixHeight(position.xy + vec2(eps, 0.0));
        float hy = knixHeight(position.xy + vec2(0.0, eps));
        vec3 objectNormal = normalize(vec3(-(hx - h0) / eps, -(hy - h0) / eps, 1.0));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`,
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.xy, h0);\nvPlane = position.xy;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPlane;\nuniform vec2 uHalf;')
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `float fadeFar = 1.0 - smoothstep(uHalf.y * 0.1, uHalf.y * 0.9, vPlane.y);
        float fadeSide = 1.0 - smoothstep(uHalf.x * 0.7, uHalf.x, abs(vPlane.x));
        vec4 diffuseColor = vec4( diffuse, opacity * fadeFar * fadeSide );`,
      );
  };

  const geometry = new PlaneGeometry(size.x, size.y, small ? 160 : 300, small ? 140 : 260);
  const surface = new Mesh(geometry, material);
  surface.rotation.x = -Math.PI / 2;
  surface.position.z = -10;
  scene.add(surface);

  const camera = new PerspectiveCamera(34, 1, 0.1, 120);
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
  if (!reduced) window.addEventListener('scroll', onScroll, { passive: true });

  // camera pitched slightly up so the horizon sits in the lower third
  let rig = { y: 1, targetY: 2 };
  function render(t) {
    uniforms.uTime.value = t;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    camera.position.set(pointer.x * 0.3, rig.y + scrollP * 0.5, 5.5);
    camera.lookAt(pointer.x * 0.15, rig.targetY - pointer.y * 0.08, -6);
    renderer.render(scene, camera);
  }

  const clock = new Clock();
  let elapsed = 6;
  let running = false;
  let raf = 0;

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const narrow = camera.aspect < 0.9;
    camera.fov = narrow ? 50 : 34;
    rig = narrow ? { y: 1.3, targetY: 3.4 } : { y: 1, targetY: 2.05 };
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
    geometry.dispose();
    material.dispose();
    envTarget.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
