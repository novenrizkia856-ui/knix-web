/**
 * CTA background: red satin silk rendered per pixel (domain warped folds,
 * derivative normals, specular and sheen). A soft gaussian band means no
 * hard edges; the shader stays dark behind the headline for legibility.
 * Renders only while visible and disposes on teardown.
 */
import {
  Clock,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three';
import { hasWebGL } from './look.js';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uDpr;
uniform vec2 uRes;
uniform vec2 uPointer;
varying vec2 vUv;

vec2 grad(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(grad(i), f), dot(grad(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(grad(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(grad(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = vUv;
  // stretched horizontally so folds run like a draped satin ribbon
  vec2 p = vec2((uv.x - 0.5) * aspect * 1.1, (uv.y - 0.5) * 2.6);
  float t = uTime * 0.07;

  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  float field = fbm(p + 1.7 * q + vec2(t * 0.6 + uPointer.x * 0.08, 0.0));
  float h = sin(field * 6.5 + p.x * 1.1 + t * 2.0);

  // surface normal from screen derivatives of the fold height
  float k = 13.0 * uDpr;
  vec3 n = normalize(vec3(-dFdx(h) * k, -dFdy(h) * k, 1.0));
  vec3 v = vec3(0.0, 0.0, 1.0);
  vec3 l = normalize(vec3(-0.35 + sin(uTime * 0.08) * 0.35 + uPointer.x * 0.25, 0.55, 0.75));
  vec3 hv = normalize(l + v);

  float diffuse = max(dot(n, l), 0.0);
  float spec = pow(max(dot(n, hv), 0.0), 70.0);
  float sheen = pow(1.0 - max(dot(n, v), 0.0), 2.2);

  vec3 deep = vec3(0.035, 0.004, 0.008);
  vec3 satin = vec3(0.72, 0.03, 0.08);
  vec3 base = mix(deep, satin, smoothstep(-0.6, 0.9, h));
  vec3 col = base * (0.18 + 0.95 * diffuse)
    + vec3(1.0, 0.62, 0.6) * spec * 0.55
    + vec3(0.95, 0.12, 0.18) * sheen * 0.35;

  // soft ribbon band, no hard edges anywhere
  float center = uv.y - 0.5 - 0.1 * sin(uv.x * 3.0 + uTime * 0.12) - (uv.x - 0.5) * 0.22;
  float band = exp(-center * center * 16.0);
  band *= smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.82, uv.x);

  // quieter behind the headline
  float title = exp(-((uv.x - 0.5) * (uv.x - 0.5) * 5.0 + (uv.y - 0.56) * (uv.y - 0.56) * 26.0));
  col *= 1.0 - 0.5 * title;

  gl_FragColor = vec4(col * band, band);
}`;

export function mountSilk(container, { reduced = false } = {}) {
  if (!hasWebGL()) return null;
  let renderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  container.append(renderer.domElement);

  const uniforms = {
    uTime: { value: 8 },
    uDpr: { value: dpr },
    uRes: { value: new Vector2(1, 1) },
    uPointer: { value: new Vector2() },
  };
  const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, premultipliedAlpha: true, depthTest: false });
  const geometry = new PlaneGeometry(2, 2);
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const target = new Vector2();
  const onPointer = (e) => target.set((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2);
  if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

  const render = () => {
    uniforms.uPointer.value.lerp(target, 0.03);
    renderer.render(scene, camera);
  };

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    uniforms.uRes.value.set(width, height);
    if (!running) render();
  };

  const clock = new Clock();
  let running = false;
  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    uniforms.uTime.value += Math.min(clock.getDelta(), 0.05);
    render();
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

  const ro = new ResizeObserver(resize);
  ro.observe(container);
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
  render();
  container.classList.add('is-ready');

  return function destroy() {
    stop();
    io.disconnect();
    ro.disconnect();
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('visibilitychange', onVisibility);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
