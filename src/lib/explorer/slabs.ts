import { DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PlaneGeometry, ShaderMaterial } from 'three';

export type Rgb = readonly [number, number, number];

export type Style = 'plain' | 'end' | 'page' | 'link';
const styleIndex: Record<Style, number> = { plain: 0, end: 1, page: 2, link: 3 };

/** One box as a flat rectangle in world space: CSS px, origin at the screen centre, y up, lifted to `z`. */
export type Slab = {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  color: Rgb;
  /** 0–1: how strongly the fill shows the colour. */
  fill: number;
  /** 0–1: hover and focus emphasis; a glowing box also casts a shadow. */
  glow: number;
  style: Style;
};

/**
 * Each quad is drawn this much larger than its box, in world px, so the
 * filtered edge has pixels to fade into, plus room for a lifted box's shadow.
 */
const EDGE_PAD = 1.5, SHADOW_PAD = 30;

const vertexShader = /* glsl */ `
  attribute vec4 aRect;
  attribute vec2 aDepth;
  attribute vec3 aColor;
  attribute vec3 aState;
  varying vec2 vLocal;
  varying vec2 vHalf;
  varying vec3 vColor;
  varying vec3 vState;
  void main() {
    vHalf = aRect.zw * .5;
    vLocal = position.xy * (aRect.zw + 2. * aDepth.y);
    vColor = aColor;
    vState = aState;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(aRect.xy + vLocal, aDepth.x, 1.);
  }
`;

/*
 * Edges are antialiased analytically rather than by multisampling: each
 * fragment knows its signed distance to the box in world px, and fwidth says
 * how many world px one screen pixel spans there, which tilt and perspective
 * change. Filtering over exactly one pixel gives smooth edges at any angle for
 * the price of one fragment per pixel.
 */
const fragmentShader = /* glsl */ `
  uniform vec3 uBackground;
  uniform float uTime;
  varying vec2 vLocal;
  varying vec2 vHalf;
  varying vec3 vColor;
  varying vec3 vState;

  /** How much of this pixel lies where the distance d is negative, given aa world px per pixel. */
  float covered(float d, float aa) {
    return clamp(.5 - d / aa, 0., 1.);
  }

  void main() {
    float fill = vState.x, glow = vState.y, style = vState.z;
    float aa = max(length(fwidth(vLocal)) * .7071, 1e-4);
    vec2 q = abs(vLocal) - vHalf;
    float d = length(max(q, 0.)) + min(max(q.x, q.y), 0.);
    float body = covered(d, aa);
    float border = body - covered(d + 1., aa);

    // A lifted box casts a soft shadow, offset away from the light.
    vec2 s = abs(vLocal - vec2(3., -5.) * glow) - vHalf;
    float sigma = 3. + 9. * glow;
    float outside = length(max(s, 0.));
    float shadow = .55 * glow * exp(-outside * outside / (2. * sigma * sigma));

    vec2 uv = vLocal / (2. * vHalf) + .5;
    float amount = (.07 + .5 * fill + .25 * glow) * (.82 + .18 * uv.y);
    // Styles arrive as interpolated floats, which need not be exactly whole, so compare by range.
    if (style < .5) {
    } else if (style < 1.5) {
      // The end symbol: hatched, with stripes fixed to the box and filtered like its edges.
      float u = vLocal.x + vLocal.y;
      float t = abs(fract(u / 10.) - .5) * 10.;
      amount *= .25 + .5 * clamp((2.5 - t) / max(fwidth(u), 1e-4) + .5, 0., 1.);
    } else if (style < 2.5) {
      // The page shimmers, as everything inside it is the page again.
      amount += .1 * (.5 + .5 * sin(uTime * 1.7 - uv.x * 9.));
    } else {
      amount *= .7;
    }
    vec3 color = mix(uBackground, vColor, amount);
    color = mix(color, vColor * (1. + .35 * glow), border * (.45 + .55 * max(glow, fill)));

    // The box over its shadow, which is black.
    float alpha = body + (1. - body) * shadow;
    gl_FragColor = vec4(color * body / max(alpha, 1e-4), alpha);
  }
`;

/** Every visible box, drawn in one call. */
export class Slabs {
  readonly mesh: Mesh;
  readonly #geometry: InstancedBufferGeometry;
  readonly #rect: InstancedBufferAttribute;
  readonly #depth: InstancedBufferAttribute;
  readonly #color: InstancedBufferAttribute;
  readonly #state: InstancedBufferAttribute;
  readonly #material: ShaderMaterial;

  constructor(readonly capacity: number, background: Rgb) {
    const quad = new PlaneGeometry(1, 1);
    this.#geometry = new InstancedBufferGeometry();
    this.#geometry.index = quad.index;
    this.#geometry.setAttribute('position', quad.getAttribute('position'));
    const attribute = (size: number) => new InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(DynamicDrawUsage);
    this.#rect = attribute(4);
    this.#depth = attribute(2);
    this.#color = attribute(3);
    this.#state = attribute(3);
    this.#geometry.setAttribute('aRect', this.#rect);
    this.#geometry.setAttribute('aDepth', this.#depth);
    this.#geometry.setAttribute('aColor', this.#color);
    this.#geometry.setAttribute('aState', this.#state);
    this.#material = new ShaderMaterial({
      uniforms: { uBackground: { value: background }, uTime: { value: 0 } },
      vertexShader,
      fragmentShader,
      // Edges and shadows blend over what is beneath, so boxes are drawn back to front instead of depth-tested.
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    this.mesh = new Mesh(this.#geometry, this.#material);
    // Boxes move every frame and are culled on the CPU already.
    this.mesh.frustumCulled = false;
  }

  /** Draws `slabs` in order, so later ones cover earlier ones. */
  update(slabs: readonly Slab[], time: number): void {
    const count = Math.min(this.capacity, slabs.length);
    for (let i = 0; i < count; i += 1) {
      const s = slabs[i]!;
      this.#rect.setXYZW(i, s.x, s.y, s.w, s.h);
      this.#depth.setXY(i, s.z, EDGE_PAD + SHADOW_PAD * s.glow);
      this.#color.setXYZ(i, ...s.color);
      this.#state.setXYZ(i, s.fill, s.glow, styleIndex[s.style]);
    }
    this.#geometry.instanceCount = count;
    this.#rect.needsUpdate = this.#depth.needsUpdate = this.#color.needsUpdate = this.#state.needsUpdate = true;
    this.#material.uniforms.uTime!.value = time;
  }

  dispose(): void {
    this.#geometry.dispose();
    this.#material.dispose();
  }
}
