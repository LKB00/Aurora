// iOS-style navigation stack: every screen in the stack stays mounted, a push slides the new screen in from the right while
// the one below shifts left a third of the way and dims, and a pop (button, browser back or an edge swipe) reverses it.
// The edge swipe follows the finger and commits past a third of the width or a quick flick, as UINavigationController does.
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Route } from '../state/store'
import { EASE_SPRING, SPRING_MS, spring } from './motion'

const EASE = EASE_SPRING // a critically damped spring, as UIKit uses for push, pop and sheets
const DUR = SPRING_MS
const PARALLAX = 0.3
const DIM = 'brightness(0.9)'

/** Business details and "What Aurora did" open as a bottom sheet (medium, can grow to full) rather than a pushed page. */
const isSheet = (r: Route) => r.name === 'business' || r.name === 'progress' || r.name === 'controls'
const GAP = 0 // full size goes all the way up
const routeKey = (r: Route, i: number) => `${i}:${r.name}:${'id' in r ? r.id : ''}`

/** What the screen inside a layer needs to know: the title to show on its back button, and whether it's the top screen. */
export type SheetInfo = { detent: 'medium' | 'full'; expand: () => void; collapse: () => void; grab: (e: React.PointerEvent<HTMLElement>) => void }
export const LayerContext = createContext<{ backLabel: string; active: boolean; sheet?: SheetInfo }>({ backLabel: 'Back', active: true })
export const useLayer = () => useContext(LayerContext)

export function StackNavigator({ stack, render, labelFor, onBack }: { stack: Route[]; render: (r: Route) => ReactNode; labelFor: (r: Route) => string; onBack: () => void }) {
  const els = useRef(new Map<string, HTMLDivElement>())
  const prev = useRef<Route[]>(stack)
  const [ghost, setGhost] = useState<{ route: Route; index: number } | null>(null)
  const swipe = useRef<{ dx: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  // Animate whenever the stack grows or shrinks by one or more screens.
  useLayoutEffect(() => {
    const was = prev.current
    prev.current = stack
    if (was === stack) return
    const w = box.current?.offsetWidth ?? 390
    if (stack.length > was.length) {
      const topRoute = stack[stack.length - 1]
      const topKey = routeKey(topRoute, stack.length - 1)
      if (isSheet(topRoute)) {
        els.current.get(topKey + '#panel')?.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: DUR, easing: EASE })
        els.current.get(topKey + '#scrim')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DUR, easing: EASE })
        return
      }
      const top = els.current.get(topKey)
      const below = els.current.get(routeKey(stack[stack.length - 2], stack.length - 2))
      top?.animate([{ transform: `translateX(${w}px)` }, { transform: 'translateX(0)' }], { duration: DUR, easing: EASE })
      below?.animate([{ transform: 'translateX(0)', filter: 'none' }, { transform: `translateX(${-w * PARALLAX}px)`, filter: DIM }], { duration: DUR, easing: EASE })
    } else if (stack.length < was.length) {
      const from = swipe.current?.dx ?? 0
      swipe.current = null
      const oldTop = was[was.length - 1]
      const index = was.length - 1
      setGhost({ route: oldTop, index })
      if (isSheet(oldTop)) {
        requestAnimationFrame(() => {
          const k = routeKey(oldTop, index)
          const panel = els.current.get(k + '#panel')
          const a = panel?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], { duration: DUR, easing: EASE, fill: 'forwards' })
          els.current.get(k + '#scrim')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DUR, easing: EASE, fill: 'forwards' })
          if (a) a.onfinish = () => setGhost(null)
          else setGhost(null)
        })
        return
      }
      requestAnimationFrame(() => {
        const g = els.current.get(routeKey(oldTop, index))
        const under = els.current.get(routeKey(stack[stack.length - 1], stack.length - 1))
        if (under) {
          under.style.transform = ''
          under.style.filter = ''
          under.animate([{ transform: `translateX(${-w * PARALLAX * (1 - from / w)}px)`, filter: DIM }, { transform: 'translateX(0)', filter: 'none' }], { duration: DUR, easing: EASE })
        }
        const a = g?.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${w}px)` }], { duration: DUR, easing: EASE, fill: 'forwards' })
        if (a) a.onfinish = () => setGhost(null)
        else setGhost(null)
      })
    }
  }, [stack])

  const layers = ghost ? [...stack.map((route, i) => ({ route, i })), { route: ghost.route, i: ghost.index }] : stack.map((route, i) => ({ route, i }))
  const topIndex = stack.length - 1

  // Left-edge swipe to go back.
  const onEdgeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stack.length < 2 || ghost) return
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const top = els.current.get(routeKey(stack[topIndex], topIndex))
    const below = els.current.get(routeKey(stack[topIndex - 1], topIndex - 1))
    const w = box.current?.offsetWidth ?? 390
    const x0 = e.clientX
    let last = { x: x0, t: performance.now() }
    let v = 0
    const move = (ev: PointerEvent) => {
      const dx = Math.max(0, Math.min(w, ev.clientX - x0))
      const now = performance.now()
      v = (ev.clientX - last.x) / Math.max(1, now - last.t)
      last = { x: ev.clientX, t: now }
      if (top) top.style.transform = `translateX(${dx}px)`
      if (below) {
        below.style.transform = `translateX(${-w * PARALLAX * (1 - dx / w)}px)`
        below.style.filter = `brightness(${0.9 + 0.1 * (dx / w)})`
      }
      swipe.current = { dx }
    }
    const end = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
      const dx = swipe.current?.dx ?? 0
      if (dx > w / 3 || v > 0.5) {
        onBack() // the stack change above animates the rest of the way
        return
      }
      swipe.current = null
      top?.animate([{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }], { duration: 260, easing: EASE })
      below?.animate([{ transform: below.style.transform, filter: below.style.filter }, { transform: `translateX(${-w * PARALLAX}px)`, filter: DIM }], { duration: 260, easing: EASE })
      if (top) top.style.transform = ''
      if (below) { below.style.transform = ''; below.style.filter = '' }
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
  }

  return (
    <div ref={box} className="relative h-full w-full overflow-hidden bg-bg">
      {layers.map(({ route, i }) => {
        const key = routeKey(route, i)
        const leaving = ghost?.index === i && i > topIndex
        const active = i === topIndex && !leaving
        const ctx = { backLabel: i > 0 ? labelFor(layers[i - 1]?.route ?? stack[i - 1]) : 'Back', active }
        if (isSheet(route)) {
          return (
            <SheetLayer
              key={key}
              k={key}
              z={i}
              active={active}
              covered={i < topIndex}
              ctx={ctx}
              els={els.current}
              box={box}
              onClose={onBack}
            >
              {render(route)}
            </SheetLayer>
          )
        }
        return (
          <div
            key={key}
            ref={(n) => { if (n) els.current.set(key, n); else els.current.delete(key) }}
            inert={!active}
            aria-hidden={!active}
            className="absolute inset-0 bg-bg will-change-transform"
            style={{ zIndex: i, boxShadow: i > 0 ? '-8px 0 24px -12px rgb(0 0 0 / 0.25)' : undefined }}
          >
            <LayerContext.Provider value={ctx}>
              {render(route)}
            </LayerContext.Provider>
            {active && stack.length > 1 && <div className="absolute inset-y-0 left-0 z-50 w-5 touch-none" onPointerDown={onEdgeDown} />}
          </div>
        )
      })}
    </div>
  )
}

/** A bottom sheet over the screen below: a dimmed backdrop, a panel that rests at medium height and can be dragged (or tapped) up to full or down to close. */
function SheetLayer({ k, z, active, covered, ctx, els, box, onClose, children }: { k: string; z: number; active: boolean; covered: boolean; ctx: { backLabel: string; active: boolean }; els: Map<string, HTMLDivElement>; box: React.RefObject<HTMLDivElement | null>; onClose: () => void; children: ReactNode }) {
  const [detent, setDetent] = useState<'medium' | 'full'>('medium')
  const panel = useRef<HTMLDivElement>(null)
  const stop = useRef<(() => void) | null>(null)
  const height = useRef(0)
  const reg = (name: string) => (n: HTMLDivElement | null) => { if (n) els.set(k + name, n); else els.delete(k + name) }
  const boxH = () => (box.current?.offsetHeight ?? 800) - GAP
  const medH = () => boxH() * 0.68

  // The one place the sheet's size is written. It also publishes how far the sheet is from medium (0) to full (1) as --p, and the
  // screen inside uses --p for everything that changes with size: corner radius, status-bar inset, photo height, handle. So all of
  // it moves together, frame by frame, whether the size is driven by a finger or by the spring.
  const apply = (h: number) => {
    const p = panel.current
    if (!p) return
    height.current = h
    const full = boxH()
    const med = medH()
    p.style.height = h + 'px'
    p.style.setProperty('--p', String(Math.max(0, Math.min(1, (h - med) / (full - med)))))
  }
  useLayoutEffect(() => { apply(medH()) }, [])

  // Keyboard and screen readers: the sheet is named after its title, focus moves into it when it opens and returns to the button that opened it
  // when it closes, and Escape closes it (only the top sheet answers).
  const [label, setLabel] = useState<string | undefined>()
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const region = panel.current?.querySelector<HTMLElement>('[role=region]')
    setLabel(region?.getAttribute('aria-label') ?? undefined)
    region?.focus({ preventScroll: true })
    return () => { if (opener && document.contains(opener)) opener.focus({ preventScroll: true }) }
  }, [])
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!active) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [active])

  // Settle on a detent with a spring that starts from the current size and the current speed (px/s, positive = growing).
  const go = (d: 'medium' | 'full', velocity = 0) => {
    stop.current?.()
    setDetent(d)
    stop.current = spring({ from: height.current, to: d === 'full' ? boxH() : medH(), velocity, onUpdate: apply })
  }
  // Something opens on top of the sheet (the follow-up flow): it goes full first, and stays full when you come back.
  useLayoutEffect(() => { if (covered) go('full') }, [covered])
  useLayoutEffect(() => () => stop.current?.(), [])

  const onGrab = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget
    const p = panel.current
    if (!p) return
    stop.current?.() // a new touch takes over from wherever the sheet is
    el.setPointerCapture(e.pointerId)
    const full = boxH()
    const y0 = e.clientY
    const h0 = height.current
    let last = { y: y0, t: performance.now() }
    let v = 0 // px per ms, positive = moving down
    let moved = false
    const move = (ev: PointerEvent) => {
      if (Math.abs(ev.clientY - y0) > 4) moved = true
      // Past full there is resistance, like a rubber band, instead of a wall.
      let h = h0 - (ev.clientY - y0)
      if (h > full) h = full + (h - full) * 0.25
      apply(Math.max(0, h))
      const now = performance.now()
      const inst = (ev.clientY - last.y) / Math.max(1, now - last.t)
      v = v * 0.6 + inst * 0.4 // smooth, so one noisy sample doesn't decide the throw
      last = { y: ev.clientY, t: now }
    }
    const end = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
      if (!moved) { go(detent === 'full' ? 'medium' : 'full'); return }
      const r = height.current / full
      let to: 'medium' | 'full' | 'close'
      if (v > 0.6) to = detent === 'full' ? 'medium' : 'close'
      else if (v < -0.6) to = 'full'
      else to = r < 0.4 ? 'close' : r > 0.84 ? 'full' : 'medium'
      if (to === 'close') onClose()
      else go(to, -v * 1000)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
  }

  return (
    <div ref={undefined} inert={!active} aria-hidden={!active} className="absolute inset-0 overflow-hidden" style={{ zIndex: z }}>
      <div ref={reg('#scrim')} className="absolute inset-0 bg-fg/40" onClick={onClose} aria-hidden />
      <div
        ref={(n) => { panel.current = n; reg('#panel')(n) }}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="absolute inset-x-0 bottom-0 overflow-hidden bg-bg shadow-[0_-8px_32px_-12px_rgb(0_0_0/0.35)]"
        style={{ borderTopLeftRadius: 'calc(var(--radius-card) * (1 - var(--p, 0)))', borderTopRightRadius: 'calc(var(--radius-card) * (1 - var(--p, 0)))' }}
      >
        <LayerContext.Provider value={{ ...ctx, sheet: { detent, expand: () => { if (detent !== 'full') go('full') }, collapse: () => { if (detent !== 'medium') go('medium') }, grab: onGrab } }}>{children}</LayerContext.Provider>
      </div>
    </div>
  )
}
