export const inr = (n: number) => '₹' + n.toLocaleString('en-IN')

/** "3 Nov, 6:38 PM" in India time. Returns null when no timestamp exists – never invents one. */
export function when(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  return `${date}, ${time}`
}

export function timeOnly(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}

/** Chronological comparator for ISO timestamps with any offset; unknown times sort first. */
export const byTime = (a: string | null | undefined, b: string | null | undefined) =>
  (a ? new Date(a).getTime() : 0) - (b ? new Date(b).getTime() : 0)

/** Lower-case a label for use mid-sentence without breaking product terms ("Final price" → "final price", "256GB in stock" unchanged). */
export const lc = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)

/** A business name short enough for a sentence: “Pai International”, “Sri Sai”, “Dentist in Kanakapura Road”. */
export const shortName = (name: string) => {
  const base = name.split(' – ')[0].split(' / ')[0]
  const words = base.split(' ')
  // Keep short names whole; never end on a connector (“Dentist in …”).
  if (words.length <= 3) return base
  const cut = words.slice(0, 2)
  return /^(in|of|at|and|the|&)$/i.test(cut[1]) ? base : cut.join(' ')
}

