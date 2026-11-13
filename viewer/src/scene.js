import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { KIND, kindInfo } from './palette.js';

// Two fixed views, no orbit:
//  - "iso": the 2:1 pixel isometric (azimuth 45 deg, elevation 30 deg), from one of four corners.
//  - "game": the top-down RPG view: the floor is a true plan, every vertical surface shows its
//    south face below its top edge. Done as an oblique projection: the camera looks straight
//    down and the world is sheared so height moves things north on screen (wallScale per metre).
const ISO_ELEV = THREE.MathUtils.degToRad(30);
const CAM_DIST = 600;

function gradientMap() {
  const data = new Uint8Array([70, 120, 190, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

// Palette quantisation with 4x4 ordered dithering. The palette is the kind colours at four
// brightness steps, so hues never drift; only the shading snaps. The background is left alone.
const PaletteShader = {
  uniforms: {
    tDiffuse: { value: null },
    palette: { value: [] },
    count: { value: 0 },
    pixelSize: { value: 3 },
    resolution: { value: new THREE.Vector2(1, 1) },
    strength: { value: 0.08 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec3 palette[128]; uniform int count; uniform float pixelSize;
    uniform vec2 resolution; uniform float strength; varying vec2 vUv;
    const float bayer[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    void main(){
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 bgd = src.rgb - palette[0];
      if (dot(bgd, bgd) < 0.0025) { gl_FragColor = src; return; }
      vec2 p = floor(vUv * resolution / pixelSize);
      int bx = int(mod(p.x, 4.0)); int by = int(mod(p.y, 4.0));
      float d = (bayer[by*4+bx] / 16.0 - 0.5) * strength;
      vec3 c = clamp(src.rgb + d, 0.0, 1.0);
      vec3 best = c; float bd = 1e9;
      for (int i = 0; i < 128; i++) {
        if (i >= count) break;
        vec3 q = palette[i]; vec3 diff = q - c; float dist = dot(diff, diff);
        if (dist < bd) { bd = dist; best = q; }
      }
      gl_FragColor = vec4(best, src.a);
    }`,
};

export class Scene {
  constructor(canvas, labelsEl) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.localClippingEnabled = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x55614e);   // the site's ground continues beyond the drawn context (owner 2026-11-13)

    this.camera = new THREE.OrthographicCamera(-50, 50, 50, -50, -2000, 4000);
    this.mode = 'iso';
    this.building = true;    // whole building (no cut, elevations in the game view) or one floor
    this.azimuth = 0;        // 0: from the south-west, then clockwise
    this.wallScale = 0.5;    // game view: screen metres north per metre of height
    this.target = new THREE.Vector3();
    this.orthoHalf = 50;

    this.scene.add(new THREE.HemisphereLight(0xe8e4ff, 0x4a4038, 0.9));
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
    sun.position.set(-40, 80, 30);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc0d0ff, 0.35);
    fill.position.set(50, 30, -60);
    this.scene.add(fill);

    this.labelRenderer = new CSS2DRenderer({ element: labelsEl });

    this.pixelSize = 3;
    this.gradient = gradientMap();
    this.materials = new Map();
    this.composer = new EffectComposer(this.renderer);
    this.pixelPass = new RenderPixelatedPass(this.pixelSize, this.scene, this.camera, { normalEdgeStrength: 0.35, depthEdgeStrength: 0.45 });
    this.composer.addPass(this.pixelPass);
    this.palettePass = new ShaderPass(PaletteShader);
    this.palettePass.enabled = false;
    this.composer.addPass(this.palettePass);
    this.composer.addPass(new OutputPass());
    this.buildPalette();

    // world carries the game-view shear; root holds the model, overlay the highlights
    this.world = new THREE.Group();
    this.world.matrixAutoUpdate = false;
    this.scene.add(this.world);
    this.root = new THREE.Group();
    this.world.add(this.root);
    this.overlay = new THREE.Group();
    this.world.add(this.overlay);
    this.clipPlanes = [];

    this.clock = new THREE.Clock();
    window.addEventListener('resize', () => this.resize());
    this.bindInput();
    this.resize();
    this.applyCamera();
  }

  buildPalette() {
    const cols = [];
    const seen = new Set();
    const push = (c) => { const k = c.getHex(); if (!seen.has(k)) { seen.add(k); cols.push(c); } };
    push(new THREE.Color(0x1b1a22));
    for (const k of Object.keys(KIND)) {
      const base = new THREE.Color(KIND[k].color);
      for (const f of [1.0, 0.78, 0.56, 0.36]) push(base.clone().multiplyScalar(f));
    }
    for (const f of [0.25, 0.45, 0.65, 0.85]) push(new THREE.Color(0x8f9aa0).multiplyScalar(f));
    push(new THREE.Color(0xff3b3b)); push(new THREE.Color(0xff8a3b)); push(new THREE.Color(0x3bff8a));
    while (cols.length < 128) cols.push(new THREE.Color(0));
    this.palettePass.uniforms.palette.value = cols.slice(0, 128);
    this.palettePass.uniforms.count.value = seen.size;
  }

  material(kind) {
    if (this.materials.has(kind)) return this.materials.get(kind);
    const info = kindInfo(kind);
    const m = new THREE.MeshToonMaterial({ color: info.color, gradientMap: this.gradient, side: THREE.DoubleSide });
    if (info.glass) { m.transparent = true; m.opacity = 0.55; m.depthWrite = false; }
    m.clippingPlanes = this.clipPlanes;
    this.materials.set(kind, m);
    return m;
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    const half = this.orthoHalf;
    this.camera.left = -half * (w / h); this.camera.right = half * (w / h);
    this.camera.top = half; this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
    this.palettePass.uniforms.resolution.value.set(w, h);
  }

  setPixelSize(n) {
    this.pixelSize = n;
    this.pixelPass.setPixelSize(n);
    this.palettePass.uniforms.pixelSize.value = n;
  }

  setEdges(on) {
    this.pixelPass.normalEdgeStrength = on ? 0.35 : 0;
    this.pixelPass.depthEdgeStrength = on ? 0.45 : 0;
  }

  setPalette(on) { this.palettePass.enabled = on; }

  /** Horizontal section cut on the model (not on highlights): keep geometry between bottomY
   *  and topY (either may be null). Applied per material so overlays stay whole. */
  setClip(bottomY, topY, extra = []) {
    const planes = [];
    if (topY != null) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), topY));
    if (bottomY != null) planes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), -bottomY));
    planes.push(...extra);
    this.clipPlanes = planes;
    // the urban context is never clipped: it is ground and neighbours, not part of a storey
    this.root.traverse((o) => { if (o.material && !o.userData.context) { o.material.clippingPlanes = planes; o.material.needsUpdate = true; } });
  }

  // ---------------------------------------------------------------- views
  /** Horizontal unit vector that is "up" on screen (north for azimuth 0, then rotated). */
  screenNorth() {
    const a = this.azimuth * Math.PI / 2;
    return new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)); // azimuth 0: north = -Z
  }

  applyCamera() {
    const north = this.screenNorth();
    if (this.mode === 'game' && this.building) {
      // whole building: the game view is a straight elevation, turned south, west, north, east
      const az = this.azimuth * Math.PI / 2;
      const dir = new THREE.Vector3(-Math.sin(az), 0, Math.cos(az));
      this.camera.position.copy(this.target).addScaledVector(dir, CAM_DIST);
      this.camera.up.set(0, 1, 0);
      this.world.matrix.identity();
    } else if (this.mode === 'iso') {
      // look from the corner opposite screen-north, 30 degrees up: the 2:1 pixel isometric
      const az = Math.PI / 4 + this.azimuth * Math.PI / 2; // 45 deg: from the south-west
      const dir = new THREE.Vector3(-Math.sin(az) * Math.cos(ISO_ELEV), Math.sin(ISO_ELEV), Math.cos(az) * Math.cos(ISO_ELEV));
      this.camera.position.copy(this.target).addScaledVector(dir, CAM_DIST);
      this.camera.up.set(0, 1, 0);
      this.world.matrix.identity();
    } else {
      this.camera.position.copy(this.target).add(new THREE.Vector3(0, CAM_DIST, 0));
      this.camera.up.copy(north);
      // shear: p' = p + north * (wallScale * y), so height moves things up the screen
      const k = this.wallScale;
      this.world.matrix.set(
        1, k * north.x, 0, 0,
        0, 1, 0, 0,
        0, k * north.z, 1, 0,
        0, 0, 0, 1);
    }
    this.world.matrixWorldNeedsUpdate = true;
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  /** In an elevation, a plane that removes everything nearer the camera than `distance`
   *  along the view direction from `centre` (an elevation drawing omits what stands in front). */
  nearPlane(centre, distance) {
    const az = this.azimuth * Math.PI / 2;
    const dir = new THREE.Vector3(-Math.sin(az), 0, Math.cos(az)); // from centre towards the camera
    const p = centre.clone().addScaledVector(dir, distance);
    const normal = dir.clone().negate();                          // keep the far side
    return new THREE.Plane(normal, -normal.dot(p));
  }

  setMode(mode) { this.mode = mode; this.applyCamera(); }
  setBuilding(on) { this.building = on; this.applyCamera(); }
  /** What the current view is called, for the panel. */
  viewName() {
    if (this.mode === 'iso') return ['south-west', 'south-east', 'north-east', 'north-west'][this.azimuth] + ' isometric';
    if (this.building) return ['south', 'west', 'north', 'east'][this.azimuth] + ' elevation';
    return 'plan, ' + ['north', 'east', 'south', 'west'][this.azimuth] + ' up';
  }
  setWallScale(k) { this.wallScale = k; this.applyCamera(); }
  rotateStep(steps) { this.azimuth = (this.azimuth + steps + 4) % 4; this.applyCamera(); }

  /** Frame a Box3 (model coordinates) in the current view. */
  frame(box, pad = 1.15) {
    if (!box || box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    if (this.mode === 'game' && !this.building) center.applyMatrix4(this.world.matrix);
    const size = box.getSize(new THREE.Vector3());
    this.target.copy(center);
    this.orthoHalf = Math.max(size.length() / 2, 0.5) * pad;
    this.camera.zoom = 1;
    this.resize();
    this.applyCamera();
  }

  /** Pan by screen fractions of the view's width and height. */
  pan(dx, dy) {
    const right = new THREE.Vector3(), up = new THREE.Vector3();
    this.camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
    const w = (this.camera.right - this.camera.left) / this.camera.zoom;
    const h = (this.camera.top - this.camera.bottom) / this.camera.zoom;
    this.target.add(right.multiplyScalar(dx * w)).add(up.multiplyScalar(dy * h));
    this.applyCamera();
  }

  /** Zoom by a factor about a screen point (NDC), keeping that point still. */
  zoomAt(factor, ndcX = 0, ndcY = 0) {
    const right = new THREE.Vector3(), up = new THREE.Vector3();
    this.camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
    const w = (this.camera.right - this.camera.left) / this.camera.zoom;
    const h = (this.camera.top - this.camera.bottom) / this.camera.zoom;
    const before = right.clone().multiplyScalar(ndcX * w / 2).add(up.clone().multiplyScalar(ndcY * h / 2));
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * factor, 0.7, 80);   // framed at 1: no zooming the building down to a speck (owner 2026-11-13)
    this.camera.updateProjectionMatrix();
    const after = before.clone().divideScalar(factor);
    this.target.add(before.sub(after));
    this.applyCamera();
  }

  bindInput() {
    let dragging = null;
    this.canvas.addEventListener('pointerdown', (e) => { dragging = { x: e.clientX, y: e.clientY, moved: 0 }; });
    window.addEventListener('pointerup', () => { dragging = null; });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const r = this.canvas.getBoundingClientRect();
      const dx = (e.clientX - dragging.x) / r.width, dy = (e.clientY - dragging.y) / r.height;
      dragging.x = e.clientX; dragging.y = e.clientY; dragging.moved += Math.abs(dx) + Math.abs(dy);
      this.pan(-dx, dy);
    });
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -((e.clientY - r.top) / r.height) * 2 + 1;
      this.zoomAt(e.deltaY < 0 ? 1.25 : 0.8, nx, ny);
    }, { passive: false });
  }

  clearOverlay() {
    for (const c of [...this.overlay.children]) {
      this.overlay.remove(c);
      if (c.geometry) c.geometry.dispose();
    }
  }

  render() {
    const t = this.clock.getElapsedTime();
    const pulse = 0.55 + 0.45 * Math.sin(t * 6);
    for (const c of this.overlay.children) if (c.userData.pulse && c.material) c.material.opacity = 0.35 + 0.5 * pulse;
    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);
  }
}
