// Where the prototype begins: Aurora's landing. "Find anything." over a quiet map of dots, a row of things to try, and the message bar.
// Tapping the first one writes the request (with its photo) into the bar; sending it starts the story: ask, watch Aurora work, get the answer.
import { useState } from 'react'
import worldDots from '../assets/world-dots.svg'
import auroraMark from '../assets/aurora-mark.png'
import { useApp } from '../state/store'
import { ChatInput } from '../ui/ChatInput'
import { DemoButton } from '../ui/Demo'
import { LocationIcon } from '../ui/LocationIcon'

const TRY = [
  { id: 'draft', label: 'iPhone 17 Pro', place: 'Sector 3' },
  { id: 'dentist', label: 'Dentist appointment', place: 'Kanakapura Road' },
  { id: 'plumbing', label: 'Plumber today', place: 'Sector 3' },
]

export function Start() {
  const { d, dispatch } = useApp()
  const req = d.scenario.request
  const photo = req.attachments?.[0]
  const [draft, setDraft] = useState('')
  const pick = (id: string) => (id === 'draft' ? setDraft(req.text) : dispatch({ type: 'LOAD_SCENARIO', id }))
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-bg text-fg" style={{ paddingTop: 'var(--safe-top, 0px)', paddingBottom: 'var(--safe-bottom, 0px)' }}>
      {/* The world, as dots, behind the question. Decoration only. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[12%] bottom-[24%] bg-fg-subtle opacity-35 [mask-image:var(--map)] [mask-position:48%_center] [mask-repeat:no-repeat] [mask-size:150%_auto] [-webkit-mask-image:var(--map)] [-webkit-mask-position:48%_center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:150%_auto]" style={{ ['--map' as string]: `url(${worldDots})` }} />

      <header className="relative z-10 grid grid-cols-[44px_1fr_44px] items-start px-3 pt-3">
        <div className="glass glass-float flex size-11 items-center justify-center rounded-full"><DemoButton /></div>
        <div className="flex flex-col items-center gap-1">
          <img src={auroraMark} alt="Aurora" className="h-9 w-auto" />
          <span className="flex items-center gap-1 text-note leading-4 text-fg-muted"><LocationIcon width={14} height={14} />{req.location}</span>
        </div>
        <span />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="m-0 text-[44px] leading-[1.05] font-medium tracking-tight text-fg" style={{ fontFamily: '"Newsreader", ui-serif, Georgia, "Times New Roman", serif' }}>Find anything<span className="text-accent">.</span></h1>
        <p className="m-0 text-lead leading-7 text-fg-muted">What can I find for you today?</p>
      </main>

      <footer className="relative z-10 flex flex-col gap-3 px-4 pb-3">
        <div>
          <p className="m-0 mb-2 px-1 text-note leading-4 text-fg-muted">Try one of these</p>
          <ul className="m-0 -mx-4 flex list-none gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Things to try">
            {TRY.map((t, i) => (
              <li key={t.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => pick(t.id)}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-body leading-5 whitespace-nowrap active:opacity-80 ${i === 0 ? 'border-transparent bg-lime-soft text-fg' : 'border-line bg-surface text-fg'}`}
                >
                  <span className="font-medium">{t.label}</span>
                  <span className="text-fg-muted">{t.place}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <ChatInput
          key={draft ? 'draft' : 'empty'}
          placeholder="Ask for anything"
          initialValue={draft}
          onSend={() => dispatch({ type: 'BEGIN' })}
          above={draft && photo ? <img src={photo.src} alt={photo.alt} className="h-16 w-24 rounded-xl object-cover" /> : undefined}
        />
        <p className="m-0 px-2 text-center text-note leading-4 text-fg-muted">Prototype: nothing calls a real business. Tap “iPhone 17 Pro”, then send.</p>
      </footer>
    </div>
  )
}
