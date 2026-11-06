// The photos at the top of a business card: a row you swipe sideways, with page dots, like the live app's cards.
// The images are unrelated stock photos of real shops (Wikimedia Commons, CC licences; credits in assets/photos/credits.json).
// They stand in for each business's own photos, which this prototype doesn't have rights to.
import { useRef, useState } from 'react'
import { useApp } from '../state/store'
import { useLayer } from './StackNavigator'

const FILES = import.meta.glob('../assets/photos/*.jpg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const pool = (prefix: string) =>
  Object.entries(FILES)
    .filter(([p]) => p.split('/').pop()!.startsWith(prefix + '-'))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, url]) => url)

const COUNT = 3

export function BusinessPhoto({ name, index, tall = false }: { name: string; index: number; tall?: boolean }) {
  const { state } = useApp()
  const { sheet } = useLayer()
  const prefix = /dent/.test(state.scenarioId) ? 'clinic' : /plumb/.test(state.scenarioId) ? 'hardware' : 'phones'
  const all = pool(prefix)
  // Each business starts at a different photo, so neighbouring cards don't show the same pictures.
  const photos = Array.from({ length: Math.min(COUNT, all.length) }, (_, k) => all[(index * 2 + k) % all.length])
  const [page, setPage] = useState(0)
  const row = useRef<HTMLDivElement>(null)
  if (!photos.length) return null
  return (
    <div className="relative bg-sunken">
      <div
        ref={row}
        onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((src, i) => (
          <img key={src + i} src={src} alt={`Photo ${i + 1} of ${photos.length} for ${name}`} loading="lazy" draggable={false} className="w-full shrink-0 snap-center object-cover" style={{ height: sheet ? 'calc(160px + 128px * var(--p, 0))' : tall ? 288 : 160 }} />
        ))}
      </div>
      {photos.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
          {photos.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-(--dur-base) ease-(--ease-out) ${i === page ? 'w-4 bg-surface' : 'w-1.5 bg-surface/60'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
