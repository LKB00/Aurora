// Where the prototype begins: a new conversation with the request already drafted. Sending it starts the search, so the whole story
// (ask, watch Aurora work, get the answer) is walked through by the person looking at it, not dropped on them half way.
import { Button, SendIcon } from '@tattva/ui'
import { useApp } from '../state/store'
import { DemoButton } from '../ui/Demo'
import { Screen } from '../ui/Screen'
import { UserRequest } from './Chat'

export function Start() {
  const { d, dispatch } = useApp()
  const req = d.scenario.request
  return (
    <Screen
      title="What do you need today?"
      back={false}
      actions={<DemoButton />}
      footer={<Button size="lg" className="w-full" onClick={() => dispatch({ type: 'BEGIN' })}><SendIcon width={18} height={18} />Send to Aurora</Button>}
    >
      <div className="flex flex-col gap-6 px-4 pt-1 pb-6">
        <p className="m-0 text-body-lg leading-7 text-fg-muted">Aurora searches nearby, phones the businesses for you, and tells you which ones can actually help, with the evidence.</p>
        <section aria-label="Your request" className="flex flex-col gap-2">
          <p className="m-0 text-note leading-4 font-medium text-fg-muted">Your request, ready to send</p>
          <div className="rounded-card border border-line bg-sunken px-5 py-3 text-body-lg leading-relaxed text-fg">
            <UserRequest text={req.text} attachments={req.attachments} full />
          </div>
        </section>
        <p className="m-0 text-note leading-5 text-fg-muted">This is a prototype. Nothing calls a real business; the search and its answers are simulated. The settings button, top right, opens other journeys: no match, conflicting answers, follow-up calls and failures.</p>
      </div>
    </Screen>
  )
}
