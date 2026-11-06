// Where the prototype begins: Aurora's landing. "Find anything." over a quiet map of dots, a row of things to try, and the message bar.
// Tapping the first one writes the request (with its photo) into the bar; sending it starts the story: ask, watch Aurora work, get the answer.
import { useState } from 'react'
import { AISuggestIcon, SectionLabel, XIcon } from '@tattva/ui'
import worldDots from '../assets/world-dots.svg'
import auroraMark from '../assets/aurora-mark.png'
import { DEFAULT_SCENARIO, SCENARIOS } from '../data/scenarios'
import { useApp } from '../state/store'
import { ChatInput } from '../ui/ChatInput'
import { DemoButton } from '../ui/Demo'
import { LocationIcon } from '../ui/LocationIcon'

const TRY = [
  { id: 'iphone-live', text: 'Find an iPhone 17 Pro in stock near me' },
  { id: 'dentist-live', text: 'Book a dental cleaning this week' },
  { id: 'plumbing-live', text: 'Find a plumber for a leak today' },
]

export function Start() {
  const { d, dispatch } = useApp()
  const req = d.scenario.request
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [photoOff, setPhotoOff] = useState(false)
  const draft = pickedId ? (SCENARIOS.find((s) => s.id === pickedId)?.request.text ?? '') : ''
  const draftPhoto = pickedId && !photoOff ? SCENARIOS.find((s) => s.id === pickedId)?.request.attachments?.[0] : undefined
  const pick = (id: string) => { setPickedId(id); setPhotoOff(false) }
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-bg text-fg" style={{ paddingTop: 'var(--safe-top, 0px)', paddingBottom: 'var(--safe-bottom, 0px)' }}>
      {/* The world, as dots, behind the question. Decoration only. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[14%] bottom-[30%] bg-fg-subtle opacity-20 [mask-image:var(--map)] [mask-position:48%_center] [mask-repeat:no-repeat] [mask-size:135%_auto] [-webkit-mask-image:var(--map)] [-webkit-mask-position:48%_center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:135%_auto]" style={{ ['--map' as string]: `url(${worldDots})` }} />

      <header className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-start px-3 pt-3">
        <span />
        <div className="flex flex-col items-center gap-1">
          <img src={auroraMark} alt="Aurora" className="h-9 w-auto" />
          <span className="flex items-center gap-1 text-note leading-4 text-fg-muted"><LocationIcon width={14} height={14} />{req.location}</span>
        </div>
        <DemoButton />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="m-0 text-[44px] leading-[1.05] font-medium tracking-tight text-fg" style={{ fontFamily: '"Newsreader", ui-serif, Georgia, "Times New Roman", serif' }}>Find anything<span className="text-accent">.</span></h1>
        <p className="m-0 text-lead leading-7 text-fg-muted">What can I find for you today?</p>
      </main>

      <footer className="relative z-10 flex flex-col gap-3 px-4 pb-3">
        <section aria-label="Suggested prompts" className="flex flex-col gap-1">
          <SectionLabel>Suggested</SectionLabel>
          <ul className="m-0 flex list-none flex-col p-0">
            {TRY.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => pick(t.id)} className="flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-control px-1 py-2.5 text-left text-body leading-6 text-fg active:bg-pressed">
                  <span className="flex h-6 shrink-0 items-center text-fg-muted"><AISuggestIcon width={16} height={16} /></span>
                  <span className="min-w-0">{t.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {/* Tapping the empty bar writes the iPhone request into it, so there is always one obvious way in. */}
        <div onFocusCapture={() => { if (!pickedId) setPickedId(DEFAULT_SCENARIO) }}>
          <ChatInput
            key={pickedId ?? 'empty'}
            placeholder="Ask for anything"
            initialValue={draft}
            onSend={() => dispatch({ type: 'BEGIN', id: pickedId ?? undefined })}
            above={draftPhoto ? (
              <span className="relative self-start">
                <img src={draftPhoto.src} alt={draftPhoto.alt} className="h-16 w-24 rounded-xl object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => setPhotoOff(true)} className="absolute -top-2 -right-2 grid size-11 cursor-pointer place-items-center rounded-full bg-transparent before:absolute before:size-6 before:rounded-full before:bg-surface before:shadow-sm before:ring-1 before:ring-line">
                  <XIcon className="relative" width={14} height={14} />
                </button>
              </span>
            ) : undefined}
          />
        </div>
      </footer>
    </div>
  )
}
