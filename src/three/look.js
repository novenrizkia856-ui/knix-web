/**
 * Shared realism kit: renderer setup, studio lighting environment,
 * physically based materials with procedural micro surface detail.
 */
import {
  CanvasTexture,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  NoColorSpace,
  PCFSoftShadowMap,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function createRenderer({ small = false, shadows = true, maxDpr = 1.75 } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : maxDpr));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  // Neutral tone mapping keeps reds true instead of drifting orange.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.1;
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
  }
  return renderer;
}

/** Photographic studio: neutral room plus red strip lights and a top softbox. */
export function studioEnvironment(renderer) {
  const env = new RoomEnvironment();
  const panel = (w, h, color, intensity, x, y, z) => {
    const mesh = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide }),
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  panel(1.4, 7, '#ff1a30', 26, 7, 1.5, -3);
  panel(1.2, 6, '#ff3a2a', 14, -7, 0.5, -4);
  panel(6, 1.2, '#fff2ea', 12, 0, 7, 2);
  panel(3, 3, '#ffd6c2', 4, 2, -5, 6);

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, 0.035);
  pmrem.dispose();
  env.dispose?.();
  env.traverse((obj) => {
    obj.geometry?.dispose();
    obj.material?.dispose?.();
  });
  return target;
}

function canvasTexture(size, draw, repeat = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = NoColorSpace;
  return texture;
}

function makeTextures() {
  const grain = canvasTexture(256, (g, s) => {
    const img = g.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 200 + Math.random() * 55;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, 3);

  const brushed = canvasTexture(512, (g, s) => {
    g.fillStyle = '#c4c4c4';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 3200; i++) {
      const v = Math.round(140 + Math.random() * 115);
      g.strokeStyle = `rgb(${v},${v},${v})`;
      g.globalAlpha = 0.2 + Math.random() * 0.4;
      g.lineWidth = 0.4 + Math.random() * 1.2;
      const y = Math.random() * s;
      const x = Math.random() * s;
      g.beginPath();
      g.moveTo(x - s * 0.7, y);
      g.lineTo(x + s * 0.7, y);
      g.stroke();
    }
  });

  return { grain, brushed };
}

export function createMaterials({ small = false, transmission = false } = {}) {
  const tex = makeTextures();
  const mats = {
    /* deep red automotive lacquer: pigment base, glossy clearcoat */
    lacquer: new MeshPhysicalMaterial({
      color: '#6e0110', metalness: 0.55, roughness: 0.3, roughnessMap: tex.grain,
      clearcoat: 1, clearcoatRoughness: 0.02, sheen: 0.25, sheenColor: new Color('#ff2a40'),
    }),
    chrome: new MeshPhysicalMaterial({ color: '#f6f3f3', metalness: 1, roughness: 0.055 }),
    aluminum: new MeshPhysicalMaterial({
      color: '#dcd9d9', metalness: 1, roughness: 0.36, roughnessMap: tex.brushed, anisotropy: 0.85,
    }),
    graphite: new MeshPhysicalMaterial({
      color: '#1d1919', metalness: 0.7, roughness: 0.42, roughnessMap: tex.grain, clearcoat: 0.5, clearcoatRoughness: 0.25,
    }),
    ceramic: new MeshPhysicalMaterial({
      color: '#0e0b0b', metalness: 0, roughness: 0.26, roughnessMap: tex.grain, clearcoat: 1, clearcoatRoughness: 0.04,
    }),
    gold: new MeshPhysicalMaterial({ color: '#e9bb8c', metalness: 1, roughness: 0.22, roughnessMap: tex.grain }),
    glass: transmission && !small
      ? new MeshPhysicalMaterial({
          color: '#ffffff', metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.9, ior: 1.52,
          attenuationColor: new Color('#e0142c'), attenuationDistance: 0.9, clearcoat: 1, clearcoatRoughness: 0.02,
        })
      : new MeshPhysicalMaterial({
          color: '#b8061c', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.6,
          clearcoat: 1, clearcoatRoughness: 0.02, side: DoubleSide, depthWrite: false,
        }),
    glow: new MeshBasicMaterial({ color: new Color('#ff2a3d').multiplyScalar(2.2), toneMapped: false }),
  };
  return {
    mats,
    dispose() {
      Object.values(mats).forEach((m) => m.dispose());
      Object.values(tex).forEach((t) => t.dispose());
    },
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

/** Beveled square link. Two of them offset by 1.2 on x (one turned 90° on x) interlock. */
export function frameGeometry(low = false) {
  const shape = roundedSquare(1.1, 0.26);
  shape.holes.push(roundedSquare(0.72, 0.1));
  const geo = new ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: low ? 3 : 6,
    curveSegments: low ? 6 : 14,
  });
  geo.center();
  return geo;
}
