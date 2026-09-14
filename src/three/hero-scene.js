/**
 * Hero centerpiece: a liquid core held by two orbiting asset streams.
 * Renders only while visible, caps pixel ratio, and disposes on teardown.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  Group,
  IcosahedronGeometry,
  Mesh,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  WebGLRenderer,
} from 'three';

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const coreMaterial = () =>
  new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0.16 },
      uIris: { value: new Color('#968cff') },
      uDeep: { value: new Color('#2a2280') },
      uGlacier: { value: new Color('#7fdcf0') },
    },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uAmp;
      varying vec3 vN; varying vec3 vView; varying float vD;
      ${NOISE}
      void main(){
        vec3 p = position;
        float n = snoise(normal * 1.35 + vec3(uTime * .16, uTime * .11, -uTime * .09));
        float n2 = snoise(normal * 3.2 - vec3(uTime * .22));
        float d = n * uAmp + n2 * uAmp * .22;
        p += normal * d;
        vD = d;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        vView = normalize(-mv.xyz);
        vN = normalize(normalMatrix * (normal + vec3(n2 * .18)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uIris; uniform vec3 uDeep; uniform vec3 uGlacier;
      varying vec3 vN; varying vec3 vView; varying float vD;
      void main(){
        float f = pow(1. - max(dot(vN, vView), 0.), 2.6);
        vec3 body = mix(vec3(.018,.017,.03), uDeep * .55, smoothstep(-.2,.25,vD));
        float band = smoothstep(.72,.98, vN.y * .5 + .5) * .55;
        float side = smoothstep(.35,1., vN.x) * .35;
        vec3 col = body + uIris * f * 1.25 + vec3(.95,.94,1.) * band * f * 1.4 + uGlacier * side * f;
        col += vec3(1.) * pow(max(dot(reflect(-vView, vN), normalize(vec3(-.4,.8,.6))), 0.), 28.) * .55;
        gl_FragColor = vec4(col, 1.);
      }`,
  });

function orbitPoints(count, radius, spread, color, size) {
  const geo = new BufferGeometry();
  const seed = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seed[i * 3] = Math.random() * Math.PI * 2; // angle
    seed[i * 3 + 1] = (Math.random() - 0.5) * spread; // band offset
    seed[i * 3 + 2] = 0.4 + Math.random() * 0.9; // speed
  }
  geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aSeed', new BufferAttribute(seed, 3));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: radius },
      uColor: { value: new Color(color) },
      uSize: { value: size },
      uPixel: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uRadius; uniform float uSize; uniform float uPixel;
      attribute vec3 aSeed; varying float vA;
      void main(){
        float a = aSeed.x + uTime * .12 * aSeed.z;
        float r = uRadius + aSeed.y;
        vec3 p = vec3(cos(a) * r, sin(a * 3. + aSeed.x) * aSeed.y * .35, sin(a) * r);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        vA = .35 + .65 * (.5 + .5 * sin(a * 2. + aSeed.x * 7.));
        gl_PointSize = uSize * uPixel * aSeed.z * (6. / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vA;
      void main(){
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, 0., d);
        gl_FragColor = vec4(uColor, a * a * vA);
      }`,
  });
  return new Points(geo, mat);
}

function ringLine(radius, color, opacity) {
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color(color) }, uOpacity: { value: opacity }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying vec2 vUv;
      void main(){
        float sweep = pow(fract(vUv.x - uTime * .05), 6.);
        gl_FragColor = vec4(uColor, uOpacity * (.25 + sweep * 1.6));
      }`,
  });
  return new Mesh(new TorusGeometry(radius, 0.0035, 6, 220), mat);
}

export function mountHeroScene(container, { reduced = false } = {}) {
  const small = window.matchMedia('(max-width: 720px)').matches;
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: !small, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  container.append(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 7.4);

  const world = new Group();
  scene.add(world);

  const core = new Mesh(new IcosahedronGeometry(1.25, small ? 28 : 64), coreMaterial());
  world.add(core);

  const orbitA = new Group();
  orbitA.rotation.set(1.18, 0.1, -0.42);
  const pointsA = orbitPoints(small ? 520 : 1100, 2.05, 0.28, '#e9e7ff', 5.5);
  orbitA.add(pointsA, ringLine(2.05, '#c4bdff', 0.35));
  world.add(orbitA);

  const orbitB = new Group();
  orbitB.rotation.set(1.62, -0.55, 0.62);
  const pointsB = orbitPoints(small ? 380 : 800, 2.55, 0.42, '#968cff', 6.5);
  orbitB.add(pointsB, ringLine(2.55, '#7fdcf0', 0.22));
  world.add(orbitB);

  const halo = orbitPoints(small ? 160 : 320, 3.6, 1.6, '#7fdcf0', 3.2);
  halo.rotation.x = 1.45;
  world.add(halo);

  const animated = [core.material, pointsA.material, pointsB.material, halo.material,
    ...orbitA.children.concat(orbitB.children).map((m) => m.material)];
  [pointsA, pointsB, halo].forEach((p) => (p.material.uniforms.uPixel.value = dpr));

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width / height < 0.9 ? 9.2 : 7.4;
    camera.updateProjectionMatrix();
    if (reduced) render(8);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  const clock = new Clock();
  let elapsed = 6;
  let running = false;
  let raf = 0;
  let scrollP = 0;

  function render(t) {
    animated.forEach((m) => (m.uniforms.uTime.value = t));
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;
    world.rotation.y = t * 0.06 + pointer.x * 0.35;
    world.rotation.x = pointer.y * 0.2 + scrollP * 0.6;
    orbitA.rotation.z = -0.42 + t * 0.05;
    orbitB.rotation.z = 0.62 - t * 0.035;
    const s = 1 - scrollP * 0.18;
    world.scale.setScalar(s);
    world.position.y = scrollP * 0.9;
    renderer.render(scene, camera);
  }

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

  const io = new IntersectionObserver(([entry]) => (entry.isIntersecting && !document.hidden ? start() : stop()));
  io.observe(container);
  const onVisibility = () => (document.hidden ? stop() : container.getBoundingClientRect().bottom > 0 && start());
  document.addEventListener('visibilitychange', onVisibility);

  const onScroll = () => {
    const h = container.getBoundingClientRect().height || 1;
    scrollP = Math.min(1, Math.max(0, window.scrollY / h));
  };
  if (!reduced) window.addEventListener('scroll', onScroll, { passive: true });

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
    scene.traverse((obj) => {
      obj.geometry?.dispose();
      obj.material?.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  };
}
