/**
 * Photographic section subjects. Each builder returns { scene, camera, update }.
 * Materials come from the shared kit so every view shares compiled shaders.
 */
import {
  BoxGeometry,
  CatmullRomCurve3,
  DirectionalLight,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  Mesh,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  ShadowMaterial,
  TubeGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { frameGeometry } from './look.js';

function stage({ small, fov = 30, shadow = true, shadowSize = 4 }) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(fov, 1, 0.1, 60);
  const key = new DirectionalLight('#fff3ec', 2.6);
  key.position.set(2.5, 5, 3.5);
  if (shadow) {
    key.castShadow = true;
    const size = small ? 512 : 1024;
    key.shadow.mapSize.set(size, size);
    Object.assign(key.shadow.camera, {
      left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, near: 0.5, far: 20,
    });
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
  }
  const rim = new PointLight('#ff1f36', 34, 14);
  rim.position.set(-3, 2, -3);
  const fill = new PointLight('#ffc2a6', 6, 12);
  fill.position.set(3, 1, 4);
  scene.add(key, rim, fill);
  return { scene, camera };
}

function floor(size = 8, opacity = 0.42) {
  const mesh = new Mesh(new PlaneGeometry(size, size), new ShadowMaterial({ opacity }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

const shade = (mesh, cast = true, receive = true) => {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
};

const aim = (camera, position, target) => {
  camera.position.set(...position);
  camera.lookAt(...target);
};

/* Pool composition: two material prisms on a ceramic plinth */
function composition({ kit, small }) {
  const { mats } = kit;
  const { scene, camera } = stage({ small, fov: 26, shadowSize: 3 });
  aim(camera, [3.6, 2.9, 5.6], [0, 0.8, 0]);
  const group = new Group();
  scene.add(group);

  const plinth = shade(new Mesh(new RoundedBoxGeometry(2.8, 0.2, 1.8, 4, 0.06), mats.ceramic));
  const a = shade(new Mesh(new RoundedBoxGeometry(0.66, 2, 0.66, 5, 0.07), mats.lacquer));
  a.position.set(-0.6, 1.1, 0.2);
  const b = shade(new Mesh(new RoundedBoxGeometry(0.66, 1.5, 0.66, 5, 0.07), mats.aluminum));
  b.position.set(0.6, 0.85, -0.2);
  group.add(plinth, a, b);

  const ground = floor();
  ground.position.y = -0.11;
  scene.add(ground);

  return {
    fitAspect: 1.25,
    scene,
    camera,
    update(t, { pointer, progress }) {
      group.rotation.y = -0.35 + Math.sin(t * 0.25) * 0.12 + pointer.x * 0.18 + (progress - 0.5) * 0.5;
    },
  };
}

/* Twofold: ceramic, red glass and brushed aluminum slabs separating with scroll */
function twofold({ kit, small }) {
  const { mats } = kit;
  const { scene, camera } = stage({ small, fov: 28, shadowSize: 3.5 });
  aim(camera, [0, 3.4, 8], [0, 0, 0]);
  const group = new Group();
  group.rotation.set(0.1, -0.7, 0);
  scene.add(group);

  const slab = new RoundedBoxGeometry(2.6, 0.18, 2.6, 5, 0.08);
  const base = shade(new Mesh(slab, mats.ceramic));
  const mid = shade(new Mesh(slab, mats.glass), false, true);
  const top = shade(new Mesh(slab, mats.aluminum));
  const beamGeo = new BoxGeometry(0.03, 1, 0.03);
  const beamLow = new Mesh(beamGeo, mats.glow);
  const beamHigh = new Mesh(beamGeo, mats.glow);
  group.add(base, mid, top, beamLow, beamHigh);

  const ground = floor(12, 0.35);
  scene.add(ground);

  return {
    fitAspect: 1.05,
    scene,
    camera,
    update(t, { pointer, progress }) {
      const sep = 0.45 + progress * 0.7;
      base.position.y = -sep;
      top.position.y = sep + Math.sin(t * 0.8) * 0.03;
      // light only in the gaps between slabs (slab half height 0.09)
      const gapLow = sep - 0.18;
      const gapHigh = top.position.y - 0.18;
      beamLow.scale.y = Math.max(0.001, gapLow);
      beamLow.position.y = -sep / 2;
      beamHigh.scale.y = Math.max(0.001, gapHigh);
      beamHigh.position.y = top.position.y / 2;
      group.rotation.y = -0.7 + Math.sin(t * 0.2) * 0.15 + pointer.x * 0.2;
      group.position.y = Math.sin(t * 0.5) * 0.05;
      ground.position.y = -sep - 0.7;
    },
  };
}

/* Objects floating around the pool card */
function poolFloat({ kit }) {
  const { mats } = kit;
  const fov = 35;
  const distance = 9;
  const { scene, camera } = stage({ small: true, fov, shadow: false });
  aim(camera, [0, 0, distance], [0, 0, 0]);

  const cube = new Mesh(new RoundedBoxGeometry(0.62, 0.62, 0.62, 6, 0.09), mats.lacquer);
  const bar = new Mesh(new RoundedBoxGeometry(0.16, 1.3, 0.16, 4, 0.06), mats.chrome);
  const gem = new Mesh(new OctahedronGeometry(0.28, 0), mats.gold);
  scene.add(cube, bar, gem);
  const halfH = Math.tan(((fov * Math.PI) / 180) / 2) * distance;

  return {
    // positions are computed from the real frustum, so never zoom this view out
    fitAspect: 0.01,
    scene,
    camera,
    // objects live in the margin band around the card, never over its controls
    update(t, { pointer, aspect }) {
      const halfW = halfH * aspect;
      cube.position.set(halfW * 0.7 + pointer.x * 0.1, halfH * 0.9 + Math.sin(t * 0.7) * 0.05, 0.5);
      cube.rotation.set(t * 0.25, t * 0.4, 0.3);
      bar.position.set(-halfW * 0.55, halfH * 0.9 + Math.sin(t * 0.6 + 1) * 0.05, 0.2);
      bar.rotation.set(0.2, t * 0.5, 1.2);
      gem.position.set(halfW * 0.62, -halfH * 0.92 + Math.sin(t * 0.9) * 0.04, -0.2);
      gem.rotation.set(t * 0.6, t * 0.3, 0);
    },
  };
}

/* Swap: two material tiles joined by a chrome route with light pulses */
function swap({ kit, small }) {
  const { mats } = kit;
  const { scene, camera } = stage({ small, fov: 30, shadowSize: 3.5 });
  aim(camera, [0, 2.6, 7.4], [0, 0.45, 0]);
  const group = new Group();
  scene.add(group);

  const tile = new RoundedBoxGeometry(1.2, 0.26, 1.2, 6, 0.14);
  const a = shade(new Mesh(tile, mats.lacquer));
  a.position.set(-1.7, 0, 0.3);
  const b = shade(new Mesh(tile, mats.aluminum));
  b.position.set(1.7, 0, -0.3);
  const curve = new CatmullRomCurve3([
    new Vector3(-1.7, 0.2, 0.3),
    new Vector3(-0.9, 1.1, 0.2),
    new Vector3(0, 1.35, 0),
    new Vector3(0.9, 1.1, -0.2),
    new Vector3(1.7, 0.2, -0.3),
  ]);
  const tube = shade(new Mesh(new TubeGeometry(curve, 96, 0.04, 12), mats.chrome), true, false);
  const hub = shade(new Mesh(new OctahedronGeometry(0.22, 0), mats.gold));
  hub.position.copy(curve.getPointAt(0.5));
  const pulseGeo = new RoundedBoxGeometry(0.12, 0.12, 0.12, 2, 0.03);
  const pulses = [0, 1, 2].map(() => new Mesh(pulseGeo, mats.glow));
  group.add(a, b, tube, hub, ...pulses);

  const ground = floor(10, 0.38);
  ground.position.y = -0.13;
  scene.add(ground);

  return {
    fitAspect: 1.9,
    scene,
    camera,
    update(t, { pointer }) {
      pulses.forEach((p, i) => {
        p.position.copy(curve.getPointAt((t * 0.28 + i / 3) % 1));
        p.rotation.set(t, t * 1.3, 0);
      });
      hub.rotation.y = t * 0.8;
      group.rotation.y = Math.sin(t * 0.3) * 0.2 + pointer.x * 0.2;
    },
  };
}

/* Stake: a stack of lacquer and aluminum slabs under a chrome lock link */
function stake({ kit, small }) {
  const { mats } = kit;
  const { scene, camera } = stage({ small, fov: 28, shadowSize: 3 });
  aim(camera, [3.6, 3.4, 5.6], [0, 0.85, 0]);
  const group = new Group();
  scene.add(group);

  const slab = new RoundedBoxGeometry(1.4, 0.17, 1.4, 4, 0.05);
  const layers = Array.from({ length: 7 }, (_, i) => {
    const mesh = shade(new Mesh(slab, i % 2 ? mats.aluminum : mats.lacquer));
    mesh.position.y = 0.085 + i * 0.19;
    group.add(mesh);
    return mesh;
  });
  const lock = shade(new Mesh(frameGeometry(small), mats.chrome), true, false);
  lock.scale.setScalar(0.55);
  lock.rotation.x = Math.PI / 2;
  group.add(lock);
  scene.add(floor());

  return {
    fitAspect: 1.0,
    scene,
    camera,
    update(t, { pointer }) {
      layers.forEach((m, i) => (m.rotation.y = Math.sin(t * 0.6 + i * 0.55) * 0.08));
      lock.rotation.z = t * 0.5;
      lock.position.y = 1.95 + Math.sin(t * 0.9) * 0.06;
      group.rotation.y = -0.4 + pointer.x * 0.2 + Math.sin(t * 0.2) * 0.1;
    },
  };
}

/* Vote: a ceramic ballot box receiving a lacquer ballot */
function vote({ kit, small }) {
  const { mats } = kit;
  const { scene, camera } = stage({ small, fov: 28, shadowSize: 3 });
  aim(camera, [3, 2.8, 5.4], [0, 0.75, 0]);
  const group = new Group();
  scene.add(group);

  const box = shade(new Mesh(new RoundedBoxGeometry(1.9, 1.3, 1.3, 5, 0.08), mats.ceramic));
  box.position.y = 0.65;
  const band = shade(new Mesh(new RoundedBoxGeometry(1.94, 0.08, 1.34, 3, 0.03), mats.aluminum));
  band.position.y = 1.12;
  const slot = new Mesh(new BoxGeometry(1.02, 0.012, 0.1), new MeshBasicMaterial({ color: '#000000' }));
  slot.position.y = 1.302;
  const ballot = shade(new Mesh(new RoundedBoxGeometry(0.9, 1.1, 0.03, 2, 0.012), mats.lacquer));
  group.add(box, band, slot, ballot);
  scene.add(floor());

  return {
    fitAspect: 1.1,
    scene,
    camera,
    update(t, { pointer }) {
      const u = (t * 0.3) % 1;
      let y;
      if (u < 0.7) {
        const e = u / 0.7;
        y = 2.7 - e * e * (3 - 2 * e) * 1.35;
      } else {
        y = 1.35 - ((u - 0.7) / 0.3) * 0.75;
      }
      ballot.position.set(0, y, 0);
      ballot.scale.setScalar(Math.min(1, u / 0.08) || 0.001);
      group.rotation.y = -0.5 + Math.sin(t * 0.25) * 0.12 + pointer.x * 0.2;
    },
  };
}

/* Agents: a processor with gold pins and traces carrying light */
function agents({ kit, small }) {
  const { mats } = kit;
  const { scene, camera } = stage({ small, fov: 28, shadowSize: 2.5 });
  aim(camera, [2.8, 3.6, 4.2], [0, 0, 0]);
  const group = new Group();
  scene.add(group);

  const board = shade(new Mesh(new RoundedBoxGeometry(2.8, 0.1, 2.8, 3, 0.03), mats.graphite), false, true);
  const lid = shade(new Mesh(new RoundedBoxGeometry(1.2, 0.16, 1.2, 4, 0.05), mats.aluminum));
  lid.position.y = 0.13;
  const die = new Mesh(new RoundedBoxGeometry(0.42, 0.02, 0.42, 2, 0.008), mats.glow);
  die.position.y = 0.215;
  group.add(board, lid, die);

  const n = 9;
  const pins = new InstancedMesh(new BoxGeometry(0.05, 0.03, 0.26), mats.gold, n * 4);
  const traces = new InstancedMesh(new BoxGeometry(0.018, 0.006, 1), mats.gold, n * 4);
  pins.castShadow = true;
  const dummy = new Object3D();
  const paths = [];
  let k = 0;
  for (let side = 0; side < 4; side++) {
    const ang = (side * Math.PI) / 2;
    const dir = new Vector3(Math.sin(ang), 0, Math.cos(ang));
    const tan = new Vector3(Math.cos(ang), 0, -Math.sin(ang));
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 0.12;
      const len = 0.25 + (((i * 37 + side * 11) % 7) * 0.05);
      dummy.rotation.set(0, ang, 0);
      dummy.position.copy(dir).multiplyScalar(0.72).addScaledVector(tan, off).setY(0.07);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      pins.setMatrixAt(k, dummy.matrix);
      dummy.position.copy(dir).multiplyScalar(0.85 + len / 2).addScaledVector(tan, off).setY(0.053);
      dummy.scale.set(1, 1, len);
      dummy.updateMatrix();
      traces.setMatrixAt(k, dummy.matrix);
      paths.push({ dir, tan, off, len });
      k++;
    }
  }
  group.add(pins, traces);

  const pulseGeo = new BoxGeometry(0.04, 0.02, 0.07);
  const pulses = [3, 13, 20, 26, 31, 8].map((index, i) => {
    const mesh = new Mesh(pulseGeo, mats.glow);
    group.add(mesh);
    return { mesh, path: paths[index], phase: i / 6 };
  });
  const ground = floor(8, 0.4);
  ground.position.y = -0.06;
  scene.add(ground);

  return {
    fitAspect: 1.35,
    scene,
    camera,
    update(t, { pointer }) {
      pulses.forEach(({ mesh, path, phase }) => {
        const u = (t * 0.45 + phase) % 1;
        mesh.position.copy(path.dir).multiplyScalar(0.85 + u * path.len).addScaledVector(path.tan, path.off).setY(0.06);
        mesh.rotation.y = Math.atan2(path.dir.x, path.dir.z);
      });
      group.rotation.y = t * 0.12 + pointer.x * 0.3;
    },
  };
}

/* Markets: an aluminum bar field with one lacquer bar, gently breathing */
function markets({ kit, small }) {
  const { mats } = kit;
  const { scene, camera } = stage({ small, fov: 28, shadowSize: 3 });
  aim(camera, [4.4, 3.8, 4.8], [0, 0.45, 0]);
  const group = new Group();
  scene.add(group);

  const base = shade(new Mesh(new RoundedBoxGeometry(3.1, 0.14, 3.1, 3, 0.05), mats.ceramic), false, true);
  base.position.y = -0.07;
  const N = 6;
  const step = 0.46;
  const barGeo = new RoundedBoxGeometry(0.3, 1, 0.3, 2, 0.04);
  const bars = new InstancedMesh(barGeo, mats.aluminum, N * N - 1);
  bars.castShadow = true;
  bars.receiveShadow = true;
  const highlight = shade(new Mesh(barGeo, mats.lacquer));
  group.add(base, bars, highlight);
  const ground = floor(10, 0.35);
  ground.position.y = -0.15;
  scene.add(ground);
  const dummy = new Object3D();

  return {
    fitAspect: 1.8,
    scene,
    camera,
    update(t, { pointer }) {
      let k = 0;
      for (let x = 0; x < N; x++) {
        for (let z = 0; z < N; z++) {
          const px = (x - (N - 1) / 2) * step;
          const pz = (z - (N - 1) / 2) * step;
          const h = 0.35 + 0.85 * (0.5 + 0.5 * Math.sin(x * 0.9 + t * 0.6) * Math.cos(z * 0.7 - t * 0.4));
          if (x === 3 && z === 2) {
            highlight.scale.set(1, h + 0.7, 1);
            highlight.position.set(px, (h + 0.7) / 2, pz);
            continue;
          }
          dummy.position.set(px, h / 2, pz);
          dummy.scale.set(1, h, 1);
          dummy.updateMatrix();
          bars.setMatrixAt(k++, dummy.matrix);
        }
      }
      bars.instanceMatrix.needsUpdate = true;
      group.rotation.y = -0.2 + Math.sin(t * 0.2) * 0.1 + pointer.x * 0.2;
    },
  };
}

/* Chain: interlocked lacquer and chrome links turning on their axis */
function chain({ kit, small }) {
  const { mats } = kit;
  const { scene, camera } = stage({ small, fov: 30, shadow: false });
  aim(camera, [0, 0, 7.2], [0, 0, 0]);
  const group = new Group();
  const geo = frameGeometry(small);
  const s = 0.62;
  for (let i = 0; i < 4; i++) {
    const link = new Mesh(geo, i % 2 ? mats.chrome : mats.lacquer);
    link.scale.setScalar(s);
    link.position.x = (i - 1.5) * 1.2 * s;
    if (i % 2) link.rotation.x = Math.PI / 2;
    group.add(link);
  }
  const holder = new Group();
  holder.rotation.z = 0.35;
  holder.add(group);
  scene.add(holder);

  return {
    fitAspect: 1.45,
    scene,
    camera,
    update(t, { pointer }) {
      group.rotation.x = t * 0.35;
      holder.rotation.y = Math.sin(t * 0.3) * 0.3 + pointer.x * 0.25;
      holder.position.y = Math.sin(t * 0.6) * 0.08;
    },
  };
}

export const BUILDERS = {
  composition,
  twofold,
  'pool-float': poolFloat,
  swap,
  stake,
  vote,
  agents,
  markets,
  chain,
};
