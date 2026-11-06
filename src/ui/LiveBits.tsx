// The pieces of Aurora's "working" state, shared by the live search and the follow-up call so they feel like one product.
import { AIMark, StreamingReveal, useStreamingText } from '@tattva/ui'

// Aurora thinks out loud, in the first person, from what is really true right now. Re-keyed per sentence so each one streams in word by word.
export function Narration({ text }: { text: string }) {
  const s = useStreamingText(text, { speed: 24 })
  return <p className="m-0 min-h-18 text-body leading-6 text-fg"><StreamingReveal text={s.text} streaming={s.streaming} /></p>
}


// Aurora's mark, alive: it swells and tilts, a halo breathes out, two small stars twinkle.
export function Spark() {
  return (
    <span className="spark" role="img" aria-label="Aurora is working">
      <span className="spark-halo" />
      <span className="spark-disc"><AIMark size={18} className="spark-core" /></span>
      <i className="spark-dot d1" />
      <i className="spark-dot d2" />
    </span>
  )
}

// A little equalizer: the call is live.
export function Eq() {
  return <span className="eq" aria-hidden><i /><i /><i /><i /></span>
}
