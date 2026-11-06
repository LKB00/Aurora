// A call that keeps going while you look at something else stays one tap away.
import { BackgroundRunChip } from '@tattva/ui'
import { shortName } from '../logic/format'
import { useApp, useNav } from '../state/store'

export function FollowUpChip() {
  const { state, d } = useApp()
  const nav = useNav()
  const fu = state.followUp
  if (!fu || d.route.name === 'followup') return null
  const b = d.businesses.find((x) => x.business.id === fu.businessId)
  if (!b) return null
  const running = fu.phase === 'queued' || fu.phase === 'calling' || fu.phase === 'interpreting'
  const finished = fu.phase === 'done'
  if (!running && !finished) return null
  return (
    <div className="px-4 pt-2">
      <BackgroundRunChip
        name={`Call to ${shortName(b.business.name)}`}
        status={running ? 'working' : 'needs-input'}
        statusText={running ? 'Call in progress' : 'Answer is ready'}
        onClick={() => nav.push({ name: 'followup', id: fu.businessId })}
      />
    </div>
  )
}
