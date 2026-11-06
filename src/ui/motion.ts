// Motion for the whole app. Nothing here is linear. Things move like objects with weight: they accelerate gently, carry the
// speed of the finger that let go of them, and settle without a hard stop.
//
// A spring is physics, not a curve: given where it is, how fast it is going and where it should end up, it works out the rest.
// That is what makes a released sheet continue in the direction you threw it, instead of restarting from zero.

export const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Critically damped (no bounce): damping = 2 * sqrt(stiffness). Settles in about 0.4 s.
export const SPRING = { stiffness: 260, damping: 32.2 }

/**
 * Animate a number with a spring. `velocity` is in units per second (e.g. px/s) and carries the speed of a gesture.
 * Returns a function that stops it (a new touch takes over from wherever it is).
 */
export function spring(opts: {
  from: number
  to: number
  velocity?: number
  stiffness?: number
  damping?: number
  onUpdate: (x: number) => void
  onDone?: () => void
}): () => void {
  const { from, to, onUpdate, onDone } = opts
  const k = opts.stiffness ?? SPRING.stiffness
  const c = opts.damping ?? SPRING.damping
  if (prefersReducedMotion()) { onUpdate(to); onDone?.(); return () => {} }
  let x = from
  let v = opts.velocity ?? 0
  let last = performance.now()
  let raf = 0
  const tick = (now: number) => {
    const dt = Math.min(0.034, (now - last) / 1000)
    last = now
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      v += (-k * (x - to) - c * v) * h
      x += v * h
    }
    if (Math.abs(x - to) < 0.3 && Math.abs(v) < 6) { onUpdate(to); onDone?.(); return }
    onUpdate(x)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

// The same physics as an easing curve, for CSS and Web Animations. A critically damped spring starting at rest:
// it leaves gently, speeds up, then settles with no hard stop, which is how UIKit moves a pushed screen or a sheet.
// x(t) = 1 - (1 + wt) e^(-wt). Sampled into CSS `linear()`; browsers without it get the closest cubic Bezier.
const supportsLinear = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('animation-timing-function', 'linear(0, 1)')
export const SPRING_MS = 480
export const EASE_SPRING = (() => {
  if (!supportsLinear) return 'cubic-bezier(0.32, 0.72, 0, 1)'
  const w = 15.4 // settles (99.5%) at SPRING_MS
  const pts = Array.from({ length: 41 }, (_, i) => {
    const t = (i / 40) * (SPRING_MS / 1000)
    return (1 - (1 + w * t) * Math.exp(-w * t)).toFixed(4)
  })
  pts[pts.length - 1] = '1'
  return `linear(${pts.join(', ')})`
})()
