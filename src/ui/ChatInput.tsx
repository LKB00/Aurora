// Aurora's message bar, after the live prototype: a tall pill with a plus on the left, a growing text field, and a mic that turns
// into a send button once there is text; a round voice orb sits beside it. Built from Tattva tokens and icons.
import { IconButton, MicIcon, PlusIcon, SendIcon } from '@tattva/ui'
import { useEffect, useRef, useState } from 'react'

// Aurora's dotted waveform. The orb is decorative here: voice is not part of this prototype.
const BARS: [number, number, number][] = [[2, 8, 4], [6, 5, 10], [10, 2, 16], [14, 6, 8], [18, 3, 14], [22, 7, 6]]
function Orb() {
  return (
    <svg width="26" height="20" viewBox="0 0 26 20" aria-hidden>
      {BARS.flatMap(([x, y, h]) => Array.from({ length: Math.round(h / 2.4) }, (_, k) => <circle key={`${x}-${k}`} cx={x} cy={y + k * 2.4} r="0.95" className={k % 2 ? 'fill-accent opacity-50' : 'fill-accent'} />))}
    </svg>
  )
}

export function ChatInput({ placeholder = 'Ask for anything', onSend }: { placeholder?: string; onSend: (text: string) => void }) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 104)}px`
  }, [value])
  const send = () => {
    const t = value.trim()
    if (!t) return
    onSend(t)
    setValue('')
  }
  return (
    <div className="flex items-end gap-2.5">
      <label className="flex min-h-14 min-w-0 flex-1 cursor-text items-end gap-3 rounded-full border border-line bg-surface py-2 pr-2 pl-4 shadow-sm">
        <span className="grid h-10 place-items-center text-fg-muted" aria-hidden><PlusIcon width={24} height={24} /></span>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          className="max-h-26 min-w-0 flex-1 resize-none bg-transparent py-2 text-body text-fg outline-none placeholder:text-fg-subtle"
        />
        {value.trim() ? (
          <IconButton label="Send" variant="primary" onClick={send} className="size-11 shrink-0 rounded-full"><SendIcon width={20} height={20} /></IconButton>
        ) : (
          <span className="grid size-10 shrink-0 place-items-center text-fg" aria-hidden><MicIcon width={23} height={23} /></span>
        )}
      </label>
      <span className="grid size-14 shrink-0 place-items-center rounded-full border border-line bg-surface shadow-sm" aria-hidden><Orb /></span>
    </div>
  )
}
