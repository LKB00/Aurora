// One frame for every screen: a phone-width column, a title bar with Back, and a scrolling body.
import { Button, ChevronIcon, XIcon } from '@tattva/ui'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNav } from '../state/store'
import { FollowUpChip } from './FollowUpChip'
import { useLayer } from './StackNavigator'

/** Soft scroll edge, the same recipe as Tattva's ScrollEdge and the main prototype: five blur layers that grow stronger towards the bar, plus a tint of the
 *  page colour. It belongs to the bar (sits behind its content) and ignores touch. */
function Fade({ edge, style, solid }: { edge: 'top' | 'bottom'; style?: React.CSSProperties; solid?: boolean }) {
  return (
    <span className="se" data-edge={edge} data-solid={solid ? '' : undefined} style={style} aria-hidden>
      <span className="se-fallback" />
      <span className="se-blur">
        <span className="se-b1" /><span className="se-b2" /><span className="se-b3" /><span className="se-b4" /><span className="se-b5" /><span className="se-tint" />
      </span>
    </span>
  )
}

// iOS navigation bar + large title: the bar is 44pt with a "‹ Previous" back button; the large title lives at the top of the
// content and, once it scrolls away, the bar's own small title fades in and a hairline appears under the bar (scroll edge).
export function Screen({ title, subtitle, back = true, onBack, backLabel: backLabelOverride, actions, footer, hero, children }: { title: string; subtitle?: string; back?: boolean; /** Replaces the default "go back one screen". */ onBack?: () => void; backLabel?: string; actions?: ReactNode; footer?: ReactNode; /** Full-bleed picture at the very top; the glass buttons float over it. */ hero?: ReactNode; children: ReactNode }) {
  const nav = useNav()
  const { backLabel, sheet } = useLayer()
  const [scrolled, setScrolled] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [footerH, setFooterH] = useState(0)
  const footerRef = useRef<HTMLElement>(null)
  const touchY = useRef(0)
  const wrap = useRef<HTMLDivElement>(null)
  // The scrolling element, found by its role.
  const scroller = () => wrap.current?.querySelector<HTMLElement>('[role=region]') ?? null
  // Scroll feel for a mouse wheel. A wheel jumps in coarse steps with no weight, so a flick throws the page to the end. Here each notch only nudges a target,
  // and the page eases toward it (about 0.14 of the remaining distance per frame): it starts quickly, then settles, like momentum with friction.
  // A trackpad already has its own momentum, so it is left alone. A sheet at medium height needs a deliberate push (about 80px of wheel) before it grows.
  const stateRef = useRef({ target: 0, raf: 0, acc: 0, t: 0 })
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet
  useEffect(() => {
    const el = scroller()
    if (!el) return
    const st = stateRef.current
    const step = () => {
      const max = el.scrollHeight - el.clientHeight
      st.target = Math.max(0, Math.min(max, st.target))
      const diff = st.target - el.scrollTop
      if (Math.abs(diff) < 0.5) { el.scrollTop = st.target; st.raf = 0; return }
      el.scrollTop += diff * 0.14
      st.raf = requestAnimationFrame(step)
    }
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.deltaY === 0) return
      const sh = sheetRef.current
      if (sh?.detent === 'medium') {
        e.preventDefault()
        if (e.deltaY > 0) { st.acc = e.timeStamp - st.t > 300 ? e.deltaY : st.acc + e.deltaY; st.t = e.timeStamp; if (st.acc > 80) { st.acc = 0; sh.expand() } }
        return
      }
      const coarse = e.deltaMode !== 0 || (Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY))
      if (!coarse) { st.target = el.scrollTop; return }
      e.preventDefault()
      if (!st.raf) st.target = el.scrollTop
      st.target += (e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY) * 0.9
      if (!st.raf) st.raf = requestAnimationFrame(step)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { el.removeEventListener('wheel', onWheel); cancelAnimationFrame(st.raf); st.raf = 0 }
  }, [])
  // Back at medium height the sheet starts from its top again.
  useEffect(() => { if (sheet?.detent === 'medium') { scroller()?.scrollTo({ top: 0 }); setScrolled(false); setCollapsed(false) } }, [sheet?.detent])
  useEffect(() => {
    const el = footerRef.current
    if (!el) { setFooterH(0); return }
    const ro = new ResizeObserver(() => setFooterH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [!!footer])
  // The screen runs all the way up under the status bar (the frame draws the time and battery over it). The bar's own fade softens whatever
  // passes under it, so there is no separate white strip. A sheet that isn't full height starts below the status bar, so it needs no inset.
  const inset = sheet ? 'calc(var(--safe-top, 0px) * var(--p, 0))' : 'var(--safe-top, 0px)'
  const base = sheet ? 56 : 48
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-fg">
      {/* Content scrolls under the floating bar and the footer. each bar's own fade (see Fade) softens it progressively as it nears either edge, so the bars
          themselves stay transparent (no hard line). With a photo at the top, the top edge only starts once the photo has scrolled away. */}
      <div
        ref={wrap}
        className="absolute inset-0"
        // In a sheet, the first upward swipe or scroll at medium height grows the sheet; the content only scrolls once it is full.
        // A downward swipe from the very top of a full sheet brings it back to medium (the iOS behaviour).
        onTouchStart={(e) => { touchY.current = e.touches[0].clientY }}
        onTouchMove={(e) => {
          if (!sheet) return
          const dy = e.touches[0].clientY - touchY.current
          if (sheet.detent === 'medium' && dy < -12) sheet.expand()
          else if (sheet.detent === 'full' && dy > 40 && (scroller()?.scrollTop ?? 0) <= 0) sheet.collapse()
        }}
        onScrollCapture={(e) => { if (e.target !== scroller()) return; const y = (e.target as HTMLElement).scrollTop; setScrolled(y > (hero ? 240 : 2)); setCollapsed(y > (hero ? 300 : 44)) }}
      >
        <div
          role="region"
          aria-label={title}
          tabIndex={0}
          className={`h-full w-full overscroll-contain focus-visible:[outline-offset:-2px] ${sheet?.detent === 'medium' ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
        >
          <div style={{ paddingTop: hero ? 0 : `calc(${base}px + ${inset})`, paddingBottom: footerH }}>
          {hero}
          <FollowUpChip />
          <div className="px-4 pt-3 pb-2">
            <h1 className="text-title-lg leading-9 font-bold tracking-tight text-fg">{title}</h1>
            {subtitle && <p className="mt-0.5 text-body text-fg-muted">{subtitle}</p>}
          </div>
          {children}
        </div>
        </div>
      </div>
      <header className={`isolate absolute inset-x-0 top-0 z-10 grid grid-cols-[auto_1fr_auto] gap-2 px-3 ${sheet ? 'items-start' : 'items-center'}`} style={{ height: `calc(${base}px + ${inset})`, paddingTop: sheet ? `calc(12px + ${inset})` : inset }}>
        {/* At rest nothing is under the bar, so nothing is softened (and over a photo there is no fade at all). Once content scrolls under it, the fade reaches 36px below the bar. */}
        <Fade edge="top" solid={!hero || scrolled} style={{ bottom: hero && !scrolled ? `calc(${base}px - 20px * ${sheet ? 'var(--p, 0)' : '1'})` : scrolled ? -12 : 0, ['--se-solid' as string]: hero && !scrolled ? '100%' : '30%' }} />
        <div className="flex size-11 items-center justify-center">
          {back && !sheet && (
            <Button size="lg" variant="ghost" onClick={onBack ?? nav.back} aria-label={`Back to ${backLabelOverride ?? backLabel}`} className="glass glass-float size-11 rounded-full p-0 text-fg">
              <ChevronIcon width={20} height={20} className="rotate-180" />
            </Button>
          )}
        </div>
        <p onPointerDown={sheet?.grab} className={`truncate text-center text-body font-semibold text-fg ${sheet ? 'h-11 leading-[44px]' : ''} transition-opacity duration-(--dur-fast) ${sheet ? 'touch-none' : ''} ${collapsed ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!sheet}>{title}</p>
        {sheet ? (
          // A sheet closes from its top-right corner, like iOS.
          // One close button everywhere in a sheet: the plain iOS grey circle (solid, so it also reads over a photo).
          <Button size="lg" variant="ghost" onClick={nav.back} aria-label="Close" className="size-11 rounded-full p-0 text-fg-muted bg-transparent! hover:bg-transparent!">
            <span className="grid size-8 place-items-center rounded-full bg-sunken ring-1 ring-line"><XIcon width={16} height={16} /></span>
          </Button>
        ) : actions ?? <div />}
      </header>
      {sheet && (
        // The handle: drag it (or tap it) to resize the sheet. It shows only at medium height; a full sheet is a whole screen, so it has no handle or rounded corners (drag the top bar or swipe down to shrink it).
        <div onPointerDown={sheet.grab} className={`absolute top-0 left-1/4 z-20 flex h-6 w-1/2 touch-none cursor-grab justify-center pt-1.5 ${scrolled || sheet.detent === 'full' ? 'pointer-events-none' : ''}`} style={{ opacity: scrolled ? 0 : 'calc(1 - var(--p, 0))' }}>
          <span className="h-1.5 w-10 rounded-full bg-surface/85 ring-1 ring-line" />
        </div>
      )}
      {footer && (
        <footer ref={footerRef} className="pointer-events-none isolate absolute inset-x-0 bottom-0 z-10 px-4 pt-4 pb-(--safe-bottom) [&>*]:pointer-events-auto"><Fade edge="bottom" />{footer}</footer>
      )}
    </div>
  )
}
