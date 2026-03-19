<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useSlideContext } from '@slidev/client'

const props = defineProps<{
  /**
   * Array of [x, y] data points. x can go backwards for looping graphs.
   * Values should be in 0-100 range for both axes.
   */
  points: [number, number][]
  /** Color of the graph line */
  color?: string
  /** Stroke width */
  strokeWidth?: number
  /** Whether to hide axes (default: false, axes shown) */
  hideAxes?: boolean
  /** Label for x axis */
  xLabel?: string
  /** Label for y axis */
  yLabel?: string
  /** Number of points to reveal per click (default: 1) */
  pointsPerClick?: number
  /** Points per click as array, e.g. [1,1,1,3] — click 4 reveals 3 points at once. Overrides pointsPerClick. */
  stepsPerClick?: number[]
  /** Width of the SVG */
  width?: number
  /** Height of the SVG */
  height?: number
  /** Hand-drawn wobble intensity (0 = none, default ~1.5) */
  wobble?: number
  /** Seed for deterministic wobble (default: 42) */
  seed?: number
  /** Labels to show at specific point indices, e.g. { 5: "???", 2: "ok" } */
  labels?: Record<number, string>
}>()

const color = computed(() => props.color ?? '#aaaaaa')
const strokeWidth = computed(() => props.strokeWidth ?? 1.5)
const showAxes = computed(() => !(props.hideAxes ?? false))
const pointsPerClick = computed(() => props.pointsPerClick ?? 1)
const w = computed(() => props.width ?? 400)
const h = computed(() => props.height ?? 250)
const wobbleAmount = computed(() => props.wobble ?? 0.3)

const padding = { top: 20, right: 20, bottom: 40, left: 100 }

const { $clicks } = useSlideContext()

const visibleCount = computed(() => {
  const clicks = $clicks.value ?? 0
  if (props.stepsPerClick) {
    // Sum up the steps for each click that has happened
    let total = 0
    for (let i = 0; i < clicks && i < props.stepsPerClick.length; i++) {
      total += props.stepsPerClick[i]
    }
    return Math.min(props.points.length, total)
  }
  return Math.min(props.points.length, clicks * pointsPerClick.value)
})

// Simple seeded PRNG for deterministic wobble
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff - 0.5 // returns -0.5 to 0.5
  }
}

// Map data coordinates (0-100) to SVG coordinates
function toSvg(pt: [number, number]): { x: number; y: number } {
  const plotW = w.value - padding.left - padding.right
  const plotH = h.value - padding.top - padding.bottom
  return {
    x: padding.left + (pt[0] / 100) * plotW,
    y: padding.top + plotH - (pt[1] / 100) * plotH,
  }
}

// Catmull-Rom helper: convert segment [p0,p1,p2,p3] to cubic bezier control points.
// The curve passes through p1→p2. p0 and p3 influence the tangent.
function catmullRomToBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
) {
  return {
    cp1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
    cp2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
  }
}

// Build a smooth Catmull-Rom path through all points with optional wobble.
// Passes through every point. Adding a point at the end only affects the last 2 segments.
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  const rng = seededRandom(props.seed ?? 42)
  const wb = wobbleAmount.value

  // Apply wobble to points (deterministic per index)
  const pts = wb === 0
    ? points
    : points.map((p) => ({
        x: p.x + rng() * wb * 2,
        y: p.y + rng() * wb * 2,
      }))

  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`
  }

  let d = `M ${pts[0].x} ${pts[0].y}`

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[Math.min(pts.length - 1, i + 1)]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]

    const { cp1, cp2 } = catmullRomToBezier(p0, p1, p2, p3)
    d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`
  }

  return d
}

// Always build the FULL path (all points) — we reveal it with stroke-dashoffset
const fullPathD = computed(() => {
  if (props.points.length === 0) return ''
  const mapped = props.points.map(toSvg)
  return smoothPath(mapped)
})

// Measure cumulative length at each point index using the full path
const pathRef = ref<SVGPathElement | null>(null)
const segmentLengths = ref<number[]>([])
const totalPathLength = ref(0)

// Find the path length at which the path is closest to a given SVG point
function findLengthAtPoint(path: SVGPathElement, total: number, target: { x: number; y: number }): number {
  // Coarse pass: sample every 2px
  const coarseStep = 2
  let bestLen = 0
  let bestDist = Infinity
  for (let len = 0; len <= total; len += coarseStep) {
    const p = path.getPointAtLength(len)
    const dist = (p.x - target.x) ** 2 + (p.y - target.y) ** 2
    if (dist < bestDist) {
      bestDist = dist
      bestLen = len
    }
  }
  // Fine pass: refine within ±coarseStep
  const lo = Math.max(0, bestLen - coarseStep)
  const hi = Math.min(total, bestLen + coarseStep)
  for (let len = lo; len <= hi; len += 0.5) {
    const p = path.getPointAtLength(len)
    const dist = (p.x - target.x) ** 2 + (p.y - target.y) ** 2
    if (dist < bestDist) {
      bestDist = dist
      bestLen = len
    }
  }
  return bestLen
}

// Recompute lengths whenever the full path changes (i.e. on mount)
watch(fullPathD, async () => {
  await nextTick()
  if (!pathRef.value) return
  const path = pathRef.value
  const total = path.getTotalLength()
  totalPathLength.value = total

  // Find the actual path length at each data point by locating
  // where the path passes closest to each point's SVG coordinates.
  const lengths: number[] = [0]
  if (props.points.length > 1) {
    for (let i = 1; i < props.points.length; i++) {
      const svgPt = toSvg(props.points[i])
      lengths.push(findLengthAtPoint(path, total, svgPt))
    }
  }
  segmentLengths.value = lengths
}, { immediate: true })

// How much of the path to reveal based on visible points
const revealedLength = computed(() => {
  const count = visibleCount.value
  if (count <= 0) return 0
  if (segmentLengths.value.length === 0) return 0
  const idx = Math.min(count - 1, segmentLengths.value.length - 1)
  return segmentLengths.value[idx]
})

// Animate the dot along the path using getPointAtLength
const dotX = ref(0)
const dotY = ref(0)
const dotVisible = ref(false)
let dotAnimFrame = 0

watch([revealedLength, () => visibleCount.value], ([targetLen, count], old) => {
  if (!pathRef.value || count <= 0) {
    dotVisible.value = false
    return
  }
  dotVisible.value = true
  const path = pathRef.value
  const oldLen = old ? (old[0] as number) : 0
  const duration = 500 // match the CSS transition duration
  const startTime = performance.now()

  cancelAnimationFrame(dotAnimFrame)

  function animate(now: number) {
    const elapsed = now - startTime
    const t = Math.min(1, elapsed / duration)
    // ease-in-out
    const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
    const currentLen = oldLen + (targetLen - oldLen) * ease
    const pt = path.getPointAtLength(currentLen)
    dotX.value = pt.x
    dotY.value = pt.y
    if (t < 1) {
      dotAnimFrame = requestAnimationFrame(animate)
    }
  }

  dotAnimFrame = requestAnimationFrame(animate)
})

// Labels visible at the current click state
const visibleLabels = computed(() => {
  if (!props.labels) return []
  return Object.entries(props.labels)
    .map(([idx, text]) => ({ idx: Number(idx), text }))
    .filter((l) => l.idx < visibleCount.value)
    .map((l) => {
      const pos = toSvg(props.points[l.idx])
      return { ...l, x: pos.x, y: pos.y }
    })
})

// Wobbly line helper — samples densely along a straight line, applies wobble
// perpendicular to the line direction, then smooths with Catmull-Rom
function wobblyLine(
  x1: number, y1: number, x2: number, y2: number,
  rng: () => number, intensity: number
): string {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const steps = Math.max(4, Math.ceil(len / 25))
  // Unit normal perpendicular to the line
  const dx = (x2 - x1) / len
  const dy = (y2 - y1) / len
  const nx = -dy
  const ny = dx

  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const offset = i === 0 || i === steps ? 0 : rng() * intensity * 1.5
    pts.push({
      x: x1 + (x2 - x1) * t + nx * offset,
      y: y1 + (y2 - y1) * t + ny * offset,
    })
  }

  // Smooth with Catmull-Rom → cubic bezier
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const prev = pts[Math.max(0, i - 1)]
    const curr = pts[i]
    const next = pts[Math.min(pts.length - 1, i + 1)]
    const next2 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = curr.x + (next.x - prev.x) / 6
    const cp1y = curr.y + (next.y - prev.y) / 6
    const cp2x = next.x - (next2.x - curr.x) / 6
    const cp2y = next.y - (next2.y - curr.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
  }
  return d
}

// Hand-drawn axis paths
const xAxisPath = computed(() => {
  const rng = seededRandom((props.seed ?? 42) + 100)
  const y = h.value - padding.bottom
  return wobblyLine(padding.left, y, w.value - padding.right, y, rng, wobbleAmount.value)
})

const yAxisPath = computed(() => {
  const rng = seededRandom((props.seed ?? 42) + 200)
  const x = padding.left
  return wobblyLine(x, h.value - padding.bottom, x, padding.top, rng, wobbleAmount.value)
})

// Small arrowhead paths
const xArrow = computed(() => {
  const y = h.value - padding.bottom
  const x = w.value - padding.right
  return `M ${x - 6} ${y - 4} L ${x + 2} ${y} L ${x - 6} ${y + 4}`
})

const yArrow = computed(() => {
  const x = padding.left
  const y = padding.top
  return `M ${x - 4} ${y + 6} L ${x} ${y - 2} L ${x + 4} ${y + 6}`
})
</script>

<template>
  <svg
    :width="w"
    :height="h"
    :viewBox="`0 0 ${w} ${h}`"
    class="animated-graph"
  >
    <!-- SVG filter for slight roughness -->
    <defs>
      <filter id="sketchy">
        <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.8" />
      </filter>
    </defs>

    <!-- Axes -->
    <g v-if="showAxes" class="axes" opacity="0.45">
      <!-- X axis (wobbly) -->
      <path
        :d="xAxisPath"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
      />
      <!-- X arrowhead -->
      <path
        :d="xArrow"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Y axis (wobbly) -->
      <path
        :d="yAxisPath"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
      />
      <!-- Y arrowhead -->
      <path
        :d="yArrow"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Axis labels -->
      <text
        v-if="xLabel"
        :x="w - padding.right"
        :y="h - padding.bottom + 28"
        text-anchor="end"
        fill="currentColor"
        font-size="5"
        opacity="0.8"
      >
        {{ xLabel }}
      </text>
      <text
        v-if="yLabel"
        :x="padding.left"
        :y="padding.top - 6"
        text-anchor="end"
        fill="currentColor"
        font-size="5"
        opacity="0.8"
      >
        {{ yLabel }}
      </text>
    </g>

    <!-- Graph line (smooth, hand-drawn) — drawn with stroke-dashoffset animation -->
    <path
      v-if="fullPathD"
      ref="pathRef"
      :d="fullPathD"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      :stroke-dasharray="totalPathLength"
      :stroke-dashoffset="totalPathLength - revealedLength"
      class="graph-line"
    />

    <!-- Current point dot — animated along the path -->
    <circle
      v-if="dotVisible"
      :cx="dotX"
      :cy="dotY"
      r="5"
      :fill="color"
    />

    <!-- Point labels -->
    <text
      v-for="label in visibleLabels"
      :key="'label-' + label.idx"
      :x="label.x"
      :y="label.y - 12"
      text-anchor="middle"
      fill="currentColor"
      font-size="5"
      font-style="italic"
      class="graph-label"
    >
      {{ label.text }}
    </text>
  </svg>
</template>

<style scoped>
.graph-line {
  transition: stroke-dashoffset 0.5s ease-in-out;
}
.graph-label {
  animation: fadeIn 0.4s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
