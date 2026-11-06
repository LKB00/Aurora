// A phone has no pointer to hover with, and the prototype is shown inside a phone, so no element may change on hover (on a real phone a hover state also sticks after a tap).
// Pressed (:active) and keyboard focus states stay. Tattva's and Tailwind's hover rules are removed from the loaded stylesheets, so every component is consistent without touching each one.
function strip(rules: CSSRuleList): void {
  for (let i = rules.length - 1; i >= 0; i--) {
    const r = rules[i] as CSSRule & { selectorText?: string; cssRules?: CSSRuleList; deleteRule?: (n: number) => void }
    if (r.cssRules && r.cssRules.length) strip(r.cssRules)
    const sel = r.selectorText
    if (sel && sel.includes(':hover')) {
      const parent = (r.parentRule as (CSSRule & { deleteRule: (n: number) => void }) | null) ?? r.parentStyleSheet
      parent?.deleteRule(i)
    }
  }
}
function run() {
  for (const sheet of Array.from(document.styleSheets)) {
    try { strip(sheet.cssRules) } catch { /* a stylesheet from another site can't be read */ }
  }
}
export function removeHoverStyles() {
  run()
  let t = 0
  new MutationObserver(() => { clearTimeout(t); t = window.setTimeout(run, 50) }).observe(document.head, { childList: true, subtree: true })
}
