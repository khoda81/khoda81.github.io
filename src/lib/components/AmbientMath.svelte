<script lang="ts">
  import { live, type Snapshot } from '#lib/live.svelte.ts';

  const equations = [
    { text: 'I(x) = −ln p(x)', unit: 'nats', rotation: -5.5 },
    { text: 'I₂(x) = I(x) / ln 2', unit: 'bits', rotation: 4.5 },
    { text: 'L ≈ −log₂ p', unit: 'probability → space', rotation: -2.5 }
  ];

  /** Parallax toward the pointer and against the scroll, with a slow drift; the pointer is replaced by a wander until it moves. */
  function drift(i: number, rotation: number, { uptime: t, pointer, scroll }: Snapshot): string {
    const nx = pointer ? pointer.x / pointer.width - .5 : Math.sin(t * .13) * .16;
    const ny = pointer ? pointer.y / pointer.height - .5 : Math.cos(t * .11) * .12;
    const scrollPhase = scroll.y / scroll.max - .5;
    const dx = nx * (12 + i * 8) + Math.sin(t * (.08 + i * .015) + i * 1.7) * 4;
    const dy = ny * (9 + i * 6) + scrollPhase * (i % 2 ? 24 : -18) + Math.cos(t * (.07 + i * .012) + i) * 3;
    return `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) rotate(${rotation}deg)`;
  }
</script>

<div class="ambient-math" aria-hidden="true">
  {#each equations as { text, unit, rotation }, i}
    <div class="ambient-equation" style:transform={drift(i, rotation, live.snapshot)}>{text}<small>{unit}</small></div>
  {/each}
</div>

<style>
  .ambient-math { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; contain: strict; }
  .ambient-equation { position: absolute; white-space: nowrap; font: 500 clamp(15px, 1.7vw, 27px)/1 var(--mono); letter-spacing: -.045em; color: rgba(113,236,195,.065); will-change: transform; text-shadow: 0 0 26px rgba(113,236,195,.035); }
  .ambient-equation small { font-size: .46em; letter-spacing: .08em; color: rgba(150,170,198,.55); margin-left: .8em; }
  .ambient-equation:nth-child(1) { left: 3vw; top: 29vh; }
  .ambient-equation:nth-child(2) { right: -4vw; top: 56vh; }
  .ambient-equation:nth-child(3) { left: 17vw; top: 82vh; }

  @media (max-width: 720px) {
    .ambient-equation { font-size: clamp(14px, 4vw, 19px); color: rgba(113,236,195,.05); }
    .ambient-equation:nth-child(1) { left: -8vw; top: 34vh; }
    .ambient-equation:nth-child(2) { right: -28vw; top: 64vh; }
    .ambient-equation:nth-child(3) { left: 8vw; top: 89vh; }
  }
</style>
