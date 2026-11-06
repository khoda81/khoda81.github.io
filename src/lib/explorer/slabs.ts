import { BoxGeometry, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Matrix4, ShaderMaterial } from 'three';

export type Rgb = readonly [number, number, number];

export type Style = 'plain' | 'end' | 'page' | 'link';
const styleIndex: Record<Style, number> = { plain: 0, end: 1, page: 2, link: 3 };

/** One box as a slab in world space: CSS px, origin at the screen centre, y up, front face at `z`. */
export type Slab = {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  color: Rgb;
  /** 0–1: how strongly the fill shows the colour. */
  fill: number;
  /** 0–1: hover and focus emphasis. */
  glow: number;
  style: Style;
};

const DEPTH = 10;

const vertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute vec3 aState;
  attribute vec2 aSize;
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec3 vState;
  varying vec2 vSize;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vColor = aColor;
    vState = aState;
    vSize = aSize;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBackground;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec3 vState;
  varying vec2 vSize;
  varying vec3 vNormal;
  void main() {
    float fill = vState.x, glow = vState.y, style = vState.z;
    if (vNormal.z < .5) {
      // Sides: the colour in shadow, darker underneath, so tilting reveals depth.
      float shade = .55 + .25 * vNormal.y - .1 * abs(vNormal.x);
      gl_FragColor = vec4(mix(uBackground, vColor, (.12 + .45 * fill + .3 * glow) * shade), 1.);
      return;
    }
    vec2 px = vUv * vSize;
    float edge = min(min(px.x, vSize.x - px.x), min(px.y, vSize.y - px.y));
    float border = 1. - smoothstep(.5, 1.5, edge);
    float amount = (.07 + .5 * fill + .25 * glow) * (.82 + .18 * vUv.y);
    // Styles arrive as interpolated floats, which need not be exactly whole, so compare by range.
    if (style < .5) {
    } else if (style < 1.5) {
      // The end symbol: a hatched stop sign rather than a solid box.
      amount *= .25 + .5 * step(.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 10.));
    } else if (style < 2.5) {
      // The page shimmers, as everything inside it is the page again.
      amount += .1 * (.5 + .5 * sin(uTime * 1.7 - vUv.x * 9.));
    } else {
      amount *= .7;
    }
    vec3 color = mix(uBackground, vColor, amount);
    color = mix(color, vColor * (1. + .35 * glow), border * (.45 + .55 * max(glow, fill)));
    gl_FragColor = vec4(color, 1.);
  }
`;

/** Every visible box, drawn in one call. */
export class Slabs {
  readonly mesh: InstancedMesh;
  readonly #color: InstancedBufferAttribute;
  readonly #state: InstancedBufferAttribute;
  readonly #size: InstancedBufferAttribute;
  readonly #material: ShaderMaterial;
  readonly #matrix = new Matrix4();

  constructor(readonly capacity: number, background: Rgb) {
    const geometry = new BoxGeometry(1, 1, 1);
    const attribute = (size: number) => new InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(DynamicDrawUsage);
    this.#color = attribute(3);
    this.#state = attribute(3);
    this.#size = attribute(2);
    geometry.setAttribute('aColor', this.#color);
    geometry.setAttribute('aState', this.#state);
    geometry.setAttribute('aSize', this.#size);
    this.#material = new ShaderMaterial({
      uniforms: { uBackground: { value: background }, uTime: { value: 0 } },
      vertexShader,
      fragmentShader
    });
    this.mesh = new InstancedMesh(geometry, this.#material, capacity);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    // Slabs move every frame and are culled on the CPU already.
    this.mesh.frustumCulled = false;
  }

  update(slabs: readonly Slab[], time: number): void {
    const count = Math.min(this.capacity, slabs.length);
    for (let i = 0; i < count; i += 1) {
      const s = slabs[i]!;
      this.#matrix.makeScale(s.w, s.h, DEPTH).setPosition(s.x, s.y, s.z - DEPTH / 2);
      this.mesh.setMatrixAt(i, this.#matrix);
      this.#color.setXYZ(i, ...s.color);
      this.#state.setXYZ(i, s.fill, s.glow, styleIndex[s.style]);
      this.#size.setXY(i, s.w, s.h);
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.#color.needsUpdate = this.#state.needsUpdate = this.#size.needsUpdate = true;
    this.#material.uniforms.uTime!.value = time;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.#material.dispose();
  }
}
