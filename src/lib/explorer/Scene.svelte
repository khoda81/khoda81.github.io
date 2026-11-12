<script lang="ts">
  import { browser } from '$app/env';
  import { decimalTicks, ladder } from '@qbar/qbar';
  import { defineQBar, type QBarElement } from '@qbar/qbar/element';
  import { onMount, untrack } from 'svelte';
  import { codeword, entropy, isPlace, lineage, name, page, PAGE_BITS, PAGE_CODE, pathOf, root, spanAt, type Node } from '../code.ts';
  import type { Project } from '../catalog.ts';
  import { BACKGROUND, colorOf, rgb } from '../palette.ts';
  import QBarFleet from '../components/QBarFleet.svelte';
  import { addressOf, cameraFor, DEEPEST, same, shallower, type Address } from './address.ts';
  import { explorer } from './explorer.svelte.ts';
  import { boxAt, layout, shallowerKey, type Box } from './layout.ts';
  import type { Slab, Slabs, Rgb } from './slabs.ts';
  import { CONTEXT_BITS, flight, fromScreen, hold, pxPerBit, viewSpan, type Camera, type Flight, type Grab, type Viewport } from './view.ts';

  if (browser) defineQBar();

  type Point = { x: number; y: number };
  type Label = { key: string; x: number; y: number; z: number; w: number; h: number; size: number; text: string; sub: string | null; vertical: boolean; detail: Detail | null };
  /** What of a project fits in its box besides its name, so a growing box reveals more of it. */
  type Detail = { project: Project; accent: string; links: boolean; picture: boolean; summary: boolean };
  type Motion =
    | { kind: 'flying'; path: Flight; started: number }
    /** Holding the focus in frame, which moves while the measure changes. */
    | { kind: 'tracking' }
    /** The reader has the camera. */
    | { kind: 'free' }
    /** A released drag coasting to a stop, in screen px/s. */
    | { kind: 'gliding'; velocity: Point };

  const CAPACITY = 3000;
  /** Eye distance in CSS px, shared by the three.js camera and the label layer's CSS perspective. */
  const PERSPECTIVE = 1600;
  const LIFT = 22;
  /** Strips kept clear of boxes for the header and the bits axis. */
  const TOP = 56, BOTTOM = 34;

  let host: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let vp = $state.raw<Viewport>({ width: 0, height: 0 });
  /** Where boxes are laid out: the scene minus the header and axis strips. */
  const area = $derived<Viewport>({ width: vp.width, height: Math.max(1, vp.height - TOP - BOTTOM) });
  let labels = $state.raw<Label[]>([]);
  /** World rotation in three.js's convention, radians. */
  let tilt = $state.raw<Point>({ x: 0, y: 0 });
  let unavailable = $state(false);
  /** The pointer in host coordinates, for the hover card. */
  let cursor = $state.raw<Point | null>(null);

  let cam: Camera = { level: 0, x: -CONTEXT_BITS - 2.5, y: .5 };
  let motion: Motion = { kind: 'tracking' };
  /** The measure being shown: 0 is emphasis, 1 is effort, in between while morphing. */
  let blend = 0;
  let boxes: Box[] = [];
  /** The pointer on the (tilted) plane, in `area` coordinates. */
  let pointer: Point | null = null;
  /** The pointer's position over the scene in [0, 1]², for parallax. */
  let parallax: Point = { x: .5, y: .5 };
  let pendingZoom = 0;
  let zoomAnchor: Point = { x: 0, y: 0 };
  let glows = new Map<string, number>();
  let reduced = false;
  /** Client coordinates to `area` coordinates, through the tilt once the scene exists. */
  let toPlane = (x: number, y: number): Point => {
    const r = host.getBoundingClientRect();
    return { x: x - r.left, y: y - r.top - TOP };
  };

  const colors = new Map<Node, Rgb>();
  const colorFor = (node: Node) => colors.get(node) ?? colors.set(node, rgb(colorOf(node))).get(node)!;
  const ease = (u: number) => (u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
  /** The address this scene last derived from a hand-moved camera, which it is already showing. */
  let followed: Address | null = null;

  $effect(() => {
    const here = explorer.here;
    untrack(() => {
      if (here === followed) return;
      pendingZoom = 0;
      const target = cameraFor(here, blend);
      if (reduced) {
        cam = target;
        motion = { kind: 'tracking' };
      } else {
        motion = { kind: 'flying', path: flight(cam, target), started: performance.now() };
      }
    });
  });

  const grabAt = (at: Point): Grab => ({ level: cam.level, ...fromScreen(cam, area, at.x, at.y) });

  function moveCamera(now: number, dt: number) {
    if (motion.kind === 'flying') {
      // A frame's timestamp can precede the moment the flight was planned within it.
      const u = Math.min(1, Math.max(0, now - motion.started) / motion.path.duration);
      cam = motion.path.at(ease(u));
      if (u === 1) motion = { kind: 'tracking' };
    } else if (motion.kind === 'tracking') {
      cam = flight(cam, cameraFor(explorer.here, blend)).at(1 - Math.exp(-dt * 10));
    } else if (motion.kind === 'gliding') {
      const { velocity } = motion;
      const centre = { x: area.width / 2, y: area.height / 2 };
      cam = hold(grabAt(centre), area, { x: centre.x + velocity.x * dt, y: centre.y + velocity.y * dt });
      const decay = Math.exp(-dt * 4.5);
      motion = Math.hypot(velocity.x, velocity.y) < 10 ? { kind: 'free' } : { kind: 'gliding', velocity: { x: velocity.x * decay, y: velocity.y * decay } };
    }
    if (pendingZoom !== 0) {
      // Wheel steps are eased out over a few frames, so a mouse wheel zooms as smoothly as a trackpad.
      const step = Math.abs(pendingZoom) < 1e-4 ? pendingZoom : pendingZoom * (1 - Math.exp(-dt * 16));
      cam = hold(grabAt(zoomAnchor), area, zoomAnchor, step);
      pendingZoom -= step;
    }
  }

  function steer(now: number, dt: number) {
    if (reduced) return;
    const s = now / 1000, k = 1 - Math.exp(-dt * 3);
    const goal = { x: (parallax.y - .5) * .14 + Math.sin(s * .31) * .018, y: (parallax.x - .5) * .2 + Math.sin(s * .23 + 1) * .025 };
    tilt = { x: tilt.x + (goal.x - tilt.x) * k, y: tilt.y + (goal.y - tilt.y) * k };
  }

  function quietLine(box: Box): string | null {
    switch (box.node.kind) {
      case 'page': return `1111 · contains everything again`;
      default: return `p ${box.p.toFixed(3)} · ${box.bits.toFixed(2)} bits`;
    }
  }

  /** Builds this frame's slabs and labels; glow eases toward hover and focus so changes never pop. */
  function compose(dt: number, hovered: Box | null): Slab[] {
    const { place, level } = explorer.focus;
    const focusKey = `${level}:${place.id}`;
    const path = new Set(lineage(place).map(node => `${level}:${node.id}`));
    for (let l = 0; l < level; l += 1) path.add(`${l}:${page.id}`);
    const k = 1 - Math.exp(-dt * 10);
    const nextGlows = new Map<string, number>();
    const slabs: Slab[] = [];
    const nextLabels: Label[] = [];

    for (const box of boxes) {
      const { node } = box;
      // The root column is always on the path, so it glows only when pointed at.
      const goal = box === hovered ? 1 : node.kind === 'root' ? .15 : box.key === focusKey ? .75 : path.has(box.key) ? .4 : 0;
      const previous = glows.get(box.key) ?? 0;
      const glow = previous + (goal - previous) * k;
      nextGlows.set(box.key, glow);

      // Off-screen extents are clamped: a box can be millions of px tall when zoomed in.
      const x0 = Math.max(box.x0, -vp.width), x1 = Math.min(box.x1, 2 * vp.width);
      const y0 = Math.max(box.y0, -vp.height), y1 = Math.min(box.y1, 2 * vp.height);
      const w = Math.max(.5, x1 - x0 - 1), h = Math.max(.5, y1 - y0 - 1);
      const z = glow * LIFT;
      slabs.push({
        x: (x0 + x1) / 2 - vp.width / 2,
        y: vp.height / 2 - TOP - (y0 + y1) / 2,
        w, h, z,
        color: colorFor(node),
        fill: node.kind === 'root' ? .06 : .15 + .7 * Math.sqrt(box.p),
        glow,
        style: node.kind === 'page' ? 'page' : 'plain'
      });

      // Labels stick to the visible part of their box, so a box half off-screen stays named.
      const vx0 = Math.max(box.x0, 0), vx1 = Math.min(box.x1, area.width);
      const vy0 = Math.max(box.y0, 0), vy1 = Math.min(box.y1, area.height);
      const lw = vx1 - vx0, lh = vy1 - vy0;
      if (lw < 30 || lh < 12) continue;
      const text = name(node);
      const cap = node.kind === 'project' ? 40 : 56;
      const across = Math.min(cap, lh * .38, (lw - 18) / (.64 * text.length));
      // Likely boxes are tall and narrow, few bits wide; name those along their height.
      const along = Math.min(cap, lw * .5, (lh - 18) / (.64 * text.length));
      const vertical = across < 9 && 9 <= along;
      const size = vertical ? along : across;
      if (size < 9) continue;
      const sub = !vertical && size * 1.3 + 30 < lh && 110 < lw ? quietLine(box) : null;
      nextLabels.push({
        key: box.key, x: vx0, y: vy0 + TOP, z, w: lw, h: lh, size, text, sub, vertical,
        detail: node.kind === 'project' && sub ? detailOf(node.project, colorOf(node), lw, lh - (12 + size + 28)) : null
      });
    }
    glows = nextGlows;
    labels = nextLabels;
    // Lifted boxes go last, so they and their shadows cover the plane. The sort is stable, so ties keep tree order.
    return slabs.sort((a, b) => a.z - b.z);
  }

  /** Minimum width and height, in px, at which each kind of preview is still legible. */
  const PICTURE = { image: [200, 110], 'qbar-fleet': [300, 230] } as const;
  const LINKS = 32, SUMMARY = 80;

  /**
   * The parts of `project` that fit a `width`-wide box with `room` px under its
   * name: links first, then its picture, then its summary, which stands in
   * for the picture when it has none.
   */
  function detailOf(project: Project, accent: string, width: number, room: number): Detail | null {
    const links = 0 < project.links.length && 130 <= width && LINKS <= room;
    room -= links ? LINKS : 0;
    const kind = project.preview?.kind;
    const minimum = kind === 'image' || kind === 'qbar-fleet' ? PICTURE[kind] : null;
    const picture = minimum !== null && minimum[0] <= width && minimum[1] <= room;
    room -= picture ? minimum[1] : 0;
    const summary = 190 <= width && SUMMARY <= room;
    return links || picture || summary ? { project, accent, links, picture, summary } : null;
  }

  function activate(box: Box | undefined) {
    if (!box) return;
    const { node, level } = box;
    explorer.go({ focus: node.kind === 'page' ? { place: root, level: level + 1 } : { place: node, level }, bits: '' });
  }

  // Pointer gestures: one pointer drags, two pinch; a press that barely moves is a click.
  const active = new Map<number, Point>();
  let gesture: { grab: Grab; origin: Point; spread: number; moved: boolean; last: Point; at: number; velocity: Point } | null = null;
  const centroid = (points: Point[]) => ({ x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length });
  const spreadOf = (points: Point[]) => (points.length < 2 ? 0 : Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y));

  function regrab() {
    const points = [...active.values()];
    const origin = centroid(points);
    gesture = { grab: grabAt(origin), origin, spread: spreadOf(points), moved: gesture?.moved ?? false, last: origin, at: performance.now(), velocity: { x: 0, y: 0 } };
  }

  function onpointerdown(event: PointerEvent) {
    // A link inside a box is followed, not dragged.
    if (event.button !== 0 || (event.target as Element).closest('a')) return;
    host.setPointerCapture(event.pointerId);
    active.set(event.pointerId, toPlane(event.clientX, event.clientY));
    pendingZoom = 0;
    regrab();
  }

  function onpointermove(event: PointerEvent) {
    const r = host.getBoundingClientRect();
    cursor = { x: event.clientX - r.left, y: event.clientY - r.top };
    parallax = { x: cursor.x / r.width, y: cursor.y / r.height };
    pointer = toPlane(event.clientX, event.clientY);
    if (!active.has(event.pointerId) || !gesture) return;
    active.set(event.pointerId, pointer);
    const points = [...active.values()];
    const at = centroid(points);
    if (!gesture.moved && 5 < Math.hypot(at.x - gesture.origin.x, at.y - gesture.origin.y)) {
      gesture.moved = true;
      motion = { kind: 'free' };
    }
    if (!gesture.moved) return;
    const zoom = 1 < points.length && 0 < gesture.spread ? Math.log2(spreadOf(points) / gesture.spread) : 0;
    cam = hold(gesture.grab, area, at, zoom);
    const now = performance.now(), dt = Math.max(1, now - gesture.at) / 1000;
    gesture.velocity = { x: gesture.velocity.x * .6 + (at.x - gesture.last.x) / dt * .4, y: gesture.velocity.y * .6 + (at.y - gesture.last.y) / dt * .4 };
    gesture.last = at;
    gesture.at = now;
  }

  function onpointerup(event: PointerEvent) {
    if (!active.delete(event.pointerId) || !gesture) return;
    if (0 < active.size) return regrab();
    const { moved, velocity, last } = gesture;
    gesture = null;
    if (!moved) activate(boxAt(boxes, last.x, last.y));
    else if (60 < Math.hypot(velocity.x, velocity.y) && !reduced) motion = { kind: 'gliding', velocity };
  }

  function onpointerleave() {
    if (active.size) return;
    pointer = cursor = null;
    parallax = { x: .5, y: .5 };
  }

  function onwheel(event: WheelEvent) {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? vp.height : 1;
    pendingZoom -= event.deltaY * unit * .0032;
    zoomAnchor = toPlane(event.clientX, event.clientY);
    motion = { kind: 'free' };
  }

  const bitsScale = decimalTicks();
  /** Ticks at binary fractions, labelled with their bits: zooming in reads the codeword off the axis. */
  const binaryScale = ladder(
    Array.from({ length: 49 }, (_, k) => ({ step: k, numerator: 1, denominator: 2 ** k })),
    (value, k) => (k === 0 || 1 <= value ? String(Math.round(value)) : '.' + Math.round(value * 2 ** k).toString(2).padStart(k, '0'))
  );

  function bitsAxis(bar: QBarElement) {
    const { x, level } = explorer.camera, start = x + PAGE_BITS * level, length = area.width / pxPerBit(area);
    bar.scale = bitsScale;
    bar.quantile = p => start + p * length;
  }

  function probabilityAxis(bar: QBarElement) {
    const { x, y } = explorer.camera, span = viewSpan(x);
    bar.scale = binaryScale;
    bar.quantile = p => Math.min(1, Math.max(0, y + (p - .5) * span));
  }

  const hovered = $derived(explorer.hover);
  const details = $derived.by(() => {
    const box = hovered;
    if (!box) return null;
    const { node } = box, t = explorer.t;
    return {
      title: name(node),
      kind: node.kind === 'project' ? node.project.kind : node.kind === 'theme' ? 'THEME' : node.kind === 'page' ? 'RECURSION' : 'ROOT',
      rows: [
        ['p given parent', box.p.toFixed(4)],
        ['−log₂ P', `${box.bits.toFixed(3)} bits`],
        // The biggest dyadic interval inside the box, from the outermost root.
        ['codeword', PAGE_CODE.repeat(box.level) + codeword(spanAt(node, t)) || '∅'],
        ...(isPlace(node) && box.level === 0 ? [['path', pathOf(node)]] : []),
        ...(0 < node.children.length ? [['H at node', `${entropy(node, t).toFixed(3)} bits`]] : []),
        ...(node.kind === 'project' && node.project.commits ? [['commits', String(node.project.commits)]] : [])
      ] as [string, string][]
    };
  });

  onMount(() => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let request = 0, disposed = false, last = performance.now();
    let teardown = () => {};

    const resize = new ResizeObserver(([entry]) => {
      vp = { width: entry!.contentRect.width, height: entry!.contentRect.height };
    });
    resize.observe(host);
    host.addEventListener('wheel', onwheel, { passive: false });

    (async () => {
      const [three, { Slabs }] = await Promise.all([import('three'), import('./slabs.ts')]);
      if (disposed) return;
      let renderer: InstanceType<typeof three.WebGLRenderer>;
      try {
        // No multisampling: the slab shader filters its own edges, so MSAA would only cost fill rate.
        renderer = new three.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
      } catch {
        unavailable = true;
        return;
      }
      // Colours are display values already, mixed by the shader as CSS would.
      renderer.outputColorSpace = three.LinearSRGBColorSpace;
      renderer.setClearColor(BACKGROUND);
      const scene = new three.Scene();
      const world = new three.Group();
      const slabs: Slabs = new Slabs(CAPACITY, rgb(BACKGROUND));
      world.add(slabs.mesh);
      scene.add(world);
      const camera = new three.PerspectiveCamera(30, 1, 10, PERSPECTIVE * 4);
      camera.position.z = PERSPECTIVE;

      const raycaster = new three.Raycaster(), ndc = new three.Vector2(), plane = new three.Plane(new three.Vector3(0, 0, 1), 0);
      const hit = new three.Vector3(), inverse = new three.Matrix4();
      toPlane = (clientX, clientY) => {
        const r = canvas.getBoundingClientRect();
        ndc.set((clientX - r.left) / r.width * 2 - 1, 1 - (clientY - r.top) / r.height * 2);
        raycaster.setFromCamera(ndc, camera);
        const ray = raycaster.ray.clone().applyMatrix4(inverse.copy(world.matrixWorld).invert());
        return ray.intersectPlane(plane, hit)
          ? { x: hit.x + vp.width / 2, y: vp.height / 2 - hit.y - TOP }
          : { x: clientX - r.left, y: clientY - r.top - TOP };
      };

      let size = { width: 0, height: 0 };
      const tick = (now: number) => {
        // The first frame's timestamp can precede the mount's clock reading.
        const dt = Math.min(.05, Math.max(0, now - last) / 1000);
        last = now;
        if (vp.width !== size.width || vp.height !== size.height) {
          size = vp;
          renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
          renderer.setSize(size.width, size.height, false);
          camera.aspect = size.width / Math.max(1, size.height);
          // At distance PERSPECTIVE, the plane z = 0 maps one unit to one CSS px.
          camera.fov = 2 * Math.atan(size.height / 2 / PERSPECTIVE) * 180 / Math.PI;
          camera.updateProjectionMatrix();
        }
        if (0 < size.width && 0 < size.height) {
          const goal = explorer.measure === 'effort' ? 1 : 0;
          blend = reduced || Math.abs(goal - blend) < 1e-4 ? goal : blend + (goal - blend) * (1 - Math.exp(-dt * 3.2));
          moveCamera(now, dt);
          if (motion.kind === 'free' || motion.kind === 'gliding') {
            // The reader moved the view, so the address follows it.
            const here = addressOf(explorer.here.focus, cam, blend);
            if (!same(here, explorer.here)) explorer.follow(followed = here);
          }
          // A flight plans in its own levels, so the recursion is only folded between them.
          while (motion.kind !== 'flying' && DEEPEST < cam.level) {
            cam = { ...cam, level: cam.level - 1 };
            explorer.follow(followed = shallower(explorer.here));
            glows = new Map([...glows].map(([key, glow]) => [shallowerKey(key), glow]));
          }
          steer(now, dt);
          explorer.camera = cam;
          boxes = layout(cam, area, blend, CAPACITY);
          const over = pointer && !gesture?.moved ? boxAt(boxes, pointer.x, pointer.y) ?? null : null;
          explorer.hover = over;
          if (pointer) {
            const r = fromScreen(cam, area, pointer.x, pointer.y);
            explorer.reading = { bits: r.bits + PAGE_BITS * cam.level, p: r.p };
          } else {
            explorer.reading = null;
          }
          host.style.cursor = gesture?.moved ? 'grabbing' : over ? 'pointer' : 'grab';
          slabs.update(compose(dt, over), reduced ? 0 : now / 1000);
          world.rotation.set(tilt.x, tilt.y, 0);
          world.updateMatrixWorld();
          renderer.render(scene, camera);
        }
        request = requestAnimationFrame(tick);
      };
      request = requestAnimationFrame(tick);
      teardown = () => {
        slabs.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(request);
      resize.disconnect();
      host.removeEventListener('wheel', onwheel);
      teardown();
    };
  });
</script>

<div
  class="scene"
  bind:this={host}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  onpointercancel={onpointerup}
  {onpointerleave}
  role="presentation"
>
  <canvas bind:this={canvas} aria-hidden="true"></canvas>

  <div class="labels" aria-hidden="true" style:perspective="{PERSPECTIVE}px">
    <div class="plane" style:transform="rotateX({-tilt.x}rad) rotateY({tilt.y}rad)">
      {#each labels as label (label.key)}
        <div
          class="label"
          class:vertical={label.vertical}
          style:transform="translate3d({label.x}px, {label.y}px, {label.z}px)"
          style:width="{label.w}px"
          style:height="{label.h}px"
        >
          <span class="name" style:font-size="{label.size}px">{label.text}</span>
          {#if label.sub}<span class="sub">{label.sub}</span>{/if}
          {#if label.detail}
            {@const { project, accent, links, picture, summary } = label.detail}
            <div class="detail" style:--accent={accent}>
              {#if links}
                <nav class="links">
                  {#each project.links as link (link.href)}
                    <a href={link.href} target="_blank" rel="noreferrer" tabindex="-1">{link.label} ↗</a>
                  {/each}
                </nav>
              {/if}
              {#if summary}<p class="summary">{project.summary}</p>{/if}
              {#if picture && project.preview?.kind === 'image'}
                <img src={project.preview.src} alt="" draggable="false" />
              {:else if picture && project.preview?.kind === 'qbar-fleet'}
                <div class="fleet"><QBarFleet /></div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <q-bar class="axis bits" orientation="horizontal" aria-hidden="true" {@attach bitsAxis}></q-bar>
  <q-bar class="axis probability" aria-hidden="true" {@attach probabilityAxis}></q-bar>
  <span class="axis-name bits-name" aria-hidden="true">−log₂ P · bits</span>

  {#if details && cursor}
    <div
      class="card"
      style:left="{cursor.x < vp.width - 260 ? cursor.x + 18 : cursor.x - 248}px"
      style:top="{cursor.y < vp.height - 190 ? cursor.y + 18 : cursor.y - 172}px"
      aria-hidden="true"
    >
      <span class="card-kind">{details.kind}</span>
      <strong>{details.title}</strong>
      <dl>
        {#each details.rows as [term, value] (term)}
          <dt>{term}</dt><dd>{value}</dd>
        {/each}
      </dl>
    </div>
  {/if}

  {#if unavailable}
    <p class="unavailable">This view needs WebGL. Everything it shows is in the index.</p>
  {/if}
</div>

<style>
  .scene { position: relative; overflow: hidden; touch-action: none; user-select: none; background: var(--bg); cursor: grab; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

  .labels { position: absolute; inset: 0; pointer-events: none; perspective-origin: 50% 50%; }
  .plane { position: absolute; inset: 0; transform-style: preserve-3d; transform-origin: 50% 50%; }
  .label {
    position: absolute; left: 0; top: 0; overflow: hidden; padding: 6px 8px;
    display: flex; flex-direction: column; gap: 4px; color: #edf3fb;
  }
  .name { flex: none; font-weight: 620; letter-spacing: -.035em; line-height: .95; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 12px rgba(8,11,16,.6); }
  .sub { flex: none; font: 500 10px/1.2 var(--mono); color: rgba(216,226,240,.62); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vertical .name { writing-mode: vertical-rl; transform: rotate(180deg); }

  .detail { flex: 1 1 auto; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
  .links { flex: none; display: flex; flex-wrap: wrap; gap: 5px; max-height: 24px; overflow: hidden; }
  /* Links are the one thing in the label layer that takes the pointer. */
  .links a {
    pointer-events: auto; padding: 5px 7px; border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent); border-radius: 3px;
    background: rgba(8,11,16,.55); font: 600 10px/1 var(--mono); color: #dfe7f1; white-space: nowrap;
  }
  .links a:hover { background: var(--accent); color: #05100c; }
  .summary { flex: none; max-width: 64ch; margin: 0; font-size: 12.5px; line-height: 1.45; color: #c3cfdd; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 1px 8px rgba(8,11,16,.8); }
  .detail img { flex: 0 1 auto; min-height: 0; max-width: min(100%, 720px); object-fit: contain; object-position: left top; align-self: flex-start; border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); background: #090b10; }
  .detail .fleet { flex: none; max-width: 720px; background: #090b10; border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); }

  .axis { position: absolute; color: rgba(216,226,240,.42); font: 500 9px/1 var(--mono); pointer-events: none; }
  /* Sized explicitly: the element's own default size would otherwise win over the insets. */
  .bits { left: 0; bottom: 0; width: calc(100% - 76px); height: 34px; }
  .probability { top: 56px; right: 0; width: 76px; height: calc(100% - 90px); }
  .axis-name { position: absolute; right: 84px; bottom: 6px; font: 500 9px/1 var(--mono); color: rgba(216,226,240,.42); pointer-events: none; background: var(--bg); padding: 2px 4px; }

  .card {
    position: absolute; z-index: 3; width: 230px; padding: 12px 13px; pointer-events: none;
    border: 1px solid var(--line); background: rgba(10,14,20,.88); backdrop-filter: blur(10px);
    box-shadow: 0 18px 50px rgba(0,0,0,.45);
  }
  .card-kind { font: 600 9px/1 var(--mono); letter-spacing: .1em; color: var(--green); }
  .card strong { display: block; margin: 6px 0 10px; font-size: 17px; letter-spacing: -.03em; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 5px 12px; margin: 0; font: 500 10px/1.2 var(--mono); }
  dt { color: var(--muted); }
  dd { margin: 0; text-align: right; color: #d7e0ec; overflow-wrap: anywhere; }

  @media (max-width: 600px) {
    .probability { display: none; }
  }

  .unavailable { position: absolute; inset: auto 24px 50% 24px; text-align: center; color: var(--muted); font: 500 12px/1.5 var(--mono); }
</style>
